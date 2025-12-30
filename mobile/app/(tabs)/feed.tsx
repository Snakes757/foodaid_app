import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  TouchableOpacity, 
  Alert,
  Image 
} from 'react-native';
import { getAvailablePosts, reservePost } from '@/api/posts';
import { FoodPostResponse, Role, DeliveryMethod } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function FeedScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FoodPostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getAvailablePosts();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleReserve = async (post: FoodPostResponse) => {
    if (user?.role !== Role.RECEIVER) return;

    Alert.alert(
      "Reserve Food",
      `Do you want to reserve "${post.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm Pickup", 
          onPress: async () => {
            try {
              // Defaulting to Pickup for quick action, expanded logic would ask Method
              await reservePost(post.post_id); 
              Alert.alert("Success", "Food reserved successfully!");
              fetchPosts(); // Refresh list
              router.push('/reservations');
            } catch (error) {
              Alert.alert("Error", "Failed to reserve post.");
            }
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: FoodPostResponse }) => (
    <View className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden mx-4 mt-2">
      {/* Header / Image Placeholder */}
      <View className="h-32 bg-orange-100 items-center justify-center">
        <Ionicons name="fast-food" size={48} color="#EA580C" />
      </View>

      <View className="p-4">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-2">
            <Text className="text-lg font-bold text-gray-800 mb-1">{item.title}</Text>
            <Text className="text-gray-600 text-sm mb-2">{item.description || "No description provided."}</Text>
          </View>
          <View className="bg-green-100 px-2 py-1 rounded-lg">
            <Text className="text-green-800 text-xs font-bold">{item.quantity}</Text>
          </View>
        </View>

        <View className="flex-row items-center mt-2 mb-3">
          <Ionicons name="location-sharp" size={16} color="#6B7280" />
          <Text className="text-gray-500 text-xs ml-1 flex-1" numberOfLines={1}>
            {item.address} {item.distance_km ? `(${item.distance_km.toFixed(1)} km away)` : ''}
          </Text>
        </View>

        <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
          <Text className="text-xs text-red-500 font-medium">
            Expires: {new Date(item.expiry).toLocaleDateString()}
          </Text>

          {user?.role === Role.RECEIVER && (
            <TouchableOpacity 
              onPress={() => handleReserve(item)}
              className="bg-green-600 px-4 py-2 rounded-full"
            >
              <Text className="text-white font-bold text-sm">Reserve</Text>
            </TouchableOpacity>
          )}
          
          {user?.role === Role.DONOR && item.donor_id === user.user_id && (
             <Text className="text-orange-600 text-sm font-bold">Your Post</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.post_id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#166534"]} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center mt-20 px-10">
            <Ionicons name="basket-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-center mt-4">
              No food available right now. Check back later!
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
      />
    </View>
  );
}