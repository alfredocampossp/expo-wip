import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Layout } from '../src/components/Layout';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import { LineChart } from '../src/components/LineChart';
import type { User, Event, Candidacy, Media } from '../src/types';

interface DashboardData {
  eventsCount: number;
  candidaciesCount: number;
  portfolioViews: number;
  rating: number;
  dailyStats?: {
    dates: string[];
    events: number[];
    candidacies: number[];
    views: number[];
  };
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    if (!auth.currentUser) return;

    try {
      // Load user data
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let eventsCount = 0;
      let candidaciesCount = 0;
      let portfolioViews = 0;
      let dailyStats: DashboardData['dailyStats'] | undefined;

      if (userDoc.data().role === 'contractor') {
        // Load contractor events
        const eventsQuery = query(
          collection(db, 'events'),
          where('creatorId', '==', auth.currentUser.uid),
          where('status', '!=', 'CANCELADO'),
          where('createdAt', '>=', thirtyDaysAgo)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsCount = eventsSnapshot.docs.length;

        if (userDoc.data().planId === 'paid') {
          // Calculate daily stats for paid users
          const dates = new Array(30).fill(0).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
          }).reverse();

          const events = new Array(30).fill(0);
          eventsSnapshot.docs.forEach(doc => {
            const eventDate = new Date(doc.data().createdAt.toDate())
              .toISOString()
              .split('T')[0];
            const index = dates.indexOf(eventDate);
            if (index !== -1) {
              events[index]++;
            }
          });

          dailyStats = {
            dates,
            events,
            candidacies: new Array(30).fill(0),
            views: new Array(30).fill(0),
          };
        }
      } else {
        // Load artist candidacies
        const candidaciesQuery = query(
          collection(db, 'candidacies'),
          where('artistId', '==', auth.currentUser.uid),
          where('status', 'in', ['PENDENTE', 'APROVADA']),
          where('createdAt', '>=', thirtyDaysAgo)
        );
        const candidaciesSnapshot = await getDocs(candidaciesQuery);
        candidaciesCount = candidaciesSnapshot.docs.length;

        if (userDoc.data().planId === 'paid') {
          // Calculate daily stats for paid users
          const dates = new Array(30).fill(0).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
          }).reverse();

          const candidacies = new Array(30).fill(0);
          candidaciesSnapshot.docs.forEach(doc => {
            const candidacyDate = new Date(doc.data().createdAt.toDate())
              .toISOString()
              .split('T')[0];
            const index = dates.indexOf(candidacyDate);
            if (index !== -1) {
              candidacies[index]++;
            }
          });

          dailyStats = {
            dates,
            events: new Array(30).fill(0),
            candidacies,
            views: new Array(30).fill(0),
          };
        }
      }

      // Load portfolio views
      const mediaQuery = query(
        collection(db, 'media'),
        where('userId', '==', auth.currentUser.uid)
      );
      const mediaSnapshot = await getDocs(mediaQuery);
      portfolioViews = mediaSnapshot.docs.reduce((total, doc) => 
        total + (doc.data().viewsCount || 0), 0
      );

      if (dailyStats) {
        // Calculate daily views for paid users
        mediaSnapshot.docs.forEach(doc => {
          const mediaData = doc.data();
          if (mediaData.viewsHistory) {
            Object.entries(mediaData.viewsHistory).forEach(([date, views]) => {
              const index = dailyStats!.dates.indexOf(date);
              if (index !== -1) {
                dailyStats!.views[index] += views as number;
              }
            });
          }
        });
      }

      setData({
        eventsCount,
        candidaciesCount,
        portfolioViews,
        rating: userDoc.data().rating || 0,
        dailyStats,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('dashboard.title')}</Text>
        </View>

        <View style={styles.statsGrid}>
          {user?.role === 'contractor' ? (
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{data?.eventsCount}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.eventsCreated')}</Text>
            </View>
          ) : (
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{data?.candidaciesCount}</Text>
              <Text style={styles.statLabel}>{i18n.t('dashboard.candidacies')}</Text>
            </View>
          )}

          <View style={styles.statCard}>
            <Ionicons name="eye" size={24} color="#FF9800" />
            <Text style={styles.statValue}>{data?.portfolioViews}</Text>
            <Text style={styles.statLabel}>{i18n.t('dashboard.portfolioViews')}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color="#F44336" />
            <Text style={styles.statValue}>{data?.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>{i18n.t('dashboard.rating')}</Text>
          </View>
        </View>

        {user?.planId === 'paid' && data?.dailyStats && (
          <>
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                {user.role === 'contractor'
                  ? i18n.t('dashboard.charts.events')
                  : i18n.t('dashboard.charts.candidacies')}
              </Text>
              <LineChart
                data={user.role === 'contractor'
                  ? data.dailyStats.events
                  : data.dailyStats.candidacies}
                labels={data.dailyStats.dates.map(date => date.split('-')[2])}
                color="#4CAF50"
              />
            </View>

            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                {i18n.t('dashboard.charts.views')}
              </Text>
              <LineChart
                data={data.dailyStats.views}
                labels={data.dailyStats.dates.map(date => date.split('-')[2])}
                color="#FF9800"
              />
            </View>
          </>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});