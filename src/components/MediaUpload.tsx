import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform } from 'react-native';
import { Button } from './Button';
import { Picker } from '@react-native-picker/picker';
import { auth, db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import i18n from '../i18n';
import type { MediaType } from '../types';

interface MediaUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function MediaUpload({ onClose, onSuccess }: MediaUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MediaType>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !auth.currentUser) return;

    setLoading(true);
    try {
      // Calculate file size in MB
      const sizeMB = file.size / (1024 * 1024);

      // Get user's current storage usage
      const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
      const userData = userDoc.data();
      const currentUsage = userData?.bucketUse || 0;
      const storageLimit = userData?.planId === 'paid' ? 2048 : 100;

      if (currentUsage + sizeMB > storageLimit) {
        Alert.alert(i18n.t('common.error.storage.limit'));
        return;
      }

      // Upload file to Firebase Storage
      const storageRef = ref(storage, `media/${auth.currentUser.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Add media document to Firestore
      await addDoc(collection(db, 'media'), {
        userId: auth.currentUser.uid,
        type,
        url: downloadURL,
        sizeMB,
        title,
        description,
        highlighted: false,
        viewsCount: 0,
        likesCount: 0,
        favoritesCount: 0,
        createdAt: new Date(),
      });

      // Update user's storage usage
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        bucketUse: increment(sizeMB),
      });

      Alert.alert(i18n.t('common.success.mediaUploaded'));
      onSuccess();
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert(i18n.t('common.error.storage.upload'));
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.notice}>
          Media upload is currently only available on web platform
        </Text>
        <Button
          title={i18n.t('common.button.close')}
          onPress={onClose}
        />
      </View>
    );
  }

  // Return the web-specific UI
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('portfolio.upload.title')}</Text>

      <View style={styles.form}>
        <Text style={styles.label}>{i18n.t('portfolio.upload.type')}</Text>
        <Picker
          selectedValue={type}
          onValueChange={(value) => setType(value as MediaType)}
          style={styles.picker}
        >
          <Picker.Item label={i18n.t('portfolio.media.photo')} value="photo" />
          <Picker.Item label={i18n.t('portfolio.media.video')} value="video" />
          <Picker.Item label={i18n.t('portfolio.media.audio')} value="audio" />
        </Picker>

        <Text style={styles.label}>{i18n.t('portfolio.upload.title_field')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>{i18n.t('portfolio.upload.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <input
          type="file"
          accept={
            type === 'photo'
              ? 'image/*'
              : type === 'video'
              ? 'video/*'
              : 'audio/*'
          }
          onChange={handleFileSelect}
          style={{ marginBottom: 15 }}
        />

        <View style={styles.buttonContainer}>
          <Button
            title={i18n.t('common.button.upload')}
            onPress={handleUpload}
            disabled={loading || !file}
          />
          <Button
            title={i18n.t('common.button.close')}
            onPress={onClose}
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notice: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  form: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
});
