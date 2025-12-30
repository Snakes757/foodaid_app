import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator,
  Linking,
  TouchableOpacity
} from 'react-native';
import { getMyReservations } from '@/api/reservations';
import { Reservation, Role } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function ReservationsScreen() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = useCallback(async () => {
    try {
      const data = await getMyReservations();
      setReservations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const openMap = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const renderItem = ({ item }: { item: Reservation }) => {
    const post = item.post_details;
    if (!post) return null;

    return (
      <View className="bg-white rounded-xl mb-3 shadow-sm border-l-4 border-l-green-600 mx-4 mt-2 p-4">
        <View className="flex-row justify-between mb-2">
          <Text className="font-bold text-lg text-gray-800">{post.title}</Text>
          <View className="bg-blue-100 px-2 py-1 rounded">
            <Text className="text-blue-800 text-xs font-bold">{item.status}</Text>
          </View>
        </View>

        <Text className="text-gray-600 mb-1">Quantity: {post.quantity}</Text>
        <Text className="text-gray-500 text-xs mb-3">Reserved on: {new Date(item.timestamp).toLocaleDateString()}</Text>

        <View className="flex-row space-x-2 mt-2">
          <TouchableOpacity 
            onPress={() => openMap(post.address)}
            className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
          >
            <Ionicons name="map" size={16} color="#4B5563" />
            <Text className="ml-2 text-gray-700 text-sm">Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-100">
        <Text className="text-xl font-bold text-green-800">
          {user?.role === Role.DONOR ? 'My Outgoing Donations' : 'My Reservations'}
        </Text>
      </View>

      <FlatList
        data={reservations}
        keyExtractor={(item) => item.reservation_id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReservations(); }} colors={["#166534"]} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center mt-20 px-10">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-center mt-4">
              No reservations found.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}