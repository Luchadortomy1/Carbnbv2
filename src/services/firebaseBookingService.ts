import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

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

export const firebaseBookingService = {
  async createBooking(bookingData: Omit<BookingData, 'bookingId' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const newBooking: BookingData = {
        ...bookingData,
        bookingId,
        status: 'active',
        createdAt: new Date(),
      };

      // Guardar en Firebase
      await setDoc(doc(db, 'bookings', bookingId), {
        ...newBooking,
        startDate: Timestamp.fromDate(newBooking.startDate),
        endDate: Timestamp.fromDate(newBooking.endDate),
        createdAt: Timestamp.fromDate(newBooking.createdAt),
      });


      return bookingId;
    } catch (error) {
      console.error('❌ Error creando booking en Firebase:', error);
      throw error;
    }
  },

  async getBooking(bookingId: string): Promise<BookingData | null> {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        createdAt: data.createdAt.toDate(),
      } as BookingData;
    } catch (error) {
      console.error('Error obteniendo booking de Firebase:', error);
      return null;
    }
  },

  async getUserBookings(userId: string): Promise<BookingData[]> {
    try {
      // Hacer consultas simples sin orderBy para evitar índices compuestos
      const ownerQuery = query(
        collection(db, 'bookings'),
        where('ownerId', '==', userId)
      );

      const renterQuery = query(
        collection(db, 'bookings'),
        where('renterId', '==', userId)
      );



      const [ownerSnapshot, renterSnapshot] = await Promise.all([
        getDocs(ownerQuery),
        getDocs(renterQuery)
      ]);



      const bookings: BookingData[] = [];

      // Procesar bookings donde es owner
      for (const doc of ownerSnapshot.docs) {
        const data = doc.data();

        
        bookings.push({
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
        } as BookingData);
      }

      // Procesar bookings donde es renter
      for (const doc of renterSnapshot.docs) {
        const data = doc.data();

        
        // Evitar duplicados (aunque no debería pasar)
        if (!bookings.some(b => b.bookingId === data.bookingId)) {
          bookings.push({
            ...data,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
            createdAt: data.createdAt.toDate(),
          } as BookingData);
        }
      }

      // Ordenar por fecha de creación en memoria (más recientes primero)
      bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());


      
      return bookings;
    } catch (error) {
      console.error('❌ Error obteniendo bookings del usuario de Firebase:', error);
      console.error('❌ Error completo:', error);
      return [];
    }
  },

  async getBookingsByOwner(ownerId: string): Promise<BookingData[]> {
    try {
      const q = query(
        collection(db, 'bookings'),
        where('ownerId', '==', ownerId)
      );

      const querySnapshot = await getDocs(q);
      const bookings: BookingData[] = [];

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        bookings.push({
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
        } as BookingData);
      }

      // Ordenar en memoria
      bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return bookings;
    } catch (error) {
      console.error('Error obteniendo bookings del propietario:', error);
      return [];
    }
  },

  async getBookingsByRenter(renterId: string): Promise<BookingData[]> {
    try {
      const q = query(
        collection(db, 'bookings'),
        where('renterId', '==', renterId)
      );

      const querySnapshot = await getDocs(q);
      const bookings: BookingData[] = [];

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        bookings.push({
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
        } as BookingData);
      }

      // Ordenar en memoria
      bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return bookings;
    } catch (error) {
      console.error('Error obteniendo bookings del renter:', error);
      return [];
    }
  },

  async updateBookingStatus(bookingId: string, status: 'active' | 'completed' | 'cancelled'): Promise<void> {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await setDoc(docRef, { status }, { merge: true });

    } catch (error) {
      console.error('❌ Error actualizando status de booking:', error);
      throw error;
    }
  },
};