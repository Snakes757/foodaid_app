import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { createNewPost } from '@/api/posts';
import { uploadImage } from '@/api/storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import AppImagePicker from '@/components/AppImagePicker';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expiryDate;
    setShowDatePicker(Platform.OS === 'ios');
    setExpiryDate(currentDate);
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Please allow location access to use this feature.', 'warning');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse.length > 0) {
        const place = addressResponse[0];
        const formattedAddress = [
          place.name !== place.street ? place.name : '',
          place.streetNumber,
          place.street,
          place.city,
          place.region,
          place.postalCode
        ].filter(part => part && part.trim() !== '').join(', ');

        setAddress(formattedAddress);
      }
    } catch (error) {
      showAlert('Location Error', 'Could not fetch current location. Please try again or enter manually.', 'error');
      console.error(error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleCreate = async () => {
    Keyboard.dismiss();

    if (!title || !quantity || !address) {
      showAlert("Missing Fields", "Please fill in Title, Quantity, and Address.", 'warning');
      return;
    }

    if (expiryDate < new Date()) {
      showAlert("Invalid Date", "Expiry date must be in the future.", 'warning');
      return;
    }

    try {
      setIsLoading(true);
      let finalImageUrl = '';

      if (imageUri) {
        finalImageUrl = await uploadImage(imageUri, 'food-posts');
      }

      const expiryISO = expiryDate.toISOString();

      await createNewPost({
        title,
        description,
        quantity,
        address,
        expiry: expiryISO,
        image_url: finalImageUrl
      });

      showAlert("Success", "Food posted successfully!", 'success');
      
      // Reset form
      setTitle('');
      setDescription('');
      setQuantity('');
      setAddress(user?.address || '');
      setImageUri(null);
      setExpiryDate(new Date());
      router.push('/feed');

    } catch (error: any) {
      const msg = getErrorMessage(error);
      showAlert("Error", msg, 'error');
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
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      className="bg-white"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          className="flex-1 px-6 py-6" 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="mb-6">
            <Text className="text-2xl font-bold text-green-800">Share Food</Text>
            <Text className="text-gray-500">Help reduce waste by sharing surplus.</Text>
          </View>

          <View className="space-y-4">
            
            <AppImagePicker imageUri={imageUri} onImageSelected={setImageUri} />

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
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <TextInput
                  className="flex-1 py-3 text-gray-800"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address manually"
                  multiline
                />
                <TouchableOpacity 
                  onPress={handleUseCurrentLocation} 
                  disabled={isGettingLocation}
                  className="p-2 ml-1"
                >
                  {isGettingLocation ? (
                    <ActivityIndicator color="#EA580C" size="small" />
                  ) : (
                    <Ionicons name="location" size={24} color="#EA580C" />
                  )}
                </TouchableOpacity>
              </View>
              <Text className="text-xs text-gray-400 mt-1 ml-1">
                Tap the icon to use your current location.
              </Text>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-1">Expiry Date</Text>

              {Platform.OS === 'android' && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className="text-gray-800">
                    {expiryDate.toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}

              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={expiryDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setExpiryDate(date);
                  }}
                  minimumDate={new Date()}
                />
              )}

              {Platform.OS === 'ios' && (
                <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 items-start">
                    <DateTimePicker
                      value={expiryDate}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                      minimumDate={new Date()}
                      style={{ alignSelf: 'flex-start' }}
                    />
                </View>
              )}
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}