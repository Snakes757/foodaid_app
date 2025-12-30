import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  Linking 
} from 'react-native';
import { getAvailableDeliveries, acceptDelivery, updateDeliveryStatus } from '@/api/logistics';
import { FoodPostResponse, PostStatus, Role } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function LogisticsScreen() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<FoodPostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Note: Currently the backend only provides "Available" (unassigned) jobs.
  // A "My Active Jobs" endpoint would be needed to show jobs already accepted by this driver.
  // For this demo, we focus on finding and accepting new work.

  const fetchJobs = useCallback(async () => {
    try {
      const data = await getAvailableDeliveries();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAccept = async (job: FoodPostResponse) => {
    Alert.alert(
      "Accept Delivery",
      `Do you want to accept the delivery for "${job.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Accept Job", 
          onPress: async () => {
            try {
              await acceptDelivery(job.post_id);
              Alert.alert("Success", "You have been assigned this delivery.");
              fetchJobs(); // Refresh list to remove it (since it's no longer 'available')
            } catch (error) {
              Alert.alert("Error", "Failed to accept job.");
            }
          } 
        }
      ]
    );
  };

  const openMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  if (user?.role !== Role.LOGISTICS) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-500">Access Restricted</Text>
      </View>
    );
  }

  const renderJob = ({ item }: { item: FoodPostResponse }) => (
    <View className="bg-white rounded-xl mx-4 mb-4 shadow-sm border border-gray-200 overflow-hidden">
      <View className="bg-blue-600 p-3 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Ionicons name="cube" size={20} color="white" />
          <Text className="text-white font-bold ml-2">Delivery Request</Text>
        </View>
        <Text className="text-blue-100 text-xs bg-blue-700 px-2 py-1 rounded">
          {item.quantity}
        </Text>
      </View>

      <View className="p-4">
        <Text className="text-lg font-bold text-gray-800 mb-1">{item.title}</Text>
        
        <View className="flex-row items-start mt-2">
          <Ionicons name="location" size={16} color="#4B5563" style={{ marginTop: 2 }} />
          <View className="ml-2 flex-1">
            <Text className="text-gray-500 text-xs uppercase font-bold">Pickup Location</Text>
            <Text className="text-gray-800 mb-2">{item.address}</Text>
          </View>
        </View>

        {item.donor_details && (
           <View className="flex-row items-center mb-4 ml-6">
             <Text className="text-gray-500 text-sm">Donor: {item.donor_details.name}</Text>
           </View>
        )}

        <View className="flex-row space-x-3 mt-2 border-t border-gray-100 pt-3">
          <TouchableOpacity 
            onPress={() => openMaps(item.address)}
            className="flex-1 bg-gray-100 py-3 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-bold">Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleAccept(item)}
            className="flex-1 bg-blue-600 py-3 rounded-lg items-center shadow-sm"
          >
            <Text className="text-white font-bold">Accept Job</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-blue-900">Available Jobs</Text>
        <Text className="text-gray-500 text-sm">Select a delivery to start.</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.post_id}
          renderItem={renderJob}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs(); }} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center mt-20 px-6">
              <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4 text-lg">All caught up!</Text>
              <Text className="text-gray-400 text-center mt-1">No pending deliveries found nearby.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}