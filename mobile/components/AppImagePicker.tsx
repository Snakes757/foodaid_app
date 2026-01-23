import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface AppImagePickerProps {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
}

export default function AppImagePicker({ imageUri, onImageSelected }: AppImagePickerProps) {

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelected(result.assets[0].uri);
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-2">Food Photo</Text>

      <TouchableOpacity
        onPress={pickImage}
        className="bg-gray-50 border border-dashed border-gray-300 rounded-xl h-48 items-center justify-center overflow-hidden"
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center">
            <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
            <Text className="text-gray-400 mt-2">Tap to add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {imageUri && (
        <TouchableOpacity
          onPress={pickImage}
          className="mt-2 self-end"
        >
          <Text className="text-green-600 font-medium text-sm">Change Photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}