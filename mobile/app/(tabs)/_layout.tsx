import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/context/NotificationContext';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Role } from '@/types/api';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  // Get the unread count from the context
  const { unreadCount } = useNotifications();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTintColor: '#166534',
        tabBarActiveTintColor: '#EA580C',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      {/* Explore Tab */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />

      {/* Create Post (Donors Only) */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Post Food',
          href: user.role === Role.DONOR ? '/create' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={32} color={color} />,
        }}
      />

      {/* Reservations (Receivers Only) */}
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reserved',
          href: user.role === Role.RECEIVER ? '/reservations' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="bag-check" size={size} color={color} />,
        }}
      />

      {/* Logistics Jobs (Logistics Only) */}
      <Tabs.Screen
        name="logistics"
        options={{
          title: 'Jobs',
          href: user.role === Role.LOGISTICS ? '/logistics' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} />,
        }}
      />
      
      {/* Admin Users (Admin Only) */}
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          href: user.role === Role.ADMIN ? '/users' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />

      {/* Hidden: My Posts (Accessed via Menu) */}
      <Tabs.Screen
        name="posts"
        options={{
          title: 'My Posts',
          href: null,
        }}
      />

      {/* Messages Tab with Dynamic Badge */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          // Show badge only if count > 0
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#DC2626', color: 'white', fontSize: 10 },
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />

      {/* Profile/Menu Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <Ionicons name="menu" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}