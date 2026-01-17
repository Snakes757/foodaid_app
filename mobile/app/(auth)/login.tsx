import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { loginUser, getUserProfile } from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/config/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Google Auth Setup
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // REPLACE THESE WITH YOUR ACTUAL CLIENT IDs FROM GOOGLE CLOUD CONSOLE
    clientId: '563755773205-k42e64mrl7m2e0055f5u8reu92ndm6m6.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      handleGoogleSignIn(credential);
    }
  }, [response]);

  const handleGoogleSignIn = async (credential: any) => {
    try {
      setIsLoading(true);
      await signInWithCredential(auth, credential);
      
      // Check if profile exists
      try {
        await getUserProfile();
        await refreshProfile();
        // Redirect handled by AuthLayout
      } catch (error) {
        // Profile doesn't exist (404), redirect to completion screen
        setIsLoading(false);
        router.push('./complete-profile');
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert("Google Sign-In Error", error.message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await loginUser({ email, password });

      await refreshProfile();
    } catch (err: any) {
      const errorMessage = err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : 'Failed to log in. Please try again.';
      Alert.alert('Login Failed', errorMessage);
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-6">
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

          <View className="items-end">
            <Link href="./forgot-password" asChild>
              <TouchableOpacity>
                <Text className="text-green-600 font-semibold">Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity
            className="bg-green-600 py-4 rounded-xl items-center shadow-sm active:bg-green-700"
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Sign In</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-4 text-gray-400">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center bg-white border border-gray-300 py-4 rounded-xl shadow-sm"
            onPress={() => promptAsync()}
            disabled={!request || isLoading}
          >
            <Ionicons name="logo-google" size={20} color="black" style={{ marginRight: 10 }} />
            <Text className="text-gray-700 font-bold text-lg">Sign in with Google</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6 mb-4">
            <Text className="text-gray-500">Don't have an account? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text className="text-orange-600 font-bold">Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}