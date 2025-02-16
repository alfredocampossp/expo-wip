import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { MediaList } from '../src/components/MediaList';
import { MediaUpload } from '../src/components/MediaUpload';
import { StorageUsage } from '../src/components/StorageUsage';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { Media, User } from '../src/types';

export default function PortfolioArtistScreen() {
  const [medias, setMedias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    if (!auth.currentUser) return;

    try {
      const [userDoc, mediasSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('id', '==', auth.currentUser.uid))),
        getDocs(query(
          collection(db, 'media'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('highlighted', 'desc'),
          orderBy('createdAt', 'desc')
        ))
      ]);

      if (!userDoc.empty) {
        setUser(userDoc.docs[0].data() as User);
      }

      const mediaList = mediasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Media[];

      setMedias(mediaList);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{i18n.t('common.error.loading')}</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="images" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('portfolio.title')}</Text>
        </View>

        <StorageUsage user={user} />

        {showUpload ? (
          <MediaUpload
            onClose={() => setShowUpload(false)}
            onSuccess={() => {
              setShowUpload(false);
              loadPortfolio();
            }}
          />
        ) : (
          <Button
            title={i18n.t('common.button.upload')}
            onPress={() => setShowUpload(true)}
          />
        )}

        <MediaList
          medias={medias}
          onUpdate={loadPortfolio}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});