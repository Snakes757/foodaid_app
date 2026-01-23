import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSystemBalance, disburseFunds, getAllUsers } from '@/api/admin';
import { SystemBalance, User, Role } from '@/types/api';
import { useAlert } from '@/context/AlertContext';
import { getErrorMessage } from '@/utils/errorHandler';

export default function AdminFinanceScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  
  const [balance, setBalance] = useState<SystemBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Disbursement Modal State
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [receivers, setReceivers] = useState<User[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const bal = await getSystemBalance();
      setBalance(bal);
      
      const allUsers = await getAllUsers();
      // Filter for receivers who have banking details
      const validReceivers = allUsers.filter(
          u => u.role === Role.RECEIVER && u.verification_status === 'Approved'
      );
      setReceivers(validReceivers);

    } catch (error) {
      console.error(error);
      showAlert("Error", "Failed to fetch finance data.", 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDisburse = async () => {
    if (!selectedReceiver) {
        Alert.alert("Selection Required", "Please select an NGO/Receiver.");
        return;
    }
    
    if (!selectedReceiver.banking_details) {
        Alert.alert("Missing Info", "This user has not set up banking details yet.");
        return;
    }

    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
        Alert.alert("Invalid Amount", "Enter a valid positive number.");
        return;
    }

    if (!balance || amountVal > (balance.current_balance / 100)) {
        Alert.alert("Insufficient Funds", "Amount exceeds current balance.");
        return;
    }

    if (!reference) {
        Alert.alert("Missing Reference", "Please enter a reference.");
        return;
    }

    Alert.alert(
        "Confirm Disbursement",
        `Transfer $${amountVal.toFixed(2)} to ${selectedReceiver.name}?`,
        [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: executeTransfer }
        ]
    );
  };

  const executeTransfer = async () => {
      if (!selectedReceiver) return;
      try {
          setIsProcessing(true);
          await disburseFunds({
              receiver_id: selectedReceiver.user_id,
              amount: Math.round(parseFloat(amount) * 100),
              reference: reference
          });
          
          showAlert("Success", "Funds disbursed successfully.", 'success');
          setShowDisburseModal(false);
          setAmount('');
          setReference('');
          setSelectedReceiver(null);
          fetchData(); // Refresh balance
      } catch (error) {
          showAlert("Transfer Failed", getErrorMessage(error), 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-800 pt-12 pb-6 px-6 rounded-b-3xl shadow-md">
        <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
               <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Finance Dashboard</Text>
        </View>
        
        <View>
            <Text className="text-blue-200 text-sm uppercase font-bold mb-1">Current Balance</Text>
            <Text className="text-white text-4xl font-bold">
                ${balance ? (balance.current_balance / 100).toFixed(2) : '0.00'}
            </Text>
        </View>

        <View className="flex-row mt-6 space-x-4">
            <View className="flex-1 bg-blue-700 p-3 rounded-xl">
                <Text className="text-blue-200 text-xs">Total In</Text>
                <Text className="text-white font-bold text-lg">
                    +${balance ? (balance.total_donated / 100).toFixed(2) : '0.00'}
                </Text>
            </View>
            <View className="flex-1 bg-blue-700 p-3 rounded-xl">
                <Text className="text-blue-200 text-xs">Total Out</Text>
                <Text className="text-white font-bold text-lg">
                    -${balance ? (balance.total_disbursed / 100).toFixed(2) : '0.00'}
                </Text>
            </View>
        </View>
      </View>

      {/* Actions */}
      <View className="p-6">
         <TouchableOpacity 
            onPress={() => setShowDisburseModal(true)}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-row items-center justify-between"
         >
             <View className="flex-row items-center">
                 <View className="bg-orange-100 p-3 rounded-full mr-4">
                     <Ionicons name="paper-plane" size={24} color="#EA580C" />
                 </View>
                 <View>
                     <Text className="text-lg font-bold text-gray-800">Disburse Funds</Text>
                     <Text className="text-gray-500 text-sm">Transfer money to NGOs</Text>
                 </View>
             </View>
             <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
         </TouchableOpacity>

         <View className="mt-6">
             <Text className="font-bold text-gray-700 mb-2">Recent Activity</Text>
             <View className="bg-white p-6 rounded-xl border border-gray-100 items-center justify-center h-40">
                 <Text className="text-gray-400">No recent transactions to display.</Text>
             </View>
         </View>
      </View>

      {/* Disbursement Modal */}
      <Modal visible={showDisburseModal} animationType="slide" presentationStyle="pageSheet">
          <View className="flex-1 bg-gray-50 pt-6">
              <View className="flex-row justify-between items-center px-6 mb-6">
                  <Text className="text-xl font-bold text-gray-800">New Transfer</Text>
                  <TouchableOpacity onPress={() => setShowDisburseModal(false)}>
                      <Text className="text-blue-600 font-bold">Cancel</Text>
                  </TouchableOpacity>
              </View>

              {!selectedReceiver ? (
                  <View className="flex-1 px-4">
                      <Text className="text-gray-500 mb-2 px-2">Select a Verified Receiver:</Text>
                      <FlatList 
                          data={receivers}
                          keyExtractor={item => item.user_id}
                          renderItem={({item}) => (
                              <TouchableOpacity 
                                  onPress={() => setSelectedReceiver(item)}
                                  className="bg-white p-4 mb-2 rounded-xl border border-gray-200 flex-row items-center"
                              >
                                  <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${item.banking_details ? 'bg-green-100' : 'bg-red-100'}`}>
                                      <Ionicons name="business" size={20} color={item.banking_details ? '#166534' : '#DC2626'} />
                                  </View>
                                  <View className="flex-1">
                                      <Text className="font-bold text-gray-800">{item.name}</Text>
                                      <Text className="text-xs text-gray-500">
                                          {item.banking_details ? `${item.banking_details.bank_name} •••${item.banking_details.account_number.slice(-4)}` : 'No Bank Details'}
                                      </Text>
                                  </View>
                                  {item.banking_details && <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />}
                              </TouchableOpacity>
                          )}
                          ListEmptyComponent={
                              <Text className="text-center text-gray-400 mt-10">No eligible receivers found.</Text>
                          }
                      />
                  </View>
              ) : (
                  <View className="flex-1 px-6">
                      <TouchableOpacity 
                          onPress={() => setSelectedReceiver(null)}
                          className="flex-row items-center mb-6 bg-blue-50 p-3 rounded-lg"
                      >
                          <Ionicons name="arrow-back" size={20} color="#1E40AF" />
                          <Text className="ml-2 text-blue-800 font-bold">Change Receiver ({selectedReceiver.name})</Text>
                      </TouchableOpacity>

                      <View className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
                          <Text className="text-gray-500 text-xs uppercase font-bold mb-2">Banking Details</Text>
                          <Text className="text-gray-800"><Text className="font-bold">Bank:</Text> {selectedReceiver.banking_details?.bank_name}</Text>
                          <Text className="text-gray-800"><Text className="font-bold">Acc Num:</Text> {selectedReceiver.banking_details?.account_number}</Text>
                          <Text className="text-gray-800"><Text className="font-bold">Branch:</Text> {selectedReceiver.banking_details?.branch_code}</Text>
                          <Text className="text-gray-800"><Text className="font-bold">Holder:</Text> {selectedReceiver.banking_details?.account_holder}</Text>
                      </View>

                      <Text className="font-bold text-gray-700 mb-2">Amount (USD)</Text>
                      <TextInput 
                          className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg mb-4"
                          placeholder="0.00"
                          keyboardType="numeric"
                          value={amount}
                          onChangeText={setAmount}
                      />

                      <Text className="font-bold text-gray-700 mb-2">Reference</Text>
                      <TextInput 
                          className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6"
                          placeholder="e.g. June Grant"
                          value={reference}
                          onChangeText={setReference}
                      />

                      <TouchableOpacity 
                          onPress={handleDisburse}
                          disabled={isProcessing}
                          className="bg-green-600 py-4 rounded-xl items-center shadow-md active:bg-green-700"
                      >
                          {isProcessing ? (
                              <ActivityIndicator color="white" />
                          ) : (
                              <Text className="text-white font-bold text-lg">Transfer Funds</Text>
                          )}
                      </TouchableOpacity>
                  </View>
              )}
          </View>
      </Modal>
    </View>
  );
}