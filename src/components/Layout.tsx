import React, { useState } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebNavigation } from './WebNavigation';
import { MobileNavigation } from './MobileNavigation';

interface LayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
}

export function Layout({ children, hideNavigation = false }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isWeb = Platform.OS === 'web' && Dimensions.get('window').width >= 768;

  if (hideNavigation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isWeb) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.webContainer}>
          <View style={styles.webNavFixed}>
            <WebNavigation />
          </View>
          <View style={styles.webContentWrapper}>
            <View style={styles.webContent}>
              {children}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <MobileNavigation 
          isOpen={menuOpen} 
          onToggle={() => setMenuOpen(!menuOpen)} 
        />
        <View style={[styles.content, menuOpen && styles.contentBlurred]}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentBlurred: {
    opacity: 0.5,
  },
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100vh',
    overflow: 'hidden',
  },
  webNavFixed: {
    width: 250,
    height: '100%',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    zIndex: 1000,
  },
  webContentWrapper: {
    flex: 1,
    marginLeft: 250,
    width: 'calc(100% - 250px)',
    height: '100%',
    overflow: 'auto',
  },
  webContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    minHeight: '100%',
  },
});