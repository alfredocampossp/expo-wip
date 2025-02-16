import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import i18n from '../i18n';
import type { User } from '../types';

interface StorageUsageProps {
  user: User | null;
}

export function StorageUsage({ user }: StorageUsageProps) {
  if (!user) return null;

  const storageLimit = user.planId === 'paid' ? 2048 : 100;
  const usedStorage = user.bucketUse || 0;
  const freeStorage = storageLimit - usedStorage;
  const usagePercentage = (usedStorage / storageLimit) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>{i18n.t('portfolio.storage.used')}</Text>
        <Text style={styles.value}>{usedStorage.toFixed(1)} MB</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${usagePercentage}%` }]} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{i18n.t('portfolio.storage.total')}</Text>
        <Text style={styles.value}>{storageLimit} MB</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>{i18n.t('portfolio.storage.free')}</Text>
        <Text style={styles.value}>{freeStorage.toFixed(1)} MB</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
});