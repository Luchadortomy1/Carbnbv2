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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { bookingService, BookingData } from '../../services/bookingService';
import { vehicleAvailabilityService } from '../../services/vehicleAvailabilityService';

export default function BookingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userBookings = await bookingService.getUserBookings(user.id);
      // Filtrar solo las reservas donde el usuario actual es el renter (no el owner)
      const myReservations = userBookings.filter(booking => booking.renterId === user.id);
      setBookings(myReservations);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'No se pudieron cargar las reservas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: BookingData['status']) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#6B7280';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: BookingData['status']) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Desconocido';
    }
  };

  const handleCancelBooking = async (booking: BookingData) => {
    Alert.alert(
      'Cancelar Reserva',
      '¿Estás seguro de que deseas cancelar esta reserva?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: () => {
            (async () => {
              try {
                await bookingService.updateBookingStatus(booking.bookingId, 'cancelled');
                await vehicleAvailabilityService.updateReservationStatus(
                  booking.vehicleId,
                  booking.bookingId,
                  'cancelled'
                );
                Alert.alert('Éxito', 'Reserva cancelada exitosamente');
                loadBookings();
              } catch (error) {
                console.error('Error cancelling booking:', error);
                Alert.alert('Error', 'No se pudo cancelar la reserva');
              }
            })();
          },
        },
      ]
    );
  };

  const renderBooking = ({ item }: { item: BookingData }) => {
    const isRenter = item.renterId === user?.id;
    const canCancel = item.status === 'active' && new Date(item.startDate) > new Date();

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Image
            source={{ uri: item.vehicle.imageUrl || 'https://via.placeholder.com/80x60' }}
            style={styles.vehicleImage}
          />
          <View style={styles.bookingInfo}>
            <Text style={styles.vehicleTitle}>
              {item.vehicle.brand} {item.vehicle.model} {item.vehicle.year}
            </Text>
            <Text style={styles.bookingRole}>
              {isRenter ? '🚗 Como Conductor' : '💼 Como Propietario'}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.dateText}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          </View>
          
          <View style={styles.priceRow}>
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text style={styles.priceText}>Total: ${item.totalPrice}</Text>
          </View>

          <View style={styles.paymentRow}>
            <Ionicons name="card-outline" size={16} color="#6B7280" />
            <Text style={styles.paymentText}>
              ID: {item.paymentId.slice(-8)}
            </Text>
          </View>
        </View>

        <View style={styles.bookingActions}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => {
              // Navegar a detalles de la reserva
              Alert.alert('Detalles', 'Función en desarrollo');
            }}
          >
            <Ionicons name="eye-outline" size={16} color="#3B82F6" />
            <Text style={styles.detailButtonText}>Ver Detalles</Text>
          </TouchableOpacity>

          {canCancel && isRenter && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(item)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No tienes reservas</Text>
      <Text style={styles.emptySubtitle}>
        Cuando hagas o recibas una reserva, aparecerá aquí
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => (navigation as any).reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          })} 
          style={styles.backButton}
        >
          <Ionicons name="home" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Reservas</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.bookingId}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={loading ? null : renderEmptyState}
      />
    </SafeAreaView>
  );
}

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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    padding: 8,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    backgroundColor: '#F3F4F6',
  },
  bookingInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  bookingRole: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  bookingDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  detailButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});