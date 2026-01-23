import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { Notification } from '@/api/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/context/NotificationContext';

export default function MessagesScreen() {
  const { notifications, isLoading, refreshNotifications, markAsRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Notification | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleOpenMessage = (message: Notification) => {
    setSelectedMessage(message);
    if (!message.read) {
      markAsRead(message.notification_id);
    }
  };

  const closeModal = () => {
    setSelectedMessage(null);
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleOpenMessage(item)}
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
          <Text 
            className={`text-sm ${item.read ? 'text-gray-500' : 'text-gray-800'}`}
            numberOfLines={2} 
          >
            {item.body}
          </Text>
          <Text className="text-xs text-gray-400 mt-2 text-right">
            {new Date(item.created_at).toLocaleDateString()}
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

      {isLoading && notifications.length === 0 ? (
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#166534"]} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center mt-20 px-6">
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4">No new messages.</Text>
            </View>
          }
        />
      )}

      {/* MESSAGE DETAIL MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedMessage}
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <TouchableWithoutFeedback>
              <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
                
                {/* Header */}
                <View className="flex-row justify-between items-start mb-4">
                  <View className="bg-green-100 p-3 rounded-full">
                    <Ionicons name="mail-open" size={24} color="#166534" />
                  </View>
                  <TouchableOpacity onPress={closeModal} className="p-1">
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                {selectedMessage && (
                  <ScrollView className="max-h-96">
                    <Text className="text-xl font-bold text-gray-800 mb-2">
                      {selectedMessage.title}
                    </Text>
                    
                    <Text className="text-xs text-gray-400 mb-4 font-medium uppercase">
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </Text>

                    <Text className="text-gray-600 text-base leading-6">
                      {selectedMessage.body}
                    </Text>
                    
                    {/* Optional: Add Action Button based on notification data */}
                    {selectedMessage.data?.type === 'job_alert' && (
                       <View className="mt-4 pt-4 border-t border-gray-100">
                          <Text className="text-blue-600 text-center font-medium">
                            Go to Jobs tab to accept this delivery.
                          </Text>
                       </View>
                    )}
                  </ScrollView>
                )}

                {/* Footer Button */}
                <TouchableOpacity
                  onPress={closeModal}
                  className="mt-6 bg-green-600 py-3 rounded-xl items-center active:bg-green-700"
                >
                  <Text className="text-white font-bold">Close</Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}