import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { auth, db } from '../../src/services/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import type { Message, Chat, User } from '../../src/types';

const FREE_PLAN_DAILY_MESSAGES = 20;

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChat();
    const interval = setInterval(loadMessages, 5000); // Poll for new messages
    return () => clearInterval(interval);
  }, [chatId]);

  const loadChat = async () => {
    if (!auth.currentUser || !chatId) return;

    try {
      const [chatDoc, userDoc] = await Promise.all([
        getDoc(doc(db, 'chats', chatId)),
        getDoc(doc(db, 'users', auth.currentUser.uid))
      ]);

      if (chatDoc.exists()) {
        const chatData = { id: chatDoc.id, ...chatDoc.data() } as Chat;
        setChat(chatData);

        // Get other participant
        const otherUserId = chatData.participants.find(id => id !== auth.currentUser?.uid);
        if (otherUserId) {
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          if (otherUserDoc.exists()) {
            setOtherUser(otherUserDoc.data() as User);
          }
        }
      }

      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
      }

      await loadMessages();
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!chatId) return;

    try {
      const messagesSnapshot = await getDocs(query(
        collection(db, `chats/${chatId}/messages`),
        orderBy('createdAt', 'asc')
      ));

      const messagesList = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Message[];

      setMessages(messagesList);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSend = async () => {
    if (!auth.currentUser || !chatId || !newMessage.trim()) return;

    try {
      if (user?.planId === 'free') {
        const messagesSent = user.messagesSentToday || 0;
        if (messagesSent >= FREE_PLAN_DAILY_MESSAGES) {
          Alert.alert(i18n.t('chat.error.dailyLimit'));
          return;
        }

        // Update messages sent count
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          messagesSentToday: increment(1)
        });
      }

      // Add message
      const message = {
        senderId: auth.currentUser.uid,
        text: newMessage.trim(),
        createdAt: new Date(),
      };

      await addDoc(collection(db, `chats/${chatId}/messages`), message);

      // Create notification for other user
      const otherUserId = chat?.participants.find(id => id !== auth.currentUser?.uid);
      if (otherUserId) {
        await addDoc(collection(db, 'notifications'), {
          type: 'chat',
          chatId,
          senderId: auth.currentUser.uid,
          receiverId: otherUserId,
          seen: false,
          createdAt: new Date(),
        });
      }

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  return (
    <Layout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={32} color="#007AFF" />
          <Text style={styles.title}>
            {otherUser?.email || i18n.t('chat.title')}
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBox,
                message.senderId === auth.currentUser?.uid
                  ? styles.sentMessage
                  : styles.receivedMessage
              ]}
            >
              <Text style={styles.messageText}>{message.text}</Text>
              <Text style={styles.messageTime}>
                {message.createdAt.toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={i18n.t('chat.placeholder')}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Ionicons
              name="send"
              size={24}
              color={newMessage.trim() ? "#007AFF" : "#999"}
            />
          </TouchableOpacity>
        </View>
      </View>
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
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messageBox: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 12,
    color: '#FFFFFF80',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});