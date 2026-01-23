import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { updateUserProfile } from '../../api/auth';
import { Ionicons } from '@expo/vector-icons';
import { Role } from '../../types/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    address: '',
  });

  // Banking Details for Receivers
  const [bankData, setBankData] = useState({
    bank_name: '',
    account_number: '',
    branch_code: '',
    account_holder: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
      });

      if (user.role === Role.RECEIVER && user.banking_details) {
        setBankData({
          bank_name: user.banking_details.bank_name || '',
          account_number: user.banking_details.account_number || '',
          branch_code: user.banking_details.branch_code || '',
          account_holder: user.banking_details.account_holder || ''
        });
      }
    }
  }, [user]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateBankField = (field: string, value: string) => {
    setBankData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!formData.name || !formData.address) {
      Alert.alert('Missing Fields', 'Name and Address are required.');
      return;
    }

    let payload: any = { ...formData };

    if (user?.role === Role.RECEIVER) {
        // Validation for banking details if any field is filled
        const hasBankData = Object.values(bankData).some(val => val.length > 0);
        const allBankData = Object.values(bankData).every(val => val.length > 0);

        if (hasBankData && !allBankData) {
            Alert.alert('Incomplete Banking Details', 'Please fill in all banking fields or leave them all empty.');
            return;
        }

        if (allBankData) {
            payload.banking_details = bankData;
        }
    }

    try {
      setIsLoading(true);
      await updateUserProfile(payload);
      await refreshProfile();

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update profile.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      className="bg-gray-50"
    >
      <View className="bg-white p-4 border-b border-gray-200 flex-row items-center z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-green-800">Edit Profile</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1 px-6 py-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 mb-1 font-medium">Full Name / Organization</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3"
                value={formData.name}
                onChangeText={(t) => updateField('name', t)}
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-1 font-medium">Email (Read Only)</Text>
              <TextInput
                className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500"
                value={user?.email}
                editable={false}
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-1 font-medium">Phone Number</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3"
                value={formData.phone_number}
                onChangeText={(t) => updateField('phone_number', t)}
                keyboardType="phone-pad"
                placeholder="+27..."
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-1 font-medium">Physical Address</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3"
                value={formData.address}
                onChangeText={(t) => updateField('address', t)}
                multiline
              />
              <Text className="text-xs text-gray-400 mt-1">
                Used to calculate distances for donations.
              </Text>
            </View>

            {/* Banking Details Section - Only for Receivers */}
            {user?.role === Role.RECEIVER && (
                <View className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <View className="flex-row items-center mb-3">
                         <Ionicons name="card" size={20} color="#1E40AF" />
                         <Text className="text-blue-800 font-bold ml-2 text-lg">Banking Details</Text>
                    </View>
                    <Text className="text-blue-600 text-xs mb-4">
                        Required to receive cash disbursements from the platform.
                    </Text>

                    <View className="space-y-3">
                         <View>
                             <Text className="text-blue-900 font-medium text-xs mb-1">Bank Name</Text>
                             <TextInput
                                className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm"
                                placeholder="e.g. FNB, Capitec"
                                value={bankData.bank_name}
                                onChangeText={(t) => updateBankField('bank_name', t)}
                             />
                         </View>
                         <View>
                             <Text className="text-blue-900 font-medium text-xs mb-1">Account Holder</Text>
                             <TextInput
                                className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm"
                                placeholder="Organization Name"
                                value={bankData.account_holder}
                                onChangeText={(t) => updateBankField('account_holder', t)}
                             />
                         </View>
                         <View className="flex-row space-x-2">
                             <View className="flex-1">
                                 <Text className="text-blue-900 font-medium text-xs mb-1">Account Number</Text>
                                 <TextInput
                                    className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm"
                                    placeholder="1234567890"
                                    keyboardType="numeric"
                                    value={bankData.account_number}
                                    onChangeText={(t) => updateBankField('account_number', t)}
                                 />
                             </View>
                             <View className="flex-1">
                                 <Text className="text-blue-900 font-medium text-xs mb-1">Branch Code</Text>
                                 <TextInput
                                    className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm"
                                    placeholder="250655"
                                    keyboardType="numeric"
                                    value={bankData.branch_code}
                                    onChangeText={(t) => updateBankField('branch_code', t)}
                                 />
                             </View>
                         </View>
                    </View>
                </View>
            )}

            <TouchableOpacity
              className="bg-green-600 py-4 rounded-xl items-center mt-6 shadow-sm mb-10"
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}