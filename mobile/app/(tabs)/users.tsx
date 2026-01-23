import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { getAllUsers, verifyUser } from '@/api/admin';
import { User, Role, VerificationStatus } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function UsersScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      showAlert("Error", "Failed to fetch users.", 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleVerify = (selectedUser: User, status: VerificationStatus) => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to mark ${selectedUser.name} as ${status}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await verifyUser(selectedUser.user_id, status);
              showAlert("Success", `User ${status.toLowerCase()} successfully.`, 'success');
              fetchUsers();
            } catch (error) {
              showAlert("Error", getErrorMessage(error), 'error');
            }
          }
        }
      ]
    );
  };

  const renderUser = ({ item }: { item: User }) => {
    // Only Donors and Receivers need to show documents
    const requiresDocument = item.role === Role.DONOR || item.role === Role.RECEIVER;

    return (
      <View className="bg-white rounded-xl mx-4 mb-3 p-4 shadow-sm border border-gray-100">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  item.role === Role.ADMIN ? 'bg-purple-100' :
                  item.role === Role.DONOR ? 'bg-orange-100' :
                  item.role === Role.RECEIVER ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                   <Ionicons 
                      name={item.role === Role.ADMIN ? 'shield' : 'person'} 
                      size={20} 
                      color={
                          item.role === Role.ADMIN ? '#7E22CE' :
                          item.role === Role.DONOR ? '#EA580C' :
                          item.role === Role.RECEIVER ? '#166534' : '#2563EB'
                      } 
                   />
              </View>
              <View>
                  <Text className="font-bold text-gray-800 text-lg">{item.name}</Text>
                  <Text className="text-gray-500 text-xs">{item.role}</Text>
              </View>
          </View>
          
          <View className={`px-2 py-1 rounded-md ${
              item.verification_status === VerificationStatus.APPROVED ? 'bg-green-100' :
              item.verification_status === VerificationStatus.PENDING ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
              <Text className={`text-xs font-bold ${
                   item.verification_status === VerificationStatus.APPROVED ? 'text-green-800' :
                   item.verification_status === VerificationStatus.PENDING ? 'text-yellow-800' : 'text-red-800'
              }`}>
                  {item.verification_status}
              </Text>
          </View>
        </View>

        <View className="ml-1 mb-3">
          <Text className="text-gray-600 text-sm mb-1">📧 {item.email}</Text>
          <Text className="text-gray-600 text-sm">📍 {item.address || "No address"}</Text>
        </View>
        
        {/* Document Viewer Section */}
        {requiresDocument && (
          <View className="mb-3">
            {item.verification_document_url ? (
              <TouchableOpacity
                onPress={() => setSelectedDocUrl(item.verification_document_url!)}
                className="bg-blue-600 p-3 rounded-lg flex-row items-center justify-center shadow-sm"
              >
                  <Ionicons name="eye-outline" size={20} color="white" />
                  <Text className="ml-2 text-white font-bold">View Verification Document</Text>
              </TouchableOpacity>
            ) : (
              <View className="bg-gray-100 p-3 rounded-lg flex-row items-center justify-center border border-gray-200">
                  <Ionicons name="alert-circle-outline" size={20} color="#6B7280" />
                  <Text className="ml-2 text-gray-500 font-medium italic">No Document Uploaded</Text>
              </View>
            )}
          </View>
        )}

        {item.verification_status === VerificationStatus.PENDING && (
            <View className="flex-row space-x-3 mt-2 pt-3 border-t border-gray-100">
               <TouchableOpacity 
                  onPress={() => handleVerify(item, VerificationStatus.APPROVED)}
                  className="flex-1 bg-green-600 py-2 rounded-lg items-center"
               >
                  <Text className="text-white font-bold">Approve</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                  onPress={() => handleVerify(item, VerificationStatus.REJECTED)}
                  className="flex-1 bg-red-100 py-2 rounded-lg items-center"
               >
                  <Text className="text-red-600 font-bold">Reject</Text>
               </TouchableOpacity>
            </View>
        )}
      </View>
    );
  };

  if (user?.role !== Role.ADMIN) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Ionicons name="lock-closed" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-4">Restricted Access</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-800">User Management</Text>
        <Text className="text-gray-500 text-sm">Verify and manage platform users.</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#166534" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={renderUser}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} />
          }
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
               <Text className="text-gray-400">No users found.</Text>
            </View>
          }
        />
      )}
      
      {/* Document Viewer Modal */}
      <Modal visible={!!selectedDocUrl} transparent={true} animationType="fade">
          <View className="flex-1 bg-black/90 justify-center items-center relative">
             <TouchableOpacity 
               onPress={() => setSelectedDocUrl(null)}
               className="absolute top-12 right-6 z-10 p-2 bg-black/50 rounded-full"
             >
                 <Ionicons name="close" size={32} color="white" />
             </TouchableOpacity>
             
             {selectedDocUrl && (
                 <Image 
                    source={{ uri: selectedDocUrl }} 
                    style={{ width: Dimensions.get('window').width, height: '80%' }}
                    resizeMode="contain"
                 />
             )}
          </View>
      </Modal>
    </View>
  );
}