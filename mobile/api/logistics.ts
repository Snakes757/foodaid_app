import client from './client';
import { FoodPostResponse, PostStatus } from '@/types/api';

export const getAvailableDeliveries = async (): Promise<FoodPostResponse[]> => {
  const { data } = await client.get<FoodPostResponse[]>('/logistics/available');
  return data;
};

export const getMyActiveJobs = async (): Promise<FoodPostResponse[]> => {
  const { data } = await client.get<FoodPostResponse[]>('/logistics/active');
  return data;
};

export const acceptDelivery = async (postId: string): Promise<FoodPostResponse> => {
  const { data } = await client.post<FoodPostResponse>(`/logistics/${postId}/accept`);
  return data;
};

export const updateDeliveryStatus = async (
  postId: string,
  status: PostStatus.IN_TRANSIT | PostStatus.DELIVERED
): Promise<FoodPostResponse> => {
  const { data } = await client.put<FoodPostResponse>(`/logistics/${postId}/status`, null, {
    params: { new_status: status }
  });
  return data;
};