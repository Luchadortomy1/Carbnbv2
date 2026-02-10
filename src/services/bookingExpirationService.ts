import { firebaseBookingService } from './firebaseBookingService';
import { firebaseVehicleAvailabilityService } from './firebaseVehicleAvailabilityService';

export const bookingExpirationService = {
  /**
   * Verifica y actualiza todas las reservas que han vencido
   */
  async checkAndUpdateExpiredBookings(): Promise<void> {
    try {

      
      const now = new Date();
      
      // Obtener todas las reservas activas de todos los usuarios
      const allActiveBookings = await this.getAllActiveBookings();
      
      // Filtrar las que han vencido
      const expiredBookings = allActiveBookings.filter(booking => 
        booking.status === 'active' && 
        new Date(booking.endDate) < now
      );
      
      if (expiredBookings.length === 0) {

        return;
      }
      

      
      // Actualizar cada reserva vencida
      for (const booking of expiredBookings) {
        const daysPastDue = Math.ceil((now.getTime() - booking.endDate.getTime()) / (1000 * 60 * 60 * 24));
        

        
        // Actualizar el estado de la reserva
        await firebaseBookingService.updateBookingStatus(booking.bookingId, 'completed');
        
        // Actualizar la disponibilidad del vehículo
        await firebaseVehicleAvailabilityService.updateReservationStatus(
          booking.vehicleId,
          booking.bookingId,
          'completed'
        );
        

      }
      

      
    } catch (error) {
      console.error('❌ Error verificando reservas vencidas:', error);
      throw error;
    }
  },

  /**
   * Obtiene todas las reservas activas del sistema
   */
  async getAllActiveBookings() {
    try {
      // Aquí necesitamos obtener todas las reservas activas
      // Por ahora usaremos una consulta general
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../config/firebaseConfig');
      
      const bookingsRef = collection(db, 'bookings');
      const activeBookingsQuery = query(
        bookingsRef,
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(activeBookingsQuery);
      
      return snapshot.docs.map(doc => ({
        bookingId: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate(),
        endDate: doc.data().endDate.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      })) as any[];
      
    } catch (error) {
      console.error('❌ Error obteniendo reservas activas:', error);
      return [];
    }
  },

  /**
   * Programa la verificación automática cada cierto tiempo
   */
  startPeriodicCheck(intervalMinutes: number = 60) {

    
    // Ejecutar inmediatamente
    this.checkAndUpdateExpiredBookings().catch(console.error);
    
    // Programar ejecución periódica
    const interval = setInterval(() => {
      this.checkAndUpdateExpiredBookings().catch(console.error);
    }, intervalMinutes * 60 * 1000);
    
    return interval;
  },

  /**
   * Detiene la verificación periódica
   */
  stopPeriodicCheck(interval: NodeJS.Timeout) {
    clearInterval(interval);

  }
};