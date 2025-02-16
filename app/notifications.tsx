import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Layout } from '../src/components/Layout';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { Notification, User } from '../src/types';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<(Notification & { sender: User })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    if (!auth.currentUser) return;

    try {
      const notificationsSnapshot = await getDocs(query(
        collection(db, 'notifications'),
        where('receiverId', '==', auth.currentUser.uid),
        where('seen', '==', false),
        orderBy('createdAt', 'desc')
      ));

      const notificationsWithUsers = await Promise.all(
        notificationsSnapshot.docs.map(async (doc) => {
          const notificationData = { id: doc.id, ...doc.data() } as Notification;
          const userDoc = await getDocs(query(
            collection(db, 'users'),
            where('id', '==', notificationData.senderId)
          ));

          if (!userDoc.empty) {
            return {
              ...notificationData,
              sender: userDoc.docs[0].data() as User,
            };
          }
          
          return null;
        })
      );

      setNotifications(notificationsWithUsers.filter(Boolean) as (Notification & { sender: User })[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as seen
      await updateDoc(doc(db, 'notifications', notification.id), {
        seen: true
      });

      // Navigate based on type
      switch (notification.type) {
        case 'chat':
          if (notification.chatId) {
            router.push(`/chat/${notification.chatId}`);
          }
          break;
        case 'event':
          if (notification.eventId) {
            router.push(`/events/${notification.eventId}`);
          }
          break;
        case 'candidacy':
          if (notification.candidacyId) {
            router.push(`/candidacies/${notification.candidacyId}`);
          }
          break;
      }

      loadNotifications();
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return 'chatbubble';
      case 'event':
        return 'calendar';
      case 'candidacy':
        return 'person';
      default:
        return 'notifications';
    }
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="notifications" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('notifications.title')}</Text>
        </View>

        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={styles.notificationItem}
            onPress={() => handleNotificationPress(notification)}
          >
            <View style={styles.notificationIcon}>
              <Ionicons
                name={getNotificationIcon(notification.type)}
                size={24}
                color="#007AFF"
              />
            </View>

            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                {i18n.t(`notifications.type.${notification.type}`)}
              </Text>
              <Text style={styles.notificationSender}>
                {notification.sender.email}
              </Text>
              <Text style={styles.notificationTime}>
                {notification.createdAt.toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {!loading && notifications.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.t('notifications.empty')}
          </Text>
        )}
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
  notificationItem: {
    flexDirection: 'row',
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
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notificationSender: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});