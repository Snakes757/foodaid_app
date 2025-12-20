
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Button } from 'react-native';
import { getAvailablePosts } from '@/api/posts';
import { FoodPostResponse } from '@/types/api';

export default function FeedScreen() {
  const [posts, setPosts] = useState<FoodPostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAvailablePosts();
      setPosts(data);
    } catch (err) {
      setError('Failed to fetch posts. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{error}</Text>
        <Button title="Retry" onPress={fetchPosts} />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.post_id}
      renderItem={({ item }) => (
        <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.title}</Text>
          <Text>{item.quantity}</Text>
          <Text>{item.location}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No available posts.</Text>}
      refreshing={isLoading}
      onRefresh={fetchPosts}
    />
  );
}
