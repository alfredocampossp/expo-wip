import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '../types';
import i18n from '../i18n';

export function WebNavigation() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

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
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  // Definir itens do menu baseado no role do usuário
  const menuItems = (() => {
    // Menu do Admin
    if (user.role === 'admin') {
      return [
        {
          icon: 'stats-chart',
          label: i18n.t('admin.menu.dashboard'),
          route: '/admin/dashboard',
        },
        {
          icon: 'musical-notes',
          label: i18n.t('admin.menu.styles'),
          route: '/admin/styles',
        },
        {
          icon: 'calendar',
          label: i18n.t('admin.menu.eventTypes'),
          route: '/admin/event-types',
        },
        {
          icon: 'star',
          label: i18n.t('admin.menu.feedbackCriteria'),
          route: '/admin/feedback-criteria',
        },
        {
          icon: 'card',
          label: i18n.t('admin.menu.plans'),
          route: '/admin/plans',
        },
        {
          icon: 'notifications',
          label: i18n.t('admin.menu.notifications'),
          route: '/admin/notifications',
        },
        {
          icon: 'people',
          label: i18n.t('admin.menu.users'),
          route: '/admin/users',
        },
      ];
    }

    // Menu do Artista
    if (user.role === 'artist') {
      return [
        {
          icon: 'home',
          label: i18n.t('navigation.home'),
          route: '/home-artist',
        },
        {
          icon: 'person',
          label: i18n.t('navigation.profile'),
          route: '/edit-artist-profile',
        },
        {
          icon: 'images',
          label: i18n.t('navigation.portfolio'),
          route: '/portfolio-artist',
        },
        {
          icon: 'calendar',
          label: i18n.t('navigation.myAgenda'),
          route: '/artist-agenda',
        },
        {
          icon: 'search',
          label: i18n.t('navigation.searchEvents'),
          route: '/events-search-artist',
        },
        {
          icon: 'star',
          label: i18n.t('reviews.pending.title'),
          route: '/reviews-pending',
        },
        {
          icon: 'card',
          label: i18n.t('navigation.plans'),
          route: '/plans',
        },
        {
          icon: 'notifications',
          label: i18n.t('navigation.notifications'),
          route: '/notifications',
        },
        {
          icon: 'chatbubbles',
          label: i18n.t('navigation.chats'),
          route: '/chats',
        },
      ];
    }

    // Menu do Contratante
    return [
      {
        icon: 'home',
        label: i18n.t('navigation.home'),
        route: '/home-contractor',
      },
      {
        icon: 'person',
        label: i18n.t('navigation.profile'),
        route: '/edit-contractor-profile',
      },
      {
        icon: 'images',
        label: i18n.t('navigation.portfolio'),
        route: '/portfolio-contractor',
      },
      {
        icon: 'calendar',
        label: i18n.t('navigation.myEvents'),
        route: './contractor/my-events',
      },
      {
        icon: 'search',
        label: i18n.t('navigation.searchArtists'),
        route: '/artists-advanced-search',
      },
      {
        icon: 'stats-chart',
        label: i18n.t('navigation.dashboard'),
        route: '/contractor-dashboard',
      },
      {
        icon: 'star',
        label: i18n.t('reviews.pending.title'),
        route: '/reviews-pending',
      },
      {
        icon: 'card',
        label: i18n.t('navigation.plans'),
        route: '/plans',
      },
      {
        icon: 'notifications',
        label: i18n.t('navigation.notifications'),
        route: '/notifications',
      },
      {
        icon: 'chatbubbles',
        label: i18n.t('navigation.chats'),
        route: '/chats',
      },
    ];
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name={user.role === 'admin' ? 'settings' : user.role === 'artist' ? 'musical-notes' : 'business'} 
          size={32} 
          color="#007AFF" 
        />
        <Text style={styles.appName}>
          {user.role === 'admin' 
            ? i18n.t('admin.title')
            : user.role === 'artist'
              ? i18n.t('navigation.artist')
              : i18n.t('navigation.contractor')}
        </Text>
      </View>

      <ScrollView style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              pathname === item.route && styles.menuItemActive
            ]}
            onPress={() => router.push(item.route)}
          >
            <Ionicons
              name={`${item.icon}${pathname === item.route ? '' : '-outline'}`}
              size={24}
              color={pathname === item.route ? '#007AFF' : '#666'}
            />
            <Text style={[
              styles.menuText,
              pathname === item.route && styles.menuTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={24} color="#666" />
        <Text style={styles.signOutText}>{i18n.t('navigation.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    height: '100%',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  menu: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: '#f0f7ff',
  },
  menuText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  menuTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  signOutText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
});