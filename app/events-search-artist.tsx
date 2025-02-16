import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { Event, User, ArtistProfile, AvailabilityBlock } from '../src/types';

export default function EventsSearchArtistScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!auth.currentUser) return;

    try {
      const [userDoc, profileDoc, eventsSnapshot, blocksSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', auth.currentUser.uid)),
        getDoc(doc(db, 'artistProfiles', auth.currentUser.uid)),
        getDocs(query(
          collection(db, 'events'),
          where('status', '==', 'ABERTO')
        )),
        getDocs(query(
          collection(db, 'artistAgenda'),
          where('artistId', '==', auth.currentUser.uid)
        ))
      ]);

      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }

      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as ArtistProfile);
      }

      let eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];

      // Filter events by artist's genres if profile exists
      if (profile?.genres.length) {
        eventsList = eventsList.filter(event =>
          event.styles.some(style => profile.genres.includes(style))
        );
      }

      const blocks = blocksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate(),
        endDate: doc.data().endDate.toDate(),
      })) as AvailabilityBlock[];

      setAvailabilityBlocks(blocks);
      setEvents(eventsList);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (event: Event) => {
    if (!auth.currentUser) return;

    if (user?.planId === 'free' && (user?.credits || 0) < 1) {
      Alert.alert(i18n.t('events.error.noCredits'));
      return;
    }

    try {
      // Check if already applied
      const existingCandidacy = await getDocs(query(
        collection(db, 'candidacies'),
        where('artistId', '==', auth.currentUser.uid),
        where('eventId', '==', event.id)
      ));

      if (!existingCandidacy.empty) {
        Alert.alert(i18n.t('events.error.alreadyApplied'));
        return;
      }

      // Create candidacy
      await addDoc(collection(db, 'candidacies'), {
        artistId: auth.currentUser.uid,
        eventId: event.id,
        status: 'PENDENTE',
        createdAt: new Date(),
      });

      // Deduct credit if free plan
      if (user?.planId === 'free') {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          credits: increment(-1)
        });
      }

      Alert.alert(i18n.t('events.success.applied'));
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error applying to event:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const checkAvailability = (event: Event) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    const conflicts = availabilityBlocks.some(block => {
      return (
        block.status === 'BUSY' &&
        eventStart <= block.endDate &&
        eventEnd >= block.startDate
      );
    });

    return !conflicts;
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="search" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('events.search.title')}</Text>
        </View>

        {events.map((event) => (
          <View key={event.id} style={styles.eventItem}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventType}>{event.eventType}</Text>
            </View>

            <View style={styles.eventDetails}>
              <Text style={styles.detailText}>
                <Ionicons name="calendar" size={16} /> {new Date(event.startDate).toLocaleDateString()}
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="location" size={16} /> {event.location}
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="musical-notes" size={16} /> {event.styles.join(', ')}
              </Text>
              <Text style={styles.cacheText}>
                {i18n.t('events.cache')}: {event.minCache}
                {event.maxCache > event.minCache && ` - ${event.maxCache}`}
              </Text>
            </View>

            <View style={styles.availabilityInfo}>
              <Ionicons
                name={checkAvailability(event) ? "checkmark-circle" : "close-circle"}
                size={20}
                color={checkAvailability(event) ? "#4CAF50" : "#F44336"}
              />
              <Text style={[
                styles.availabilityText,
                { color: checkAvailability(event) ? "#4CAF50" : "#F44336" }
              ]}>
                {i18n.t(checkAvailability(event) ? 'agenda.available' : 'agenda.unavailable')}
              </Text>
            </View>
            <Button
              title={i18n.t('events.apply')}
              onPress={() => handleApply(event)}
              disabled={!checkAvailability(event)}
            />
          </View>
        ))}
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
  eventItem: {
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
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cacheText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  availabilityText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
});