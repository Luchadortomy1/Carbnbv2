import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment' | 'booking' | 'general';
  read: boolean;
  createdAt: Date;
  data?: any;
}

export const notificationService = {
  async createNotification(notificationData: Omit<NotificationData, 'id' | 'createdAt' | 'read'>): Promise<string> {
    try {
      const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const newNotification: NotificationData = {
        ...notificationData,
        id: notificationId,
        read: false,
        createdAt: new Date(),
      };

      const existingNotifications = await this.getAllNotifications();
      const updatedNotifications = [...existingNotifications, newNotification];
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));


      return notificationId;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  async getAllNotifications(): Promise<NotificationData[]> {
    try {
      const notificationsData = await AsyncStorage.getItem('notifications');
      return notificationsData ? JSON.parse(notificationsData) : [];
    } catch (error) {
      console.error('Error getting all notifications:', error);
      return [];
    }
  },

  async getUserNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const allNotifications = await this.getAllNotifications();
      return allNotifications
        .filter(notification => notification.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const allNotifications = await this.getAllNotifications();
      const updatedNotifications = allNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async notifyPaymentReceived(ownerId: string, paymentDetails: {
    paymentId: string;
    amount: number;
    renterName: string;
    vehicleInfo: string;
    bookingDates: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        userId: ownerId,
        title: '💰 ¡Pago Recibido!',
        message: `Has recibido un pago de $${paymentDetails.amount} por tu ${paymentDetails.vehicleInfo}. El renter ${paymentDetails.renterName} ha completado la reserva para las fechas ${paymentDetails.bookingDates}.`,
        type: 'payment',
        data: {
          paymentId: paymentDetails.paymentId,
          amount: paymentDetails.amount,
          renterName: paymentDetails.renterName,
          vehicleInfo: paymentDetails.vehicleInfo,
          bookingDates: paymentDetails.bookingDates,
        },
      });
    } catch (error) {
      console.error('Error notifying payment received:', error);
      throw error;
    }
  },

  async notifyBookingConfirmed(renterId: string, bookingDetails: {
    bookingId: string;
    vehicleInfo: string;
    ownerName: string;
    bookingDates: string;
    totalAmount: number;
  }): Promise<void> {
    try {
      await this.createNotification({
        userId: renterId,
        title: '🚗 ¡Reserva Confirmada!',
        message: `Tu reserva del ${bookingDetails.vehicleInfo} con ${bookingDetails.ownerName} ha sido confirmada para las fechas ${bookingDetails.bookingDates}. Total pagado: $${bookingDetails.totalAmount}.`,
        type: 'booking',
        data: {
          bookingId: bookingDetails.bookingId,
          vehicleInfo: bookingDetails.vehicleInfo,
          ownerName: bookingDetails.ownerName,
          bookingDates: bookingDetails.bookingDates,
          totalAmount: bookingDetails.totalAmount,
        },
      });
    } catch (error) {
      console.error('Error notifying booking confirmed:', error);
      throw error;
    }
  },
};