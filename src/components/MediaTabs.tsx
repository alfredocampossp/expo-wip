import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Media } from '../types';

interface MediaTabsProps {
  activeTab: 'photos' | 'videos' | 'audio';
  onTabChange: (tab: 'photos' | 'videos' | 'audio') => void;
  medias: Media[];
}

export function MediaTabs({ activeTab, onTabChange, medias }: MediaTabsProps) {
  const photosCount = medias.filter(m => m.type === 'photo').length;
  const videosCount = medias.filter(m => m.type === 'video').length;
  const audioCount = medias.filter(m => m.type === 'audio').length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
        onPress={() => onTabChange('photos')}
      >
        <Ionicons 
          name={activeTab === 'photos' ? "images" : "images-outline"} 
          size={24} 
          color={activeTab === 'photos' ? "#007AFF" : "#666"}
        />
        <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
          Fotos ({photosCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
        onPress={() => onTabChange('videos')}
      >
        <Ionicons 
          name={activeTab === 'videos' ? "videocam" : "videocam-outline"} 
          size={24} 
          color={activeTab === 'videos' ? "#007AFF" : "#666"}
        />
        <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
          Vídeos ({videosCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'audio' && styles.activeTab]}
        onPress={() => onTabChange('audio')}
      >
        <Ionicons 
          name={activeTab === 'audio' ? "musical-notes" : "musical-notes-outline"} 
          size={24} 
          color={activeTab === 'audio' ? "#007AFF" : "#666"}
        />
        <Text style={[styles.tabText, activeTab === 'audio' && styles.activeTabText]}>
          Áudio ({audioCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
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
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F0F7FF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
});