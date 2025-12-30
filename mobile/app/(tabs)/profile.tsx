import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  Image
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { logoutUser } from '@/api/auth';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      "Logout", 
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            await logoutUser();
            // Auth listener in useAuth will handle redirect, but we can force it
            router.replace('/login');
          }
        }
      ]
    );
  };

  const MenuOption = ({ icon, label, onPress, color = "#374151" }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center bg-white p-4 mb-2 rounded-xl border border-gray-100"
    >
      <View className="w-8">
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text className="flex-1 text-base font-medium text-gray-700">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-green-700 pt-10 pb-8 px-6 rounded-b-3xl shadow-sm mb-6">
        <View className="flex-row items-center">
          <View className="bg-white p-3 rounded-full mr-4">
            <Ionicons name="person" size={32} color="#166534" />
          </View>
          <View>
            <Text className="text-white text-xl font-bold">{user?.name || "User"}</Text>
            <Text className="text-green-100">{user?.email}</Text>
            <View className="bg-orange-500 self-start px-2 py-0.5 rounded-md mt-2">
              <Text className="text-white text-xs font-bold uppercase">{user?.role}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-4">
        <Text className="text-gray-500 font-bold mb-2 ml-1 uppercase text-xs">Account</Text>
        <MenuOption icon="person-circle-outline" label="Edit Profile" onPress={() => {}} />
        <MenuOption icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <MenuOption icon="shield-checkmark-outline" label="Privacy & Security" onPress={() => {}} />

        <Text className="text-gray-500 font-bold mb-2 ml-1 mt-4 uppercase text-xs">Support</Text>
        <MenuOption icon="help-circle-outline" label="Help Center" onPress={() => {}} />
        <MenuOption icon="information-circle-outline" label="About FoodAid" onPress={() => {}} />

        <TouchableOpacity 
          onPress={handleLogout}
          className="flex-row items-center bg-red-50 p-4 mt-6 rounded-xl border border-red-100"
        >
          <View className="w-8">
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          </View>
          <Text className="flex-1 text-base font-bold text-red-600">Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      <View className="h-10" />
    </ScrollView>
  );
}