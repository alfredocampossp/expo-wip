import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import i18n from '../i18n';
import type { User } from '../types';

export function Navigation() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }
    } catch (error) {
      console.error('Error loading user in Navigation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!user) {
    // Usuário não logado ou ainda sem dados
    return null;
  }

  const isArtist = user.role === 'artist';
  const isContractor = user.role === 'contractor';
  const isAdmin = !!user.isAdmin;

  // Rotas básicas conforme o perfil
  const homeRoute = isArtist ? '/home-artist' : '/home-contractor';
  const profileRoute = isArtist ? '/edit-artist-profile' : '/edit-contractor-profile';
  const dashboardRoute = isArtist ? '/artist-dashboard' : '/contractor-dashboard';
  const portfolioRoute = isArtist ? '/portfolio-artist' : '/portfolio-contractor';
  const eventsOrAgendaRoute = isArtist ? '/artist-agenda' : '/events';
  const searchRoute = isArtist ? '/events-search-artist' : '/artists-advanced-search';

  return (
    <View style={styles.container}>
      {/* HOME */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation(homeRoute)}>
        <Ionicons name="home-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.home')}</Text>
      </TouchableOpacity>

      {/* DASHBOARD */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation(dashboardRoute)}>
        <Ionicons name="stats-chart" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.dashboard')}</Text>
      </TouchableOpacity>

      {/* PERFIL */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation(profileRoute)}>
        <Ionicons name="person-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.profile')}</Text>
      </TouchableOpacity>

      {/* PORTFÓLIO */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation(portfolioRoute)}>
        <Ionicons name="images-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.portfolio')}</Text>
      </TouchableOpacity>

      {/* EVENTS (CONTRATANTE) ou AGENDA (ARTISTA) */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation(eventsOrAgendaRoute)}>
        {isArtist ? (
          <>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.navText}>{i18n.t('navigation.myAgenda')}</Text>
          </>
        ) : (
          <>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.navText}>{i18n.t('navigation.myEvents')}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* SEARCH (EVENTOS / ARTISTAS) */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation(searchRoute)}>
        <Ionicons name="search-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>
          {isArtist ? i18n.t('navigation.searchEvents') : i18n.t('navigation.searchArtists')}
        </Text>
      </TouchableOpacity>

      {/* PLANS */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('/plans')}>
        <Ionicons name="card-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.plans')}</Text>
      </TouchableOpacity>

      {/* NOTIFICATIONS */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('/notifications')}>
        <Ionicons name="notifications-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.notifications')}</Text>
      </TouchableOpacity>

      {/* CHATS */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('/chats')}>
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.chats')}</Text>
      </TouchableOpacity>

      {/* ADMIN (opcional) */}
      {isAdmin && (
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('/admin')}>
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
          <Text style={styles.navText}>{i18n.t('navigation.admin')}</Text>
        </TouchableOpacity>
      )}

      {/* LOGOUT */}
      <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#007AFF" />
        <Text style={styles.navText}>{i18n.t('navigation.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    ...Platform.select({
      web: {
        maxWidth: 600,
        marginHorizontal: 'auto',
      },
    }),
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
    width: '25%', // Ajuste conforme desejado para exibição no Web/Mobile
  },
  navText: {
    marginTop: 5,
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
});
