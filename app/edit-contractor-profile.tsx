import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { ContractorProfile, User } from '../src/types';

export default function EditContractorProfileScreen() {
  const [profile, setProfile] = useState<Partial<ContractorProfile>>({
    mainAddress: '',
    venueCapacity: 0,
    description: '',
    eventTypes: [],
  });
  const [eventTypesInput, setEventTypesInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!auth.currentUser) return;

    try {
      const [profileDoc, userDoc] = await Promise.all([
        getDoc(doc(db, 'contractorProfiles', auth.currentUser.uid)),
        getDoc(doc(db, 'users', auth.currentUser.uid))
      ]);

      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as ContractorProfile;
        setProfile(profileData);
        setEventTypesInput(profileData.eventTypes.join(', '));
      }

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUserPlan(userData.planId);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', i18n.t('common.error.profile'));
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    if (profile.venueCapacity! < 1) {
      Alert.alert('Erro', 'A capacidade do local deve ser maior que zero');
      return false;
    }

    const eventTypes = eventTypesInput.split(',').map(t => t.trim()).filter(Boolean);
    if (userPlan === 'free' && eventTypes.length > 2) {
      Alert.alert('Erro', 'Plano gratuito permite apenas 2 tipos de evento');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!auth.currentUser || !validateProfile()) return;

    setSaving(true);
    try {
      const eventTypes = eventTypesInput.split(',').map(t => t.trim()).filter(Boolean);
      const updatedProfile = {
        ...profile,
        eventTypes,
        userId: auth.currentUser.uid,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'contractorProfiles', auth.currentUser.uid), updatedProfile);
      Alert.alert('Sucesso', i18n.t('common.success.profileSaved'));
      router.back();
    } catch (error) {
      Alert.alert('Erro', i18n.t('common.error.profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ionicons name="business" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('profile.contractor.title')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('profile.contractor.mainAddress')}</Text>
          <TextInput
            style={styles.input}
            value={profile.mainAddress}
            onChangeText={(value) => setProfile({ ...profile, mainAddress: value })}
          />

          <Text style={styles.label}>{i18n.t('profile.contractor.venueCapacity')}</Text>
          <TextInput
            style={styles.input}
            value={profile.venueCapacity?.toString()}
            onChangeText={(value) => setProfile({ ...profile, venueCapacity: Number(value) || 0 })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>
            {i18n.t('profile.contractor.eventTypes')}
            {userPlan === 'free' && (
              <Text style={styles.planLimit}> (máx. 2)</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            value={eventTypesInput}
            onChangeText={setEventTypesInput}
            placeholder="Casamento, Formatura"
          />

          <Text style={styles.label}>{i18n.t('profile.contractor.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.description}
            onChangeText={(value) => setProfile({ ...profile, description: value })}
            multiline
            numberOfLines={4}
          />
        </View>

        <Button 
          title={i18n.t('common.button.save')} 
          onPress={handleSave}
          disabled={saving}
        />
        
        {saving && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  planLimit: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  savingContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
});