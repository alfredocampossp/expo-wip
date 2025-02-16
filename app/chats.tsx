import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Layout } from '../src/components/Layout';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import type { Chat, User } from '../src/types';

export default function ChatsScreen() {
  const [chats, setChats] = useState<(Chat & { otherUser: User })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    if (!auth.currentUser) return;

    try {
      const chatsSnapshot = await getDocs(query(
        collection(db, 'chats'),
        where('participants', 'array-contains', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      ));

      const chatsWithUsers = await Promise.all(
        chatsSnapshot.docs.map(async (doc) => {
          const chatData = { id: doc.id, ...doc.data() } as Chat;
          const otherUserId = chatData.participants.find(id => id !== auth.currentUser?.uid);
          
          if (otherUserId) {
            const userDoc = await getDocs(query(
              collection(db, 'users'),
              where('id', '==', otherUserId)
            ));

            if (!userDoc.empty) {
              return {
                ...chatData,
                otherUser: userDoc.docs[0].data() as User,
              };
            }
          }
          
          return null;
        })
      );

      setChats(chatsWithUsers.filter(Boolean) as (Chat & { otherUser: User })[]);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('chats.title')}</Text>
        </View>

        {chats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatItem}
            onPress={() => handleOpenChat(chat.id)}
          >
            <View style={styles.chatHeader}>
              <Text style={styles.userName}>{chat.otherUser.email}</Text>
              {chat.lastMessage && (
                <Text style={styles.lastMessageTime}>
                  {chat.lastMessage.createdAt.toLocaleDateString()}
                </Text>
              )}
            </View>

            {chat.lastMessage && (
              <Text style={styles.lastMessageText} numberOfLines={1}>
                {chat.lastMessage.text}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        {!loading && chats.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.t('chats.empty')}
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
  chatItem: {
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
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#666',
  },
  lastMessageText: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});