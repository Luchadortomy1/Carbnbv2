import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { CarCard } from '../../components/CarCard';
import { LocationInput } from '../../components/LocationInput';
import { RadiusSlider } from '../../components/RadiusSlider';
import { vehicleService } from '../../services/firebaseService';
import { firebaseVehicleAvailabilityService } from '../../services/firebaseVehicleAvailabilityService';
import { locationService } from '../../services/locationService';
import { LOCATION_CONFIG } from '../../config/locationConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Vehicle, SearchFilters } from '../../types';

export const SearchScreen: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const navigation = useNavigation();
  const { user } = useAuth();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: null,
    radius: LOCATION_CONFIG.defaultRadius,
    type: '',
    minPrice: undefined,
    maxPrice: undefined,
  });

  const vehicleTypes = [
    { key: '', label: 'Todos los tipos' },
    { key: 'sedan', label: 'Sedán' },
    { key: 'suv', label: 'SUV' },
    { key: 'hatchback', label: 'Hatchback' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'coupe', label: 'Coupé' },
    { key: 'convertible', label: 'Convertible' },
    { key: 'motorcycle', label: 'Motocicleta' },
  ];

  useEffect(() => {
    loadAllVehicles();
  }, []);

  const loadAllVehicles = async () => {
    try {
      const vehiclesList = await vehicleService.getAvailableVehicles();

      
      // Filtrar vehículos del usuario actual y vehículos rentados
      const filteredVehicles = [];
      
      for (const vehicle of vehiclesList) {
        // Excluir vehículos del usuario actual si hay usuario logueado
        if (user && vehicle.ownerId === user.id) {
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
      

      setAllVehicles(filteredVehicles);
      setSearchResults(filteredVehicles);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'No se pudieron cargar los vehículos');
    }
  };

  const handleSearch = () => {
    let filtered = [...allVehicles];

    // Filtrar por ubicación y radio
    if (filters.location && filters.radius) {
      filtered = locationService.filterVehiclesByLocation(
        filtered,
        filters.location,
        filters.radius
      );
    }

    // Filtrar por tipo
    if (filters.type) {
      filtered = filtered.filter(vehicle => vehicle.type === filters.type);
    }

    // Filtrar por precio mínimo
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      filtered = filtered.filter(vehicle => vehicle.pricePerDay >= filters.minPrice!);
    }

    // Filtrar por precio máximo
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      filtered = filtered.filter(vehicle => vehicle.pricePerDay <= filters.maxPrice!);
    }

    setSearchResults(filtered);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      location: null,
      radius: LOCATION_CONFIG.defaultRadius,
      type: '',
      minPrice: undefined,
      maxPrice: undefined,
    });
    setSearchResults(allVehicles);
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleVehiclePress = async (vehicle: Vehicle) => {
    try {
      // Verificar si el vehículo está disponible
      const availability = await firebaseVehicleAvailabilityService.getVehicleAvailability(vehicle.id);
      
      const isCurrentlyRented = availability && !availability.isAvailable;
      const hasActiveReservations = availability?.reservations?.some((r: any) => r.status === 'active') || false;
      
      let statusMessage = '';
      let buttons = [];
      
      if (isCurrentlyRented || hasActiveReservations) {
        const activeReservation = availability?.reservations?.find((r: any) => r.status === 'active');
        const renterName = activeReservation?.renterName || 'Otro usuario';
        
        statusMessage = `\n\n🚫 Este vehículo ya fue rentado por ${renterName}.\n\n⏰ No está disponible para nuevas reservas hasta que finalice su periodo de renta actual.`;
        
        buttons = [
          { text: 'Entendido', style: 'cancel' as const },
          { 
            text: 'Seguir Buscando', 
            onPress: () => {}
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
          { text: 'Cancelar', style: 'cancel' as const },
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
            vehicle: {
              id: vehicle.id,
              brand: vehicle.brand,
              model: vehicle.model,
              ownerId: vehicle.ownerId,
              ownerName: vehicle.ownerName,
            },
          });
        }},
      ]
    );
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <CarCard vehicle={item} onPress={handleVehiclePress} />
  );

  const renderTypeSelector = () => (
    <View style={styles.typeSelector}>
      <Text style={styles.filterLabel}>Tipo de vehículo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollView}>
        {vehicleTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.typeButton,
              filters.type === type.key && styles.typeButtonActive,
            ]}
            onPress={() => updateFilter('type', type.key)}
          >
            <Text
              style={[
                styles.typeButtonText,
                filters.type === type.key && styles.typeButtonTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filtersHeader}>
        <Text style={styles.filtersTitle}>Filtros de búsqueda</Text>
        <TouchableOpacity onPress={() => setShowFilters(false)}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <LocationInput
        label="Ubicación"
        placeholder="Buscar ciudad, estado o dirección..."
        value={filters.location}
        onLocationSelect={(location) => updateFilter('location', location)}
        showCurrentLocationButton={true}
      />

      <RadiusSlider
        value={filters.radius || LOCATION_CONFIG.defaultRadius}
        onValueChange={(value) => updateFilter('radius', value)}
      />

      {renderTypeSelector()}

      <View style={styles.priceContainer}>
        <View style={styles.priceInput}>
          <CustomInput
            label="Precio mínimo"
            placeholder="0"
            value={filters.minPrice?.toString() || ''}
            onChangeText={(value) => updateFilter('minPrice', value ? Number.parseInt(value, 10) : undefined)}
            keyboardType="numeric"
            icon="cash-outline"
          />
        </View>
        <View style={styles.priceSeparator} />
        <View style={styles.priceInput}>
          <CustomInput
            label="Precio máximo"
            placeholder="1000"
            value={filters.maxPrice?.toString() || ''}
            onChangeText={(value) => updateFilter('maxPrice', value ? Number.parseInt(value, 10) : undefined)}
            keyboardType="numeric"
            icon="cash-outline"
          />
        </View>
      </View>

      <View style={styles.filterButtons}>
        <CustomButton
          title="Limpiar"
          variant="outline"
          onPress={clearFilters}
          style={styles.clearButton}
        />
        <CustomButton
          title="Buscar"
          onPress={handleSearch}
          style={styles.searchButton}
        />
      </View>
    </View>
  );

  const renderEmptyResults = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={80} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No se encontraron vehículos</Text>
      <Text style={styles.emptyMessage}>
        Intenta ajustar tus filtros de búsqueda
      </Text>
      <CustomButton
        title="Limpiar filtros"
        variant="outline"
        onPress={clearFilters}
        style={styles.clearFiltersButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscar vehículos</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={24} color="#3B82F6" />
          <Text style={styles.filterButtonText}>Filtros</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {searchResults.length} vehículo{searchResults.length === 1 ? '' : 's'} encontrado{searchResults.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyResults}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={searchResults.length === 0 ? styles.emptyListContainer : undefined}
      />

      {showFilters && (
        <TouchableOpacity 
          style={styles.filtersOverlay}
          activeOpacity={1}
          onPress={() => setShowFilters(false)}
        >
          <TouchableOpacity 
            style={styles.filtersContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView 
              style={styles.filtersScrollView} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {renderFilters()}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EBF4FF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 16,
    color: '#6B7280',
  },
  filtersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filtersContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    flex: 1,
  },
  filtersScrollView: {
    flex: 1,
  },
  filtersContainer: {
    padding: 20,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  typeSelector: {
    marginBottom: 20,
  },
  typeScrollView: {
    marginTop: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  priceContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  priceInput: {
    flex: 1,
  },
  priceSeparator: {
    width: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
  },
  searchButton: {
    flex: 1,
    marginLeft: 8,
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
  clearFiltersButton: {
    marginTop: 20,
  },
});