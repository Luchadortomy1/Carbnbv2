import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { CarCard } from '../../components/CarCard';
import { vehicleService } from '../../services/firebaseService';
import { firebaseVehicleAvailabilityService } from '../../services/firebaseVehicleAvailabilityService';
import { Vehicle } from '../../types';

const ListHeader: React.FC<{ user: any; vehicles: Vehicle[]; unreadCount: number; navigation: any }> = ({ user, vehicles, unreadCount, navigation }) => (
  <>
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hola, {user?.displayName || 'Usuario'}</Text>
        <Text style={styles.subtitle}>¿Qué vehículo buscas hoy?</Text>
      </View>
      <TouchableOpacity 
        style={styles.notificationButton}
        onPress={() => navigation.navigate('Notifications')}
      >
        <Ionicons name="notifications-outline" size={24} color="#374151" />
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      

    </View>
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{vehicles.length}</Text>
        <Text style={styles.statLabel}>Disponibles</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>
          ${vehicles.length > 0 ? Math.min(...vehicles.map(v => v.pricePerDay)).toFixed(2) : '0.00'}
        </Text>
        <Text style={styles.statLabel}>Desde</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>
          {new Set(vehicles.map(v => v.location.city)).size}
        </Text>
        <Text style={styles.statLabel}>Ciudades</Text>
      </View>
    </View>
  </>
);

export const HomeScreen: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigation = useNavigation();

  useEffect(() => {
    loadVehicles();
  }, [user]); // Recargar cuando cambie el usuario

  const loadVehicles = async () => {
    try {
      const vehiclesList = await vehicleService.getAvailableVehicles();

      
      // Filtrar vehículos del usuario actual y vehículos rentados
      const filteredVehicles = [];
      
      for (const vehicle of vehiclesList) {
        if (!user) {
          filteredVehicles.push(vehicle);
          continue;
        }
        
        // Excluir vehículos del usuario actual
        if (vehicle.ownerId === user.id) {
          continue;
        }
        
        try {
          // Verificar si el vehículo está disponible
          const availability = await firebaseVehicleAvailabilityService.getVehicleAvailability(vehicle.id);
          const isCurrentlyRented = availability && !availability.isAvailable;
          const hasActiveReservations = availability?.reservations?.some((r: any) => r.status === 'active') || false;
          
          // Solo incluir vehículos que NO están rentados
          if (!isCurrentlyRented && !hasActiveReservations) {
            filteredVehicles.push(vehicle);
          }
        } catch (error) {
          console.error(`Error checking availability for vehicle ${vehicle.id}:`, error);
          // En caso de error, incluir el vehículo (mejor mostrar de más que de menos)
          filteredVehicles.push(vehicle);
        }
      }
      

      for (let index = 0; index < filteredVehicles.length; index++) {
        const vehicle = filteredVehicles[index];

      }
      setVehicles(filteredVehicles);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'No se pudieron cargar los vehículos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const handleVehiclePress = async (vehicle: Vehicle) => {
    try {
      // Verificar si el vehículo está disponible
      const availability = await firebaseVehicleAvailabilityService.getVehicleAvailability(vehicle.id);
      
      const isCurrentlyRented = availability && !availability.isAvailable;
      const hasActiveReservations = availability?.reservations?.some(r => r.status === 'active') || false;
      
      let statusMessage = '';
      let buttons = [];
      
      if (isCurrentlyRented || hasActiveReservations) {
        const activeReservation = availability?.reservations?.find(r => r.status === 'active');
        const renterName = activeReservation?.renterName || 'Otro usuario';
        
        statusMessage = `\n\n🚫 Este vehículo ya fue rentado por ${renterName}.\n\n⏰ No está disponible para nuevas reservas hasta que finalice su periodo de renta actual.`;
        
        buttons = [
          { text: 'Entendido', style: 'cancel' as const },
          { 
            text: 'Buscar Otros', 
            onPress: () => {
              // Simplemente cerrar y dejar que busquen manualmente

            } 
          }
        ];
      } else {
        buttons = [
          { text: 'Cancelar', style: 'cancel' as const },
          { text: 'Contactar', onPress: () => handleContactOwner(vehicle) },
        ];
      }
      
      Alert.alert(
        vehicle.brand + ' ' + vehicle.model,
        `${vehicle.description}\n\nPrecio: $${vehicle.pricePerDay.toFixed(2)}/día\nUbicación: ${vehicle.location.city}, ${vehicle.location.state}${statusMessage}`,
        buttons
      );
    } catch (error) {
      console.error('Error checking vehicle availability:', error);
      // Si hay error, mostrar opciones normales
      Alert.alert(
        vehicle.brand + ' ' + vehicle.model,
        `${vehicle.description}\n\nPrecio: $${vehicle.pricePerDay.toFixed(2)}/día\nUbicación: ${vehicle.location.city}, ${vehicle.location.state}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Contactar', onPress: () => handleContactOwner(vehicle) },
        ]
      );
    }
  };



  const handleContactOwner = (vehicle: Vehicle) => {
    if (!user) {
      Alert.alert('Error', 'Necesitas iniciar sesión para contactar al propietario');
      return;
    }

    if (vehicle.ownerId === user.id) {
      Alert.alert('Información', 'No puedes contactar tu propio vehículo');
      return;
    }



    Alert.alert(
      'Contactar propietario',
      `¿Deseas contactar a ${vehicle.ownerName} por el ${vehicle.brand} ${vehicle.model}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, contactar', onPress: () => {
          (navigation as any).navigate('Chat', {
            otherUserId: vehicle.ownerId,
            vehicleId: vehicle.id,
            vehicle: vehicle, // Pasar el objeto completo
          });
        }},
      ]
    );
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <CarCard vehicle={item} onPress={handleVehiclePress} />
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={80} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No hay vehículos disponibles</Text>
      <Text style={styles.emptyMessage}>
        Sé el primero en publicar tu vehículo en la plataforma
      </Text>
      

    </View>
  );



  if (loading && vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="car-sport" size={50} color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando vehículos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ListHeader user={user} vehicles={vehicles} unreadCount={unreadCount} navigation={navigation} />}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={vehicles.length === 0 ? styles.emptyListContainer : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});