import React from 'react';
import { View, Text, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export default function CustomAlert({ visible, title, message, type, onClose }: CustomAlertProps) {
  const [scaleValue] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle';
  let colorClass = 'text-blue-600';
  let bgClass = 'bg-blue-100';
  let buttonBgClass = 'bg-blue-600';

  if (type === 'success') {
    iconName = 'checkmark-circle';
    colorClass = 'text-green-600';
    bgClass = 'bg-green-100';
    buttonBgClass = 'bg-green-600';
  } else if (type === 'error') {
    iconName = 'alert-circle';
    colorClass = 'text-red-600';
    bgClass = 'bg-red-100';
    buttonBgClass = 'bg-red-600';
  } else if (type === 'warning') {
    iconName = 'warning';
    colorClass = 'text-orange-600';
    bgClass = 'bg-orange-100';
    buttonBgClass = 'bg-orange-600';
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <Animated.View 
          className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl items-center"
          style={{ transform: [{ scale: scaleValue }] }}
        >
          <View className={`p-4 rounded-full mb-4 ${bgClass}`}>
            <Ionicons name={iconName} size={32} className={colorClass} color={type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : type === 'warning' ? '#ea580c' : '#2563eb'} />
          </View>

          <Text className="text-xl font-bold text-gray-800 text-center mb-2">
            {title}
          </Text>

          <Text className="text-gray-500 text-center mb-6 leading-5">
            {message}
          </Text>

          <TouchableOpacity
            onPress={onClose}
            className={`w-full py-3 rounded-xl ${buttonBgClass} active:opacity-90`}
          >
            <Text className="text-white font-bold text-center text-lg">OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}