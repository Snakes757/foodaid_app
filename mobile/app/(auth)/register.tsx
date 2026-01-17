import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { registerUser, getUserProfile } from '@/api/auth';
import { Role } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Google Auth
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '563755773205-k42e64mrl7m2e0055f5u8reu92ndm6m6.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      handleGoogleSignUp(credential);
    }
  }, [response]);

  const handleGoogleSignUp = async (credential: any) => {
    try {
      setIsLoading(true);
      await signInWithCredential(auth, credential);
      
      try {
        await getUserProfile();
        await refreshProfile();
      } catch (error) {
        // Profile doesn't exist, go to completion
        router.push('./complete-profile');
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert("Google Error", error.message);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    address: '',
    role: Role.DONOR
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.address) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    try {
      setIsLoading(true);
      await registerUser(formData);
      Alert.alert(
        'Success',
        'Account created successfully! Please log in.',
        [{ text: 'OK', onPress: () => router.push('/login') }]
      );
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoleButton = (role: Role, icon: keyof typeof Ionicons.glyphMap, label: string) => (
    <TouchableOpacity
      onPress={() => updateField('role', role)}
      className={`flex-1 p-3 rounded-xl border items-center justify-center mr-2 ${
        formData.role === role
          ? 'bg-orange-50 border-orange-500'
          : 'bg-white border-gray-200'
      }`}
    >
      <Ionicons
        name={icon}
        size={24}
        color={formData.role === role ? '#EA580C' : '#6B7280'}
      />
      <Text className={`mt-1 font-medium ${
        formData.role === role ? 'text-orange-700' : 'text-gray-500'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1 px-6 pt-10">
        <View className="mb-6">
          <Text className="text-3xl font-bold text-green-800">Create Account</Text>
          <Text className="text-gray-500">Join the movement to end food waste.</Text>
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-bold mb-3">I am a:</Text>
          <View className="flex-row">
            {renderRoleButton(Role.DONOR, 'restaurant', 'Donor')}
            {renderRoleButton(Role.RECEIVER, 'heart', 'Receiver')}
            {renderRoleButton(Role.LOGISTICS, 'bicycle', 'Driver')}
          </View>
        </View>

        <View className="space-y-4 pb-10">
          <View>
            <Text className="text-gray-700 mb-1 font-medium">Full Name / Organization</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="e.g. Joe's Bakery"
              value={formData.name}
              onChangeText={(t) => updateField('name', t)}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Email</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="email@address.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(t) => updateField('email', t)}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Phone Number</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="+27 12 345 6789"
              keyboardType="phone-pad"
              value={formData.phone_number}
              onChangeText={(t) => updateField('phone_number', t)}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Physical Address</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="Street, Suburb, City"
              value={formData.address}
              onChangeText={(t) => updateField('address', t)}
              multiline
            />
            <Text className="text-xs text-gray-400 mt-1">
              Used to locate you on the map.
            </Text>
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Password</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="Min 6 characters"
              secureTextEntry
              value={formData.password}
              onChangeText={(t) => updateField('password', t)}
            />
          </View>

          <TouchableOpacity
            className="bg-green-600 py-4 rounded-xl items-center mt-4 shadow-sm"
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Create Account</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-4">
             <View className="flex-1 h-px bg-gray-200" />
             <Text className="mx-4 text-gray-400">OR</Text>
             <View className="flex-1 h-px bg-gray-200" />
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center bg-white border border-gray-300 py-4 rounded-xl shadow-sm mb-4"
            onPress={() => promptAsync()}
            disabled={!request || isLoading}
          >
            <Ionicons name="logo-google" size={20} color="black" style={{ marginRight: 10 }} />
            <Text className="text-gray-700 font-bold text-lg">Sign up with Google</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-2 mb-8">
            <Text className="text-gray-500">Already a member? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text className="text-orange-600 font-bold">Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}