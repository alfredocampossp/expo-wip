// app.config.js
module.exports = {
  expo: {
    name: 'wip',
    slug: 'wip',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'wip',
    userInterfaceStyle: 'automatic',
    splash: {
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourcompany.wip',
      newArchEnabled: true
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff'
      },
      package: 'com.yourcompany.wip'
    },
    web: {
      bundler: 'metro',
      output: 'static'
    },
    plugins: ['expo-router'],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    },
    extra: {
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    }
  }
};
