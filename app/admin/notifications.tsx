import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import { sendPushNotification } from '../../src/services/notifications';

type NotificationTarget = 'all' | 'artist' | 'contractor';

interface AdminNotification {
  id: string;
  subject: string;
  message: string;
  target: NotificationTarget;
  createdAt: Date;
  sentBy: string;
}

export default function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<NotificationTarget>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const notificationsSnapshot = await getDocs(query(
        collection(db, 'adminNotifications'),
        orderBy('createdAt', 'desc')
      ));

      const notificationsList = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as AdminNotification[];

      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!auth.currentUser || !subject.trim() || !message.trim()) return;

    setSending(true);
    try {
      // Get target users
      const usersQuery = target === 'all'
        ? query(collection(db, 'users'))
        : query(collection(db, 'users'), where('role', '==', target));

      const usersSnapshot = await getDocs(usersQuery);
      const userIds = usersSnapshot.docs.map(doc => doc.id);

      // Create admin notification record
      const notificationDoc = await addDoc(collection(db, 'adminNotifications'), {
        subject: subject.trim(),
        message: message.trim(),
        target,
        createdAt: new Date(),
        sentBy: auth.currentUser.uid,
      });

      // Create individual notifications for each user
      const notificationPromises = userIds.map(userId =>
        addDoc(collection(db, 'notifications'), {
          type: 'admin-broadcast',
          subject: subject.trim(),
          message: message.trim(),
          senderId: auth.currentUser!.uid,
          receiverId: userId,
          seen: false,
          createdAt: new Date(),
          adminNotificationId: notificationDoc.id,
        })
      );

      await Promise.all(notificationPromises);

      // Send push notifications
      const tokens = usersSnapshot.docs
        .map(doc => doc.data().pushToken)
        .filter(Boolean);

      if (tokens.length > 0) {
        await sendPushNotification(tokens, subject.trim(), message.trim(), {
          type: 'admin-broadcast',
          notificationId: notificationDoc.id,
        });
      }

      setSubject('');
      setMessage('');
      Alert.alert(i18n.t('admin.notifications.success.sent'));
      loadNotifications();
    } catch (error) {
      console.error('Error sending notifications:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setSending(false);
    }
  };

  const getTargetLabel = (target: NotificationTarget) => {
    switch (target) {
      case 'all':
        return i18n.t('admin.notifications.target.all');
      case 'artist':
        return i18n.t('admin.notifications.target.artist');
      case 'contractor':
        return i18n.t('admin.notifications.target.contractor');
      default:
        return target;
    }
  };

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
            <Ionicons name="notifications" size={32} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('admin.notifications.title')}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('admin.notifications.form.subject')}</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder={i18n.t('admin.notifications.form.subjectPlaceholder')}
          />

          <Text style={styles.label}>{i18n.t('admin.notifications.form.message')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            placeholder={i18n.t('admin.notifications.form.messagePlaceholder')}
          />

          <Text style={styles.label}>{i18n.t('admin.notifications.form.target')}</Text>
          <View style={styles.targetButtons}>
            <Button
              title={i18n.t('admin.notifications.target.all')}
              onPress={() => setTarget('all')}
              variant={target === 'all' ? 'primary' : 'secondary'}
            />
            <Button
              title={i18n.t('admin.notifications.target.artist')}
              onPress={() => setTarget('artist')}
              variant={target === 'artist' ? 'primary' : 'secondary'}
            />
            <Button
              title={i18n.t('admin.notifications.target.contractor')}
              onPress={() => setTarget('contractor')}
              variant={target === 'contractor' ? 'primary' : 'secondary'}
            />
          </View>

          <Button
            title={i18n.t('admin.notifications.form.send')}
            onPress={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
          />
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            {i18n.t('admin.notifications.history.title')}
          </Text>

          {notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationItem}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationSubject}>
                  {notification.subject}
                </Text>
                <View style={styles.targetBadge}>
                  <Text style={styles.targetText}>
                    {getTargetLabel(notification.target)}
                  </Text>
                </View>
              </View>

              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>

              <Text style={styles.notificationTime}>
                {notification.createdAt.toLocaleString()}
              </Text>
            </View>
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
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  targetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  historySection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  notificationItem: {
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
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  targetBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  targetText: {
    fontSize: 12,
    color: '#007AFF',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
});