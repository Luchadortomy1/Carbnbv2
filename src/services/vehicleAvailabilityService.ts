import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VehicleReservation {
  vehicleId: string;
  bookingId: string;
  startDate: Date;
  endDate: Date;
  renterId: string;
  renterName: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface VehicleAvailability {
  vehicleId: string;
  isAvailable: boolean;
  reservations: VehicleReservation[];
  updatedAt: Date;
}

export const vehicleAvailabilityService = {
  async markVehicleAsReserved(
    vehicleId: string,
    bookingDetails: {
      bookingId: string;
      startDate: Date;
      endDate: Date;
      renterId: string;
      renterName: string;
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
      };

      const updatedAvailability: VehicleAvailability = {
        vehicleId,
        isAvailable: false, // Marcar como no disponible
        reservations: [...(availability?.reservations || []), newReservation],
        updatedAt: new Date(),
      };

      await this.saveVehicleAvailability(vehicleId, updatedAvailability);

    } catch (error) {
      console.error('Error marking vehicle as reserved:', error);
      throw error;
    }
  },

  async getVehicleAvailability(vehicleId: string): Promise<VehicleAvailability | null> {
    try {
      const availabilityData = await AsyncStorage.getItem(`vehicle_availability_${vehicleId}`);
      return availabilityData ? JSON.parse(availabilityData) : null;
    } catch (error) {
      console.error('Error getting vehicle availability:', error);
      return null;
    }
  },

  async saveVehicleAvailability(vehicleId: string, availability: VehicleAvailability): Promise<void> {
    try {
      await AsyncStorage.setItem(`vehicle_availability_${vehicleId}`, JSON.stringify(availability));
    } catch (error) {
      console.error('Error saving vehicle availability:', error);
      throw error;
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

      await this.saveVehicleAvailability(vehicleId, updatedAvailability);

    } catch (error) {
      console.error('Error updating reservation status:', error);
      throw error;
    }
  },

  async getAllReservedVehicles(): Promise<string[]> {
    try {
      // Obtener todas las claves de AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const availabilityKeys = allKeys.filter(key => key.startsWith('vehicle_availability_'));
      
      const reservedVehicles: string[] = [];
      
      for (const key of availabilityKeys) {
        const vehicleId = key.replace('vehicle_availability_', '');
        const availability = await this.getVehicleAvailability(vehicleId);
        
        if (availability && !availability.isAvailable) {
          reservedVehicles.push(vehicleId);
        }
      }
      
      return reservedVehicles;
    } catch (error) {
      console.error('Error getting all reserved vehicles:', error);
      return [];
    }
  },
};