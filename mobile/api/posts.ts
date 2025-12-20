
import client from './client';
import { FoodPostResponse, FoodPostCreate } from '@/types/api';

/**
 * Fetches all "Available" food posts.
 * Corresponds to: GET /api/v1/posts/
 */
export const getAvailablePosts = async (): Promise<FoodPostResponse[]> => {
  const { data } = await client.get<FoodPostResponse[]>('/api/v1/posts/');
  return data;
};

/**
 * Creates a new food post.
 * Corresponds to: POST /api/v1/posts/
 */
export const createNewPost = async (postData: FoodPostCreate): Promise<FoodPostResponse> => {
  const { data } = await client.post<FoodPostResponse>('/api/v1/posts/', postData);
  return data;
};

/**
 * Reserves a food post.
 * Corresponds to: PUT /api/v1/posts/{post_id}/reserve
 */
export const reservePost = async (postId: string): Promise<FoodPostResponse> => {
  const { data } = await client.put<FoodPostResponse>(`/api/v1/posts/${postId}/reserve`);
  return data;
};

// TODO: Add functions for:
// - getMyPosts (for Donors)
// - getMyReservations (for Receivers)
