
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const { login } = useAuth();

  const handleLogin = () => {
    
    const [user, setUser] = useState([]);
    // --- TODO: Implement actual login logic ---
    // 1. Call your api/auth.ts function
    // 2. On success, call login(user, token)
    // Example:
   
   
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Login</Text>
      {/* Add TextInput fields for email/password */}
      <input 
        type="email"
        placeholder="Email"
        onChange={(e) => setUser({ ...user, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
      />
      <Button title="Login (Demo)" onPress={handleLogin} />
      <Link href="/register">
        <Text style={{ color: 'blue', marginTop: 20 }}>Don't have an account? Register</Text>
      </Link>
    </View>
  );
}
