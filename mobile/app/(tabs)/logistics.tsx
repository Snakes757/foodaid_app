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
import { getAvailableDeliveries, getMyActiveJobs, acceptDelivery, updateDeliveryStatus } from '@/api/logistics';
import { FoodPostResponse, PostStatus, Role } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function LogisticsScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [activeJobs, setActiveJobs] = useState<FoodPostResponse[]>([]);
  const [availableJobs, setAvailableJobs] = useState<FoodPostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [active, available] = await Promise.all([
        getMyActiveJobs(),
        getAvailableDeliveries()
      ]);
      setActiveJobs(active);
      setAvailableJobs(available);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
              showAlert("Success", "You have been assigned this delivery.", 'success');
              fetchData();
            } catch (error) {
              showAlert("Error", getErrorMessage(error), 'error');
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (job: FoodPostResponse, newStatus: PostStatus.IN_TRANSIT | PostStatus.DELIVERED) => {
    const action = newStatus === PostStatus.IN_TRANSIT ? "Confirm Pickup" : "Complete Delivery";
    
    Alert.alert(
      action,
      `Are you sure you want to mark this job as ${newStatus === PostStatus.IN_TRANSIT ? 'picked up' : 'delivered'}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateDeliveryStatus(job.post_id, newStatus);
              showAlert("Success", "Job status updated.", 'success');
              fetchData();
            } catch (error) {
              showAlert("Error", getErrorMessage(error), 'error');
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

  const renderActiveJob = ({ item }: { item: FoodPostResponse }) => {
    const isInTransit = item.status === PostStatus.IN_TRANSIT;
    
    return (
      <View className="bg-white rounded-xl mx-4 mb-4 shadow-md border border-green-200 overflow-hidden">
        <View className={`${isInTransit ? 'bg-orange-600' : 'bg-green-700'} p-3 flex-row justify-between items-center`}>
          <View className="flex-row items-center">
            <Ionicons name={isInTransit ? "bicycle" : "clipboard"} size={20} color="white" />
            <Text className="text-white font-bold ml-2">
              {isInTransit ? "In Transit" : "Accepted - Pickup Pending"}
            </Text>
          </View>
        </View>

        <View className="p-4">
          <Text className="text-xl font-bold text-gray-800 mb-1">{item.title}</Text>
          <Text className="text-gray-500 mb-3">{item.quantity}</Text>

          <View className="flex-row items-start mb-4">
            <Ionicons name="location" size={20} color="#EA580C" style={{ marginTop: 2 }} />
            <View className="ml-2 flex-1">
              <Text className="text-gray-500 text-xs uppercase font-bold">Destination</Text>
              <Text className="text-gray-800 text-base">{item.address}</Text>
            </View>
          </View>

          <View className="flex-row space-x-3 mt-2">
             <TouchableOpacity
                onPress={() => openMaps(item.address)}
                className="flex-1 bg-gray-100 py-3 rounded-lg items-center flex-row justify-center"
              >
                <Ionicons name="navigate" size={18} color="#4B5563" />
                <Text className="text-gray-700 font-bold ml-2">Directions</Text>
              </TouchableOpacity>

              {item.status === PostStatus.RESERVED ? (
                 <TouchableOpacity
                    onPress={() => handleUpdateStatus(item, PostStatus.IN_TRANSIT)}
                    className="flex-1 bg-orange-600 py-3 rounded-lg items-center"
                  >
                    <Text className="text-white font-bold">Confirm Pickup</Text>
                  </TouchableOpacity>
              ) : (
                 <TouchableOpacity
                    onPress={() => handleUpdateStatus(item, PostStatus.DELIVERED)}
                    className="flex-1 bg-green-700 py-3 rounded-lg items-center"
                  >
                    <Text className="text-white font-bold">Complete Delivery</Text>
                  </TouchableOpacity>
              )}
          </View>
        </View>
      </View>
    );
  };

  const renderAvailableJob = ({ item }: { item: FoodPostResponse }) => (
    <View className="bg-white rounded-xl mx-4 mb-4 shadow-sm border border-gray-200 overflow-hidden opacity-90">
      <View className="bg-blue-600 p-3 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Ionicons name="cube" size={20} color="white" />
          <Text className="text-white font-bold ml-2">New Request</Text>
        </View>
        <Text className="text-blue-100 text-xs bg-blue-700 px-2 py-1 rounded">
          {item.quantity}
        </Text>
      </View>

      <View className="p-4">
        <Text className="text-lg font-bold text-gray-800 mb-1">{item.title}</Text>
        <Text className="text-gray-600 mb-3" numberOfLines={1}>{item.address}</Text>

        <TouchableOpacity
          onPress={() => handleAccept(item)}
          className="w-full bg-blue-600 py-3 rounded-lg items-center shadow-sm"
        >
          <Text className="text-white font-bold">Accept Job</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-blue-900">Driver Dashboard</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={[...activeJobs, ...availableJobs]}
          keyExtractor={(item) => item.post_id}
          renderItem={({ item }) => {
             const isActive = activeJobs.some(j => j.post_id === item.post_id);
             return isActive ? renderActiveJob({ item }) : renderAvailableJob({ item });
          }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
          }
          ListHeaderComponent={
             (activeJobs.length === 0 && availableJobs.length === 0) ? (
                <View className="items-center justify-center mt-20 px-6">
                  <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
                  <Text className="text-gray-500 text-center mt-4 text-lg">All caught up!</Text>
                  <Text className="text-gray-400 text-center mt-1">No pending deliveries found nearby.</Text>
                </View>
             ) : null
          }
        />
      )}
    </View>
  );
}