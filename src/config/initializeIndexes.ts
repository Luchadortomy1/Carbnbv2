import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, where, limit, getDocs } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDiHd0jJsjatM35VD2VPoqjSO4VrwmTCFU",
  authDomain: "carbnb-d1422.firebaseapp.com",
  projectId: "carbnb-d1422",
  storageBucket: "carbnb-d1422.firebasestorage.app",
  messagingSenderId: "368912439544",
  appId: "1:368912439544:web:545227dee572de98b6c30d",
  measurementId: "G-VCCQMN1EKL"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Este script iniciará las consultas que requieren índices compuestos
 * para que Firebase automáticamente sugiera crear los índices necesarios.
 * 
 * Los índices requeridos son:
 * 
 * 1. Colección: vehicles
 *    Campos: available (Ascending), createdAt (Descending)
 * 
 * 2. Colección: vehicles  
 *    Campos: ownerId (Ascending), createdAt (Descending)
 * 
 * 3. Colección: chats
 *    Campos: participants (Array), updatedAt (Descending)
 */

export const initializeFirestoreIndexes = async () => {
  try {
    // 1. Índice para obtener vehículos disponibles ordenados por fecha
    const availableVehiclesQuery = query(
      collection(db, 'vehicles'),
      where('available', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    await getDocs(availableVehiclesQuery);

    // 2. Índice para obtener vehículos de un propietario
    const ownerVehiclesQuery = query(
      collection(db, 'vehicles'),
      where('ownerId', '==', 'dummy-id'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    await getDocs(ownerVehiclesQuery);

    // 3. Índice para chats por participantes
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', 'dummy-id'),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    await getDocs(chatsQuery);


    
  } catch (error) {
    // Los errores esperados mostrarán los enlaces para crear los índices
  }
};

// Auto-ejecutar si se llama directamente
if (require.main === module) {
  initializeFirestoreIndexes();
}