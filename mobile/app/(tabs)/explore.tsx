import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator 
} from 'react-native';
import { getAvailablePosts } from '@/api/posts';
import { FoodPostResponse } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';

/**
 * Explore Screen
 * Allows users to find donations nearby.
 * Uses external linking to Google Maps for production reliability 
 * without needing 'react-native-maps' configuration immediately.
 */
export default function ExploreScreen() {
  const [posts, setPosts] = useState<FoodPostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await getAvailablePosts();
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openInMaps = (address: string) => {
    // Universal link for maps
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
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
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-green-800">Explore Nearby</Text>
        <Text className="text-gray-500 text-sm">Find donations in your area.</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.post_id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View className="flex-row bg-white p-4 rounded-xl mb-3 items-center shadow-sm">
            <View className="bg-orange-100 p-3 rounded-full mr-4">
              <Ionicons name="location" size={24} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-800">{item.title}</Text>
              <Text className="text-gray-600 text-sm" numberOfLines={1}>{item.address}</Text>
              <Text className="text-green-600 text-xs font-medium mt-1">
                {item.quantity} • {item.distance_km ? `${item.distance_km.toFixed(1)}km` : 'Distance unavailable'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => openInMaps(item.address)}
              className="bg-gray-100 p-2 rounded-lg"
            >
              <Ionicons name="navigate-circle" size={28} color="#166534" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 mt-10">No locations found.</Text>
        }
      />
    </View>
  );
}