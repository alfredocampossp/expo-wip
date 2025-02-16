import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../../src/components/Layout';
import { auth, db } from '../../../src/services/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../../src/i18n';
import type { Candidacy, Event, User, AvailabilityBlock } from '../../../src/types';

export default function EventCandidaciesScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const [candidacies, setCandidacies] = useState<(Candidacy & { artist: User })[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCandidacies();
  }, [eventId]);

  const loadCandidacies = async () => {
    if (!auth.currentUser || !eventId) return;

    try {
      // Load event details
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEvent(eventDoc.data() as Event);
      }

      // Load candidacies
      const candidaciesSnapshot = await getDocs(query(
        collection(db, 'candidacies'),
        where('eventId', '==', eventId)
      ));

      const candidaciesWithArtists = await Promise.all(
        candidaciesSnapshot.docs.map(async (doc) => {
          const candidacy = { id: doc.id, ...doc.data() } as Candidacy;
          const artistDoc = await getDoc(doc(db, 'users', candidacy.artistId));
          return {
            ...candidacy,
            artist: artistDoc.data() as User,
          };
        })
      );

      setCandidacies(candidaciesWithArtists);
    } catch (error) {
      console.error('Error loading candidacies:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (candidacy: Candidacy, newStatus: 'APROVADA' | 'REJEITADA') => {
    try {
      await updateDoc(doc(db, 'candidacies', candidacy.id), {
        status: newStatus
      });

      if (newStatus === 'APROVADA') {
        // Create BUSY block in artist's agenda
        if (event) {
          await addDoc(collection(db, 'artistAgenda'), {
            artistId: candidacy.artistId,
            startDate: event.startDate,
            endDate: event.endDate,
            status: 'BUSY',
            eventId: event.id,
            createdAt: new Date(),
          });
        }

        if (event?.eventType === 'SHOW') {
          await updateDoc(doc(db, 'events', eventId), {
            status: 'ENCERRADO'
          });
        }
      }

      Alert.alert(
        i18n.t('events.success.statusUpdated'),
        newStatus === 'APROVADA' 
          ? i18n.t('events.success.approved')
          : i18n.t('events.success.rejected')
      );

      loadCandidacies();
    } catch (error) {
      console.error('Error updating candidacy:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="people" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('events.candidacies.title')}</Text>
        </View>

        {candidacies.map((candidacy) => (
          <View key={candidacy.id} style={styles.candidacyItem}>
            <View style={styles.candidacyHeader}>
              <Text style={styles.artistName}>{candidacy.artist.email}</Text>
              <View style={[styles.statusBadge, styles[`status${candidacy.status}`]]}>
                <Text style={styles.statusText}>
                  {i18n.t(`events.candidacies.status.${candidacy.status.toLowerCase()}`)}
                </Text>
              </View>
            </View>

            {candidacy.status === 'PENDENTE' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleUpdateStatus(candidacy, 'APROVADA')}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={[styles.actionText, styles.approveText]}>
                    {i18n.t('events.candidacies.approve')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleUpdateStatus(candidacy, 'REJEITADA')}
                >
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                  <Text style={[styles.actionText, styles.rejectText]}>
                    {i18n.t('events.candidacies.reject')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  candidacyItem: {
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
  candidacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  artistName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPENDENTE: {
    backgroundColor: '#FFC107',
  },
  statusAPROVADA: {
    backgroundColor: '#4CAF50',
  },
  statusREJEITADA: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#E8F5E9',
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  approveText: {
    color: '#4CAF50',
  },
  rejectText: {
    color: '#F44336',
  },
});