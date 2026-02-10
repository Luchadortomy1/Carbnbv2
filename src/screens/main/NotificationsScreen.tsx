import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications, Notification } from '../../contexts/NotificationsContext';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService, NotificationData } from '../../services/notificationService';

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const [paymentNotifications, setPaymentNotifications] = useState<NotificationData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPaymentNotifications();
  }, [user]);

  const loadPaymentNotifications = async () => {
    if (!user) return;
    
    try {
      const userNotifications = await notificationService.getUserNotifications(user.id);
      setPaymentNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading payment notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navegar según el tipo de notificación
    switch (notification.type) {
      case 'message':
        // Navegar al chat específico con información del vehículo si está disponible
        if (notification.data?.chatId && notification.data?.vehicleId) {
          navigation.navigate('Chat', { 
            chatId: notification.data.chatId,
            vehicleId: notification.data.vehicleId,
            otherUserId: notification.data.otherUserId || notification.data.senderId
          });
        } else if (notification.data?.chatId) {
          navigation.navigate('Chat', { chatId: notification.data.chatId });
        }
        break;
      case 'booking_request':
        // Navegar al chat donde está la solicitud con toda la información del vehículo
        if (notification.data?.chatId && notification.data?.vehicleId) {
          navigation.navigate('Chat', { 
            chatId: notification.data.chatId,
            vehicleId: notification.data.vehicleId,
            otherUserId: notification.data.otherUserId
          });
        } else if (notification.data?.chatId) {
          navigation.navigate('Chat', { chatId: notification.data.chatId });
        }
        break;
      case 'booking_confirmed':
      case 'booking_cancelled':
        // Navegar al chat relacionado con información del vehículo si está disponible
        if (notification.data?.chatId && notification.data?.vehicleId) {
          navigation.navigate('Chat', { 
            chatId: notification.data.chatId,
            vehicleId: notification.data.vehicleId,
            otherUserId: notification.data.otherUserId
          });
        } else if (notification.data?.chatId) {
          navigation.navigate('Chat', { chatId: notification.data.chatId });
        } else {
          Alert.alert('Información', notification.message);
        }
        break;
      case 'payment':
      case 'payment_received':
        // Mostrar recibo completo de pago
        showPaymentReceipt(notification);
        break;
      default:
        Alert.alert('Notificación', notification.message);
    }
  };

  const showPaymentReceipt = (notification: Notification) => {
    const isOwnerReceipt = notification.data?.type === 'owner_receipt';
    const title = isOwnerReceipt ? '💰 Recibo de Pago Recibido' : '🧾 Recibo de Compra';
    
    Alert.alert(
      title,
      notification.message,
      [
        { text: 'Cerrar', style: 'cancel' },
        { 
          text: 'Ir al Chat', 
          onPress: () => {
            // Navegar al chat con información completa
            if (notification.data?.vehicleId && notification.data?.otherUserId) {
              navigation.navigate('Chat', { 
                vehicleId: notification.data.vehicleId,
                otherUserId: notification.data.otherUserId,
                // Información adicional para el contexto del chat
                vehicleInfo: notification.data.vehicleInfo,
                renterName: notification.data.renterName
              });
            } else {
              navigation.navigate('Messages');
            }
          }
        }
      ]
    );
  };



  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'booking_request':
        return 'calendar';
      case 'booking_confirmed':
        return 'checkmark-circle';
      case 'booking_cancelled':
        return 'close-circle';
      case 'payment_received':
        return 'card';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return '#3B82F6';
      case 'booking_request':
        return '#F59E0B';
      case 'booking_confirmed':
        return '#10B981';
      case 'booking_cancelled':
        return '#EF4444';
      case 'payment_received':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const formatTime = (date: any): string => {
    try {
      // Asegurar que tenemos un objeto Date válido
      let validDate: Date;
      
      if (date instanceof Date) {
        validDate = date;
      } else if (typeof date === 'string') {
        validDate = new Date(date);
      } else if (date && typeof date.toDate === 'function') {
        // Timestamp de Firestore
        validDate = date.toDate();
      } else if (date?.seconds) {
        // Timestamp de Firestore en formato objeto
        validDate = new Date(date.seconds * 1000);
      } else {
        // Fallback a fecha actual si no podemos procesar
        validDate = new Date();
      }
      
      const now = new Date();
      const diff = now.getTime() - validDate.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) return 'Ahora';
      if (minutes < 60) return `${minutes}m`;
      if (hours < 24) return `${hours}h`;
      if (days < 7) return `${days}d`;
      
      return validDate.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Fecha desconocida';
    }
  };

  

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.read && styles.unreadItem]} 
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getNotificationIcon(item.type)} 
          size={24} 
          color={getNotificationColor(item.type)} 
        />
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTime(item.createdAt)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Notificaciones</Text>
      {unreadCount > 0 && (
        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>Marcar todo</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={80} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No hay notificaciones</Text>
      <Text style={styles.emptyMessage}>
        Cuando tengas nuevas reservas, mensajes o actualizaciones, aparecerán aquí.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={[...notifications, ...paymentNotifications.map(pn => ({
          id: pn.id,
          userId: pn.userId,
          type: 'payment_received' as const,
          title: pn.title,
          message: pn.message,
          timestamp: pn.createdAt,
          createdAt: pn.createdAt,
          read: pn.read,
          data: pn.data,
        }))]}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={notifications.length === 0 ? styles.emptyListContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF4FF',
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});