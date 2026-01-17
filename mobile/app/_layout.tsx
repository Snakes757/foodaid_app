
import React, { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { AuthProvider } from '@/hooks/useAuth';
import "../global.css";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * Root layout for the entire app.
 * Wraps all screens in the AuthProvider so auth state is global.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
