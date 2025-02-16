import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { User } from '../src/types';

export default function AutoPromoteSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser(userData);
        
        if (userData.autoPromote) {
          setEnabled(userData.autoPromote.enabled);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoPromote: {
          enabled,
          updatedAt: new Date(),
        },
      });

      Alert.alert(i18n.t('autoPromote.success.saved'));
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="megaphone" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('autoPromote.title')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>{i18n.t('autoPromote.enable')}</Text>
            <Button
              title={enabled ? i18n.t('common.button.enabled') : i18n.t('common.button.disabled')}
              onPress={() => setEnabled(!enabled)}
              variant={enabled ? 'primary' : 'secondary'}
            />
          </View>

          <Text style={styles.description}>
            {i18n.t('autoPromote.description')}
          </Text>

          {user?.planId === 'free' && (
            <Text style={styles.planWarning}>
              {i18n.t('autoPromote.freeWarning')}
            </Text>
          )}

          <Button
            title={i18n.t('common.button.save')}
            onPress={handleSave}
          />
        </View>
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
  form: {
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  planWarning: {
    fontSize: 14,
    color: '#FFA000',
    marginBottom: 20,
    fontStyle: 'italic',
  },
});