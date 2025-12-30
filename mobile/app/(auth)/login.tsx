import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { loginUser } from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await loginUser({ email, password });
      // Profile refresh is handled by the auth listener in useAuth, 
      // but we await it here if needed or let the layout handle the redirect
      await refreshProfile();
    } catch (err: any) {
      const errorMessage = err.code === 'auth/invalid-credential' 
        ? 'Invalid email or password.' 
        : 'Failed to log in. Please try again.';
      Alert.alert('Login Failed', errorMessage);
      console.error(err);
      setIsLoading(false); // Only stop loading on error, success redirects via layout
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white justify-center px-6"
    >
      <View className="items-center mb-10">
        <View className="bg-orange-100 p-4 rounded-full mb-4">
          <Ionicons name="nutrition" size={48} color="#EA580C" /> 
        </View>
        <Text className="text-3xl font-bold text-green-800">Food Aid</Text>
        <Text className="text-gray-500 mt-2 text-center">
          Connect surplus food with those in need.
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-gray-700 mb-2 font-medium">Email Address</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-green-600 focus:border-2"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-gray-700 mb-2 font-medium">Password</Text>
          <View className="relative">
            <TextInput
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-green-600 focus:border-2"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              className="absolute right-4 top-3.5"
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="gray" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          className="bg-green-600 py-4 rounded-xl items-center mt-6 shadow-sm active:bg-green-700"
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Don't have an account? </Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text className="text-orange-600 font-bold">Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}