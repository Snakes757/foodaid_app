import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { resetPassword } from '../../api/auth';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    Keyboard.dismiss();
    if (!email) {
      showAlert('Missing Email', 'Please enter your email address.', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email);
      showAlert('Email Sent', 'Check your inbox for password reset instructions.', 'success');
      setTimeout(() => router.back(), 2000);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showAlert('Error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      className="bg-white"
    >
      <View className="p-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">Reset Password</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 p-6 justify-center">
          <View className="items-center mb-8">
            <View className="bg-orange-100 p-4 rounded-full mb-4">
              <Ionicons name="key-outline" size={40} color="#EA580C" />
            </View>
            <Text className="text-2xl font-bold text-gray-800">Forgot Password?</Text>
            <Text className="text-gray-500 mt-2 text-center px-4">
              Enter your email address and we'll send you a link to reset your password.
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

            <TouchableOpacity
              className="bg-green-600 py-4 rounded-xl items-center shadow-sm active:bg-green-700 mt-4"
              onPress={handleReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}