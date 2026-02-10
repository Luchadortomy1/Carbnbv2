import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { locationService, LocationData, PlacePrediction } from '../services/locationService';

interface LocationInputProps {
  label: string;
  placeholder?: string;
  value?: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  error?: string;
  showCurrentLocationButton?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  label,
  placeholder = 'Buscar ubicación...',
  value,
  onLocationSelect,
  error,
  showCurrentLocationButton = true,
}) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) {
      setQuery(`${value.city}, ${value.state}`);
    }
  }, [value]);

  useEffect(() => {
    const searchPlaces = async () => {
      if (query.length >= 3) {
        setLoading(true);
        try {
          const results = await locationService.searchPlaces(query);
          setPredictions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Error searching places:', error);
          setPredictions([]);
          setShowSuggestions(false);
        } finally {
          setLoading(false);
        }
      } else {
        setPredictions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(searchPlaces, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePlaceSelect = async (prediction: PlacePrediction) => {
    try {
      setLoading(true);
      const locationData = await locationService.getPlaceDetails(prediction.placeId);
      if (locationData) {
        setQuery(prediction.description);
        onLocationSelect(locationData);
        setShowSuggestions(false);
        setPredictions([]); // Limpiar sugerencias
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', 'No se pudo obtener los detalles de la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await locationService.getCurrentLocation();
      if (location) {
        setQuery(`${location.city}, ${location.state}`);
        onLocationSelect(location);
        setShowSuggestions(false);
        setPredictions([]); // Limpiar sugerencias
      } else {
        Alert.alert('Error', 'No se pudo obtener la ubicación actual');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Error al obtener la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const renderPrediction = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      style={styles.predictionItem}
      onPress={() => handlePlaceSelect(item)}
    >
      <Ionicons name="location-outline" size={20} color="#6B7280" />
      <View style={styles.predictionTextContainer}>
        <Text style={styles.predictionMainText}>{item.mainText}</Text>
        <Text style={styles.predictionSecondaryText}>{item.secondaryText}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay para permitir que el toque en sugerencia se registre
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onEndEditing={() => {
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholderTextColor="#9CA3AF"
          />
          {loading && (
            <Ionicons name="refresh" size={20} color="#6B7280" style={styles.loadingIcon} />
          )}
        </View>
        {showCurrentLocationButton && (
          <TouchableOpacity style={styles.currentLocationButton} onPress={handleCurrentLocation}>
            <Ionicons name="navigate" size={20} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && predictions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView 
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {predictions.map((item) => (
              <View key={item.placeId}>
                {renderPrediction({ item })}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  currentLocationButton: {
    marginLeft: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  suggestionsContainer: {
    position: 'relative',
    zIndex: 1000,
    elevation: 5, // Para Android
    shadowColor: '#000', // Para iOS
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionsList: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  predictionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  predictionMainText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  predictionSecondaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});