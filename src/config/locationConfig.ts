// Google Places API configuration
// IMPORTANTE: Reemplaza 'YOUR_API_KEY_HERE' con tu API key real de Google Places API
export const GOOGLE_PLACES_API_KEY = 'AIzaSyA_k9wLZR9G_6ZX93FFuSotolCz9uzrX4o';

export const GOOGLE_PLACES_CONFIG = {
  key: GOOGLE_PLACES_API_KEY,
  language: 'es',
  region: 'MX', // México
  types: 'geocode', // Para obtener direcciones
  components: 'country:mx', // Limitar a México
};

export const LOCATION_CONFIG = {
  defaultRadius: 15, // 15 km por defecto
  minRadius: 5,
  maxRadius: 50,
  defaultLocation: {
    latitude: 32.5027, // San Luis Río Colorado, Sonora
    longitude: -114.7705,
    city: 'San Luis Río Colorado',
    state: 'Sonora',
  },
};