import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { AvailabilityBlock, User } from '../src/types';

const MAX_FREE_BLOCKS = 10;

export default function ArtistAgendaScreen() {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadAgenda();
  }, []);

  const loadAgenda = async () => {
    if (!auth.currentUser) return;

    try {
      const [userDoc, blocksSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', auth.currentUser.uid)),
        getDocs(query(
          collection(db, 'artistAgenda'),
          where('artistId', '==', auth.currentUser.uid)
        ))
      ]);

      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }

      const blocksList = blocksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate(),
        endDate: doc.data().endDate.toDate(),
      })) as AvailabilityBlock[];

      setBlocks(blocksList.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()));
    } catch (error) {
      console.error('Error loading agenda:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    if (!auth.currentUser) return;

    if (user?.planId === 'free' && blocks.filter(b => b.status === 'FREE').length >= MAX_FREE_BLOCKS) {
      Alert.alert(i18n.t('agenda.error.maxBlocks'));
      return;
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        Alert.alert(i18n.t('agenda.error.invalidDates'));
        return;
      }

      if (end <= start) {
        Alert.alert(i18n.t('agenda.error.endBeforeStart'));
        return;
      }

      // Check for conflicts
      const conflicts = blocks.some(block => {
        return (start <= block.endDate && end >= block.startDate);
      });

      if (conflicts) {
        Alert.alert(i18n.t('agenda.error.dateConflict'));
        return;
      }

      await addDoc(collection(db, 'artistAgenda'), {
        artistId: auth.currentUser.uid,
        startDate: start,
        endDate: end,
        status: 'FREE',
        createdAt: new Date(),
      });

      setShowAddForm(false);
      setStartDate('');
      setEndDate('');
      loadAgenda();
    } catch (error) {
      console.error('Error adding block:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleDeleteBlock = async (block: AvailabilityBlock) => {
    if (block.status === 'BUSY') {
      Alert.alert(i18n.t('agenda.error.deleteBusy'));
      return;
    }

    try {
      await deleteDoc(doc(db, 'artistAgenda', block.id));
      loadAgenda();
    } catch (error) {
      console.error('Error deleting block:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="calendar" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('agenda.title')}</Text>
        </View>

        {user?.planId === 'free' && (
          <Text style={styles.limitText}>
            {i18n.t('agenda.blocksLimit', { current: blocks.filter(b => b.status === 'FREE').length, max: MAX_FREE_BLOCKS })}
          </Text>
        )}

        {!showAddForm ? (
          <Button
            title={i18n.t('agenda.addBlock')}
            onPress={() => setShowAddForm(true)}
          />
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>{i18n.t('agenda.startDate')}</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD HH:mm"
            />

            <Text style={styles.label}>{i18n.t('agenda.endDate')}</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD HH:mm"
            />

            <View style={styles.formButtons}>
              <Button
                title={i18n.t('common.button.save')}
                onPress={handleAddBlock}
              />
              <Button
                title={i18n.t('common.button.cancel')}
                onPress={() => setShowAddForm(false)}
                variant="secondary"
              />
            </View>
          </View>
        )}

        {blocks.map((block) => (
          <View key={block.id} style={styles.blockItem}>
            <View style={styles.blockHeader}>
              <View style={[styles.statusBadge, styles[`status${block.status}`]]}>
                <Text style={styles.statusText}>
                  {i18n.t(`agenda.status.${block.status.toLowerCase()}`)}
                </Text>
              </View>
              {block.status === 'FREE' && (
                <TouchableOpacity
                  onPress={() => handleDeleteBlock(block)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={24} color="#F44336" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.blockDetails}>
              <Text style={styles.dateText}>
                <Ionicons name="time-outline" size={16} />
                {' '}
                {block.startDate.toLocaleString()} - {block.endDate.toLocaleString()}
              </Text>
            </View>
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
  limitText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  formButtons: {
    gap: 10,
  },
  blockItem: {
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
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusFREE: {
    backgroundColor: '#4CAF50',
  },
  statusBUSY: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  blockDetails: {
    marginTop: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 5,
  },
});