import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Función para crear un booking de prueba en Firebase
export const createTestBooking = async () => {
  try {
    const testBooking = {
      bookingId: `test_booking_${Date.now()}`,
      vehicleId: 'test_vehicle_123',
      ownerId: 'test_owner_456',
      ownerName: 'Test Owner',
      ownerEmail: 'owner@test.com',
      ownerContact: '+1234567890',
      renterId: 'test_renter_789',
      renterName: 'Test Renter',
      renterEmail: 'renter@test.com',
      renterContact: '+0987654321',
      startDate: Timestamp.now(),
      endDate: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3 días después
      totalPrice: 450,
      paymentId: 'test_payment_123',
      status: 'active',
      createdAt: Timestamp.now(),
      vehicle: {
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        imageUrl: 'https://via.placeholder.com/300x200'
      }
    };

    const docRef = await addDoc(collection(db, 'bookings'), testBooking);

    return docRef.id;
  } catch (error) {
    console.error('❌ Error creando test booking:', error);
    throw error;
  }
};

// Función para verificar que Firebase esté funcionando
export const testFirebaseConnection = async () => {
  try {
    // Intentar leer la colección bookings
    const testDoc = await addDoc(collection(db, 'test'), {
      message: 'Firebase connection test',
      timestamp: Timestamp.now()
    });
    

    return true;
  } catch (error) {
    console.error('❌ Firebase connection test falló:', error);
    return false;
  }
};