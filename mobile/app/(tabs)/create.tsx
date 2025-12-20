
import React from 'react';
import { View, Text, Button } from 'react-native';

export default function CreatePostScreen() {
  const handleCreate = () => {
    // TODO: Implement form logic and call createNewPost()
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Create New Post Screen</Text>
      {/* TODO: Add form inputs for title, description, quantity, location, expiry */}
      <Button title="Submit Post" onPress={handleCreate} />
    </View>
  );
}
