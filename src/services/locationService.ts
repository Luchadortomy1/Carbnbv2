import * as Location from 'expo-location';
import { GOOGLE_PLACES_API_KEY, LOCATION_CONFIG } from '../config/locationConfig';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country?: string;
}

export interface PlacePrediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface SearchFilters {
  location?: LocationData;
  radius?: number; // en kilómetros
  minPrice?: number;
  maxPrice?: number;
  type?: string;
  transmission?: string;
  fuelType?: string;
}

class LocationService {
  private apiKey: string;

  constructor() {
    this.apiKey = GOOGLE_PLACES_API_KEY;
  }

  // Obtener ubicación actual del usuario
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {

        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: `${address.street || ''} ${address.streetNumber || ''}`.trim(),
        city: address.city || 'Ciudad',
        state: address.region || 'Estado',
        country: address.country || 'México',
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Buscar lugares con autocompletado usando Google Places API
  async searchPlaces(query: string): Promise<PlacePrediction[]> {
    if (!query || query.length < 3) return [];

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${this.apiKey}&language=es&components=country:mx&types=geocode`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        return data.predictions.map((prediction: any) => ({
          description: prediction.description,
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || '',
        }));
      }

      return [];
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  // Obtener detalles de un lugar por su place_id
  async getPlaceDetails(placeId: string): Promise<LocationData | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.apiKey}&fields=geometry,address_components,formatted_address&language=es`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const location = result.geometry.location;
        
        // Extraer componentes de la dirección
        let city = '';
        let state = '';
        let country = '';
        
        result.address_components?.forEach((component: any) => {
          if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
            city = component.long_name;
          } else if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (component.types.includes('country')) {
            country = component.long_name;
          }
        });

        return {
          latitude: location.lat,
          longitude: location.lng,
          address: result.formatted_address,
          city: city || 'Ciudad',
          state: state || 'Estado',
          country: country || 'México',
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  // Calcular distancia entre dos puntos (fórmula de Haversine)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Redondear a 2 decimales
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Filtrar vehículos por ubicación y distancia
  filterVehiclesByLocation(
    vehicles: any[],
    userLocation: LocationData,
    radius: number = LOCATION_CONFIG.defaultRadius
  ): any[] {
    return vehicles.filter((vehicle) => {
      if (!vehicle.location) return false;
      
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        vehicle.location.latitude,
        vehicle.location.longitude
      );
      
      return distance <= radius;
    }).map((vehicle) => ({
      ...vehicle,
      distance: this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        vehicle.location.latitude,
        vehicle.location.longitude
      ),
    })).sort((a, b) => a.distance - b.distance); // Ordenar por distancia
  }

  // Obtener sugerencias de ubicación basadas en texto parcial
  async getLocationSuggestions(partialText: string): Promise<string[]> {
    const commonLocations = [
      'San Luis Río Colorado, Sonora',
      'Mexicali, Baja California',
      'Tijuana, Baja California',
      'Hermosillo, Sonora',
      'Phoenix, Arizona',
      'Yuma, Arizona',
    ];

    if (!partialText || partialText.length < 2) {
      return commonLocations;
    }

    const filtered = commonLocations.filter(location =>
      location.toLowerCase().includes(partialText.toLowerCase())
    );

    // Si encontramos coincidencias locales, las devolvemos
    if (filtered.length > 0) {
      return filtered;
    }

    // Si no, buscamos en Google Places
    try {
      const predictions = await this.searchPlaces(partialText);
      return predictions.map(p => p.description);
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      return commonLocations;
    }
  }
}

export const locationService = new LocationService();