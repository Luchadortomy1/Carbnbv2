import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../contexts/AuthContext';
import { vehicleService } from '../../services/firebaseService';
import { Vehicle } from '../../types';
import { useNavigation } from '@react-navigation/native';

export const AddCarScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    color: '',
    type: 'sedan' as Vehicle['type'],
    transmission: 'manual' as Vehicle['transmission'],
    fuelType: 'gasoline' as Vehicle['fuelType'],
    pricePerDay: '',
    description: '',
    features: [] as string[],
  });
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const vehicleTypes = [
    { key: 'sedan', label: 'Sedán' },
    { key: 'suv', label: 'SUV' },
    { key: 'hatchback', label: 'Hatchback' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'coupe', label: 'Coupé' },
    { key: 'convertible', label: 'Convertible' },
    { key: 'motorcycle', label: 'Motocicleta' },
  ];

  const transmissionTypes = [
    { key: 'manual', label: 'Manual' },
    { key: 'automatic', label: 'Automático' },
  ];

  const fuelTypes = [
    { key: 'gasoline', label: 'Gasolina' },
    { key: 'diesel', label: 'Diésel' },
    { key: 'electric', label: 'Eléctrico' },
    { key: 'hybrid', label: 'Híbrido' },
  ];

  const features = [
    'Aire acondicionado',
    'GPS',
    'Bluetooth',
    'Cámara trasera',
    'Asientos de cuero',
    'Techo solar',
    'Sistema de sonido premium',
    'Control crucero',
    'Sensores de parking',
    'Arranque sin llave',
  ];

  const updateFormData = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar que el usuario tenga número de teléfono
    if (!user?.phoneNumber || user.phoneNumber.trim() === '') {
      Alert.alert(
        '📱 Número de Teléfono Requerido',
        'Para publicar un vehículo necesitas tener un número de teléfono en tu perfil. Esto permite que los interesados puedan contactarte.\n\n¿Quieres ir a tu perfil para agregarlo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Ir a Perfil', 
            onPress: () => {
              // @ts-ignore
              navigation.navigate('EditProfile');
            }
          }
        ]
      );
      return false;
    }

    if (!formData.brand.trim()) newErrors.brand = 'La marca es requerida';
    if (!formData.model.trim()) newErrors.model = 'El modelo es requerido';
    if (formData.year.trim() === '') {
      newErrors.year = 'El año es requerido';
    } else {
      const yearNum = Number.parseInt(formData.year, 10);
      if (yearNum < 1990 || yearNum > new Date().getFullYear() + 1) {
        newErrors.year = 'Ingresa un año válido';
      }
    }
    if (!formData.color.trim()) newErrors.color = 'El color es requerido';
    if (formData.pricePerDay.trim() === '') {
      newErrors.pricePerDay = 'El precio es requerido';
    } else {
      const price = Number.parseInt(formData.pricePerDay, 10);
      if (price < 0) {
        newErrors.pricePerDay = 'El precio debe ser mayor o igual a 0';
      }
    }
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';
    if (images.length === 0) newErrors.images = 'Agrega al menos una foto';
    if (!location) newErrors.location = 'La ubicación es requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a las fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImages(prev => [...prev, result.assets[0].uri]);
        if (errors.images) {
          setErrors(prev => ({ ...prev, images: '' }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Error al seleccionar la imagen');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de ubicación');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: `${address.street || ''} ${address.streetNumber || ''}`.trim(),
        city: address.city || 'Ciudad',
        state: address.region || 'Estado',
      });

      if (errors.location) {
        setErrors(prev => ({ ...prev, location: '' }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Error al obtener la ubicación');
    }
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (!user) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      // Crear el vehículo primero para obtener el ID
      const vehicleId = await vehicleService.createVehicle({
        ownerId: user.id,
        ownerName: user.displayName || user.email || 'Usuario',
        ownerPhoto: user.photoURL || '',
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: Number.parseInt(formData.year, 10),
        color: formData.color.trim(),
        type: formData.type,
        transmission: formData.transmission,
        fuelType: formData.fuelType,
        pricePerDay: Number.parseInt(formData.pricePerDay, 10),
        description: formData.description.trim(),
        images: [], // Se actualizará después de subir las imágenes
        location: location!,
        features: formData.features,
        available: true,
      });

      // Subir imágenes
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const imageUrl = await vehicleService.uploadVehicleImage(images[i], vehicleId, i);
        imageUrls.push(imageUrl);
      }

      // Actualizar el vehículo con las URLs de las imágenes
      await vehicleService.updateVehicle(vehicleId, { images: imageUrls });

      Alert.alert(
        'Éxito',
        'Tu vehículo ha sido publicado correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              // Limpiar el formulario
              setFormData({
                brand: '',
                model: '',
                year: '',
                color: '',
                type: 'sedan',
                transmission: 'manual',
                fuelType: 'gasoline',
                pricePerDay: '',
                description: '',
                features: [],
              });
              setImages([]);
              setLocation(null);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating vehicle:', error);
      Alert.alert('Error', 'Error al publicar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  const renderImagePicker = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Fotos del vehículo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
        {images.map((image, index) => (
          <View key={`image-${image}-${index}`} style={styles.imageWrapper}>
            <Image source={{ uri: image }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
          <Ionicons name="camera" size={32} color="#6B7280" />
          <Text style={styles.addImageText}>Agregar foto</Text>
        </TouchableOpacity>
      </ScrollView>
      {Boolean(errors.images) && <Text style={styles.errorText}>{errors.images}</Text>}
    </View>
  );

  const renderSelector = (
    title: string,
    options: { key: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.selectorButton,
              selectedValue === option.key && styles.selectorButtonActive,
            ]}
            onPress={() => onSelect(option.key)}
          >
            <Text
              style={[
                styles.selectorButtonText,
                selectedValue === option.key && styles.selectorButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFeatures = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Características</Text>
      <View style={styles.featuresGrid}>
        {features.map((feature) => (
          <TouchableOpacity
            key={feature}
            style={[
              styles.featureButton,
              formData.features.includes(feature) && styles.featureButtonActive,
            ]}
            onPress={() => toggleFeature(feature)}
          >
            <Text
              style={[
                styles.featureButtonText,
                formData.features.includes(feature) && styles.featureButtonTextActive,
              ]}
            >
              {feature}
            </Text>
            {formData.features.includes(feature) && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Publicar mi vehículo</Text>
            <Text style={styles.subtitle}>Completa la información de tu vehículo</Text>
          </View>

          {/* Alerta si no tiene teléfono */}
          {(!user?.phoneNumber || user.phoneNumber.trim() === '') && (
            <View style={styles.phoneWarningCard}>
              <View style={styles.phoneWarningHeader}>
                <Ionicons name="warning" size={28} color="#F59E0B" />
                <View style={styles.phoneWarningContent}>
                  <Text style={styles.phoneWarningTitle}>📱 Teléfono Requerido</Text>
                  <Text style={styles.phoneWarningText}>
                    Necesitas agregar tu número de teléfono para poder publicar vehículos.
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.phoneWarningButton}
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('EditProfile');
                }}
              >
                <Text style={styles.phoneWarningButtonText}>Agregar Teléfono</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {renderImagePicker()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información básica</Text>
            <CustomInput
              label="Marca"
              placeholder="Toyota, Honda, Ford..."
              value={formData.brand}
              onChangeText={(value) => updateFormData('brand', value)}
              error={errors.brand}
              icon="car-outline"
            />
            <CustomInput
              label="Modelo"
              placeholder="Corolla, Civic, Focus..."
              value={formData.model}
              onChangeText={(value) => updateFormData('model', value)}
              error={errors.model}
              icon="car-sport-outline"
            />
            <CustomInput
              label="Año"
              placeholder="2020"
              value={formData.year}
              onChangeText={(value) => updateFormData('year', value)}
              error={errors.year}
              keyboardType="numeric"
              icon="calendar-outline"
            />
            <CustomInput
              label="Color"
              placeholder="Blanco, Negro, Azul..."
              value={formData.color}
              onChangeText={(value) => updateFormData('color', value)}
              error={errors.color}
              icon="color-palette-outline"
            />
          </View>

          {renderSelector('Tipo de vehículo', vehicleTypes, formData.type, (value) =>
            updateFormData('type', value as Vehicle['type'])
          )}

          {renderSelector('Transmisión', transmissionTypes, formData.transmission, (value) =>
            updateFormData('transmission', value as Vehicle['transmission'])
          )}

          {renderSelector('Combustible', fuelTypes, formData.fuelType, (value) =>
            updateFormData('fuelType', value as Vehicle['fuelType'])
          )}

          <View style={styles.section}>
            <CustomInput
              label="Precio por día (USD) - Mínimo $100"
              placeholder="100"
              value={formData.pricePerDay}
              onChangeText={(value) => updateFormData('pricePerDay', value)}
              error={errors.pricePerDay}
              keyboardType="numeric"
              icon="cash-outline"
            />
          </View>

          <View style={styles.section}>
            <CustomInput
              label="Descripción"
              placeholder="Describe tu vehículo, condiciones especiales, etc."
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              error={errors.description}
              multiline={true}
              style={styles.textArea}
              icon="document-text-outline"
            />
          </View>

          {renderFeatures()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
              <Ionicons name="location-outline" size={24} color="#3B82F6" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationButtonText}>
                  {location ? 'Actualizar ubicación' : 'Obtener ubicación actual'}
                </Text>
                {location && (
                  <Text style={styles.locationText}>
                    {location.address}, {location.city}, {location.state}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {Boolean(errors.location) && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          <CustomButton
            title="Publicar vehículo"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  imageContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addImageButton: {
    width: 120,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addImageText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  selectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  selectorButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  selectorButtonTextActive: {
    color: '#FFFFFF',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  featureButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  featureButtonText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 4,
  },
  featureButtonTextActive: {
    color: '#FFFFFF',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
  },
  submitButton: {
    margin: 16,
    marginBottom: 32,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  phoneWarningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  phoneWarningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  phoneWarningContent: {
    flex: 1,
    marginLeft: 12,
  },
  phoneWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  phoneWarningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  phoneWarningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  phoneWarningButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});