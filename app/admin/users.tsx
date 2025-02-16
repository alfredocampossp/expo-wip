import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import { UserRating } from '../../src/components/UserRating';
import type { User } from '../../src/types';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'artist' | 'contractor'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'email' | 'rating' | 'createdAt'>('createdAt');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      ));

      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as User[];

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        isAdmin: !user.isAdmin,
        updatedAt: new Date(),
      });

      Alert.alert(
        user.isAdmin
          ? i18n.t('admin.users.success.adminRemoved')
          : i18n.t('admin.users.success.adminAdded')
      );
      loadUsers();
    } catch (error) {
      console.error('Error toggling admin status:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        active: !user.active,
        updatedAt: new Date(),
      });

      Alert.alert(
        user.active
          ? i18n.t('admin.users.success.deactivated')
          : i18n.t('admin.users.success.activated')
      );
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleResetCredits = async (user: User) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        credits: user.planId === 'free' ? 10 : -1,
        updatedAt: new Date(),
      });

      Alert.alert(i18n.t('admin.users.success.creditsReset'));
      loadUsers();
    } catch (error) {
      console.error('Error resetting credits:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesPlan = filterPlan === 'all' || user.planId === filterPlan;
      return matchesSearch && matchesRole && matchesPlan;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'email':
          return a.email.localeCompare(b.email);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'createdAt':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="people" size={32} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('admin.users.title')}</Text>
          </View>
        </View>

        <View style={styles.filters}>
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder={i18n.t('admin.users.search')}
          />

          <View style={styles.filterButtons}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>{i18n.t('admin.users.filterRole')}</Text>
              <View style={styles.buttonGroup}>
                <Button
                  title={i18n.t('admin.users.roles.all')}
                  onPress={() => setFilterRole('all')}
                  variant={filterRole === 'all' ? 'primary' : 'secondary'}
                />
                <Button
                  title={i18n.t('admin.users.roles.artist')}
                  onPress={() => setFilterRole('artist')}
                  variant={filterRole === 'artist' ? 'primary' : 'secondary'}
                />
                <Button
                  title={i18n.t('admin.users.roles.contractor')}
                  onPress={() => setFilterRole('contractor')}
                  variant={filterRole === 'contractor' ? 'primary' : 'secondary'}
                />
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>{i18n.t('admin.users.filterPlan')}</Text>
              <View style={styles.buttonGroup}>
                <Button
                  title={i18n.t('admin.users.plans.all')}
                  onPress={() => setFilterPlan('all')}
                  variant={filterPlan === 'all' ? 'primary' : 'secondary'}
                />
                <Button
                  title={i18n.t('admin.users.plans.free')}
                  onPress={() => setFilterPlan('free')}
                  variant={filterPlan === 'free' ? 'primary' : 'secondary'}
                />
                <Button
                  title={i18n.t('admin.users.plans.paid')}
                  onPress={() => setFilterPlan('paid')}
                  variant={filterPlan === 'paid' ? 'primary' : 'secondary'}
                />
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>{i18n.t('admin.users.sortBy')}</Text>
              <View style={styles.buttonGroup}>
                <Button
                  title={i18n.t('admin.users.sort.email')}
                  onPress={() => setSortBy('email')}
                  variant={sortBy === 'email' ? 'primary' : 'secondary'}
                />
                <Button
                  title={i18n.t('admin.users.sort.rating')}
                  onPress={() => setSortBy('rating')}
                  variant={sortBy === 'rating' ? 'primary' : 'secondary'}
                />
                <Button
                  title={i18n.t('admin.users.sort.date')}
                  onPress={() => setSortBy('createdAt')}
                  variant={sortBy === 'createdAt' ? 'primary' : 'secondary'}
                />
              </View>
            </View>
          </View>
        </View>

        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userItem}>
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, styles.roleBadge]}>
                    <Text style={styles.badgeText}>
                      {i18n.t(`admin.users.roles.${user.role}`)}
                    </Text>
                  </View>
                  <View style={[styles.badge, styles.planBadge]}>
                    <Text style={styles.badgeText}>
                      {i18n.t(`admin.users.plans.${user.planId}`)}
                    </Text>
                  </View>
                  {user.isAdmin && (
                    <View style={[styles.badge, styles.adminBadge]}>
                      <Text style={styles.badgeText}>
                        {i18n.t('admin.users.badges.admin')}
                      </Text>
                    </View>
                  )}
                  {!user.active && (
                    <View style={[styles.badge, styles.inactiveBadge]}>
                      <Text style={styles.badgeText}>
                        {i18n.t('admin.users.badges.inactive')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {user.rating !== undefined && (
                <UserRating rating={user.rating} reviewCount={user.reviewCount || 0} />
              )}
            </View>

            <View style={styles.userDetails}>
              <Text style={styles.detailText}>
                {i18n.t('admin.users.credits')}: {user.credits || 0}
              </Text>
              <Text style={styles.detailText}>
                {i18n.t('admin.users.storage')}: {user.bucketUse || 0}MB
              </Text>
              <Text style={styles.detailText}>
                {i18n.t('admin.users.joined')}: {user.createdAt.toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleToggleAdmin(user)}
              >
                <Ionicons
                  name={user.isAdmin ? "shield-off" : "shield"}
                  size={24}
                  color="#007AFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleToggleActive(user)}
              >
                <Ionicons
                  name={user.active ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color={user.active ? "#F44336" : "#4CAF50"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleResetCredits(user)}
              >
                <Ionicons name="refresh" size={24} color="#FF9800" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  filters: {
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  filterButtons: {
    gap: 15,
  },
  filterGroup: {
    gap: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadge: {
    backgroundColor: '#E3F2FD',
  },
  planBadge: {
    backgroundColor: '#E8F5E9',
  },
  adminBadge: {
    backgroundColor: '#FFF3E0',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  userDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
});