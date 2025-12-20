
import React from 'react';
import { View, Text } from 'react-native';

export default function MyPostsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>My Food Posts</Text>
      {/* TODO: Fetch and display posts created by this user (Donor) */}
    </View>
  );
}
