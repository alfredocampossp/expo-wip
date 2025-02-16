import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { ArtistProfile, User } from '../src/types';

export default function EditArtistProfileScreen() {
  const [profile, setProfile] = useState<Partial<ArtistProfile>>({
    minimumCache: 0,
    maximumCache: 0,
    mainCity: '',
    coverageRadius: 0,
    genres: [],
    description: '',
  });
  const [genresInput, setGenresInput] = useState('');
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
        getDoc(doc(db, 'artistProfiles', auth.currentUser.uid)),
        getDoc(doc(db, 'users', auth.currentUser.uid))
      ]);

      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as ArtistProfile;
        setProfile(profileData);
        setGenresInput(profileData.genres.join(', '));
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
    if (profile.minimumCache! > profile.maximumCache!) {
      Alert.alert('Erro', 'O cachê mínimo não pode ser maior que o máximo');
      return false;
    }

    if (profile.coverageRadius! < 0) {
      setProfile(prev => ({ ...prev, coverageRadius: 0 }));
    }

    const genres = genresInput.split(',').map(g => g.trim()).filter(Boolean);
    if (userPlan === 'free' && genres.length > 3) {
      Alert.alert('Erro', 'Plano gratuito permite apenas 3 gêneros musicais');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!auth.currentUser || !validateProfile()) return;

    setSaving(true);
    try {
      const genres = genresInput.split(',').map(g => g.trim()).filter(Boolean);
      const updatedProfile = {
        ...profile,
        genres,
        coverageRadius: userPlan === 'free' ? 0 : profile.coverageRadius,
        userId: auth.currentUser.uid,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'artistProfiles', auth.currentUser.uid), updatedProfile);
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
          <Ionicons name="person" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('profile.artist.title')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('profile.artist.minimumCache')}</Text>
          <TextInput
            style={styles.input}
            value={profile.minimumCache?.toString()}
            onChangeText={(value) => setProfile({ ...profile, minimumCache: Number(value) || 0 })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{i18n.t('profile.artist.maximumCache')}</Text>
          <TextInput
            style={styles.input}
            value={profile.maximumCache?.toString()}
            onChangeText={(value) => setProfile({ ...profile, maximumCache: Number(value) || 0 })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>{i18n.t('profile.artist.mainCity')}</Text>
          <TextInput
            style={styles.input}
            value={profile.mainCity}
            onChangeText={(value) => setProfile({ ...profile, mainCity: value })}
          />

          {userPlan !== 'free' && (
            <>
              <Text style={styles.label}>{i18n.t('profile.artist.coverageRadius')}</Text>
              <TextInput
                style={styles.input}
                value={profile.coverageRadius?.toString()}
                onChangeText={(value) => setProfile({ ...profile, coverageRadius: Number(value) || 0 })}
                keyboardType="numeric"
              />
            </>
          )}

          <Text style={styles.label}>
            {i18n.t('profile.artist.genres')}
            {userPlan === 'free' && (
              <Text style={styles.planLimit}> (máx. 3)</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            value={genresInput}
            onChangeText={setGenresInput}
            placeholder="Rock, Pop, Jazz"
          />

          <Text style={styles.label}>{i18n.t('profile.artist.description')}</Text>
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