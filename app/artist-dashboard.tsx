import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import i18n from '../src/i18n';
import type { User, Candidacy, Media } from '../src/types';

// Import Chart.js components only on web platform
let Line: any;
if (Platform.OS === 'web') {
  const { Line: WebLine } = require('react-chartjs-2');
  const { Chart, registerables } = require('chart.js');
  Chart.register(...registerables);
  Line = WebLine;
}

type Period = '7d' | '30d' | 'custom';
type ChartData = { dates: string[]; values: number[] };

export default function ArtistDashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');
  const [candidaciesData, setCandidaciesData] = useState<{
    total: number;
    approved: number;
    rejected: number;
    chart: ChartData;
  }>({
    total: 0,
    approved: 0,
    rejected: 0,
    chart: { dates: [], values: [] },
  });
  const [portfolioData, setPortfolioData] = useState<{
    totalViews: number;
    chart: ChartData;
  }>({
    totalViews: 0,
    chart: { dates: [], values: [] },
  });
  const [ratingData, setRatingData] = useState<{
    average: number;
    total: number;
    recent: number;
  }>({
    average: 0,
    total: 0,
    recent: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    if (!auth.currentUser) return;

    try {
      // Load user data
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }

      const periodDays = period === '7d' ? 7 : 30;
      const startDate = subDays(new Date(), periodDays);

      // Load candidacies
      const candidaciesSnapshot = await getDocs(query(
        collection(db, 'candidacies'),
        where('artistId', '==', auth.currentUser.uid)
      ));

      const candidacies = candidaciesSnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Candidacy[];

      const recentCandidacies = candidacies.filter(c => 
        isWithinInterval(c.createdAt, {
          start: startOfDay(startDate),
          end: endOfDay(new Date()),
        })
      );

      // Generate dates array for charts
      const dates = Array.from({ length: periodDays }, (_, i) => {
        const date = subDays(new Date(), i);
        return format(date, 'yyyy-MM-dd');
      }).reverse();

      // Calculate candidacies per day
      const candidaciesPerDay = dates.map(date => {
        return recentCandidacies.filter(c => 
          format(c.createdAt, 'yyyy-MM-dd') === date
        ).length;
      });

      setCandidaciesData({
        total: candidacies.length,
        approved: candidacies.filter(c => c.status === 'APROVADA').length,
        rejected: candidacies.filter(c => c.status === 'REJEITADA').length,
        chart: {
          dates,
          values: candidaciesPerDay,
        },
      });

      // Load portfolio views
      const mediaSnapshot = await getDocs(query(
        collection(db, 'media'),
        where('userId', '==', auth.currentUser.uid)
      ));

      const media = mediaSnapshot.docs.map(doc => doc.data()) as Media[];
      const totalViews = media.reduce((sum, m) => sum + (m.viewsCount || 0), 0);

      // Calculate views per day if viewsHistory exists
      const viewsPerDay = dates.map(date => {
        return media.reduce((sum, m) => {
          if (m.viewsHistory && m.viewsHistory[date]) {
            return sum + m.viewsHistory[date];
          }
          return sum;
        }, 0);
      });

      setPortfolioData({
        totalViews,
        chart: {
          dates,
          values: viewsPerDay,
        },
      });

      // Load rating data
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const reviewsSnapshot = await getDocs(query(
          collection(db, 'reviews'),
          where('reviewedId', '==', auth.currentUser.uid)
        ));

        const reviews = reviewsSnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        }));

        const recentReviews = reviews.filter(r =>
          isWithinInterval(r.createdAt, {
            start: startOfDay(startDate),
            end: endOfDay(new Date()),
          })
        );

        setRatingData({
          average: userData.rating || 0,
          total: userData.reviewCount || 0,
          recent: recentReviews.length,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (data: ChartData, label: string, color: string) => {
    if (Platform.OS !== 'web') {
      return (
        <View style={styles.simpleChart}>
          {data.values.map((value, index) => (
            <View
              key={index}
              style={[
                styles.chartBar,
                {
                  height: `${(value / Math.max(...data.values)) * 100}%`,
                  backgroundColor: color,
                },
              ]}
            />
          ))}
        </View>
      );
    }

    return (
      <Line
        data={{
          labels: data.dates.map(date => format(new Date(date), 'dd/MM')),
          datasets: [
            {
              label,
              data: data.values,
              fill: false,
              borderColor: color,
              tension: 0.1,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top' as const,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        }}
      />
    );
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('dashboard.artist.title')}</Text>
        </View>

        <View style={styles.periodSelector}>
          <Button
            title="7 dias"
            onPress={() => setPeriod('7d')}
            variant={period === '7d' ? 'primary' : 'secondary'}
          />
          <Button
            title="30 dias"
            onPress={() => setPeriod('30d')}
            variant={period === '30d' ? 'primary' : 'secondary'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('dashboard.artist.candidacies')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{candidaciesData.total}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.artist.totalCandidacies')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{candidaciesData.approved}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.artist.approvedCandidacies')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#F44336' }]}>{candidaciesData.rejected}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.artist.rejectedCandidacies')}</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {renderChart(
              candidaciesData.chart,
              i18n.t('dashboard.artist.candidaciesChart'),
              '#007AFF'
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('dashboard.artist.portfolio')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{portfolioData.totalViews}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.artist.totalViews')}</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {renderChart(
              portfolioData.chart,
              i18n.t('dashboard.artist.viewsChart'),
              '#4CAF50'
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('dashboard.artist.rating')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{ratingData.average.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.artist.averageRating')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{ratingData.total}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.artist.totalReviews')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{ratingData.recent}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.artist.recentReviews')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chart: {
    height: 200,
    marginTop: 20,
  },
  simpleChart: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'flex-end',
    gap: 2,
  },
  chartBar: {
    flex: 1,
    backgroundColor: '#007AFF',
    minHeight: 1,
  },
});