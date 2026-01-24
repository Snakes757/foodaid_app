import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deleteMyAccount, logoutUser } from '@/api/auth';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function PrivacyScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    Keyboard.dismiss();
    
    if (!deleteReason.trim()) {
      Alert.alert("Reason Required", "Please tell us why you are leaving so we can improve.");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteMyAccount(deleteReason);
      
      // Perform local cleanup
      await logoutUser();
      
      setShowDeleteModal(false);
      showAlert("Account Deleted", "Your account has been permanently removed.", 'success');
      
      // Navigate to login after a brief delay
      setTimeout(() => {
        router.replace('/login');
      }, 1500);

    } catch (error) {
      const msg = getErrorMessage(error);
      showAlert("Deletion Failed", msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

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

        <TouchableOpacity 
          onPress={() => router.push('../auth/forgot-password')} 
          className="mt-6 bg-white p-4 rounded-xl border border-gray-200 flex-row justify-between items-center"
        >
          <Text className="font-medium text-gray-700">Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setShowDeleteModal(true)}
          className="mt-2 bg-white p-4 rounded-xl border border-gray-200 flex-row justify-between items-center"
        >
          <Text className="font-medium text-red-600">Delete Account</Text>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>
      </View>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="bg-white w-full rounded-2xl p-6 shadow-xl">
              <View className="items-center mb-4">
                <View className="bg-red-100 p-3 rounded-full mb-3">
                  <Ionicons name="warning" size={32} color="#DC2626" />
                </View>
                <Text className="text-xl font-bold text-gray-800 text-center">Delete Account?</Text>
                <Text className="text-gray-500 text-center mt-2 text-sm leading-5">
                  This action is permanent and cannot be undone. All your data will be erased.
                </Text>
              </View>

              <Text className="text-gray-700 font-bold mb-2 text-sm">Reason for leaving:</Text>
              <TextInput 
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-24 mb-6 text-gray-800"
                multiline
                textAlignVertical="top"
                placeholder="e.g. I no longer need this service..."
                value={deleteReason}
                onChangeText={setDeleteReason}
              />

              <View className="flex-row gap-x-3">
                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-red-600 items-center"
                >
                  {isDeleting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-bold">Confirm Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>
    </View>
  );
}