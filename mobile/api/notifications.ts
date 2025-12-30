import client from './client';

export interface Notification {
  notification_id: string;
  title: string;
  body: string;
  user_id: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export const getMyNotifications = async (): Promise<Notification[]> => {
  const { data } = await client.get<Notification[]>('/notifications/');
  return data;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await client.put(`/notifications/${notificationId}/read`);
};