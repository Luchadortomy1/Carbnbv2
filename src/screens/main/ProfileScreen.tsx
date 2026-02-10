import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

import { CarCard } from '../../components/CarCard';
import { vehicleService } from '../../services/firebaseService';
import { hybridBookingService } from '../../services/hybridBookingService';
import { bookingExpirationService } from '../../services/bookingExpirationService';

import { Vehicle, Booking } from '../../types';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [rentedVehicles, setRentedVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'bookings' | 'rented'>('vehicles');

  useEffect(() => {
    if (user) {
      loadUserData();
      checkAndUpdateExpiredBookings(); // Verificar reservas vencidas al cargar
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      if (!user) return;

      // Cargar vehículos del usuario
      const vehicles = await vehicleService.getVehiclesByUser(user.id);
      
      // Filtrar vehículos disponibles vs rentados usando el servicio de Firebase
      const { firebaseVehicleAvailabilityService } = await import('../../services/firebaseVehicleAvailabilityService');
      const vehiclesWithAvailability = await Promise.all(
        vehicles.map(async (vehicle) => {
          const availability = await firebaseVehicleAvailabilityService.getVehicleAvailability(vehicle.id);
          return {
            ...vehicle,
            isCurrentlyRented: availability ? !availability.isAvailable : false,
            reservationInfo: availability?.reservations.find(r => r.status === 'active') || null
          };
        })
      );
      


      // Solo mostrar vehículos disponibles en "Mis Vehículos"
      const availableVehicles = vehiclesWithAvailability.filter(v => !v.isCurrentlyRented);
      setUserVehicles(availableVehicles);



      // Usar el servicio híbrido de bookings (Firebase + AsyncStorage fallback)
      const detailedBookings = await hybridBookingService.getUserBookings(user.id);
      


      
      // Convertir a formato compatible con el componente existente
      const formattedBookings = detailedBookings.map(booking => ({
        id: booking.bookingId,
        vehicleId: booking.vehicleId,
        ownerId: booking.ownerId,
        renterId: booking.renterId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.createdAt,
        // Información adicional para mostrar - incluyendo contacto completo
        renterName: booking.renterName,
        renterEmail: booking.renterEmail,
        renterContact: booking.renterContact,
        ownerName: booking.ownerName,
        ownerEmail: booking.ownerEmail, // Información completa del propietario
        ownerContact: booking.ownerContact, // Teléfono del propietario
        vehicleInfo: `${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}`,
        paymentId: booking.paymentId,
      }));

      setUserBookings(formattedBookings);

      // Cargar vehículos rentados combinando información de vehículos reales + bookings
      const rentedVehiclesData = [];
      
      // Obtener vehículos que están actualmente rentados (isCurrentlyRented = true)
      const currentlyRentedVehicles = vehiclesWithAvailability.filter(v => v.isCurrentlyRented);
      

      
      for (const vehicle of currentlyRentedVehicles) {
        // Buscar la información de reserva activa para este vehículo
        const activeBooking = detailedBookings.find(booking => 
          booking.vehicleId === vehicle.id && 
          booking.ownerId === user.id && 
          booking.status === 'active'
        );
        

        
        if (activeBooking) {
          rentedVehiclesData.push({
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            images: vehicle.images,
            pricePerDay: vehicle.pricePerDay,
            renterInfo: {
              renterId: activeBooking.renterId,
              name: activeBooking.renterName,
              email: activeBooking.renterEmail,
              contact: activeBooking.renterContact || activeBooking.renterEmail,
              startDate: activeBooking.startDate,
              endDate: activeBooking.endDate,
              totalPrice: activeBooking.totalPrice,
              paymentId: activeBooking.paymentId,
            }
          });
        }
      }
      

      
      setRentedVehicles(rentedVehiclesData);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };



  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          style: 'destructive',
          onPress: () => {
            logout().catch(() => {
              Alert.alert('Error', 'Error al cerrar sesión');
            });
          }
        },
      ]
    );
  };

  const handleVehiclePress = (vehicle: Vehicle) => {
    Alert.alert(
      vehicle.brand + ' ' + vehicle.model,
      `${vehicle.description}\n\nPrecio: $${vehicle.pricePerDay.toFixed(2)}/día\nEstado: ${vehicle.available ? 'Disponible' : 'No disponible'}`,
      [
        { text: 'Cancelar', style: 'cancel' },

        { 
          text: vehicle.available ? 'Desactivar' : 'Activar', 
          onPress: () => {
            toggleVehicleAvailability(vehicle).catch(() => {
              Alert.alert('Error', 'No se pudo actualizar el vehículo');
            });
          }
        },
      ]
    );
  };

  const toggleVehicleAvailability = async (vehicle: Vehicle) => {
    try {
      await vehicleService.updateVehicle(vehicle.id, { 
        available: !vehicle.available 
      });
      
      setUserVehicles(prev => 
        prev.map(v => 
          v.id === vehicle.id 
            ? { ...v, available: !v.available }
            : v
        )
      );

      Alert.alert(
        'Éxito',
        `Vehículo ${vehicle.available ? 'desactivado' : 'activado'} correctamente`
      );
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', 'No se pudo actualizar el vehículo');
    }
  };

  const getBookingStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#10B981';
      case 'active': return '#3B82F6';
      case 'completed': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getBookingStatusText = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'active': return 'Activa';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const showBookingDetails = (booking: any) => {
    const isOwner = booking.ownerId === user?.id;
    const bookingDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();
    
    const detailsMessage = `
🚗 DETALLES DE LA RESERVA

${booking.vehicleInfo || `Reserva #${booking.id.slice(-6).toUpperCase()}`}

📅 Fechas: ${bookingDate} - ${endDate}
💰 Total: $${booking.totalPrice.toFixed(2)}
🆔 ID de Pago: ${booking.paymentId.slice(-8)}
📊 Estado: ${getBookingStatusText(booking.status)}

${isOwner ? '👤 INFORMACIÓN DEL RENTER:' : '🏢 INFORMACIÓN DEL PROPIETARIO:'}
${isOwner ? `Nombre: ${booking.renterName}
📧 Email: ${booking.renterEmail}
📞 Teléfono: ${booking.renterContact}
✅ Contacto directo disponible` : `Propietario: ${booking.ownerName}
📧 Email: ${booking.ownerEmail}
📞 Teléfono: ${booking.ownerContact}
✅ Contacto directo disponible`}

${isOwner ? '💡 Como propietario, prepárate para entregar el vehículo en las fechas programadas.' : '💡 Como renter, contacta al propietario para coordinar la entrega del vehículo.'}
    `.trim();

    Alert.alert(
      '📋 Detalles de Reserva',
      detailsMessage,
      [
        { text: 'Cerrar', style: 'cancel' },
        ...(isOwner ? [
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
        ] : [
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
        ])
      ]
    );
  };

  const showRentedVehicleDetails = (vehicleData: any) => {
    const startDate = new Date(vehicleData.renterInfo.startDate).toLocaleDateString();
    const endDate = new Date(vehicleData.renterInfo.endDate).toLocaleDateString();
    const days = Math.ceil((new Date(vehicleData.renterInfo.endDate).getTime() - new Date(vehicleData.renterInfo.startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    const detailsMessage = `
🎉 VEHÍCULO RENTADO EXITOSAMENTE

👤 Rentado por: ${vehicleData.renterInfo.name}
📧 Email: ${vehicleData.renterInfo.email}
📞 Contacto: ${vehicleData.renterInfo.contact || 'Ver en chat'}

📅 Fechas de renta:
   Inicio: ${startDate}
   Final: ${endDate}
   Duración: ${days} día${days > 1 ? 's' : ''}

💰 Pago recibido: $${vehicleData.renterInfo.totalPrice ? vehicleData.renterInfo.totalPrice.toFixed(2) : 'Ver booking'}
🆔 ID de Pago: ${vehicleData.renterInfo.paymentId.slice(-8)}

💡 Tu vehículo está temporalmente fuera de circulación pública y no aparece en búsquedas.

🔧 ¿Necesitas hacer algún cambio? Contacta al soporte.
    `.trim();

    Alert.alert(
      `🚗 ${vehicleData.brand} ${vehicleData.model}`,
      detailsMessage,
      [
        { text: 'Cerrar', style: 'cancel' },
        { 
          text: 'Contactar Renter', 
          onPress: () => {
            // Navegar al chat con el renter
            navigation.navigate('Chat', {
              otherUserId: vehicleData.renterInfo.renterId,
              vehicleId: vehicleData.id,
            });
          }
        }
      ]
    );
  };



  const navigateToRentedVehicles = () => {
    navigation.navigate('RentedVehicles');
  };

  const navigateToBookingHistory = () => {
    navigation.navigate('BookingHistory');
  };

  // Función para verificar y actualizar reservas vencidas
  const checkAndUpdateExpiredBookings = async () => {
    if (!user) return;
    
    try {
      // Usar el servicio centralizado de expiración
      await bookingExpirationService.checkAndUpdateExpiredBookings();
      
      // Recargar datos para mostrar los cambios
      await loadUserData();
      
    } catch (error) {
      console.error('❌ Error verificando reservas vencidas:', error);
    }
  };



  const renderBookingItem = (booking: any) => {
    const isOwner = booking.ownerId === user?.id;
    
    return (
      <TouchableOpacity 
        key={booking.id} 
        style={styles.bookingItem}
        onPress={() => showBookingDetails(booking)}
        activeOpacity={0.7}
      >
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingTitle}>
            {booking.vehicleInfo || `Reserva #${booking.id.slice(-6).toUpperCase()}`}
          </Text>
          <View style={styles.bookingHeaderRight}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getBookingStatusColor(booking.status) + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getBookingStatusColor(booking.status) }
              ]}>
                {getBookingStatusText(booking.status)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetail}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.bookingDetailText}>
              {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.bookingDetail}>
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text style={styles.bookingDetailText}>${booking.totalPrice}</Text>
          </View>

          {/* Mostrar información del renter si el usuario es el propietario */}
          {isOwner && booking.renterName && (
            <>
              <View style={styles.bookingDetail}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                <Text style={styles.bookingDetailText}>Rentado por: {booking.renterName}</Text>
              </View>
              <View style={styles.bookingDetail}>
                <Ionicons name="mail-outline" size={16} color="#6B7280" />
                <Text style={styles.bookingDetailText}>{booking.renterEmail}</Text>
              </View>
              <View style={styles.bookingDetail}>
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <Text style={styles.bookingDetailText}>Tel: {booking.renterContact}</Text>
              </View>
            </>
          )}

          {/* Mostrar información del propietario si el usuario es el renter */}
          {!isOwner && (
            <>
              <View style={styles.bookingDetail}>
                <Ionicons name="business-outline" size={16} color="#6B7280" />
                <Text style={styles.bookingDetailText}>Propietario: {booking.ownerName || 'No disponible'}</Text>
              </View>
              <View style={styles.bookingDetail}>
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <Text style={styles.bookingDetailText}>Tel: {booking.ownerContact || 'No disponible'}</Text>
              </View>
            </>
          )}

          <View style={styles.bookingDetail}>
            <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
            <Text style={[styles.bookingDetailText, { color: '#3B82F6', fontWeight: '500' }]}>
              Toca para ver más detalles
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.profileInfo}>
        <Image
          source={{ 
            uri: user?.photoURL || 'https://via.placeholder.com/80x80' 
          }}
          style={styles.profileAvatar}
        />
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{user?.displayName || 'Usuario'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.memberSince}>
            Miembro desde {user?.createdAt?.toLocaleDateString() || 'N/A'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="create-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {userBookings.filter(b => b.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Reservas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {userVehicles.filter(v => v.available).length}
          </Text>
          <Text style={styles.statLabel}>Disponibles</Text>
        </View>
      </View>
    </View>
  );

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'vehicles' && styles.tabButtonActive
        ]}
        onPress={() => setActiveTab('vehicles')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'vehicles' && styles.tabButtonTextActive
        ]}>
          Mis Vehículos 
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'bookings' && styles.tabButtonActive
        ]}
        onPress={() => setActiveTab('bookings')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'bookings' && styles.tabButtonTextActive
        ]}>
          Mis Reservas
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'rented' && styles.tabButtonActive
        ]}
        onPress={() => setActiveTab('rented')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'rented' && styles.tabButtonTextActive
        ]}>
          Vehículos Rentados 
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'vehicles') {
      return userVehicles.length > 0 ? (
        <View style={styles.vehiclesContainer}>
          {userVehicles.map(vehicle => (
            <CarCard
              key={vehicle.id}
              vehicle={vehicle}
              onPress={handleVehiclePress}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={60} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No tienes vehículos publicados</Text>
          <Text style={styles.emptyMessage}>
            Publica tu primer vehículo y comienza a ganar dinero
          </Text>
        </View>
      );
    }

    if (activeTab === 'rented') {
      return (
        <View style={styles.vehiclesContainer}>
          {/* Botón de Historial de Vehículos Rentados */}
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => navigateToRentedVehicles()}
          >
            <View style={styles.historyButtonContent}>
              <Ionicons name="car-sport-outline" size={20} color="#10B981" />
              <Text style={[styles.historyButtonText, { color: '#10B981' }]}>Ver Historial de Rentas</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
            <Text style={styles.historyButtonSubtext}>
              Todos los vehículos rentados
            </Text>
          </TouchableOpacity>

          {rentedVehicles.length > 0 ? (
            <>
              <Text style={styles.sectionSubtitle}>Vehículos Actualmente Rentados</Text>
              {rentedVehicles.slice(0, 3).map((vehicleData, index) => (
            <TouchableOpacity 
              key={`${vehicleData.brand}-${vehicleData.model}-${vehicleData.renterInfo.paymentId}`} 
              style={styles.rentedVehicleCard}
              onPress={() => showRentedVehicleDetails(vehicleData)}
              activeOpacity={0.8}
            >
              <View style={styles.rentedVehicleInfo}>
                {/* Header con imagen y badge */}
                <View style={styles.rentedVehicleHeader}>
                  <View style={styles.rentedVehicleMainInfo}>
                    <Image 
                      source={{ uri: vehicleData.images?.[0] || 'https://via.placeholder.com/60x40' }}
                      style={styles.rentedVehicleImage}
                    />
                    <View style={styles.rentedVehicleTitleContainer}>
                      <Text style={styles.rentedVehicleTitle}>
                        {vehicleData.brand} {vehicleData.model}
                      </Text>
                      <Text style={styles.rentedVehicleYear}>{vehicleData.year}</Text>
                    </View>
                  </View>
                  <View style={styles.rentedBadge}>
                    <Ionicons name="cash" size={14} color="#FFFFFF" />
                    <Text style={styles.rentedBadgeText}>RENTADO</Text>
                  </View>
                </View>
                
                {/* Información del renter con avatar */}
                <View style={styles.renterInfoSection}>
                  <View style={styles.renterHeaderWithAvatar}>
                    <Image 
                      source={{ uri: 'https://via.placeholder.com/40x40' }}
                      style={styles.renterAvatar}
                    />
                    <View style={styles.renterMainInfo}>
                      <Text style={styles.renterName}>{vehicleData.renterInfo.name}</Text>
                      <Text style={styles.renterEmail}>{vehicleData.renterInfo.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </View>

                {/* Detalles compactos */}
                <View style={styles.rentalDetailsCompact}>
                  <View style={styles.compactDetailItem}>
                    <Ionicons name="calendar" size={16} color="#10B981" />
                    <Text style={styles.compactDetailText}>
                      {new Date(vehicleData.renterInfo.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.compactDetailItem}>
                    <Ionicons name="time" size={16} color="#F59E0B" />
                    <Text style={styles.compactDetailText}>
                      {Math.ceil((new Date(vehicleData.renterInfo.endDate).getTime() - new Date(vehicleData.renterInfo.startDate).getTime()) / (1000 * 60 * 60 * 24))} días
                    </Text>
                  </View>
                  <View style={styles.compactDetailItem}>
                    <Ionicons name="cash" size={16} color="#3B82F6" />
                    <Text style={styles.compactDetailText}>
                      ${vehicleData.renterInfo.totalPrice || 'Ver booking'}
                    </Text>
                  </View>
                </View>

                {/* Indicador de más información */}
                <View style={styles.moreInfoIndicator}>
                  <Ionicons name="information-circle" size={16} color="#6B7280" />
                  <Text style={styles.moreInfoText}>Toca para ver detalles completos</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
              {rentedVehicles.length > 3 && (
                <Text style={styles.moreItemsText}>
                  +{rentedVehicles.length - 3} vehículos más en historial
                </Text>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-sport-outline" size={60} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No tienes vehículos rentados</Text>
              <Text style={styles.emptyMessage}>
                Cuando alguien rente uno de tus vehículos, aparecerá aquí
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.bookingsContainer}>
        {/* Botón de Historial de Reservas */}
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => navigateToBookingHistory()}
        >
          <View style={styles.historyButtonContent}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <Text style={styles.historyButtonText}>Ver Historial Completo</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
          <Text style={styles.historyButtonSubtext}>
            Todas las reservas realizadas
          </Text>
        </TouchableOpacity>

        {userBookings.length > 0 ? (
          <>
            <Text style={styles.sectionSubtitle}>Reservas Activas</Text>
            {userBookings.filter(b => b.status === 'active').slice(0, 3).map(renderBookingItem)}
            {userBookings.filter(b => b.status === 'active').length > 3 && (
              <Text style={styles.moreItemsText}>
                +{userBookings.filter(b => b.status === 'active').length - 3} reservas más en historial
              </Text>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No tienes reservas activas</Text>
            <Text style={styles.emptyMessage}>
              Cuando reserves un vehículo, aparecerá aquí
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="person" size={50} color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderProfileHeader()}
        {renderTabButtons()}
        {renderContent()}
      </ScrollView>
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#3B82F6',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#3B82F6',
  },
  vehiclesContainer: {
    paddingTop: 8,
  },
  bookingsContainer: {
    padding: 16,
  },
  bookingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDetails: {
    gap: 8,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
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
  logoutButtonBottom: {
    margin: 20,
    marginTop: 32,
  },
  editProfileButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  viewAllBookingsButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  bookingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewAllBookingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  bookingsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingsCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyBookingsPreview: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyBookingsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  rentedVehicleCard: {
    position: 'relative',
    marginBottom: 16,
  },
  rentedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rentedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rentedVehicleInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rentedVehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rentedVehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  renterInfoSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  renterInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  renterInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  renterInfoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  rentalDetailsSection: {
    marginBottom: 8,
  },
  rentalDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  rentalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rentalDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  rentalDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  // Nuevos estilos para vehículos rentados mejorados
  rentedVehicleMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rentedVehicleImage: {
    width: 60,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  rentedVehicleTitleContainer: {
    flex: 1,
  },
  rentedVehicleYear: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  renterHeaderWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  renterMainInfo: {
    flex: 1,
  },
  renterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  renterEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  rentalDetailsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  compactDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDetailText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  moreInfoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  moreInfoText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  // Estilos para botones de historial
  historyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    flex: 1,
    marginLeft: 8,
  },
  historyButtonSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 28,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  moreItemsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
  },
});