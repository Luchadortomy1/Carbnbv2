import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { hybridBookingService, BookingData } from '../../services/hybridBookingService';

interface BookingHistoryScreenProps {
  navigation: any;
}

export const BookingHistoryScreen: React.FC<BookingHistoryScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      if (!user) return;
      
      const userBookings = await hybridBookingService.getUserBookings(user.id);
      
      // Filtrar solo las reservas donde el usuario es el renter (quien rentó)
      const myReservations = userBookings.filter(booking => booking.renterId === user.id);
      
      setBookings(myReservations);
    } catch (error) {
      console.error('Error loading booking history:', error);
      Alert.alert('Error', 'No se pudo cargar el historial de reservas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const getStatusColor = (booking: BookingData) => {
    const now = new Date();
    const endDate = new Date(booking.endDate);
    
    switch (booking.status) {
      case 'active': 
        return endDate < now ? '#F59E0B' : '#10B981'; // Amarillo para vencidas, verde para activas
      case 'completed': 
        return '#6B7280'; // Gris para completadas
      case 'cancelled': 
        return '#EF4444'; // Rojo para canceladas
      default: 
        return '#3B82F6';
    }
  };

  const getStatusText = (booking: BookingData) => {
    const now = new Date();
    const endDate = new Date(booking.endDate);
    
    switch (booking.status) {
      case 'active': 
        if (endDate < now) {
          return 'Vencida'; // Esta reserva debería actualizarse automáticamente
        }
        return 'Activa';
      case 'completed': 
        return endDate < now ? 'Finalizada' : 'Completada';
      case 'cancelled': 
        return 'Cancelada';
      default: 
        return booking.status;
    }
  };

  const showBookingDetails = (booking: BookingData) => {
    const startDate = booking.startDate.toLocaleDateString();
    const endDate = booking.endDate.toLocaleDateString();
    const days = Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const now = new Date();
    const isExpired = new Date(booking.endDate) < now;
    const statusText = getStatusText(booking);
    
    let statusInfo = '';
    if (booking.status === 'active' && isExpired) {
      const daysPastDue = Math.ceil((now.getTime() - booking.endDate.getTime()) / (1000 * 60 * 60 * 24));
      statusInfo = `\n⚠️ Esta reserva venció hace ${daysPastDue} día${daysPastDue > 1 ? 's' : ''}`;
    } else if (booking.status === 'completed') {
      statusInfo = '\n✅ Esta reserva se completó exitosamente';
    } else if (booking.status === 'cancelled') {
      statusInfo = '\n❌ Esta reserva fue cancelada';
    }
    
    const detailsMessage = `
🚗 DETALLES DE LA RESERVA

Vehículo: ${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}

📅 Fechas: ${startDate} - ${endDate}
⏰ Duración: ${days} día${days > 1 ? 's' : ''}
💰 Total pagado: $${booking.totalPrice.toFixed(2)}
🆔 ID de Pago: ${booking.paymentId.slice(-8)}
📊 Estado: ${statusText}${statusInfo}

🏢 INFORMACIÓN DEL PROPIETARIO:
Nombre: ${booking.ownerName}
📧 Email: ${booking.ownerEmail}
📞 Teléfono: ${booking.ownerContact}

💡 ${booking.status === 'active' ? 'Puedes contactar al propietario para coordinar la entrega del vehículo.' : 'Reserva finalizada.'}
    `.trim();

    Alert.alert(
      '📋 Detalles de Reserva',
      detailsMessage,
      [
        { text: 'Cerrar', style: 'cancel' },
        { 
          text: 'Ver Recibo', 
          onPress: () => {
            const receiptText = `🚗 CARBNB - RECIBO DE PAGO
═══════════════════════════════════════

📋 ID de Reserva: #${booking.bookingId.slice(-8)}
📅 Fecha: ${new Date().toLocaleDateString()}

🚗 Vehículo: ${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}
📅 Periodo: ${startDate} - ${endDate} (${days} días)
💰 Total pagado: $${booking.totalPrice.toFixed(2)}
🆔 ID de Pago: ${booking.paymentId.slice(-8)}

👤 Propietario:
${booking.ownerName}
📧 ${booking.ownerEmail}
📞 ${booking.ownerContact}

═══════════════════════════════════════
Carbnb - Recibo generado automáticamente`;
              
            Alert.alert('📄 Recibo de Pago', receiptText);
          }
        },
        { 
          text: 'Contactar Propietario', 
          onPress: () => {
            // Navegar al chat con el propietario
            navigation.navigate('Chat', {
              otherUserId: booking.ownerId,
              vehicleId: booking.vehicleId,
            });
          }
        }
      ]
    );
  };

  const renderBookingItem = ({ item }: { item: BookingData }) => {
    const startDate = item.startDate.toLocaleDateString();
    const endDate = item.endDate.toLocaleDateString();
    const days = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <TouchableOpacity 
        style={styles.bookingCard}
        onPress={() => showBookingDetails(item)}
      >
        <View style={styles.bookingHeader}>
          <Image 
            source={{ uri: item.vehicle.imageUrl || 'https://via.placeholder.com/80x60' }}
            style={styles.vehicleImage}
          />
          <View style={styles.bookingInfo}>
            <Text style={styles.vehicleTitle}>
              {item.vehicle.brand} {item.vehicle.model} {item.vehicle.year}
            </Text>
            <Text style={styles.ownerName}>
              Propietario: {item.ownerName}
            </Text>
            <Text style={styles.dateRange}>
              📅 {startDate} - {endDate} ({days} día{days > 1 ? 's' : ''})
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              💰 $${item.totalPrice.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
            <Text style={styles.statusText}>
              {getStatusText(item)}
            </Text>
          </View>
        </View>
        
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentId}>
            🆔 Pago: {item.paymentId.slice(-8)}
          </Text>
          <Text style={styles.bookingDate}>
            📅 Reservado: {item.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No hay reservas</Text>
      <Text style={styles.emptyText}>
        Cuando hagas una reserva, aparecerá aquí tu historial completo.
      </Text>
      <TouchableOpacity 
        style={styles.exploreButton}
        onPress={() => navigation.navigate('Search')}
      >
        <Ionicons name="search-outline" size={20} color="#FFFFFF" />
        <Text style={styles.exploreButtonText}>Explorar Vehículos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Reservas</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Total de reservas: {bookings.length}
        </Text>
        <Text style={styles.statsText}>
          Activas: {bookings.filter(b => b.status === 'active').length}
        </Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.bookingId}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookingHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  vehicleImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceContainer: {
    flex: 1,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paymentId: {
    fontSize: 12,
    color: '#6B7280',
  },
  bookingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});