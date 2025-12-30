import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { getMyReservations } from '@/api/reservations'; // Using reservations API to see interactions on my posts
import { Reservation, Role, PostStatus } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MyPostsScreen() {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // For Donors, the backend /reservations/me endpoint returns reservations made AGAINST their posts.
  // This effectively acts as an "Active Orders" dashboard.

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getMyReservations();
      setActiveOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const renderOrder = ({ item }: { item: Reservation }) => {
    const post = item.post_details;
    if (!post) return null;

    const isDelivered = post.status === PostStatus.DELIVERED;

    return (
      <View className="bg-white rounded-xl mx-4 mb-4 shadow-sm border border-gray-200 overflow-hidden">
        <View className={`p-3 flex-row justify-between items-center ${isDelivered ? 'bg-gray-100' : 'bg-orange-100'}`}>
          <Text className={`font-bold ${isDelivered ? 'text-gray-600' : 'text-orange-800'}`}>
            Order #{item.reservation_id.slice(-4)}
          </Text>
          <View className={`px-2 py-1 rounded ${isDelivered ? 'bg-gray-200' : 'bg-orange-200'}`}>
             <Text className={`text-xs font-bold ${isDelivered ? 'text-gray-600' : 'text-orange-800'}`}>
               {post.status}
             </Text>
          </View>
        </View>

        <View className="p-4">
          <Text className="text-lg font-bold text-gray-800 mb-1">{post.title}</Text>
          <Text className="text-gray-600 mb-3">{post.quantity}</Text>

          <View className="flex-row items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
            <Ionicons name="person-circle" size={24} color="#4B5563" />
            <View className="ml-2">
              <Text className="text-xs text-gray-500 uppercase font-bold">Receiver</Text>
              <Text className="text-gray-800 text-sm">
                {item.receiver_details?.name || "Verified Receiver"}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row justify-between items-center">
             <Text className="text-xs text-gray-400">
                Reserved: {new Date(item.timestamp).toLocaleDateString()}
             </Text>
             <Text className="text-xs font-bold text-gray-500 uppercase">
                {item.delivery_method || "Pickup"}
             </Text>
          </View>
        </View>
      </View>
    );
  };

  if (user?.role !== Role.DONOR) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-500">Only Donors can view this page.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200 flex-row justify-between items-center">
        <View>
          <Text className="text-xl font-bold text-green-800">My Active Orders</Text>
          <Text className="text-gray-500 text-sm">Track reservations on your posts.</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/create')}
          className="bg-green-600 p-2 rounded-full"
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#166534" />
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.reservation_id}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={["#166534"]} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center mt-20 px-6">
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4 text-lg">No active orders.</Text>
              <Text className="text-gray-400 text-center mt-1 mb-6">
                Posts that have been reserved by receivers will appear here.
              </Text>
              <TouchableOpacity 
                onPress={() => router.push('/create')}
                className="bg-orange-600 px-6 py-3 rounded-full shadow-sm"
              >
                <Text className="text-white font-bold">Create New Post</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}