import React, { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { AuthProvider } from '@/hooks/useAuth';
import { AlertProvider } from '@/context/AlertContext';
import { NotificationProvider } from '@/context/NotificationContext';
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <NotificationProvider>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </NotificationProvider>
      </AuthProvider>
    </AlertProvider>
  );
}