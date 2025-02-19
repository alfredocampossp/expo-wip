import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Button } from '../src/components/Button';
import { auth, db } from '../src/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../src/i18n';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Autenticar com Firebase
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Buscar dados do usuário
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setError('Usuário não encontrado');
        setLoading(false);
        return;
      }

      // 3. Obter dados do usuário
      const userData = userDoc.data();
      const userRole = userData.role;

      // 4. Redirecionar baseado no role
      if (!userRole) {
        setError('Tipo de usuário não definido');
        setLoading(false);
        return;
      }

      // 5. Verificar rota com base no role
      switch (userRole) {
        case 'artist':
          router.replace('/home-artist');
          break;
        case 'contractor':
          router.replace('/home-contractor');
          break;
        case 'admin':
          router.replace('/admin/dashboard');
          break;
        default:
          setError('Tipo de usuário inválido');
          setLoading(false);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setError('Email ou senha inválidos');
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
            <Text style={styles.title}>Login</Text>
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
                placeholder="Email"
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
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <Button
              title={loading ? "Entrando..." : "Entrar"}
              onPress={handleLogin}
              disabled={loading}
              icon={<Ionicons name="log-in-outline" size={20} color="#FFF" />}
            />

            <Button
              title="Criar Conta"
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