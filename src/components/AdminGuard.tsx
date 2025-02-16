import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from './Button';
import i18n from '../i18n';

interface AdminGuardProps {
  children: React.ReactNode;
  isAdmin: boolean;
}

export function AdminGuard({ children, isAdmin }: AdminGuardProps) {
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('admin.accessDenied')}</Text>
        <Text style={styles.message}>{i18n.t('admin.notAuthorized')}</Text>
        <Button
          title={i18n.t('common.button.back')}
          onPress={() => router.back()}
          variant="secondary"
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#F44336',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});