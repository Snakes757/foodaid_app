import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getMyNotifications, markNotificationAsRead, Notification } from '@/api/notifications';
import { useAuth } from '@/hooks/useAuth';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
        setNotifications([]);
        return;
    }
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchNotifications();
        // Poll for new messages every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
        // Optimistic update: update UI immediately before server response
        setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
        await markNotificationAsRead(id);
    } catch (error) {
        console.error("Failed to mark read", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
        notifications, 
        unreadCount, 
        isLoading, 
        refreshNotifications: fetchNotifications, 
        markAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};