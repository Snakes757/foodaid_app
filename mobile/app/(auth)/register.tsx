import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { registerUser } from '../../api/auth';
import { uploadImage } from '@/api/storage';
import { Role } from '../../types/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export default function RegisterScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    address: '',
    role: Role.DONOR
  });

  const [documentUri, setDocumentUri] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

        updateField('address', formattedAddress);
      }
    } catch (error) {
      showAlert('Location Error', 'Could not fetch current location. Please try again or enter manually.', 'error');
      console.error(error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const pickDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Camera roll permissions needed to upload documents.', 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!formData.name || !formData.email || !formData.password || !formData.address) {
      showAlert('Missing Fields', 'Please fill in all required fields.', 'warning');
      return;
    }

    if (!documentUri) {
       showAlert('Verification Required', 'Please upload a photo of your business license or ID.', 'warning');
       return;
    }

    try {
      setIsLoading(true);

      const docUrl = await uploadImage(documentUri, 'verification-docs');

      await registerUser({
        ...formData,
        verification_document_url: docUrl
      });

      showAlert(
        'Success',
        'Account created successfully! Please log in.',
        'success'
      );

      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showAlert('Registration Failed', msg, 'error');
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
      style={{ flex: 1 }}
      className="bg-white"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="text-3xl font-bold text-green-800">Create Account</Text>
            <Text className="text-gray-500">Join the movement to end food waste.</Text>
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
                placeholder="e.g. Joe's Bakery"
                value={formData.name}
                onChangeText={(t) => updateField('name', t)}
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-1 font-medium">Email</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                placeholder="email@address.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(t) => updateField('email', t)}
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
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <TextInput
                  className="flex-1 py-3 text-gray-800"
                  placeholder="Street, Suburb, City"
                  value={formData.address}
                  onChangeText={(t) => updateField('address', t)}
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
              <Text className="text-gray-700 mb-1 font-medium">Password</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                placeholder="Min 6 characters"
                secureTextEntry
                value={formData.password}
                onChangeText={(t) => updateField('password', t)}
              />
            </View>

            {/* Verification Document Upload */}
            <View className="mt-2">
               <Text className="text-gray-700 mb-2 font-medium">Verification Document</Text>
               <TouchableOpacity
                  onPress={pickDocument}
                  className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 items-center justify-center h-32"
               >
                  {documentUri ? (
                      <View className="items-center">
                         <Image source={{ uri: documentUri }} className="w-20 h-20 rounded mb-1" resizeMode="cover" />
                         <Text className="text-green-600 text-xs font-bold">Document Selected</Text>
                      </View>
                  ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={32} color="#9CA3AF" />
                        <Text className="text-gray-500 text-center text-sm mt-2">
                           Upload Business License / ID
                        </Text>
                      </>
                  )}
               </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="bg-green-600 py-4 rounded-xl items-center mt-4 shadow-sm"
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Create Account</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6 mb-8">
              <Text className="text-gray-500">Already a member? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text className="text-orange-600 font-bold">Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}