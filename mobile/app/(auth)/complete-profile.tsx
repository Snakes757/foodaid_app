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
import { useRouter } from 'expo-router';
import { registerGoogleUser } from '@/api/auth';
import { Role } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { firebaseUser, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    role: Role.DONOR
  });

  useEffect(() => {
    if (firebaseUser) {
      setFormData(prev => ({
        ...prev,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || prev.name
      }));
    }
  }, [firebaseUser]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFinishSetup = async () => {
    if (!formData.name || !formData.address) {
      Alert.alert('Missing Fields', 'Please fill in Name and Address.');
      return;
    }

    try {
      setIsLoading(true);
      await registerGoogleUser(formData);
      
      // Refresh profile to trigger AuthLayout redirect
      await refreshProfile();
      
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Setup failed. Please try again.';
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
          <Text className="text-3xl font-bold text-green-800">Complete Setup</Text>
          <Text className="text-gray-500">Just a few more details to get started.</Text>
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
              value={formData.name}
              onChangeText={(t) => updateField('name', t)}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Email</Text>
            <TextInput
              className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500"
              value={formData.email}
              editable={false}
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

          <TouchableOpacity
            className="bg-green-600 py-4 rounded-xl items-center mt-4 shadow-sm"
            onPress={handleFinishSetup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Finish Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}