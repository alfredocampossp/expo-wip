import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, storage } from '../services/firebase';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import i18n from '../i18n';
import type { Media } from '../types';
import { MediaPreview } from './MediaPreview';

interface MediaListProps {
  medias: Media[];
  onUpdate: () => void;
  isPaidPlan: boolean;
}

export function MediaList({ medias, onUpdate, isPaidPlan }: MediaListProps) {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  const handleDelete = async (media: Media) => {
    try {
      const storageRef = ref(storage, media.url);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'media', media.id));

      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          bucketUse: increment(-media.sizeMB)
        });
      }

      Alert.alert(i18n.t('common.success.mediaDeleted'));
      onUpdate();
    } catch (error) {
      console.error('Error deleting media:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleHighlight = async (media: Media) => {
    if (!isPaidPlan) {
      Alert.alert(i18n.t('common.error.storage.limit'));
      return;
    }

    try {
      await updateDoc(doc(db, 'media', media.id), {
        highlighted: !media.highlighted
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating media:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleLike = async (media: Media) => {
    try {
      await updateDoc(doc(db, 'media', media.id), {
        likesCount: increment(1)
      });
      onUpdate();
    } catch (error) {
      console.error('Error liking media:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleFavorite = async (media: Media) => {
    try {
      await updateDoc(doc(db, 'media', media.id), {
        favoritesCount: increment(1)
      });
      onUpdate();
    } catch (error) {
      console.error('Error favoriting media:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const renderMediaIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <Ionicons name="image" size={24} color="#007AFF" />;
      case 'video':
        return <Ionicons name="videocam" size={24} color="#007AFF" />;
      case 'audio':
        return <Ionicons name="musical-notes" size={24} color="#007AFF" />;
      default:
        return null;
    }
  };

  return (
    <>
      <View style={styles.grid}>
        {medias.map((media) => (
          <View 
            key={media.id} 
            style={[
              styles.mediaItem,
              media.highlighted && styles.highlighted
            ]}
          >
            <View style={styles.mediaHeader}>
              {renderMediaIcon(media.type)}
              <Text style={styles.mediaTitle} numberOfLines={1}>
                {media.title}
              </Text>
              {media.highlighted && (
                <Ionicons name="star" size={20} color="#FFD700" />
              )}
            </View>

            <TouchableOpacity
              style={styles.previewContainer}
              onPress={() => setSelectedMedia(media)}
            >
              {media.type === 'photo' ? (
                <Image 
                  source={{ uri: media.url }} 
                  style={styles.mediaPreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.playButton}>
                  <Ionicons 
                    name={media.type === 'video' ? "play-circle" : "play"} 
                    size={48} 
                    color="#007AFF" 
                  />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.mediaDescription} numberOfLines={2}>
              {media.description}
            </Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="eye" size={16} color="#666" />
                <Text style={styles.statText}>{media.viewsCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={16} color="#666" />
                <Text style={styles.statText}>{media.likesCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#666" />
                <Text style={styles.statText}>{media.favoritesCount}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(media)}
              >
                <Ionicons name="heart-outline" size={20} color="#007AFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleFavorite(media)}
              >
                <Ionicons name="star-outline" size={20} color="#007AFF" />
              </TouchableOpacity>

              {isPaidPlan && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleHighlight(media)}
                >
                  <Ionicons
                    name={media.highlighted ? "star" : "star-outline"}
                    size={20}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(media)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <MediaPreview
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
    width: '100%',
    ...Platform.select({
      web: {
        display: 'grid',
      },
      default: {
        flexDirection: 'row',
        flexWrap: 'wrap',
      },
    }),
  },
  mediaItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
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
  highlighted: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  mediaTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  previewContainer: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 40,
    padding: 8,
  },
  mediaDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  actionButton: {
    padding: 8,
  },
});