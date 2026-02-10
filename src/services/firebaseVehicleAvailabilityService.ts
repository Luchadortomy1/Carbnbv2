import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface VehicleReservation {
  vehicleId: string;
  bookingId: string;
  startDate: Date;
  endDate: Date;
  renterId: string;
  renterName: string;
  status: 'active' | 'completed' | 'cancelled';
  paymentId?: string;
  totalPrice?: number;
}

export interface VehicleAvailability {
  vehicleId: string;
  isAvailable: boolean;
  reservations: VehicleReservation[];
  updatedAt: Date;
}

export const firebaseVehicleAvailabilityService = {
  async markVehicleAsReserved(
    vehicleId: string,
    bookingDetails: {
      bookingId: string;
      startDate: Date;
      endDate: Date;
      renterId: string;
      renterName: string;
      paymentId?: string;
      totalPrice?: number;
    }
  ): Promise<void> {
    try {
      const availability = await this.getVehicleAvailability(vehicleId);
      
      const newReservation: VehicleReservation = {
        vehicleId,
        bookingId: bookingDetails.bookingId,
        startDate: bookingDetails.startDate,
        endDate: bookingDetails.endDate,
        renterId: bookingDetails.renterId,
        renterName: bookingDetails.renterName,
        status: 'active',
        paymentId: bookingDetails.paymentId,
        totalPrice: bookingDetails.totalPrice,
      };

      const updatedAvailability: VehicleAvailability = {
        vehicleId,
        isAvailable: false, // Marcar como no disponible
        reservations: [...(availability?.reservations || []), newReservation],
        updatedAt: new Date(),
      };

      // Guardar en Firebase
      await setDoc(doc(db, 'vehicle_availability', vehicleId), {
        ...updatedAvailability,
        updatedAt: Timestamp.now(),
        reservations: updatedAvailability.reservations.map(r => ({
          ...r,
          startDate: Timestamp.fromDate(r.startDate),
          endDate: Timestamp.fromDate(r.endDate),
        })),
      });

      // También actualizar el campo 'available' en el vehículo principal
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        available: false,
        updatedAt: Timestamp.now(),
      });


    } catch (error) {
      console.error('❌ Error marking vehicle as reserved in Firebase:', error);
      throw error;
    }
  },

  async getVehicleAvailability(vehicleId: string): Promise<VehicleAvailability | null> {
    try {
      const docRef = doc(db, 'vehicle_availability', vehicleId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        vehicleId: data.vehicleId,
        isAvailable: data.isAvailable,
        reservations: data.reservations.map((r: any) => ({
          ...r,
          startDate: r.startDate.toDate(),
          endDate: r.endDate.toDate(),
        })),
        updatedAt: data.updatedAt.toDate(),
      };
    } catch (error) {
      console.error('Error getting vehicle availability from Firebase:', error);
      return null;
    }
  },

  async isVehicleAvailable(vehicleId: string, startDate: Date, endDate: Date): Promise<boolean> {
    try {
      const availability = await this.getVehicleAvailability(vehicleId);
      
      if (!availability || availability.reservations.length === 0) {
        return true; // No hay reservas, está disponible
      }

      // Verificar si hay conflictos con reservas activas
      const hasConflict = availability.reservations.some(reservation => {
        if (reservation.status !== 'active') {
          return false; // Ignorar reservas no activas
        }

        const reservationStart = new Date(reservation.startDate);
        const reservationEnd = new Date(reservation.endDate);
        
        // Verificar si las fechas se superponen
        return (
          (startDate >= reservationStart && startDate <= reservationEnd) ||
          (endDate >= reservationStart && endDate <= reservationEnd) ||
          (startDate <= reservationStart && endDate >= reservationEnd)
        );
      });

      return !hasConflict;
    } catch (error) {
      console.error('Error checking vehicle availability:', error);
      return false; // En caso de error, asumir que no está disponible
    }
  },

  async getVehicleReservations(vehicleId: string): Promise<VehicleReservation[]> {
    try {
      const availability = await this.getVehicleAvailability(vehicleId);
      return availability?.reservations || [];
    } catch (error) {
      console.error('Error getting vehicle reservations:', error);
      return [];
    }
  },

  async updateReservationStatus(
    vehicleId: string,
    bookingId: string,
    status: VehicleReservation['status']
  ): Promise<void> {
    try {
      const availability = await this.getVehicleAvailability(vehicleId);
      
      if (!availability) {
        throw new Error('Vehicle availability not found');
      }

      const updatedReservations = availability.reservations.map(reservation =>
        reservation.bookingId === bookingId
          ? { ...reservation, status }
          : reservation
      );

      // Si se cancela o completa la reserva, verificar si el vehículo puede estar disponible
      const hasActiveReservations = updatedReservations.some(r => r.status === 'active');

      const updatedAvailability: VehicleAvailability = {
        ...availability,
        isAvailable: !hasActiveReservations,
        reservations: updatedReservations,
        updatedAt: new Date(),
      };

      // Actualizar en Firebase
      await setDoc(doc(db, 'vehicle_availability', vehicleId), {
        ...updatedAvailability,
        updatedAt: Timestamp.now(),
        reservations: updatedAvailability.reservations.map(r => ({
          ...r,
          startDate: Timestamp.fromDate(r.startDate),
          endDate: Timestamp.fromDate(r.endDate),
        })),
      });

      // También actualizar el campo 'available' en el vehículo principal
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        available: !hasActiveReservations,
        updatedAt: Timestamp.now(),
      });


    } catch (error) {
      console.error('❌ Error updating reservation status in Firebase:', error);
      throw error;
    }
  },

  async getAllReservedVehiclesByOwner(ownerId: string): Promise<VehicleReservation[]> {
    try {
      // Obtener todos los vehículos del propietario
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('ownerId', '==', ownerId)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      
      const allReservations: VehicleReservation[] = [];
      
      // Para cada vehículo, obtener sus reservas activas
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        const vehicleId = vehicleDoc.id;
        const availability = await this.getVehicleAvailability(vehicleId);
        
        if (availability) {
          const activeReservations = availability.reservations.filter(r => r.status === 'active');
          allReservations.push(...activeReservations);
        }
      }
      
      return allReservations;
    } catch (error) {
      console.error('Error getting reserved vehicles by owner:', error);
      return [];
    }
  },

  async getVehicleReservationsByRenter(renterId: string): Promise<VehicleReservation[]> {
    try {
      // Buscar en todas las availability collections las reservas del renter
      const availabilityQuery = query(collection(db, 'vehicle_availability'));
      const availabilitySnapshot = await getDocs(availabilityQuery);
      
      const renterReservations: VehicleReservation[] = [];
      
      for (const doc of availabilitySnapshot.docs) {
        const data = doc.data();
        if (data.reservations) {
          const userReservations = data.reservations
            .filter((r: any) => r.renterId === renterId)
            .map((r: any) => ({
              ...r,
              startDate: r.startDate.toDate(),
              endDate: r.endDate.toDate(),
            }));
          
          renterReservations.push(...userReservations);
        }
      }
      
      return renterReservations;
    } catch (error) {
      console.error('Error getting reservations by renter:', error);
      return [];
    }
  },
};