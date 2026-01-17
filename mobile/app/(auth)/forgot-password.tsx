import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { resetPassword } from '@/api/auth';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email);
      Alert.alert(
        'Email Sent',
        'Check your email for a link to reset your password.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      let msg = 'Failed to send reset email.';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
      
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white justify-center px-6"
    >
      <View className="items-center mb-8">
        <View className="bg-green-100 p-4 rounded-full mb-4">
          <Ionicons name="key" size={40} color="#166534" />
        </View>
        <Text className="text-2xl font-bold text-green-800">Reset Password</Text>
        <Text className="text-gray-500 mt-2 text-center px-4">
          Enter your email address and we'll send you a link to reset your password.
        </Text>
      </View>

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

      <TouchableOpacity
        className="bg-green-600 py-4 rounded-xl items-center mt-6 shadow-sm active:bg-green-700"
        onPress={handleReset}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-6 items-center"
        onPress={() => router.back()}
      >
        <Text className="text-gray-500 font-medium">Back to Login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}