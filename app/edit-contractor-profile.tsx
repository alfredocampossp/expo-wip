import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth, db } from '../src/services/firebase';
import { Button } from '../src/components/Button';
import { Layout } from '../src/components/Layout';
import i18n from '../src/i18n';
import type { ContractorProfile, User } from '../src/types';

interface EventType {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export default function EditContractorProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEventTypesModal, setShowEventTypesModal] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);

  // Profile state
  const [profile, setProfile] = useState<Partial<ContractorProfile>>({
    mainAddress: '',
    venueCapacity: 0,
    description: '',
    eventTypes: [],
  });

  // User plan
  const [userPlan, setUserPlan] = useState<string>('free');

  useEffect(() => {
    loadProfile();
    loadEventTypes();
  }, []);

  const loadProfile = async () => {
    if (!auth.currentUser) return;

    try {
      const [profileDoc, userDoc] = await Promise.all([
        getDoc(doc(db, 'contractorProfiles', auth.currentUser.uid)),
        getDoc(doc(db, 'users', auth.currentUser.uid)),
      ]);

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUserPlan(userData.planId || 'free');
      }

      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as ContractorProfile;
        setProfile(profileData);
        setSelectedEventTypes(profileData.eventTypes || []);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', i18n.t('common.error.profile'));
    } finally {
      setLoading(false);
    }
  };

  const loadEventTypes = async () => {
    try {
      const eventTypesSnapshot = await getDocs(query(
        collection(db, 'eventTypes'),
        where('active', '==', true)
      ));

      const typesList = eventTypesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventType[];

      setEventTypes(typesList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    // Validate event types limit for free plan
    if (userPlan === 'free' && selectedEventTypes.length > 2) {
      Alert.alert('Error', 'Free plan allows maximum 2 event types');
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = {
        ...profile,
        eventTypes: selectedEventTypes,
        userId: auth.currentUser.uid,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'contractorProfiles', auth.currentUser.uid), updatedProfile);
      Alert.alert('Success', i18n.t('common.success.profileSaved'));
      router.back();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', i18n.t('common.error.profile'));
    } finally {
      setSaving(false);
    }
  };

  const toggleEventType = (typeId: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="business" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('profile.contractor.title')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Main Address */}
          <View style={styles.inputGroup}>
            <Ionicons style={styles.icon} name="location-outline" size={20} color="#666" />
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{i18n.t('profile.contractor.mainAddress')}</Text>
              <TextInput
                style={styles.input}
                value={profile.mainAddress}
                onChangeText={(text) => setProfile({ ...profile, mainAddress: text })}
                placeholder="Ex: Rua Example, 123 - São Paulo, SP"
              />
            </View>
          </View>

          {/* Venue Capacity */}
          <View style={styles.inputGroup}>
            <Ionicons style={styles.icon} name="people-outline" size={20} color="#666" />
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{i18n.t('profile.contractor.venueCapacity')}</Text>
              <TextInput
                style={styles.input}
                value={String(profile.venueCapacity || '')}
                onChangeText={(text) => setProfile({ ...profile, venueCapacity: Number(text) || 0 })}
                keyboardType="numeric"
                placeholder="Ex: 500"
              />
            </View>
          </View>

          {/* Event Types */}
          <View style={styles.inputGroup}>
            <Ionicons style={styles.icon} name="calendar-outline" size={20} color="#666" />
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>
                {i18n.t('profile.contractor.eventTypes')}
                {userPlan === 'free' && (
                  <Text style={styles.planLimit}> (máx. 2)</Text>
                )}
              </Text>
              <Button
                title={`Selecionar Tipos (${selectedEventTypes.length})`}
                onPress={() => setShowEventTypesModal(true)}
                icon={<Ionicons name="list-outline" size={20} color="#FFF" />}
              />
              {selectedEventTypes.length > 0 && (
                <Text style={styles.selectedTypes}>
                  {eventTypes
                    .filter(type => selectedEventTypes.includes(type.id))
                    .map(type => type.name)
                    .join(', ')}
                </Text>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Ionicons style={styles.icon} name="document-text-outline" size={20} color="#666" />
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{i18n.t('profile.contractor.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profile.description}
                onChangeText={(text) => setProfile({ ...profile, description: text })}
                multiline
                numberOfLines={4}
                placeholder="Descreva seu estabelecimento..."
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title={i18n.t('common.button.cancel')}
            onPress={() => router.back()}
            variant="secondary"
          />
          <Button
            title={i18n.t('common.button.save')}
            onPress={handleSave}
            disabled={saving}
          />
        </View>

        {saving && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}

        {/* Event Types Modal */}
        <Modal
          visible={showEventTypesModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEventTypesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="calendar" size={24} color="#007AFF" />
                <Text style={styles.modalTitle}>Tipos de Evento</Text>
              </View>

              <ScrollView style={styles.typesList}>
                {eventTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeItem,
                      selectedEventTypes.includes(type.id) && styles.typeItemSelected
                    ]}
                    onPress={() => toggleEventType(type.id)}
                  >
                    <View style={styles.typeHeader}>
                      <Text style={styles.typeName}>{type.name}</Text>
                      <Ionicons
                        name={selectedEventTypes.includes(type.id) ? "checkmark-circle" : "checkmark-circle-outline"}
                        size={24}
                        color={selectedEventTypes.includes(type.id) ? "#4CAF50" : "#ccc"}
                      />
                    </View>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalButtons}>
                <Button
                  title={i18n.t('common.button.confirm')}
                  onPress={() => setShowEventTypesModal(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  form: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  icon: {
    marginTop: 25,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  planLimit: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectedTypes: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonRow: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  savingContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  typesList: {
    marginBottom: 20,
  },
  typeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  typeItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  typeDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});