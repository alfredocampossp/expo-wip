import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { EventList } from '../../src/components/EventList';
import { auth, db } from '../../src/services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import type { Event, User } from '../../src/types';

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    if (!auth.currentUser) return;

    try {
      const [userDoc, eventsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('id', '==', auth.currentUser.uid))),
        getDocs(query(
          collection(db, 'events'),
          where('creatorId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        ))
      ]);

      if (!userDoc.empty) {
        setUser(userDoc.docs[0].data() as User);
      }

      const eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];

      setEvents(eventsList);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    if (user?.planId === 'free' && (user?.credits || 0) < 1) {
      Alert.alert(i18n.t('events.error.noCredits'));
      return;
    }
    router.push('/events/create');
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="calendar" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('events.title')}</Text>
        </View>

        <Button
          title={i18n.t('events.createButton')}
          onPress={handleCreateEvent}
        />

        <EventList
          events={events}
          onUpdate={loadEvents}
          isPaidPlan={user?.planId === 'paid'}
        />
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
});