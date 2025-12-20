
import React from 'react';
import { View, Text } from 'react-native';

export default function ReservationsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>My Reservations</Text>
      {/* TODO: Fetch and display posts reserved by this user */}
    </View>
  );
}
