import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { Button } from './Button';
import { auth, db, storage } from '../services/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import i18n from '../i18n';
import type { MediaType } from '../types';

interface MediaUploadProps {
  onClose: () => void;
  onSuccess: () => void;
  onProgress?: (progress: number) => void;
  allowedTypes?: MediaType[];
}

export function MediaUpload({ 
  onClose, 
  onSuccess, 
  onProgress,
  allowedTypes = ['photo', 'video', 'audio']
}: MediaUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | Blob | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria.');
        return;
      }

      // Determine if we want photos, videos, or both
      let mediaTypes;
      if (allowedTypes.includes('photo') && allowedTypes.includes('video')) {
        mediaTypes = ImagePicker.MediaTypeOptions.All;
      } else if (allowedTypes.includes('video')) {
        mediaTypes = ImagePicker.MediaTypeOptions.Videos;
      } else {
        mediaTypes = ImagePicker.MediaTypeOptions.Images;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        // Determine media type from the asset type
        let detectedType: MediaType;
        if (asset.type === 'video') {
          detectedType = 'video';
        } else {
          detectedType = 'photo';
        }

        if (allowedTypes.includes(detectedType)) {
          setFile(blob);
          setFileName(asset.uri.split('/').pop() || 'file');
          setMediaType(detectedType);
        } else {
          Alert.alert('Erro', 'Este tipo de mídia não é permitido');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes.map(type => {
          switch (type) {
            case 'photo': return 'image/*';
            case 'video': return 'video/*';
            case 'audio': return 'audio/*';
            default: return '*/*';
          }
        }),
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        const response = await fetch(result.uri);
        const blob = await response.blob();
        
        let detectedType: MediaType | null = null;
        if (result.mimeType?.startsWith('image/')) detectedType = 'photo';
        if (result.mimeType?.startsWith('video/')) detectedType = 'video';
        if (result.mimeType?.startsWith('audio/')) detectedType = 'audio';

        if (detectedType && allowedTypes.includes(detectedType)) {
          setFile(blob);
          setFileName(result.name);
          setMediaType(detectedType);
        } else {
          Alert.alert('Erro', 'Tipo de arquivo não suportado');
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo');
    }
  };

  const handleFileSelect = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      
      const acceptTypes = [];
      if (allowedTypes.includes('photo')) acceptTypes.push('image/*');
      if (allowedTypes.includes('video')) acceptTypes.push('video/*');
      if (allowedTypes.includes('audio')) acceptTypes.push('audio/*');
      input.accept = acceptTypes.join(',');
      
      input.onchange = async (e: any) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
          let detectedType: MediaType | null = null;
          if (selectedFile.type.startsWith('image/')) detectedType = 'photo';
          if (selectedFile.type.startsWith('video/')) detectedType = 'video';
          if (selectedFile.type.startsWith('audio/')) detectedType = 'audio';

          if (detectedType && allowedTypes.includes(detectedType)) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setMediaType(detectedType);
          } else {
            Alert.alert('Erro', 'Tipo de arquivo não suportado');
          }
        }
      };
      
      input.click();
    } else {
      // For mobile platforms, use appropriate picker based on allowed types
      if (allowedTypes.includes('photo') || allowedTypes.includes('video')) {
        await pickImage();
      } else if (allowedTypes.includes('audio')) {
        await pickDocument();
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !auth.currentUser || !mediaType) return;

    setLoading(true);
    try {
      const sizeMB = file.size / (1024 * 1024);
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();
      const currentUsage = userData?.bucketUse || 0;
      const storageLimit = userData?.planId === 'paid' ? 2048 : 100;

      if (currentUsage + sizeMB > storageLimit) {
        Alert.alert(i18n.t('common.error.storage.limit'));
        setLoading(false);
        return;
      }

      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;
      const storageRef = ref(storage, `media/${auth.currentUser.uid}/${uniqueFileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          onProgress?.(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          Alert.alert(i18n.t('common.error.storage.upload'));
          setLoading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            await addDoc(collection(db, 'media'), {
              userId: auth.currentUser!.uid,
              type: mediaType,
              url: downloadURL,
              sizeMB,
              title: title || fileName,
              description,
              highlighted: false,
              viewsCount: 0,
              likesCount: 0,
              favoritesCount: 0,
              createdAt: new Date(),
            });

            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              bucketUse: increment(sizeMB),
            });

            Alert.alert(i18n.t('common.success.mediaUploaded'));
            onSuccess();
          } catch (error) {
            console.error('Error saving to Firestore:', error);
            Alert.alert(i18n.t('common.error.storage.upload'));
          } finally {
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert(i18n.t('common.error.storage.upload'));
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cloud-upload" size={24} color="#007AFF" />
        <Text style={styles.title}>{i18n.t('portfolio.upload.title')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{i18n.t('portfolio.upload.title_field')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Digite um título"
            editable={!loading}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{i18n.t('portfolio.upload.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholder="Digite uma descrição"
            editable={!loading}
          />
        </View>

        <View style={styles.formGroup}>
          <Button
            title={fileName || "Selecionar arquivo"}
            onPress={handleFileSelect}
            disabled={loading}
            icon={<Ionicons name="attach" size={20} color={loading ? "#999" : "#FFF"} />}
          />
          {mediaType && (
            <Text style={styles.mediaTypeText}>
              Tipo: {mediaType === 'photo' ? 'Foto' : mediaType === 'video' ? 'Vídeo' : 'Áudio'}
            </Text>
          )}
        </View>

        {loading && uploadProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(uploadProgress)}%
            </Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          <Button
            title={i18n.t('common.button.upload')}
            onPress={handleUpload}
            disabled={loading || !file}
            icon={loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
            )}
          />
          <Button
            title={i18n.t('common.button.cancel')}
            onPress={onClose}
            variant="secondary"
            disabled={loading}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  form: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  mediaTypeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});