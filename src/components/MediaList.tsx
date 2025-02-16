import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, storage } from '../services/firebase';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import i18n from '../i18n';
import type { Media } from '../types';

interface MediaListProps {
  medias: Media[];
  onUpdate: () => void;
  isPaidPlan: boolean;
}

export function MediaList({ medias, onUpdate, isPaidPlan }: MediaListProps) {
  const handleDelete = async (media: Media) => {
    try {
      // Delete from Storage
      const storageRef = ref(storage, media.url);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'media', media.id));

      // Update user's storage usage
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
    <View style={styles.container}>
      {medias.map((media) => (
        <View key={media.id} style={[styles.mediaItem, media.highlighted && styles.highlighted]}>
          <View style={styles.mediaHeader}>
            {renderMediaIcon(media.type)}
            <Text style={styles.mediaTitle}>{media.title}</Text>
            {media.highlighted && (
              <Ionicons name="star" size={20} color="#FFD700" style={styles.highlightIcon} />
            )}
          </View>

          {media.type === 'photo' && (
            <Image source={{ uri: media.url }} style={styles.mediaPreview} />
          )}

          <Text style={styles.mediaDescription}>{media.description}</Text>

          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              <Ionicons name="eye" size={16} /> {media.viewsCount}
            </Text>
            <Text style={styles.statsText}>
              <Ionicons name="heart" size={16} /> {media.likesCount}
            </Text>
            <Text style={styles.statsText}>
              <Ionicons name="star" size={16} /> {media.favoritesCount}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(media)}
            >
              <Ionicons name="heart-outline" size={24} color="#007AFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleFavorite(media)}
            >
              <Ionicons name="star-outline" size={24} color="#007AFF" />
            </TouchableOpacity>

            {isPaidPlan && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleHighlight(media)}
              >
                <Ionicons
                  name={media.highlighted ? "star" : "star-outline"}
                  size={24}
                  color="#FFD700"
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(media)}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  mediaItem: {
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
  highlighted: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  highlightIcon: {
    marginLeft: 10,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 4,
    marginBottom: 10,
  },
  mediaDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  actionButton: {
    padding: 5,
  },
});