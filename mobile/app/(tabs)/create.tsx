import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { createNewPost } from '@/api/posts';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/api';

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Basic form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  
  // Handling date as string for simplicity to avoid uninstalled dependencies 
  // format: YYYY-MM-DD
  const [expiryDate, setExpiryDate] = useState('');

  const handleCreate = async () => {
    if (!title || !quantity || !address || !expiryDate) {
      Alert.alert("Missing Fields", "Please fill in Title, Quantity, Address, and Expiry.");
      return;
    }

    try {
      setIsLoading(true);
      
      // Simple date parsing
      const expiry = new Date(expiryDate).toISOString();

      await createNewPost({
        title,
        description,
        quantity,
        address,
        expiry,
        image_url: '' // Placeholder for now
      });

      Alert.alert("Success", "Food posted successfully!", [
        { text: "OK", onPress: () => {
            // Reset form
            setTitle('');
            setDescription('');
            setQuantity('');
            setExpiryDate('');
            router.push('/feed');
        }}
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to create post. Please check your inputs.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role !== Role.DONOR) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-6">
        <Ionicons name="lock-closed" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 text-center mt-4">
          Only registered Donors can post food.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1 px-6 py-6">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-green-800">Share Food</Text>
          <Text className="text-gray-500">Help reduce waste by sharing surplus.</Text>
        </View>

        <View className="space-y-4 pb-10">
          <View>
            <Text className="text-gray-700 font-medium mb-1">Title</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="e.g. 10 Loaves of Bread"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-1">Quantity</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="e.g. 5kg, 3 Boxes"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-1">Description (Optional)</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-24"
              placeholder="Any details about condition or contents..."
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-1">Pickup Address</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <View>
            <Text className="text-gray-700 font-medium mb-1">Expiry Date (YYYY-MM-DD)</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              placeholder="2025-12-31"
              value={expiryDate}
              onChangeText={setExpiryDate}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <TouchableOpacity 
            className="bg-orange-600 py-4 rounded-xl items-center mt-6 shadow-sm active:bg-orange-700"
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Post Donation</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}