import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '../types';
import i18n from '../i18n';

interface MobileNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileNavigation({ isOpen, onToggle }: MobileNavigationProps) {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

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

  const handleNavigation = (route: string) => {
    router.push(route);
    onToggle();
  };

  if (!user) return null;

  // Menu items baseados no perfil
  const getMenuItems = () => {
    const baseItems = [
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
      {
        icon: 'card',
        label: i18n.t('navigation.plans'),
        route: '/plans',
      },
    ];

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
          icon: 'flash',
          label: 'Auto Oferta',
          route: '/auto-offer-settings',
        },
        ...baseItems,
      ];
    }

    if (user.role === 'contractor') {
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
          route: '/events',
        },
        {
          icon: 'search',
          label: i18n.t('navigation.searchArtists'),
          route: '/artists-advanced-search',
        },
        {
          icon: 'stats-chart',
          label: 'Dashboard',
          route: '/contractor-dashboard',
        },
        ...baseItems,
      ];
    }

    if (user.isAdmin) {
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

    return baseItems;
  };

  const menuItems = getMenuItems();

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onToggle} style={styles.menuButton}>
          <Ionicons name={isOpen ? "close" : "menu"} size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WIP</Text>
      </View>

      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.menuContent}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Ionicons 
                name={user.role === 'artist' ? 'person' : 'business'} 
                size={32} 
                color="#007AFF" 
              />
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userRole}>
              {user.role === 'artist' ? 'Artista' : user.role === 'contractor' ? 'Contratante' : 'Admin'}
            </Text>
          </View>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                pathname === item.route && styles.menuItemActive
              ]}
              onPress={() => handleNavigation(item.route)}
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

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color="#666" />
            <Text style={styles.signOutText}>{i18n.t('navigation.logout')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onToggle}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#fff',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuContent: {
    flex: 1,
    paddingTop: 20,
  },
  userInfo: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
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
    marginTop: 'auto',
  },
  signOutText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
});