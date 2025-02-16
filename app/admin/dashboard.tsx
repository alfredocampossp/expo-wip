import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { router } from 'expo-router';
import i18n from '../../src/i18n';
import type { User, Event } from '../../src/types';

// Import Chart.js components only on web platform
let Line: any;
let Pie: any;
if (Platform.OS === 'web') {
  const { Line: WebLine, Pie: WebPie } = require('react-chartjs-2');
  const { Chart, registerables } = require('chart.js');
  Chart.register(...registerables);
  Line = WebLine;
  Pie = WebPie;
}

type Period = '7d' | '30d' | 'custom';
type ChartData = { dates: string[]; values: number[] };
type PieChartData = { labels: string[]; values: number[] };

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');

  const [usersData, setUsersData] = useState<{
    total: number;
    artists: number;
    contractors: number;
    admins: number;
    free: number;
    paid: number;
    chart: ChartData;
    roleChart: PieChartData;
    planChart: PieChartData;
  }>({
    total: 0,
    artists: 0,
    contractors: 0,
    admins: 0,
    free: 0,
    paid: 0,
    chart: { dates: [], values: [] },
    roleChart: { labels: [], values: [] },
    planChart: { labels: [], values: [] },
  });

  const [eventsData, setEventsData] = useState<{
    total: number;
    open: number;
    closed: number;
    canceled: number;
    completed: number;
    shows: number;
    festivals: number;
    chart: ChartData;
    statusChart: PieChartData;
    typeChart: PieChartData;
  }>({
    total: 0,
    open: 0,
    closed: 0,
    canceled: 0,
    completed: 0,
    shows: 0,
    festivals: 0,
    chart: { dates: [], values: [] },
    statusChart: { labels: [], values: [] },
    typeChart: { labels: [], values: [] },
  });

  const [ratingsData, setRatingsData] = useState<{
    globalAverage: number;
    totalReviews: number;
    topArtists: { email: string; rating: number }[];
    topContractors: { email: string; rating: number }[];
    chart: ChartData;
  }>({
    globalAverage: 0,
    totalReviews: 0,
    topArtists: [],
    topContractors: [],
    chart: { dates: [], values: [] },
  });

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    if (!auth.currentUser) return;

    try {
      const periodDays = period === '7d' ? 7 : 30;
      const startDate = subDays(new Date(), periodDays);

      // Generate dates array for charts
      const dates = Array.from({ length: periodDays }, (_, i) => {
        const date = subDays(new Date(), i);
        return format(date, 'yyyy-MM-dd');
      }).reverse();

      // Load users data
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as User[];

      const recentUsers = users.filter(u =>
        isWithinInterval(u.createdAt, {
          start: startOfDay(startDate),
          end: endOfDay(new Date()),
        })
      );

      // Calculate users per day
      const usersPerDay = dates.map(date => {
        return recentUsers.filter(u =>
          format(u.createdAt, 'yyyy-MM-dd') === date
        ).length;
      });

      setUsersData({
        total: users.length,
        artists: users.filter(u => u.role === 'artist').length,
        contractors: users.filter(u => u.role === 'contractor').length,
        admins: users.filter(u => u.isAdmin).length,
        free: users.filter(u => u.planId === 'free').length,
        paid: users.filter(u => u.planId === 'paid').length,
        chart: {
          dates,
          values: usersPerDay,
        },
        roleChart: {
          labels: ['Artists', 'Contractors', 'Admins'],
          values: [
            users.filter(u => u.role === 'artist').length,
            users.filter(u => u.role === 'contractor').length,
            users.filter(u => u.isAdmin).length,
          ],
        },
        planChart: {
          labels: ['Free', 'Paid'],
          values: [
            users.filter(u => u.planId === 'free').length,
            users.filter(u => u.planId === 'paid').length,
          ],
        },
      });

      // Load events data
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const events = eventsSnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Event[];

      const recentEvents = events.filter(e =>
        isWithinInterval(e.createdAt, {
          start: startOfDay(startDate),
          end: endOfDay(new Date()),
        })
      );

      // Calculate events per day
      const eventsPerDay = dates.map(date => {
        return recentEvents.filter(e =>
          format(e.createdAt, 'yyyy-MM-dd') === date
        ).length;
      });

      setEventsData({
        total: events.length,
        open: events.filter(e => e.status === 'ABERTO').length,
        closed: events.filter(e => e.status === 'ENCERRADO').length,
        canceled: events.filter(e => e.status === 'CANCELADO').length,
        completed: events.filter(e => e.status === 'CONCLUIDO').length,
        shows: events.filter(e => e.eventType === 'SHOW').length,
        festivals: events.filter(e => e.eventType === 'FESTIVAL').length,
        chart: {
          dates,
          values: eventsPerDay,
        },
        statusChart: {
          labels: ['Open', 'Closed', 'Canceled', 'Completed'],
          values: [
            events.filter(e => e.status === 'ABERTO').length,
            events.filter(e => e.status === 'ENCERRADO').length,
            events.filter(e => e.status === 'CANCELADO').length,
            events.filter(e => e.status === 'CONCLUIDO').length,
          ],
        },
        typeChart: {
          labels: ['Shows', 'Festivals'],
          values: [
            events.filter(e => e.eventType === 'SHOW').length,
            events.filter(e => e.eventType === 'FESTIVAL').length,
          ],
        },
      });

      // Load ratings data
      const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
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

      // Calculate reviews per day
      const reviewsPerDay = dates.map(date => {
        return recentReviews.filter(r =>
          format(r.createdAt, 'yyyy-MM-dd') === date
        ).length;
      });

      // Get top rated users
      const artistsWithRatings = users
        .filter(u => u.role === 'artist' && u.rating)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5)
        .map(u => ({ email: u.email, rating: u.rating || 0 }));

      const contractorsWithRatings = users
        .filter(u => u.role === 'contractor' && u.rating)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5)
        .map(u => ({ email: u.email, rating: u.rating || 0 }));

      setRatingsData({
        globalAverage: users.reduce((sum, u) => sum + (u.rating || 0), 0) / users.filter(u => u.rating).length,
        totalReviews: reviews.length,
        topArtists: artistsWithRatings,
        topContractors: contractorsWithRatings,
        chart: {
          dates,
          values: reviewsPerDay,
        },
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLineChart = (data: ChartData, label: string, color: string) => {
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

  const renderPieChart = (data: PieChartData, colors: string[]) => {
    if (Platform.OS !== 'web') {
      return (
        <View style={styles.simplePieChart}>
          {data.values.map((value, index) => (
            <View
              key={index}
              style={[
                styles.pieSlice,
                {
                  flex: value,
                  backgroundColor: colors[index],
                },
              ]}
            />
          ))}
        </View>
      );
    }

    return (
      <Pie
        data={{
          labels: data.labels,
          datasets: [
            {
              data: data.values,
              backgroundColor: colors,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'right' as const,
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="stats-chart" size={32} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('admin.dashboard.title')}</Text>
          </View>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('admin.dashboard.users.title')}</Text>
            <TouchableOpacity
              style={styles.sectionLink}
              onPress={() => router.push('/admin/users')}
            >
              <Text style={styles.linkText}>{i18n.t('admin.dashboard.viewAll')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{usersData.total}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.users.total')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{usersData.artists}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.users.artists')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>{usersData.contractors}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.users.contractors')}</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {renderLineChart(
              usersData.chart,
              i18n.t('admin.dashboard.users.newUsers'),
              '#007AFF'
            )}
          </View>

          <View style={styles.chartsRow}>
            <View style={[styles.chart, styles.halfChart]}>
              {renderPieChart(
                usersData.roleChart,
                ['#4CAF50', '#2196F3', '#FF9800']
              )}
            </View>
            <View style={[styles.chart, styles.halfChart]}>
              {renderPieChart(
                usersData.planChart,
                ['#F44336', '#4CAF50']
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('admin.dashboard.events.title')}</Text>
            <TouchableOpacity
              style={styles.sectionLink}
              onPress={() => router.push('/admin/events')}
            >
              <Text style={styles.linkText}>{i18n.t('admin.dashboard.viewAll')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{eventsData.total}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.events.total')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{eventsData.shows}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.events.shows')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>{eventsData.festivals}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.events.festivals')}</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {renderLineChart(
              eventsData.chart,
              i18n.t('admin.dashboard.events.newEvents'),
              '#4CAF50'
            )}
          </View>

          <View style={styles.chartsRow}>
            <View style={[styles.chart, styles.halfChart]}>
              {renderPieChart(
                eventsData.statusChart,
                ['#4CAF50', '#FFC107', '#F44336', '#2196F3']
              )}
            </View>
            <View style={[styles.chart, styles.halfChart]}>
              {renderPieChart(
                eventsData.typeChart,
                ['#2196F3', '#FF9800']
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.dashboard.ratings.title')}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{ratingsData.globalAverage.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.ratings.average')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{ratingsData.totalReviews}</Text>
              <Text style={styles.statLabel}>{i18n.t('admin.dashboard.ratings.total')}</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {renderLineChart(
              ratingsData.chart,
              i18n.t('admin.dashboard.ratings.newReviews'),
              '#FF9800'
            )}
          </View>

          <View style={styles.topUsers}>
            <View style={styles.topSection}>
              <Text style={styles.topTitle}>{i18n.t('admin.dashboard.ratings.topArtists')}</Text>
              {ratingsData.topArtists.map((artist, index) => (
                <View key={index} style={styles.topItem}>
                  <Text style={styles.topEmail}>{artist.email}</Text>
                  <Text style={styles.topRating}>{artist.rating.toFixed(1)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.topSection}>
              <Text style={styles.topTitle}>{i18n.t('admin.dashboard.ratings.topContractors')}</Text>
              {ratingsData.topContractors.map((contractor, index) => (
                <View key={index} style={styles.topItem}>
                  <Text style={styles.topEmail}>{contractor.email}</Text>
                  <Text style={styles.topRating}>{contractor.rating.toFixed(1)}</Text>
                </View>
              ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
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
  chartsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  halfChart: {
    flex: 1,
    height: 200,
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
  simplePieChart: {
    flexDirection: 'row',
    height: '100%',
  },
  pieSlice: {
    height: '100%',
  },
  topUsers: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  topSection: {
    flex: 1,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  topItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  topEmail: {
    fontSize: 14,
    color: '#333',
  },
  topRating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});