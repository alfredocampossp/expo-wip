import React from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import type { Media } from '../types';

interface MediaPreviewProps {
  media: Media | null;
  onClose: () => void;
}

export function MediaPreview({ media, onClose }: MediaPreviewProps) {
  if (!media) return null;

  const renderContent = () => {
    if (Platform.OS === 'web') {
      switch (media.type) {
        case 'photo':
          return (
            <img 
              src={media.url} 
              style={styles.image as any} 
              alt={media.title}
            />
          );
        case 'video':
          return (
            <video 
              src={media.url} 
              style={styles.video as any} 
              controls 
              autoPlay
            />
          );
        case 'audio':
          return (
            <audio 
              src={media.url} 
              style={styles.audio as any} 
              controls 
              autoPlay
            />
          );
        default:
          return null;
      }
    } else {
      switch (media.type) {
        case 'photo':
          return (
            <Image
              source={{ uri: media.url }}
              style={styles.nativeImage}
              resizeMode="contain"
            />
          );
        case 'video':
          return (
            <Video
              source={{ uri: media.url }}
              style={styles.nativeVideo}
              useNativeControls
              shouldPlay
              resizeMode="contain"
              isLooping={false}
            />
          );
        case 'audio':
          return (
            <View style={styles.audioContainer}>
              <Video
                source={{ uri: media.url }}
                style={styles.nativeAudio}
                useNativeControls
                shouldPlay
                isLooping={false}
              />
            </View>
          );
        default:
          return null;
      }
    }
  };

  return (
    <Modal
      visible={!!media}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 800,
    maxHeight: '90%',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  // Web styles
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  audio: {
    width: '100%',
    padding: 20,
    backgroundColor: '#000',
  },
  // Native styles
  nativeImage: {
    width: '100%',
    height: 300,
  },
  nativeVideo: {
    width: '100%',
    height: 300,
  },
  audioContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeAudio: {
    width: '100%',
    height: 80,
  },
});