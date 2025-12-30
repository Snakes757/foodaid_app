import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { getMyNotifications, markNotificationAsRead, Notification } from '@/api/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
      await markNotificationAsRead(id);
    } catch (error) {
      console.error("Failed to mark read", error);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      onPress={() => handleRead(item.notification_id, item.read)}
      className={`p-4 mx-4 mb-3 rounded-xl border ${
        item.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'
      }`}
    >
      <View className="flex-row items-start">
        <View className={`p-2 rounded-full mr-3 ${item.read ? 'bg-gray-100' : 'bg-blue-100'}`}>
          <Ionicons 
            name={item.read ? "mail-open-outline" : "mail"} 
            size={24} 
            color={item.read ? "#9CA3AF" : "#2563EB"} 
          />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between mb-1">
            <Text className={`font-bold text-base ${item.read ? 'text-gray-700' : 'text-blue-900'}`}>
              {item.title}
            </Text>
            {!item.read && (
              <View className="bg-blue-600 w-2 h-2 rounded-full mt-2" />
            )}
          </View>
          <Text className={`text-sm ${item.read ? 'text-gray-500' : 'text-gray-800'}`}>
            {item.body}
          </Text>
          <Text className="text-xs text-gray-400 mt-2 text-right">
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200 mb-2">
        <Text className="text-xl font-bold text-green-800">Messages</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#166534" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} colors={["#166534"]} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center mt-20 px-6">
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4">No new messages.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}