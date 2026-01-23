import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert
} from 'react-native';
import { getAvailablePosts } from '@/api/posts';
import { FoodPostResponse } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function ExploreScreen() {
  const [posts, setPosts] = useState<FoodPostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Get Location First
      const { status } = await Location.requestForegroundPermissionsAsync();
      let currentLat = undefined;
      let currentLng = undefined;

      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(loc);
          currentLat = loc.coords.latitude;
          currentLng = loc.coords.longitude;
        } catch (locErr) {
          console.log("Could not fetch location:", locErr);
        }
      }

      // 2. Fetch Posts with Coordinates (if available)
      const data = await getAvailablePosts(currentLat, currentLng);
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openInMaps = (address: string) => {
    // Use directions mode
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#166534" />
        <Text className="text-gray-400 mt-2 text-sm">Finding nearby food...</Text>
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
        refreshing={isLoading}
        onRefresh={loadData}
        renderItem={({ item }) => (
          <View className="flex-row bg-white p-4 rounded-xl mb-3 items-center shadow-sm border border-gray-100">
            <View className="bg-orange-100 p-3 rounded-full mr-4">
              <Ionicons name="location" size={24} color="#EA580C" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-800 text-lg">{item.title}</Text>
              <Text className="text-gray-600 text-sm mb-1" numberOfLines={1}>{item.address}</Text>
              <View className="flex-row items-center">
                <View className="bg-green-100 px-2 py-0.5 rounded mr-2">
                   <Text className="text-green-800 text-xs font-bold">{item.quantity}</Text>
                </View>
                <Text className="text-gray-400 text-xs font-medium">
                  {item.distance_km !== undefined && item.distance_km !== null
                    ? `• ${item.distance_km.toFixed(1)} km away` 
                    : '• Distance unavailable'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => openInMaps(item.address)}
              className="bg-gray-50 p-2 rounded-lg border border-gray-200"
            >
              <Ionicons name="navigate" size={24} color="#166534" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center mt-10">
             <Text className="text-gray-500">No locations found.</Text>
             <TouchableOpacity onPress={loadData} className="mt-4">
                <Text className="text-blue-600">Retry</Text>
             </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}