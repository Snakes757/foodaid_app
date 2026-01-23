import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { logoutUser } from '@/api/auth';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logoutUser();
    router.replace('/login');
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
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
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

          <MenuOption
            icon="person-circle-outline"
            label="Edit Profile"
            onPress={() => router.push('/profile/edit')}
          />
          <MenuOption
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/profile/notifications')}
          />
          <MenuOption
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={() => router.push('/profile/privacy')}
          />

          <Text className="text-gray-500 font-bold mb-2 ml-1 mt-4 uppercase text-xs">Support</Text>

          <MenuOption
            icon="help-circle-outline"
            label="Help Center"
            onPress={() => router.push('/profile/help')}
          />
          <MenuOption
            icon="information-circle-outline"
            label="About FoodAid"
            onPress={() => router.push('/profile/about')}
          />

          <TouchableOpacity
            onPress={() => setShowLogoutModal(true)}
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

      {/* Custom Logout Modal */}
      <Modal
        transparent
        visible={showLogoutModal}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <TouchableWithoutFeedback onPress={() => setShowLogoutModal(false)}>
            <View className="absolute inset-0" />
          </TouchableWithoutFeedback>
          <View className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl items-center">
            <View className="p-4 rounded-full mb-4 bg-red-100">
              <Ionicons name="log-out" size={32} color="#DC2626" />
            </View>

            <Text className="text-xl font-bold text-gray-800 text-center mb-2">
              Sign Out
            </Text>

            <Text className="text-gray-500 text-center mb-6 leading-5">
              Are you sure you want to log out of your account?
            </Text>

            <View className="flex-row gap-x-3 w-full">
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 active:bg-gray-200"
              >
                <Text className="text-gray-700 font-bold text-center text-lg">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                className="flex-1 py-3 rounded-xl bg-red-600 active:bg-red-700"
              >
                <Text className="text-white font-bold text-center text-lg">Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}