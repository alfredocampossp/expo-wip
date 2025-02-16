import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { auth, db } from '../../src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AdminGuard } from '../../src/components/AdminGuard';

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
      setIsAdmin(userDoc.exists() && userDoc.data()?.isAdmin === true);
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <AdminGuard isAdmin={isAdmin}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'Admin Panel',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="styles"
          options={{
            title: 'Musical Styles',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="event-types"
          options={{
            title: 'Event Types',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="feedback-criteria"
          options={{
            title: 'Feedback Criteria',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="plans"
          options={{
            title: 'Plans',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="users"
          options={{
            title: 'Users',
            headerShown: false,
          }}
        />
      </Stack>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});