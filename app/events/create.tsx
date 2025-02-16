import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from '../../src/services/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';
import type { EventType, User } from '../../src/types';

export default function CreateEventScreen() {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState<EventType>('SHOW');
  const [minCache, setMinCache] = useState('');
  const [maxCache, setMaxCache] = useState('');
  const [stylesInput, setStylesInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const validateForm = () => {
    if (!title || !startDate || !endDate || !location) {
      Alert.alert(i18n.t('events.error.requiredFields'));
      return false;
    }

    if (user?.planId === 'free') {
      if (eventType !== 'SHOW') {
        Alert.alert(i18n.t('events.error.eventTypeRestricted'));
        return false;
      }

      const styles = stylesInput.split(',').map(s => s.trim()).filter(Boolean);
      if (styles.length > 1) {
        Alert.alert(i18n.t('events.error.styleLimit'));
        return false;
      }
    }

    return true;
  };

  const handleCreate = async () => {
    if (!auth.currentUser || !validateForm()) return;

    setLoading(true);
    try {
      const styles = stylesInput.split(',').map(s => s.trim()).filter(Boolean);
      
      const eventData = {
        creatorId: auth.currentUser.uid,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        eventType,
        minCache: Number(minCache) || 0,
        maxCache: Number(maxCache) || 0,
        styles,
        status: 'ABERTO',
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'events'), eventData);

      if (user?.planId === 'free') {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          credits: increment(-1)
        });
      }

      Alert.alert(i18n.t('events.success.created'));
      router.back();
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="create" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('events.create.title')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('events.form.title')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>{i18n.t('events.form.startDate')}</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD HH:mm"
          />

          <Text style={styles.label}>{i18n.t('events.form.endDate')}</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD HH:mm"
          />

          <Text style={styles.label}>{i18n.t('events.form.location')}</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.label}>{i18n.t('events.form.eventType')}</Text>
          <Picker
            selectedValue={eventType}
            onValueChange={(value) => setEventType(value as EventType)}
            style={styles.picker}
            enabled={user?.planId === 'paid'}
          >
            <Picker.Item label={i18n.t('events.type.show')} value="SHOW" />
            {user?.planId === 'paid' && (
              <Picker.Item label={i18n.t('events.type.festival')} value="FESTIVAL" />
            )}
          </Picker>

          <Text style={styles.label}>{i18n.t('events.form.cache')}</Text>
          <View style={styles.cacheContainer}>
            <TextInput
              style={[styles.input, styles.cacheInput]}
              value={minCache}
              onChangeText={setMinCache}
              keyboardType="numeric"
              placeholder={i18n.t('events.form.minCache')}
            />
            <TextInput
              style={[styles.input, styles.cacheInput]}
              value={maxCache}
              onChangeText={setMaxCache}
              keyboardType="numeric"
              placeholder={i18n.t('events.form.maxCache')}
              editable={user?.planId === 'paid'}
            />
          </View>

          <Text style={styles.label}>
            {i18n.t('events.form.styles')}
            {user?.planId === 'free' && (
              <Text style={styles.planLimit}> (máx. 1)</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            value={stylesInput}
            onChangeText={setStylesInput}
            placeholder="Rock, Pop, Jazz"
          />
        </View>

        <Button
          title={i18n.t('events.create.submit')}
          onPress={handleCreate}
          disabled={loading}
        />
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
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  planLimit: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  picker: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  cacheContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cacheInput: {
    flex: 1,
    marginHorizontal: 5,
  },
});