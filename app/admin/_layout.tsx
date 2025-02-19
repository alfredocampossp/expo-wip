import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { auth, db } from '../../src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AdminGuard } from '../../src/components/AdminGuard';
import { Layout } from '../../src/components/Layout';
import i18n from '../../src/i18n';
import type { User } from '../../src/types';

export default function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setIsAdmin(userData.role === 'admin');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout hideNavigation>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
        </View>
      </Layout>
    );
  }

  return (
    <AdminGuard isAdmin={isAdmin}>
      <Layout>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="users" />
          <Stack.Screen name="styles" />
          <Stack.Screen name="event-types" />
          <Stack.Screen name="feedback-criteria" />
          <Stack.Screen name="plans" />
          <Stack.Screen name="notifications" />
        </Stack>
      </Layout>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
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
});