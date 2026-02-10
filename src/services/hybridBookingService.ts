import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
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

export const hybridBookingService = {
  async createBooking(bookingData: Omit<BookingData, 'bookingId' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const newBooking: BookingData = {
        ...bookingData,
        bookingId,
        status: 'active',
        createdAt: new Date(),
      };



      // 1. Guardar en Firebase
      try {
        await setDoc(doc(db, 'bookings', bookingId), {
          ...newBooking,
          startDate: Timestamp.fromDate(newBooking.startDate),
          endDate: Timestamp.fromDate(newBooking.endDate),
          createdAt: Timestamp.fromDate(newBooking.createdAt),
        });

      } catch (firebaseError) {
        console.warn('⚠️ Error guardando en Firebase:', firebaseError);
      }

      // 2. Guardar en AsyncStorage como backup
      await AsyncStorage.setItem(`booking_${bookingId}`, JSON.stringify(newBooking));


      // 3. Agregar a lista de bookings del usuario
      await this.addToUserBookings(bookingData.ownerId, bookingId);
      await this.addToUserBookings(bookingData.renterId, bookingId);

      return bookingId;
    } catch (error) {
      console.error('❌ Error creando booking:', error);
      throw error;
    }
  },

  async addToUserBookings(userId: string, bookingId: string): Promise<void> {
    try {
      const existingBookings = await AsyncStorage.getItem(`user_bookings_${userId}`);
      const bookingIds = existingBookings ? JSON.parse(existingBookings) : [];
      
      if (!bookingIds.includes(bookingId)) {
        bookingIds.push(bookingId);
        await AsyncStorage.setItem(`user_bookings_${userId}`, JSON.stringify(bookingIds));
      }
    } catch (error) {
      console.error('Error agregando booking a usuario:', error);
    }
  },

  async getUserBookings(userId: string): Promise<BookingData[]> {
    try {

      
      const bookings: BookingData[] = [];

      // 1. Intentar obtener de Firebase primero
      try {
        // Buscar como owner (sin orderBy)
        const ownerQuery = query(
          collection(db, 'bookings'),
          where('ownerId', '==', userId)
        );

        // Buscar como renter (sin orderBy)
        const renterQuery = query(
          collection(db, 'bookings'),
          where('renterId', '==', userId)
        );

        const [ownerSnapshot, renterSnapshot] = await Promise.all([
          getDocs(ownerQuery),
          getDocs(renterQuery)
        ]);



        // Procesar bookings de Firebase
        for (const doc of ownerSnapshot.docs) {
          const data = doc.data();
          bookings.push({
            ...data,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
            createdAt: data.createdAt.toDate(),
          } as BookingData);
        }

        for (const doc of renterSnapshot.docs) {
          const data = doc.data();
          if (!bookings.some(b => b.bookingId === data.bookingId)) {
            bookings.push({
              ...data,
              startDate: data.startDate.toDate(),
              endDate: data.endDate.toDate(),
              createdAt: data.createdAt.toDate(),
            } as BookingData);
          }
        }



      } catch (firebaseError) {
        console.warn('⚠️ Error obteniendo de Firebase, usando AsyncStorage:', firebaseError);
      }

      // 2. Si Firebase falló o no hay datos, usar AsyncStorage
      if (bookings.length === 0) {
        try {
          const userBookingIds = await AsyncStorage.getItem(`user_bookings_${userId}`);
          if (userBookingIds) {
            const bookingIds = JSON.parse(userBookingIds);

            
            for (const bookingId of bookingIds) {
              const bookingData = await AsyncStorage.getItem(`booking_${bookingId}`);
              if (bookingData) {
                const booking = JSON.parse(bookingData);
                bookings.push({
                  ...booking,
                  startDate: new Date(booking.startDate),
                  endDate: new Date(booking.endDate),
                  createdAt: new Date(booking.createdAt),
                });
              }
            }
          }

        } catch (asyncError) {
          console.error('Error obteniendo de AsyncStorage:', asyncError);
        }
      }

      // Ordenar por fecha de creación
      bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());


      
      return bookings;
    } catch (error) {
      console.error('❌ Error obteniendo bookings del usuario:', error);
      return [];
    }
  },
};