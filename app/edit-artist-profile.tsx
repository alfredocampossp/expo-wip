import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { auth, db } from '../src/services/firebase';
import { Button } from '../src/components/Button';
import { StylePickerModal } from '../src/components/StylePickerModal';
import { LocationRadius } from '../src/components/LocationRadius';
import { Layout } from '../src/components/Layout';
import { AutoOfferModal } from '../src/components/AutoOfferModal';
import i18n from '../src/i18n';
import type { ArtistProfile, User } from '../src/types';

export default function EditArtistProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Perfil do artista
  const [profile, setProfile] = useState<Partial<ArtistProfile>>({
    minimumCache: 0,
    maximumCache: 0,
    coverageRadius: 0,
    genres: [],
    description: '',
    mainCity: '',
    autoOfferEnabled: false,
  });

  // Modal de estilos
  const [showStyleModal, setShowStyleModal] = useState(false);
  
  // Modal de auto-oferta
  const [showAutoOfferModal, setShowAutoOfferModal] = useState(false);

  // Se for free, cache fixo (min = max)
  const [cacheFixo, setCacheFixo] = useState('0');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!auth.currentUser) return;

    try {
      const uid = auth.currentUser.uid;
      const [profileSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'artistProfiles', uid)),
        getDoc(doc(db, 'users', uid)),
      ]);

      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        setUser(userData);
      }

      if (profileSnap.exists()) {
        const pData = profileSnap.data() as ArtistProfile;
        setProfile(pData);

        // Se min==max => definimos cacheFixo
        if (pData.minimumCache === pData.maximumCache) {
          setCacheFixo(String(pData.minimumCache || '0'));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      Alert.alert('Erro', i18n.t('common.error.profile'));
    } finally {
      setLoading(false);
    }
  }

  function validateProfile() {
    if (!profile.mainCity?.trim()) {
      Alert.alert('Erro', 'A cidade principal é obrigatória');
      return false;
    }

    if (profile.genres?.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um gênero musical');
      return false;
    }

    // Se for plano pago, min <= max
    if (user?.planId === 'paid') {
      if ((profile.minimumCache ?? 0) > (profile.maximumCache ?? 0)) {
        Alert.alert('Erro', 'O cachê mínimo não pode ser maior que o máximo');
        return false;
      }
    }
    return true;
  }

  async function handleSave() {
    if (!auth.currentUser) return;
    if (!validateProfile()) return;

    setSaving(true);
    try {
      const uid = auth.currentUser.uid;
      const now = new Date();
      
      let finalProfile: ArtistProfile;

      if (user?.planId === 'free') {
        // min=max=cacheFixo
        const fixo = parseFloat(cacheFixo || '0');
        finalProfile = {
          userId: uid,
          minimumCache: fixo,
          maximumCache: fixo,
          coverageRadius: 0, // desativado p/ free
          genres: profile.genres || [],
          description: profile.description || '',
          mainCity: profile.mainCity || '',
          autoOfferEnabled: false,
          createdAt: profile.createdAt || now,
          updatedAt: now,
        };
      } else {
        finalProfile = {
          userId: uid,
          minimumCache: profile.minimumCache || 0,
          maximumCache: profile.maximumCache || 0,
          coverageRadius: profile.coverageRadius || 0,
          genres: profile.genres || [],
          description: profile.description || '',
          mainCity: profile.mainCity || '',
          autoOfferEnabled: profile.autoOfferEnabled || false,
          createdAt: profile.createdAt || now,
          updatedAt: now,
        };
      }

      await setDoc(doc(db, 'artistProfiles', uid), finalProfile);
      Alert.alert('Sucesso', i18n.t('common.success.profileSaved'));
      router.back();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      Alert.alert('Erro', i18n.t('common.error.profile'));
    } finally {
      setSaving(false);
    }
  }

  function handleGenresSelected(newGenres: string[]) {
    setShowStyleModal(false);
    setProfile((prev) => ({ ...prev, genres: newGenres }));
  }

  function handleAutoOfferToggle() {
    if (user?.planId === 'free') {
      Alert.alert('Atenção', 'Auto-oferta disponível apenas no plano pago');
      return;
    }
    setShowAutoOfferModal(true);
  }

  if (loading) {
    return (
      <Layout>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Ionicons name="person" size={32} color="#007AFF" />
          <Text style={styles.title}>{i18n.t('profile.artist.title')}</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          {/* Cachê */}
          {user?.planId === 'free' ? (
            <View style={styles.inputGroup}>
              <Ionicons style={styles.icon} name="cash-outline" size={20} color="#666" />
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Cachê Fixo</Text>
                <TextInput
                  style={styles.input}
                  value={cacheFixo}
                  onChangeText={setCacheFixo}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Ionicons style={styles.icon} name="cash-outline" size={20} color="#666" />
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>{i18n.t('profile.artist.minimumCache')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="R$ 0,00"
                    keyboardType="numeric"
                    value={String(profile.minimumCache || '')}
                    onChangeText={(val) =>
                      setProfile((prev) => ({ ...prev, minimumCache: Number(val) || 0 }))
                    }
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Ionicons style={styles.icon} name="cash-outline" size={20} color="#666" />
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>{i18n.t('profile.artist.maximumCache')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="R$ 0,00"
                    keyboardType="numeric"
                    value={String(profile.maximumCache || '')}
                    onChangeText={(val) =>
                      setProfile((prev) => ({ ...prev, maximumCache: Number(val) || 0 }))
                    }
                  />
                </View>
              </View>
            </>
          )}

          {/* Cidade Principal */}
          <View style={styles.inputGroup}>
            <Ionicons style={styles.icon} name="location-outline" size={20} color="#666" />
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{i18n.t('profile.artist.mainCity')}</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: São Paulo, SP"
                value={profile.mainCity}
                onChangeText={(val) => setProfile((prev) => ({ ...prev, mainCity: val }))}
              />
            </View>
          </View>

          {/* Raio de Cobertura */}
          <LocationRadius
            radius={profile.coverageRadius ?? 0}
            onRadiusChange={(val) => setProfile((prev) => ({ ...prev, coverageRadius: val }))}
            maxRadius={200}
            minRadius={0}
            step={5}
            disabled={user?.planId === 'free'}
          />

          {/* Gêneros Musicais */}
          <View style={styles.inputGroup}>
            <Ionicons style={styles.icon} name="musical-notes-outline" size={20} color="#666" />
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, { marginTop: 5 }]}>{i18n.t('profile.artist.genres')}</Text>
              <Button
                title={`Escolher Estilos (${profile.genres?.length || 0})`}
                onPress={() => setShowStyleModal(true)}
              />
              {!!profile.genres?.length && (
                <Text style={styles.genresText}>{profile.genres.join(', ')}</Text>
              )}
            </View>
          </View>

          {/* Descrição */}
          <View style={styles.inputGroup}>
            <Ionicons style={styles.icon} name="document-text-outline" size={20} color="#666" />
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, { marginTop: 5 }]}>{i18n.t('profile.artist.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descreva sua experiência..."
                multiline
                numberOfLines={4}
                value={profile.description}
                onChangeText={(val) => setProfile((prev) => ({ ...prev, description: val }))}
              />
            </View>
          </View>

          {/* Auto-Oferta */}
          <View style={styles.autoOffer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flash-outline" size={20} color="#666" />
              <Text style={styles.autoOfferLabel}>
                Auto-Oferta {user?.planId === 'free' && '(apenas pago)'}
              </Text>
            </View>
            <Switch
              value={!!profile.autoOfferEnabled}
              onValueChange={handleAutoOfferToggle}
              disabled={user?.planId === 'free'}
            />
          </View>
        </View>

        {/* Botões Salvar/Cancelar */}
        <View style={styles.buttonRow}>
          <Button title={i18n.t('common.button.cancel')} variant="secondary" onPress={() => router.back()} />
          <Button title={i18n.t('common.button.save')} onPress={handleSave} disabled={saving} />
        </View>

        {saving && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </ScrollView>

      {/* Modal de seleção de estilos */}
      <StylePickerModal
        visible={showStyleModal}
        currentSelection={profile.genres ?? []}
        planId={user?.planId || 'free'}
        onClose={() => setShowStyleModal(false)}
        onConfirm={handleGenresSelected}
      />

      {/* Modal de Auto-Oferta */}
      {user?.planId === 'paid' && (
        <AutoOfferModal
          visible={showAutoOfferModal}
          onClose={() => setShowAutoOfferModal(false)}
          onSave={loadProfile}
          currentSettings={{
            enabled: profile.autoOfferEnabled || false,
            minCache: profile.minimumCache || 0,
            genres: profile.genres || [],
          }}
        />
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 800,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  form: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  icon: {
    marginTop: 25,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    marginTop: 5,
  },
  genresText: {
    marginTop: 5,
    fontStyle: 'italic',
    fontSize: 14,
    color: '#666',
  },
  autoOffer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoOfferLabel: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  buttonRow: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  savingContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
});