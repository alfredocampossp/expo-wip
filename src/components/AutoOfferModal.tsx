import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Button } from './Button';
import { auth, db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';

interface AutoOfferModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  currentSettings: {
    enabled: boolean;
    minCache: number;
    genres: string[];
  };
}

export function AutoOfferModal({ visible, onClose, onSave, currentSettings }: AutoOfferModalProps) {
  const [enabled, setEnabled] = useState(currentSettings.enabled);
  const [minCache, setMinCache] = useState(currentSettings.minCache.toString());
  const [genresInput, setGenresInput] = useState(currentSettings.genres.join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!auth.currentUser) return;

    setSaving(true);
    try {
      const genres = genresInput.split(',').map(g => g.trim()).filter(Boolean);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoOffer: {
          enabled,
          minCache: Number(minCache) || 0,
          genres,
          updatedAt: new Date(),
        },
      });

      Alert.alert(i18n.t('autoOffer.success.saved'));
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving auto-offer settings:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="flash" size={24} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('autoOffer.title')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.switchContainer}>
              <Text style={styles.label}>{i18n.t('autoOffer.enable')}</Text>
              <Button
                title={enabled ? i18n.t('common.button.enabled') : i18n.t('common.button.disabled')}
                onPress={() => setEnabled(!enabled)}
                variant={enabled ? 'primary' : 'secondary'}
              />
            </View>

            <Text style={styles.label}>{i18n.t('autoOffer.minCache')}</Text>
            <TextInput
              style={styles.input}
              value={minCache}
              onChangeText={setMinCache}
              keyboardType="numeric"
              editable={enabled}
            />

            <Text style={styles.label}>{i18n.t('autoOffer.genres')}</Text>
            <TextInput
              style={styles.input}
              value={genresInput}
              onChangeText={setGenresInput}
              placeholder="Rock, Pop, Jazz"
              editable={enabled}
            />

            <Text style={styles.description}>
              {i18n.t('autoOffer.description')}
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                title={i18n.t('common.button.cancel')}
                onPress={onClose}
                variant="secondary"
                disabled={saving}
              />
              <Button
                title={i18n.t('common.button.save')}
                onPress={handleSave}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    gap: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
});