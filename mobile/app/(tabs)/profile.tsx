
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Profile</Text>
      <Text style={{ fontSize: 18, marginVertical: 10 }}>Email: {user?.email}</Text>
      <Text style={{ fontSize: 18, marginVertical: 10 }}>Role: {user?.role}</Text>
      <Button title="Logout" onPress={logout} color="red" />
    </View>
  );
}
