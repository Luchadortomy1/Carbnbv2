export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  type: 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'coupe' | 'convertible' | 'motorcycle';
  transmission: 'manual' | 'automatic';
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  pricePerDay: number;
  description: string;
  images: string[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
  };
  features: string[];
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  vehicleId: string;
  ownerId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: string[];
  participantPhotos: string[];
  vehicleId?: string;
  vehicleTitle?: string;
  ownerId?: string; // ID del propietario del vehículo
  renterId?: string; // ID del interesado/renter
  lastMessage?: Message;
  updatedAt: Date;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  AddCar: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Chat: {
    chatId?: string;
    otherUserId?: string;
    vehicleId?: string;
    vehicle?: Vehicle;
  };
  Notifications: undefined;
  EditProfile: undefined;
  Bookings: undefined;
  BookingHistory: undefined;
  RentedVehicles: undefined;
  Payment: {
    bookingDetails: {
      vehicle: Vehicle;
      startDate: Date;
      endDate: Date;
      totalPrice: number;
      days: number;
      ownerId: string;
      ownerName: string;
    };
    chatId: string;
  };
};

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country?: string;
}

export type SearchFilters = {
  location?: LocationData | null;
  radius?: number;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: Date;
  endDate?: Date;
};