import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, KeyboardAvoidingView, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../src/i18n';
import type { UserRole } from '../src/types';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(true);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !role) {
      setError(i18n.t('auth.error.emptyFields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(i18n.t('auth.error.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role,
        planId: 'free',
        createdAt: new Date(),
      });

      router.replace(role === 'artist' ? '/home-artist' : '/home-contractor');
    } catch (error: any) {
      setError(i18n.t('auth.error.registration'));
    } finally {
      setLoading(false);
    }
  };

  const RoleModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showRoleModal}
      onRequestClose={() => setShowRoleModal(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => router.back()}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{i18n.t('screens.register.role.label')}</Text>
          
          <View style={styles.roleOptions}>
            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => {
                setRole('artist');
                setShowRoleModal(false);
              }}
            >
              <View style={styles.roleIconContainer}>
                <Ionicons name="musical-notes" size={32} color="#007AFF" />
              </View>
              <Text style={styles.roleText}>{i18n.t('screens.register.role.artist')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleOption}
              onPress={() => {
                setRole('contractor');
                setShowRoleModal(false);
              }}
            >
              <View style={styles.roleIconContainer}>
                <Ionicons name="business" size={32} color="#007AFF" />
              </View>
              <Text style={styles.roleText}>{i18n.t('screens.register.role.contractor')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  if (showRoleModal) {
    return <RoleModal />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons 
              name={role === 'artist' ? 'musical-notes' : 'business'} 
              size={48} 
              color="#007AFF" 
            />
            <Text style={styles.title}>{i18n.t('screens.register.title')}</Text>
            <Text style={styles.subtitle}>
              {role === 'artist' 
                ? i18n.t('screens.register.role.artist')
                : i18n.t('screens.register.role.contractor')}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={i18n.t('auth.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={i18n.t('auth.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="shield-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={i18n.t('auth.confirmPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <Button
              title={i18n.t('common.button.register')}
              onPress={handleRegister}
              disabled={loading}
            />

            <Button
              title={i18n.t('screens.register.changeRole')}
              onPress={() => setShowRoleModal(true)}
              variant="secondary"
              disabled={loading}
            />

            <Button
              title={i18n.t('screens.register.backToLogin')}
              onPress={() => router.push('/login')}
              variant="secondary"
              disabled={loading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    textAlign: 'center',
  },
  roleOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  roleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});