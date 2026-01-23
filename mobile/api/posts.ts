import client from './client';
import { FoodPostResponse, FoodPostCreate, DeliveryMethod } from '@/types/api';

export const getAvailablePosts = async (lat?: number, lng?: number): Promise<FoodPostResponse[]> => {
  const params: any = {};
  if (lat !== undefined) params.lat = lat;
  if (lng !== undefined) params.lng = lng;

  const { data } = await client.get<FoodPostResponse[]>('/posts/', { params });
  return data;
};

export const createNewPost = async (postData: FoodPostCreate): Promise<FoodPostResponse> => {
  const { data } = await client.post<FoodPostResponse>('/posts/', postData);
  return data;
};

export const reservePost = async (postId: string, deliveryMethod: DeliveryMethod): Promise<FoodPostResponse> => {
  const { data } = await client.put<FoodPostResponse>(`/posts/${postId}/reserve`, {
    delivery_method: deliveryMethod
  });
  return data;
};