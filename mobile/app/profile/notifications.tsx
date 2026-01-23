import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-green-800">Notifications</Text>
      </View>

      <View className="p-6">
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1 pr-4">
              <Text className="font-bold text-gray-800 text-lg">Push Notifications</Text>
              <Text className="text-gray-500 text-sm">
                Receive real-time alerts about donations nearby.
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: "#16a34a" }}
              thumbColor={pushEnabled ? "#f4f3f4" : "#f4f3f4"}
              onValueChange={() => setPushEnabled(prev => !prev)}
              value={pushEnabled}
            />
          </View>
          
          <View className="h-px bg-gray-100 my-2" />

          <View className="flex-row justify-between items-center mt-2">
            <View className="flex-1 pr-4">
              <Text className="font-bold text-gray-800 text-lg">Email Updates</Text>
              <Text className="text-gray-500 text-sm">
                Receive weekly summaries and account alerts.
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: "#16a34a" }}
              thumbColor={emailEnabled ? "#f4f3f4" : "#f4f3f4"}
              onValueChange={() => setEmailEnabled(prev => !prev)}
              value={emailEnabled}
            />
          </View>
        </View>
      </View>
    </View>
  );
}