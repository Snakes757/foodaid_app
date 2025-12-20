
import React from 'react';
import { View, Text, Button } from 'react-native';
import { Link, useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();

  const handleRegister = () => {
    // --- TODO: Implement actual registration logic ---
    // 1. Call your api/auth.ts function
    // 2. On success, navigate to login
    router.push('/login');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Register Screen</Text>
      {/* Add TextInput fields for name, email, password, role */}
      <Button title="Register" onPress={handleRegister} />
      <Link href="/login">
        <Text style={{ color: 'blue', marginTop: 20 }}>Already have an account? Login</Text>
      </Link>
    </View>
  );
}
