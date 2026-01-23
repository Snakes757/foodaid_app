import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { getAvailablePosts, reservePost } from '@/api/posts';
import { FoodPostResponse, Role, DeliveryMethod } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function FeedScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
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

  const executeReservation = async (post: FoodPostResponse, method: DeliveryMethod) => {
    try {
      await reservePost(post.post_id, method);
      showAlert("Success", "Food reserved successfully!", 'success');
      fetchPosts();
      router.push('/reservations');
    } catch (error) {
      showAlert("Error", getErrorMessage(error), 'error');
    }
  };

  const handleReserve = async (post: FoodPostResponse) => {
    if (user?.role !== Role.RECEIVER) return;

    Alert.alert(
      "Reserve Food",
      `How would you like to receive "${post.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I'll Pick It Up",
          onPress: () => executeReservation(post, DeliveryMethod.PICKUP)
        },
        {
          text: "Request Delivery",
          onPress: () => executeReservation(post, DeliveryMethod.DELIVERY)
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: FoodPostResponse }) => (
    <View className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden mx-4 mt-2">
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          className="h-48 w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-32 bg-orange-100 items-center justify-center">
          <Ionicons name="fast-food" size={48} color="#EA580C" />
        </View>
      )}

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
      <View className="p-4 bg-white border-b border-gray-200 flex-row justify-between items-center">
          <View>
              <Text className="text-xl font-bold text-green-800">
                  {user?.role === Role.ADMIN ? 'Admin Feed' : 'Food Feed'}
              </Text>
              <Text className="text-gray-500 text-xs">Available Donations</Text>
          </View>

          {/* New Button for Donors to Donate Money */}
          {user?.role === Role.DONOR && (
               <TouchableOpacity 
                  onPress={() => router.push('../donate/money')}
                  className="bg-orange-100 px-3 py-2 rounded-lg flex-row items-center border border-orange-200"
               >
                   <Ionicons name="cash-outline" size={18} color="#EA580C" />
                   <Text className="text-orange-700 font-bold ml-1 text-xs">Donate Money</Text>
               </TouchableOpacity>
          )}

          {/* New Button for Admin Finance Dashboard */}
          {user?.role === Role.ADMIN && (
               <TouchableOpacity 
                  onPress={() => router.push('../admin/finance')}
                  className="bg-blue-100 px-3 py-2 rounded-lg flex-row items-center border border-blue-200"
               >
                   <Ionicons name="wallet-outline" size={18} color="#1E40AF" />
                   <Text className="text-blue-700 font-bold ml-1 text-xs">Finance</Text>
               </TouchableOpacity>
          )}
      </View>

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