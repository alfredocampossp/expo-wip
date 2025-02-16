import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { Layout } from '../src/components/Layout';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';
import { UserRating } from '../src/components/UserRating';
import type { User, ArtistProfile } from '../src/types';

interface ArtistWithProfile extends User {
  profile: ArtistProfile;
}

export default function ArtistsAdvancedSearchScreen() {
  const [styles, setStyles] = useState('');
  const [minRating, setMinRating] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('');
  const [artists, setArtists] = useState<ArtistWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'distance'>('rating');

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
      let baseQuery = query(
        collection(db, 'users'),
        where('role', '==', 'artist')
      );

      // Get all artists first
      const artistsSnapshot = await getDocs(baseQuery);
      let artistsList: ArtistWithProfile[] = [];

      // Get profiles and apply filters
      for (const artistDoc of artistsSnapshot.docs) {
        const artistData = artistDoc.data() as User;
        const profileDoc = await getDoc(doc(db, 'artistProfiles', artistDoc.id));
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as ArtistProfile;

          // Apply style filter
          if (styles) {
            const stylesList = styles.split(',').map(s => s.trim());
            if (!stylesList.some(style => profileData.genres.includes(style))) {
              continue;
            }
          }

          // Apply rating filter for paid users
          if (user?.planId === 'paid' && minRating) {
            if ((artistData.rating || 0) < Number(minRating)) {
              continue;
            }
          }

          // Apply location filter for paid users
          if (user?.planId === 'paid' && location && radius) {
            // In a real app, we would use geolocation here
            // For now, we'll just filter by exact location match
            if (!profileData.mainCity.toLowerCase().includes(location.toLowerCase())) {
              continue;
            }
          }

          artistsList.push({
            ...artistData,
            profile: profileData,
          });
        }
      }

      // Apply sorting
      switch (sortBy) {
        case 'rating':
          artistsList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'distance':
          // In a real app, we would sort by actual distance
          // For now, we'll just sort alphabetically by location
          artistsList.sort((a, b) => 
            a.profile.mainCity.localeCompare(b.profile.mainCity)
          );
          break;
      }

      setArtists(artistsList);
    } catch (error) {
      console.error('Error searching artists:', error);
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
          <Text style={styles.title}>{i18n.t('search.artists.title')}</Text>
        </View>

        <View style={styles.form}>
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
            </>
          )}

          <View style={styles.sortContainer}>
            <Text style={styles.label}>{i18n.t('search.sortBy')}</Text>
            <View style={styles.sortButtons}>
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

        {artists.map((artist) => (
          <View key={artist.id} style={styles.artistCard}>
            <View style={styles.artistHeader}>
              <Text style={styles.artistName}>{artist.email}</Text>
              <UserRating rating={artist.rating || 0} reviewCount={artist.reviewCount || 0} />
            </View>

            <View style={styles.artistDetails}>
              <Text style={styles.detailText}>
                <Ionicons name="location" size={16} /> {artist.profile.mainCity}
              </Text>
              <Text style={styles.detailText}>
                <Ionicons name="musical-notes" size={16} /> {artist.profile.genres.join(', ')}
              </Text>
              <Text style={styles.cacheText}>
                {i18n.t('search.cache')}: {artist.profile.minimumCache}
                {artist.profile.maximumCache > artist.profile.minimumCache && 
                  ` - ${artist.profile.maximumCache}`}
              </Text>
            </View>

            <Text style={styles.description}>
              {artist.profile.description}
            </Text>
          </View>
        ))}

        {!loading && artists.length === 0 && (
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
  sortContainer: {
    marginBottom: 15,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  artistCard: {
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
  artistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  artistDetails: {
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cacheText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});