import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Role } from '@/types/api';

/**
 * Navigation Bar Layout
 * Implements role-based tabs:
 * Donor: Home, Explore, Create, Messages, Menu
 * Receiver: Home, Explore, Reservations, Messages, Menu
 */
export default function TabsLayout() {
  const { user, isLoading } = useAuth();

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
        headerTintColor: '#166534', // green-800
        tabBarActiveTintColor: '#EA580C', // orange-600
        tabBarInactiveTintColor: '#6B7280', // gray-500
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      {/* Home / Feed - Available for all */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      {/* Explore / Map - Available for all */}
      <Tabs.Screen
        name="explore" // Needs to be created
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />

      {/* Create Post - Donor Only */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Post Food',
          href: user.role === Role.DONOR ? '/create' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={32} color={color} />,
        }}
      />

      {/* Reserved Posts - Receiver Only */}
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reserved',
          href: user.role === Role.RECEIVER ? '/reservations' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="bag-check" size={size} color={color} />,
        }}
      />

      {/* Logistics Dashboard - Driver Only (Replaces Feed/Reservations ideally, but keeping simple for now) */}
      <Tabs.Screen
        name="logistics" // Needs to be created
        options={{
          title: 'Jobs',
          href: user.role === Role.LOGISTICS ? '/logistics' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} />,
        }}
      />

      {/* My Posts - Donor Only (Hidden from main bar, accessed via Menu usually, but here for now) */}
      <Tabs.Screen
        name="posts"
        options={{
          title: 'My Posts',
          href: null, // Hidden from tab bar, accessed via Profile? Or keep if needed.
        }}
      />

      {/* Messages - All */}
      <Tabs.Screen
        name="messages" // Needs to be created
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />

      {/* Menu / Profile - All */}
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