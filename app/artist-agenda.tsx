import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Layout } from '../src/components/Layout';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { AgendaCalendar } from '../src/components/agenda/AgendaCalendar';
import { ConfirmedEvents } from '../src/components/agenda/ConfirmedEvents';
import { PendingEvents } from '../src/components/agenda/PendingEvents';
import { auth, db } from '../src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { User } from '../src/types';

const Tab = createMaterialTopTabNavigator();

export default function ArtistAgendaScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="calendar" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('agenda.title')}</Text>
        </View>

        <NavigationContainer independent={true}>
          <Tab.Navigator
            screenOptions={{
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
              tabBarIndicatorStyle: styles.tabIndicator,
              tabBarActiveTintColor: '#007AFF',
              tabBarInactiveTintColor: '#666',
            }}
          >
            <Tab.Screen
              name="calendar"
              options={{ title: i18n.t('agenda.tabs.calendar') }}
            >
              {() => <AgendaCalendar user={user} />}
            </Tab.Screen>

            <Tab.Screen
              name="confirmed"
              options={{ title: i18n.t('agenda.tabs.confirmed') }}
            >
              {() => <ConfirmedEvents user={user} />}
            </Tab.Screen>

            <Tab.Screen
              name="pending"
              options={{ title: i18n.t('agenda.tabs.pending') }}
            >
              {() => <PendingEvents user={user} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  tabBar: {
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'none',
  },
  tabIndicator: {
    backgroundColor: '#007AFF',
    height: 3,
  },
});