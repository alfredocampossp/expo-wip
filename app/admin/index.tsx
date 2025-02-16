import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';

interface AdminMenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
}

const MENU_ITEMS: AdminMenuItem[] = [
  {
    id: 'styles',
    title: 'admin.menu.styles',
    icon: 'musical-notes',
    route: '/admin/styles',
  },
  {
    id: 'event-types',
    title: 'admin.menu.eventTypes',
    icon: 'calendar',
    route: '/admin/event-types',
  },
  {
    id: 'feedback-criteria',
    title: 'admin.menu.feedbackCriteria',
    icon: 'star',
    route: '/admin/feedback-criteria',
  },
  {
    id: 'plans',
    title: 'admin.menu.plans',
    icon: 'card',
    route: '/admin/plans',
  },
  {
    id: 'notifications',
    title: 'admin.menu.notifications',
    icon: 'notifications',
    route: '/admin/notifications',
  },
  {
    id: 'users',
    title: 'admin.menu.users',
    icon: 'people',
    route: '/admin/users',
  },
];

export default function AdminScreen() {
  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="settings" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('admin.title')}</Text>
        </View>

        <View style={styles.menuGrid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route)}
            >
              <Ionicons name={item.icon as any} size={32} color="#007AFF" />
              <Text style={styles.menuTitle}>{i18n.t(item.title)}</Text>
            </TouchableOpacity>
          ))}
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
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
    color: '#333',
  },
});