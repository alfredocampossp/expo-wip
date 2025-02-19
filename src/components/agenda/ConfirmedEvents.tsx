import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';
import type { Event, User } from '../../types';

interface ConfirmedEventsProps {
  user: User | null;
}

export function ConfirmedEvents({ user }: ConfirmedEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
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
        where('status', '==', 'APROVADA')
      ));

      const eventIds = candidaciesSnapshot.docs.map(doc => doc.data().eventId);
      const eventsData: Event[] = [];

      for (const eventId of eventIds) {
        const eventDoc = await getDocs(query(
          collection(db, 'events'),
          where('id', '==', eventId)
        ));

        if (!eventDoc.empty) {
          eventsData.push({
            id: eventDoc.docs[0].id,
            ...eventDoc.docs[0].data()
          } as Event);
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
        <Text>{i18n.t('agenda.noConfirmedEvents')}</Text>
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

          <View style={[styles.statusBadge, styles[`status${event.status}`]]}>
            <Text style={styles.statusText}>
              {i18n.t(`events.status.${event.status.toLowerCase()}`)}
            </Text>
          </View>
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusABERTO: {
    backgroundColor: '#E8F5E9',
  },
  statusENCERRADO: {
    backgroundColor: '#FFF3E0',
  },
  statusCANCELADO: {
    backgroundColor: '#FFEBEE',
  },
  statusCONCLUIDO: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});