import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import { Layout } from '../src/components/Layout';
import { Navigation } from '../src/components/Navigation';

export default function HomeArtistScreen() {
  const [hasProfile, setHasProfile] = useState<boolean>(false);

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    if (!auth.currentUser) return;

    try {
      const profileDoc = await getDoc(doc(db, 'artistProfiles', auth.currentUser.uid));
      setHasProfile(profileDoc.exists());
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <Layout>
      <View style={styles.header}>
        <Ionicons name="person" size={32} color="#007AFF" />
        <Text style={styles.title}>{i18n.t('screens.homeArtist.title')}</Text>
      </View>
      
      <Text style={styles.subtitle}>{i18n.t('screens.homeArtist.welcome')}</Text>
      
      {!hasProfile && (
        <Button
          title={i18n.t('common.button.completeProfile')}
          onPress={() => router.push('/edit-artist-profile')}
        />
      )}
      
      <Button 
        title={i18n.t('common.button.signOut')} 
        onPress={handleSignOut} 
        variant="secondary" 
      />
      
      <Navigation />
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
});