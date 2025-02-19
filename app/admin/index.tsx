import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../../src/i18n';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError(i18n.t('auth.error.emptyFields'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        setError(i18n.t('auth.error.userNotFound'));
        return;
      }

      const userData = userDoc.data();

      // Check if user is admin
      if (userData.userType === 'admin' || userData.isAdmin) {
        router.replace('/admin');
        return;
      }

      // For non-admin users, check if profile exists
      const profileDoc = await getDoc(doc(db, 
        userData.role === 'artist' ? 'artistProfiles' : 'contractorProfiles', 
        userCredential.user.uid
      ));

      if (!profileDoc.exists()) {
        // Redirect to complete profile
        router.replace(userData.role === 'artist' ? '/edit-artist-profile' : '/edit-contractor-profile');
      } else {
        // Profile exists, go to home
        router.replace(userData.role === 'artist' ? '/home-artist' : '/home-contractor');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(i18n.t('auth.error.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="musical-notes" size={48} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('screens.login.title')}</Text>
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

            <Button
              title={i18n.t('common.button.login')}
              onPress={handleLogin}
              disabled={loading}
              icon={<Ionicons name="log-in-outline" size={20} color="#FFF" />}
            />

            <Button
              title={i18n.t('screens.login.createAccount')}
              onPress={() => router.push('/register')}
              variant="secondary"
              disabled={loading}
              icon={<Ionicons name="person-add-outline" size={20} color="#007AFF" />}
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
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }
    }),
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
});