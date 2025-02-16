import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { registerForPushNotificationsAsync, updatePushToken } from '../src/services/notifications';
import '../src/services/firebase';

export default function RootLayout() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerPushNotifications();
    setupNotificationListeners();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const registerPushNotifications = async () => {
    if (Platform.OS !== 'web') {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await updatePushToken(token);
      }
    }
  };

  const setupNotificationListeners = () => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Handle received notification
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Handle notification tap
      if (data.type === 'chat' && data.chatId) {
        router.push(`/chat/${data.chatId}`);
      } else if (data.type === 'event' && data.eventId) {
        router.push(`/events/${data.eventId}`);
      } else if (data.type === 'candidacy' && data.candidacyId) {
        router.push(`/candidacies/${data.candidacyId}`);
      }
    });
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: Platform.select({
              web: { backgroundColor: 'white' },
              default: undefined,
            }),
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="home-artist" />
          <Stack.Screen name="home-contractor" />
          <Stack.Screen name="edit-artist-profile" />
          <Stack.Screen name="edit-contractor-profile" />
          <Stack.Screen name="portfolio-artist" />
          <Stack.Screen name="portfolio-contractor" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="chats" />
          <Stack.Screen name="chat/[id]" />
        </Stack>
        <StatusBar style="auto" />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}