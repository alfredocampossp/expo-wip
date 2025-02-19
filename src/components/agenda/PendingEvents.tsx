import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';
import type { Event, User, Candidacy } from '../../types';

interface PendingEventsProps {
  user: User | null;
}

interface PendingEvent extends Event {
  candidacyId: string;
}

export function PendingEvents({ user }: PendingEventsProps) {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    if (!auth.currentUser) return;

    try {
      const candidaciesSnapshot = await getDocs(query(
        collection(db, 'candidacies'),
        where('artistId', '==', auth.currentUser.uid),
        where('status', '==', 'PENDENTE')
      ));

      const eventsData: PendingEvent[] = [];

      for (const candidacyDoc of candidaciesSnapshot.docs) {
        const candidacy = candidacyDoc.data() as Candidacy;
        const eventDoc = await getDocs(query(
          collection(db, 'events'),
          where('id', '==', candidacy.eventId)
        ));

        if (!eventDoc.empty) {
          eventsData.push({
            id: eventDoc.docs[0].id,
            ...eventDoc.docs[0].data(),
            candidacyId: candidacyDoc.id,
          } as PendingEvent);
        }
      }

      setEvents(eventsData.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      ));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCandidacy = async (event: PendingEvent) => {
    try {
      await updateDoc(doc(db, 'candidacies', event.candidacyId), {
        status: 'CANCELADA',
        updatedAt: new Date(),
      });

      Alert.alert(i18n.t('agenda.success.candidacyCanceled'));
      loadEvents();
    } catch (error) {
      console.error('Error canceling candidacy:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text>{i18n.t('common.loading')}</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text>{i18n.t('agenda.noPendingEvents')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {events.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                {format(new Date(event.startDate), 'dd/MM/yyyy HH:mm')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="musical-notes-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{event.styles.join(', ')}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                R$ {event.minCache}
                {event.maxCache > event.minCache && ` - R$ ${event.maxCache}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelCandidacy(event)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#F44336" />
            <Text style={styles.cancelText}>{i18n.t('agenda.cancelCandidacy')}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  eventDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  cancelText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
});