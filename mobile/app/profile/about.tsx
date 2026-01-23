import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-green-800">About FoodAid</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="items-center mb-8 mt-4">
          <View className="bg-orange-100 p-6 rounded-full mb-4">
            <Ionicons name="nutrition" size={64} color="#EA580C" />
          </View>
          <Text className="text-2xl font-bold text-gray-800">FoodAid</Text>
          <Text className="text-gray-500 font-medium">Version 1.0.0</Text>
        </View>

        <View className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
          <Text className="text-gray-700 leading-6 text-center">
            FoodAid is a platform dedicated to reducing food waste and helping those in need. We connect restaurants, bakeries, and supermarkets with surplus food to local NGOs and shelters.
          </Text>
        </View>

        <View className="space-y-4">
          <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-xl border border-gray-100">
            <Ionicons name="document-text-outline" size={24} color="#4B5563" />
            <Text className="flex-1 ml-4 text-gray-700 font-medium">Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-xl border border-gray-100">
            <Ionicons name="shield-checkmark-outline" size={24} color="#4B5563" />
            <Text className="flex-1 ml-4 text-gray-700 font-medium">Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-xl border border-gray-100">
            <Ionicons name="star-outline" size={24} color="#4B5563" />
            <Text className="flex-1 ml-4 text-gray-700 font-medium">Rate Us</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        <Text className="text-center text-gray-400 text-xs mt-10 mb-4">
          © 2026 FoodAid Inc. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}