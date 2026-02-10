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

interface RentedVehiclesScreenProps {
  navigation: any;
}

export const RentedVehiclesScreen: React.FC<RentedVehiclesScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [rentedVehicles, setRentedVehicles] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRentedVehicles();
  }, []);

  const loadRentedVehicles = async () => {
    try {
      if (!user) return;
      
      const userBookings = await hybridBookingService.getUserBookings(user.id);
      
      // Filtrar los vehículos que el usuario actual ha rentado (donde es owner)
      // Incluir tanto activos como completados para mostrar historial completo
      const myRentedVehicles = userBookings.filter(booking => 
        booking.ownerId === user.id && (booking.status === 'active' || booking.status === 'completed')
      );
      
      setRentedVehicles(myRentedVehicles);
    } catch (error) {
      console.error('Error loading rented vehicles:', error);
      Alert.alert('Error', 'No se pudieron cargar los vehículos rentados');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRentedVehicles();
    setRefreshing(false);
  };

  const showRenterDetails = (booking: BookingData) => {
    const startDate = booking.startDate.toLocaleDateString();
    const endDate = booking.endDate.toLocaleDateString();
    const days = Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const detailsMessage = `
🎉 VEHÍCULO RENTADO EXITOSAMENTE

${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}

👤 INFORMACIÓN DEL RENTER:
Nombre: ${booking.renterName}
📧 Email: ${booking.renterEmail}
📞 Teléfono: ${booking.renterContact}

📅 DETALLES DE LA RENTA:
Inicio: ${startDate}
Final: ${endDate}
Duración: ${days} día${days > 1 ? 's' : ''}

💰 PAGO RECIBIDO:
Total: $${booking.totalPrice.toFixed(2)}
🆔 ID de Pago: ${booking.paymentId.slice(-8)}
📅 Pagado: ${booking.createdAt.toLocaleDateString()}

💡 Tu vehículo está temporalmente fuera de circulación pública y no aparece en búsquedas.

🔧 ¿Necesitas hacer algún cambio? Contacta al renter o al soporte.
    `.trim();

    Alert.alert(
      `🚗 Vehículo Rentado`,
      detailsMessage,
      [
        { text: 'Cerrar', style: 'cancel' },
        { 
          text: 'Ver Recibo', 
          onPress: () => {
            const receiptText = `🚗 CARBNB - RECIBO DE INGRESO
═══════════════════════════════════════

📋 ID de Reserva: #${booking.bookingId.slice(-8)}
📅 Fecha: ${new Date().toLocaleDateString()}

🚗 Tu Vehículo: ${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}
📅 Periodo rentado: ${startDate} - ${endDate} (${days} días)
💰 Ingreso recibido: $${booking.totalPrice.toFixed(2)}
🆔 ID de Pago: ${booking.paymentId.slice(-8)}

👤 Persona que rentó:
${booking.renterName}
📧 ${booking.renterEmail}
📞 ${booking.renterContact}

═══════════════════════════════════════
Carbnb - Recibo generado automáticamente`;
            
            Alert.alert('📄 Recibo de Ingresos', receiptText);
          }
        },
        { 
          text: 'Contactar Renter', 
          onPress: () => {
            // Navegar al chat con el renter
            navigation.navigate('Chat', {
              otherUserId: booking.renterId,
              vehicleId: booking.vehicleId,
            });
          }
        }
      ]
    );
  };

  const calculateEarnings = () => {
    return rentedVehicles.reduce((total, booking) => total + booking.totalPrice, 0);
  };

  const renderRentedVehicle = ({ item }: { item: BookingData }) => {
    const startDate = item.startDate.toLocaleDateString();
    const endDate = item.endDate.toLocaleDateString();
    const days = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <TouchableOpacity 
        style={styles.vehicleCard}
        onPress={() => showRenterDetails(item)}
      >
        <View style={styles.vehicleHeader}>
          <Image 
            source={{ uri: item.vehicle.imageUrl || 'https://via.placeholder.com/80x60' }}
            style={styles.vehicleImage}
          />
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleTitle}>
              {item.vehicle.brand} {item.vehicle.model} {item.vehicle.year}
            </Text>
            <Text style={styles.renterName}>
              👤 Rentado por: {item.renterName}
            </Text>
            <Text style={styles.dateRange}>
              📅 {startDate} - {endDate}
            </Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusBadge,
              item.status === 'active' ? styles.activeStatus : styles.completedStatus
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: item.status === 'active' ? '#10B981' : '#6B7280' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: item.status === 'active' ? '#10B981' : '#6B7280' }
              ]}>
                {item.status === 'active' ? 'Activo' : 'Finalizada'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.rentalDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {days} día{days > 1 ? 's' : ''} de renta
            </Text>
          </View>
          {item.status === 'completed' && (
            <View style={styles.detailItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              <Text style={[styles.detailText, { color: '#10B981' }]}>
                Completada
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
            <Text style={styles.earningsText}>
              $${item.totalPrice.toFixed(2)} recibidos
            </Text>
          </View>
        </View>
        
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={14} color="#6B7280" />
            <Text style={styles.contactText} numberOfLines={1}>
              {item.renterEmail}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={14} color="#6B7280" />
            <Text style={styles.contactText}>
              {item.renterContact}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.paymentId}>
            🆔 {item.paymentId.slice(-8)}
          </Text>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat', {
              otherUserId: item.renterId,
              vehicleId: item.vehicleId,
            })}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No hay vehículos rentados</Text>
      <Text style={styles.emptyText}>
        Cuando alguien rente uno de tus vehículos, aparecerá aquí con toda la información del renter.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Vehículos Rentados</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{rentedVehicles.length}</Text>
          <Text style={styles.statLabel}>Vehículos Rentados</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.earningsNumber]}>
            ${calculateEarnings().toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Ingresos Totales</Text>
        </View>
      </View>

      <FlatList
        data={rentedVehicles}
        renderItem={renderRentedVehicle}
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  earningsNumber: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  vehicleCard: {
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
  vehicleHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  vehicleImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  renterName: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateRange: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusIndicator: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStatus: {
    backgroundColor: '#F0FDF4',
  },
  completedStatus: {
    backgroundColor: '#F9FAFB',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rentalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  earningsText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  contactInfo: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  chatButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
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
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addVehicleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});