import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50">
       <View className="bg-white p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-green-800">Privacy & Security</Text>
      </View>

      <View className="p-6">
        <View className="bg-white p-6 rounded-xl border border-gray-100 items-center justify-center">
          <Ionicons name="lock-closed-outline" size={48} color="#166534" />
          <Text className="text-center text-gray-800 font-bold text-lg mt-4">
            Your data is secure
          </Text>
          <Text className="text-center text-gray-500 mt-2">
            We use industry standard encryption to protect your personal information and location data.
          </Text>
        </View>

        <TouchableOpacity className="mt-6 bg-white p-4 rounded-xl border border-gray-200 flex-row justify-between items-center">
          <Text className="font-medium text-gray-700">Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>

        <TouchableOpacity className="mt-2 bg-white p-4 rounded-xl border border-gray-200 flex-row justify-between items-center">
          <Text className="font-medium text-red-600">Delete Account</Text>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>
      </View>
    </View>
  );
}