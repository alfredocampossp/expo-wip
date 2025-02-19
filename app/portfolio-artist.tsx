import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { MediaList } from '../src/components/MediaList';
import { MediaUpload } from '../src/components/MediaUpload';
import { MediaTabs } from '../src/components/MediaTabs';
import { StorageUsage } from '../src/components/StorageUsage';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { Media, User } from '../src/types';

type MediaTab = 'photos' | 'videos' | 'audio';

export default function PortfolioArtistScreen() {
  const [medias, setMedias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<MediaTab>('photos');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    if (!auth.currentUser) return;

    try {
      const [userDoc, mediasSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', auth.currentUser.uid)),
        getDocs(query(
          collection(db, 'media'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('highlighted', 'desc'),
          orderBy('createdAt', 'desc')
        ))
      ]);

      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
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

  const filteredMedias = medias.filter(media => {
    switch (activeTab) {
      case 'photos':
        return media.type === 'photo';
      case 'videos':
        return media.type === 'video';
      case 'audio':
        return media.type === 'audio';
      default:
        return false;
    }
  });

  if (loading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="images" size={32} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('portfolio.title')}</Text>
          </View>

          {/* Storage Usage Card */}
          <View style={styles.card}>
            <StorageUsage user={user} />
          </View>

          {/* Upload Section */}
          <View style={styles.uploadSection}>
            {showUpload ? (
              <View style={styles.card}>
                <MediaUpload
                  onClose={() => setShowUpload(false)}
                  onSuccess={() => {
                    setShowUpload(false);
                    loadPortfolio();
                  }}
                  onProgress={setUploadProgress}
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                    <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
                  </View>
                )}
              </View>
            ) : (
              <Button
                title={i18n.t('common.button.upload')}
                onPress={() => setShowUpload(true)}
                icon={<Ionicons name="cloud-upload-outline" size={20} color="#FFF" />}
              />
            )}
          </View>

          {/* Media Tabs */}
          <MediaTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            medias={medias}
          />

          {/* Media Grid */}
          <View style={styles.mediaGrid}>
            <MediaList
              medias={filteredMedias}
              onUpdate={loadPortfolio}
              isPaidPlan={user?.planId === 'paid'}
            />
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  uploadSection: {
    marginBottom: 24,
  },
  mediaGrid: {
    flex: 1,
  },
  progressContainer: {
    marginTop: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    height: 20,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#fff',
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '600',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
});