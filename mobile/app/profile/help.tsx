import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HelpCenterScreen() {
  const router = useRouter();

  const FAQItem = ({ question, answer }: { question: string, answer: string }) => (
    <View className="mb-4 bg-white p-4 rounded-xl border border-gray-100">
      <Text className="font-bold text-gray-800 mb-2">{question}</Text>
      <Text className="text-gray-600 leading-5">{answer}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-green-800">Help Center</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="bg-green-50 p-6 rounded-xl border border-green-100 mb-6 items-center">
          <Ionicons name="headset" size={40} color="#166534" />
          <Text className="text-center font-bold text-green-800 text-lg mt-2">
            How can we help you?
          </Text>
          <Text className="text-center text-green-600 mt-1">
            Browse our FAQs or contact support below.
          </Text>
        </View>

        <Text className="font-bold text-gray-500 mb-4 uppercase text-xs ml-1">Frequently Asked Questions</Text>

        <FAQItem 
          question="How do I post a donation?" 
          answer="Go to the 'Post Food' tab (center button), fill in the details about your surplus food, and tap 'Post Donation'." 
        />
        <FAQItem 
          question="Who can see my location?" 
          answer="Your location is only shared with verified receivers when a donation is active or reserved." 
        />
        <FAQItem 
          question="How do I become a verified donor?" 
          answer="Please contact us with your business registration documents for verification." 
        />

        <TouchableOpacity className="bg-green-600 py-4 rounded-xl items-center mt-4 shadow-sm active:bg-green-700">
          <Text className="text-white font-bold text-lg">Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}