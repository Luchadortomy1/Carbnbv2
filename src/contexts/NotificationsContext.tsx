import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/firebaseService';

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'booking_request' | 'booking_confirmed' | 'booking_cancelled' | 'payment_received' | 'payment';
  title: string;
  message: string;
  data?: any; // Datos adicionales específicos del tipo
  read: boolean;
  createdAt: Date;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addNotificationForUser: (targetUserId: string, notification: Omit<Notification, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const refreshNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      const notifications = await notificationService.getUserNotifications(user.id);
      setNotifications(notifications);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      setNotifications([]);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;

    try {
      await notificationService.createNotification({
        userId: user.id,
        ...notification,
      });
      // La notificación se actualizará automáticamente por el listener
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Función para crear notificación para otro usuario
  const addNotificationForUser = async (targetUserId: string, notification: Omit<Notification, 'id' | 'userId' | 'createdAt'>) => {
    try {
      await notificationService.createNotification({
        userId: targetUserId,
        ...notification,
      });
    } catch (error) {
      console.error('Error creating notification for user:', error);
    }
  };

  useEffect(() => {
    if (user) {
      // Usar listener en tiempo real en lugar de polling
      const unsubscribe = notificationService.subscribeToNotifications(user.id, (notifications) => {
        setNotifications(notifications);
      });
      
      return unsubscribe;
    }
  }, [user]);

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    addNotificationForUser,
  }), [notifications, unreadCount]);

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};