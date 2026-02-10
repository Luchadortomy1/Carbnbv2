import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BookingData {
  bookingId: string;
  vehicleId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerContact: string;
  renterId: string;
  renterName: string;
  renterEmail: string;
  renterContact: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  paymentId: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    imageUrl: string;
  };
}

export const bookingService = {
  async createBooking(bookingData: Omit<BookingData, 'bookingId' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const newBooking: BookingData = {
        ...bookingData,
        bookingId,
        status: 'active',
        createdAt: new Date(),
      };

      // Guardar en AsyncStorage
      const existingBookings = await this.getAllBookings();
      const updatedBookings = [...existingBookings, newBooking];
      await AsyncStorage.setItem('bookings', JSON.stringify(updatedBookings));


      return bookingId;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  async getAllBookings(): Promise<BookingData[]> {
    try {
      const bookingsData = await AsyncStorage.getItem('bookings');
      return bookingsData ? JSON.parse(bookingsData) : [];
    } catch (error) {
      console.error('Error getting all bookings:', error);
      return [];
    }
  },

  async getUserBookings(userId: string): Promise<BookingData[]> {
    try {
      const allBookings = await this.getAllBookings();
      return allBookings.filter(booking => 
        booking.renterId === userId || booking.ownerId === userId
      );
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw error;
    }
  },

  async getBookingById(bookingId: string): Promise<BookingData | null> {
    try {
      const allBookings = await this.getAllBookings();
      return allBookings.find(booking => booking.bookingId === bookingId) || null;
    } catch (error) {
      console.error('Error getting booking by ID:', error);
      throw error;
    }
  },

  async updateBookingStatus(bookingId: string, status: BookingData['status']): Promise<void> {
    try {
      const allBookings = await this.getAllBookings();
      const updatedBookings = allBookings.map(booking =>
        booking.bookingId === bookingId
          ? { ...booking, status, updatedAt: new Date() }
          : booking
      );
      await AsyncStorage.setItem('bookings', JSON.stringify(updatedBookings));
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },
};