import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Inicializar servicios de Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;