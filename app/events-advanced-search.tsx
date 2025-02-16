import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import { EventList } from '../src/components/EventList';
import type { Event, User } from '../src/types';

export default function EventsAdvancedSearchScreen() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [styles, setStyles] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minCache, setMinCache] = useState('');
  const [maxCache, setMaxCache] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'distance'>('date');

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

  const handleSearch = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      let baseQuery = query(collection(db, 'events'), where('status', '==', 'ABERTO'));

      // Add date filters
      if (startDate && endDate) {
        baseQuery = query(baseQuery, 
          where('startDate', '>=', new Date(startDate)),
          where('endDate', '<=', new Date(endDate))
        );
      }

      // Add style filter
      if (styles) {
        const stylesList = styles.split(',').map(s => s.trim());
        baseQuery = query(baseQuery, where('styles', 'array-contains-any', stylesList));
      }

      // Add cache range filter for paid users
      if (user?.planId === 'paid' && minCache && maxCache) {
        baseQuery = query(baseQuery,
          where('minCache', '>=', Number(minCache)),
          where('maxCache', '<=', Number(maxCache))
        );
      }

      // Execute query
      const eventsSnapshot = await getDocs(baseQuery);
      let eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];

      // Apply client-side filters for paid users
      if (user?.planId === 'paid') {
        // Filter by rating
        if (minRating) {
          eventsList = eventsList.filter(event => {
            const rating = event.rating || 0;
            return rating >= Number(minRating);
          });
        }

        // Filter by location radius
        if (location && radius) {
          // In a real app, we would use geolocation here
          // For now, we'll just filter by exact location match
          eventsList = eventsList.filter(event => 
            event.location.toLowerCase().includes(location.toLowerCase())
          );
        }
      }

      // Apply sorting
      switch (sortBy) {
        case 'date':
          eventsList.sort((a, b) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          break;
        case 'rating':
          eventsList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'distance':
          // In a real app, we would sort by actual distance
          // For now, we'll just sort alphabetically by location
          eventsList.sort((a, b) => 
            a.location.localeCompare(b.location)
          );
          break;
      }

      setEvents(eventsList);
    } catch (error) {
      console.error('Error searching events:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="search" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('search.title')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('search.startDate')}</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>{i18n.t('search.endDate')}</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>{i18n.t('search.styles')}</Text>
          <TextInput
            style={styles.input}
            value={styles}
            onChangeText={setStyles}
            placeholder="Rock, Pop, Jazz"
          />

          {user?.planId === 'paid' && (
            <>
              <Text style={styles.label}>{i18n.t('search.location')}</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder={i18n.t('search.locationPlaceholder')}
              />

              <Text style={styles.label}>{i18n.t('search.radius')}</Text>
              <TextInput
                style={styles.input}
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
                placeholder="km"
              />

              <Text style={styles.label}>{i18n.t('search.minRating')}</Text>
              <TextInput
                style={styles.input}
                value={minRating}
                onChangeText={setMinRating}
                keyboardType="numeric"
                placeholder="1-5"
              />

              <Text style={styles.label}>{i18n.t('search.cache')}</Text>
              <View style={styles.cacheContainer}>
                <TextInput
                  style={[styles.input, styles.cacheInput]}
                  value={minCache}
                  onChangeText={setMinCache}
                  keyboardType="numeric"
                  placeholder={i18n.t('search.minCache')}
                />
                <TextInput
                  style={[styles.input, styles.cacheInput]}
                  value={maxCache}
                  onChangeText={setMaxCache}
                  keyboardType="numeric"
                  placeholder={i18n.t('search.maxCache')}
                />
              </View>
            </>
          )}

          <View style={styles.sortContainer}>
            <Text style={styles.label}>{i18n.t('search.sortBy')}</Text>
            <View style={styles.sortButtons}>
              <Button
                title={i18n.t('search.sortDate')}
                onPress={() => setSortBy('date')}
                variant={sortBy === 'date' ? 'primary' : 'secondary'}
              />
              <Button
                title={i18n.t('search.sortRating')}
                onPress={() => setSortBy('rating')}
                variant={sortBy === 'rating' ? 'primary' : 'secondary'}
              />
              {user?.planId === 'paid' && (
                <Button
                  title={i18n.t('search.sortDistance')}
                  onPress={() => setSortBy('distance')}
                  variant={sortBy === 'distance' ? 'primary' : 'secondary'}
                />
              )}
            </View>
          </View>

          <Button
            title={i18n.t('search.submit')}
            onPress={handleSearch}
            disabled={loading}
          />
        </View>

        {events.length > 0 && (
          <EventList
            events={events}
            onUpdate={handleSearch}
            isPaidPlan={user?.planId === 'paid'}
          />
        )}

        {!loading && events.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.t('search.noResults')}
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
  cacheContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cacheInput: {
    flex: 1,
  },
  sortContainer: {
    marginBottom: 15,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});