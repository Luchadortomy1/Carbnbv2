import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { User } from '../types';

export interface UserContactInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
}

export const userService = {
  async getUserContactInfo(userId: string): Promise<UserContactInfo> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        return {
          id: userId,
          name: userData.displayName || 'Usuario desconocido',
          email: userData.email,
          phone: userData.phoneNumber || 'No proporcionado',
          photoURL: userData.photoURL,
        };
      } else {
        // Usuario no encontrado, devolver información básica
        return {
          id: userId,
          name: 'Usuario desconocido',
          email: 'Sin email',
          phone: 'Sin teléfono',
        };
      }
    } catch (error) {
      console.error('Error getting user contact info:', error);
      return {
        id: userId,
        name: 'Usuario desconocido',
        email: 'Sin email',
        phone: 'Sin teléfono',
      };
    }
  },

  async getUsersContactInfo(userIds: string[]): Promise<UserContactInfo[]> {
    try {
      const promises = userIds.map(id => this.getUserContactInfo(id));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error getting multiple users contact info:', error);
      return userIds.map(id => ({
        id,
        name: 'Usuario desconocido',
        email: 'Sin email',
        phone: 'Sin teléfono',
      }));
    }
  },
};