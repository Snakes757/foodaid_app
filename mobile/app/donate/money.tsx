import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createPaymentOrder, capturePaymentOrder } from '@/api/payments';
import { useAuth } from '@/hooks/useAuth';
import * as WebBrowser from 'expo-web-browser';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function DonateMoneyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDonate = async () => {
    Keyboard.dismiss();
    
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
      return;
    }

    // Convert to cents for API
    const amountCents = Math.round(amountVal * 100);

    try {
      setIsLoading(true);

      // 1. Create Order
      const orderData = await createPaymentOrder({
        amount: amountCents,
        currency: 'USD',
        email: user?.email || 'donor@foodaid.com'
      });

      // 2. Find Approval Link
      const approveLink = orderData.links.find((l: any) => l.rel === 'approve');
      if (!approveLink) {
        throw new Error("No approval link found from PayPal.");
      }

      // 3. Open Web Browser for PayPal login
      const result = await WebBrowser.openAuthSessionAsync(
        approveLink.href,
      );

      // 4. Verify Payment Automatically (Capture)
      if (result.type === 'dismiss' || result.type === 'cancel' || result.type === 'success') {
          try {
              setIsLoading(true); // Ensure loading state is on
              const captureData = await capturePaymentOrder(orderData.order_id);
              
              if (captureData.status === 'COMPLETED') {
                  showAlert("Thank You", "Your donation was successful and verified!", 'success');
                  setAmount('');
                  setTimeout(() => router.back(), 1500);
              } else {
                  showAlert("Payment Incomplete", "The payment was not completed or approved.", 'warning');
              }
          } catch (capErr: any) {
              console.log("Capture Error:", capErr);
              showAlert("Payment Cancelled", "We could not verify the payment. If you didn't approve it, no funds were taken.", 'info');
          }
      }

    } catch (error: any) {
      console.error(error);
      showAlert("Error", getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      className="bg-gray-50"
    >
      {/* Standard Header */}
      <View className="bg-white p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-green-800">Donate Funds</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          
          {/* Hero / Info Card */}
          <View className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6 items-center">
             <View className="bg-orange-100 p-4 rounded-full mb-3">
                 <Ionicons name="heart" size={40} color="#EA580C" />
             </View>
             <Text className="text-xl font-bold text-gray-800 text-center">
               Support Food Aid
             </Text>
             <Text className="text-gray-500 text-center mt-2 leading-5 text-sm">
               Your financial donation helps us cover logistics and support shelters directly.
             </Text>
          </View>

          {/* Donation Input Card */}
          <View className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-700 font-bold mb-3 text-sm uppercase">Enter Amount (USD)</Text>
            
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 mb-6 bg-gray-50 focus:border-orange-500">
               <Text className="text-2xl text-gray-500 font-bold mr-2">$</Text>
               <TextInput
                  className="flex-1 text-3xl font-bold text-gray-900 h-12"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
               />
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-3">
                {[10, 25, 50, 100].map((val) => (
                    <TouchableOpacity 
                      key={val}
                      onPress={() => setAmount(val.toString())}
                      className={`w-[48%] px-4 py-3 rounded-xl border items-center justify-center ${
                        amount === val.toString() 
                        ? 'bg-orange-600 border-orange-600' 
                        : 'bg-white border-gray-200'
                      }`}
                    >
                        <Text className={`font-bold text-lg ${
                          amount === val.toString() ? 'text-white' : 'text-gray-700'
                        }`}>
                          ${val}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleDonate}
            disabled={isLoading}
            className="bg-green-600 py-4 rounded-xl items-center shadow-md active:bg-green-700 mb-6"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="logo-paypal" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-lg">Pay with PayPal</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View className="flex-row items-center justify-center px-4">
             <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
             <Text className="text-center text-gray-400 text-xs ml-1">
                Payments are processed securely via PayPal.
             </Text>
          </View>

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}