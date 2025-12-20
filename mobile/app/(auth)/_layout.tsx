
import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';

/**
 * Layout for the authentication group (login, register).
 * Redirects to the main app if the user is already logged in.
 */
export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // Show a loading indicator while checking auth state
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    // User is logged in, redirect them to the main app (feed screen)
    return <Redirect href="/feed" />;
  }

  // User is not logged in, show the auth stack (login, register screens)
  return <Stack />;
}
