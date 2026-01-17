import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import client from '@/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TestConnectionScreen() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');
  const router = useRouter();

  // Get the base URL from the client to display it
  const baseURL = client.defaults.baseURL;

  const handlePing = async () => {
    setStatus('loading');
    setMessage('Pinging backend...');
    setDetails('');

    try {
      // Trying to hit the root "/" or "/ping" endpoint
      const response = await client.get('/ping');
      
      setStatus('success');
      setMessage('Connection Successful!');
      setDetails(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      setStatus('error');
      setMessage('Connection Failed');
      
      let errorMsg = error.message;
      if (error.code === 'ERR_NETWORK') {
        errorMsg += '\n\nPossible Causes:\n1. Backend is not running.\n2. Wrong IP address (Host vs Emulator).\n3. Firewall blocking port 8000.';
      }
      setDetails(errorMsg);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-6">
      <View className="mb-6 mt-10">
        <Text className="text-2xl font-bold text-gray-800">Backend Diagnostic</Text>
        <Text className="text-gray-500">Test the connection between your device and the API.</Text>
      </View>

      {/* Configuration Card */}
      <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <Text className="text-xs font-bold text-gray-400 uppercase mb-2">Current Configuration</Text>
        
        <View className="flex-row items-center mb-2">
          <Ionicons name="hardware-chip-outline" size={20} color="#4B5563" />
          <Text className="ml-2 text-gray-700 font-medium">Device: {Platform.OS.toUpperCase()}</Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="globe-outline" size={20} color="#4B5563" />
          <View className="ml-2 flex-1">
            <Text className="text-gray-700 font-medium">API URL:</Text>
            <Text className="text-blue-600 font-mono text-sm bg-blue-50 p-2 rounded mt-1">
              {baseURL}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Area */}
      <TouchableOpacity
        onPress={handlePing}
        disabled={status === 'loading'}
        className={`py-4 rounded-xl items-center shadow-sm mb-6 ${
          status === 'loading' ? 'bg-gray-400' : 'bg-blue-600 active:bg-blue-700'
        }`}
      >
        {status === 'loading' ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Ping Backend</Text>
        )}
      </TouchableOpacity>

      {/* Result Display */}
      {status !== 'idle' && (
        <View className={`p-4 rounded-xl border ${
          status === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <View className="flex-row items-center mb-2">
            <Ionicons 
              name={status === 'success' ? "checkmark-circle" : "alert-circle"} 
              size={24} 
              color={status === 'success' ? "#16A34A" : "#DC2626"} 
            />
            <Text className={`ml-2 font-bold text-lg ${
              status === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message}
            </Text>
          </View>
          
          <View className="bg-white p-3 rounded-lg border border-gray-100 opacity-90">
            <Text className="font-mono text-xs text-gray-600">{details}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity 
        onPress={() => router.back()}
        className="mt-8 items-center"
      >
        <Text className="text-gray-500">Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}