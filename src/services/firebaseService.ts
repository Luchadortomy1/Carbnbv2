import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebaseConfig';
import { Vehicle, User, Chat, Message, Booking } from '../types';

// Servicios para Vehículos
export const vehicleService = {
  // Crear un nuevo vehículo
  async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'vehicles'), {
        ...vehicleData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Error creating vehicle: ${error}`);
    }
  },

  // Obtener todos los vehículos disponibles
  async getAvailableVehicles(): Promise<Vehicle[]> {
    try {
      // Crear query para obtener solo vehículos disponibles desde Firebase
      const q = query(
        collection(db, 'vehicles'),
        where('available', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const vehicles: Vehicle[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        vehicles.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Vehicle);
      }
      

      return vehicles;
    } catch (error) {
      console.error('❌ Error fetching available vehicles from Firebase:', error);
      throw new Error(`Error fetching vehicles: ${error}`);
    }
  },

  // Función de respaldo para obtener todos los vehículos
  async getAllVehiclesFallback(): Promise<Vehicle[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'vehicles'));
      const vehicles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Vehicle[];
      
      // Filtrar y ordenar en JavaScript
      return vehicles
        .filter(vehicle => vehicle.available)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      throw new Error(`Error fetching vehicles (fallback): ${error}`);
    }
  },

  // Obtener vehículos por usuario
  async getVehiclesByUser(userId: string): Promise<Vehicle[]> {
    try {
      // Usar fallback directamente para evitar índices compuestos
      return await this.getUserVehiclesFallback(userId);
    } catch (error) {
      throw new Error(`Error fetching user vehicles: ${error}`);
    }
  },

  // Función de respaldo para obtener vehículos del usuario
  async getUserVehiclesFallback(userId: string): Promise<Vehicle[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'vehicles'));
      const vehicles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Vehicle[];
      
      // Filtrar y ordenar en JavaScript
      return vehicles
        .filter(vehicle => vehicle.ownerId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      throw new Error(`Error fetching user vehicles (fallback): ${error}`);
    }
  },

  // Subir imagen a Firebase Storage
  async uploadVehicleImage(imageUri: string, vehicleId: string, imageIndex: number): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const imageRef = ref(storage, `vehicles/${vehicleId}/image_${imageIndex}`);
      await uploadBytes(imageRef, blob);
      return await getDownloadURL(imageRef);
    } catch (error) {
      throw new Error(`Error uploading image: ${error}`);
    }
  },

  // Actualizar vehículo
  async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<void> {
    try {
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      await updateDoc(vehicleRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      throw new Error(`Error updating vehicle: ${error}`);
    }
  },

  // Eliminar vehículo
  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
    } catch (error) {
      throw new Error(`Error deleting vehicle: ${error}`);
    }
  },

  // Obtener vehículo por ID
  async getVehicleById(vehicleId: string): Promise<Vehicle | null> {
    try {
      const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
      if (vehicleDoc.exists()) {
        const data = vehicleDoc.data();
        return {
          id: vehicleDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Vehicle;
      }
      return null;
    } catch (error) {
      console.error('Error getting vehicle by ID:', error);
      return null;
    }
  },
};

// Servicios para Chat
export const chatService = {
  // Crear o obtener chat entre dos usuarios
  async getOrCreateChat(user1Id: string, user2Id: string, vehicleId?: string, vehicleInfo?: any): Promise<string> {
    try {
      // Buscar chat existente por participants Y vehicleId si existe
      const participants = [user1Id, user2Id].sort((a, b) => a.localeCompare(b));
      
      // Buscar todos los chats del usuario usando fallback
      const allChats = await getDocs(collection(db, 'chats'));
      const existingChat = allChats.docs.find(doc => {
        const data = doc.data();
        const chatParticipants = data.participants || [];
        return chatParticipants.length === 2 && 
               chatParticipants.includes(user1Id) && 
               chatParticipants.includes(user2Id) &&
               (!vehicleId || data.vehicleId === vehicleId);
      });
      
      if (existingChat) {
        return existingChat.id;
      }

      // Obtener información de los usuarios
      const user1 = await userService.getUser(user1Id);
      const user2 = await userService.getUser(user2Id);

      // Crear nuevo chat con información completa
      const chatData = {
        participants,
        participantNames: [user1?.displayName || 'Usuario', user2?.displayName || 'Usuario'],
        participantPhotos: [user1?.photoURL || '', user2?.photoURL || ''],
        vehicleId: vehicleId || null,
        vehicleTitle: vehicleInfo ? `${vehicleInfo.brand} ${vehicleInfo.model}` : null,
        ownerId: vehicleInfo?.ownerId || null,
        renterId: vehicleInfo?.ownerId === user1Id ? user2Id : user1Id, // El que no es dueño es el renter
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'chats'), chatData);
      return docRef.id;
    } catch (error) {
      throw new Error(`Error creating chat: ${error}`);
    }
  },

  // Obtener chats del usuario
  async getUserChats(userId: string): Promise<Chat[]> {
    try {
      // Usar fallback directamente para evitar índices compuestos
      return await this.getUserChatsFallback(userId);
    } catch (error) {
      throw new Error(`Error fetching chats: ${error}`);
    }
  },

  // Función de respaldo para obtener chats del usuario
  async getUserChatsFallback(userId: string): Promise<Chat[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'chats'));
      const chats = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Función helper para convertir timestamps
        const convertTimestamp = (timestamp: any): Date => {
          if (!timestamp) return new Date();
          if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
          }
          if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000);
          }
          if (timestamp instanceof Date) {
            return timestamp;
          }
          return new Date();
        };

        // Convertir lastMessage timestamp si existe
        let lastMessage = data.lastMessage;
        if (lastMessage?.timestamp) {
          lastMessage = {
            ...lastMessage,
            timestamp: convertTimestamp(lastMessage.timestamp),
          };
        }

        return {
          id: doc.id,
          participants: data.participants || [],
          participantNames: data.participantNames || [],
          participantPhotos: data.participantPhotos || [],
          vehicleId: data.vehicleId,
          vehicleTitle: data.vehicleTitle,
          ownerId: data.ownerId,
          renterId: data.renterId,
          lastMessage,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        };
      }) as Chat[];
      
      // Filtrar y ordenar en JavaScript
      return chats
        .filter(chat => chat.participants?.includes(userId))
        .sort((a, b) => {
          const dateA = a.updatedAt ? a.updatedAt.getTime() : 0;
          const dateB = b.updatedAt ? b.updatedAt.getTime() : 0;
          return dateB - dateA;
        });
    } catch (error) {
      console.error('Error in getUserChatsFallback:', error);
      throw new Error(`Error fetching chats (fallback): ${error}`);
    }
  },

  // Enviar mensaje
  async sendMessage(chatId: string, senderId: string, text: string, senderName?: string): Promise<void> {
    try {
      // Obtener información del chat
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      const chatData = chatDoc.data();
      
      // Agregar mensaje a la subcolección
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId,
        text,
        timestamp: Timestamp.now(),
        read: false,
      });

      // Actualizar el último mensaje del chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          id: '', // Se puede generar si es necesario
          senderId,
          senderName: senderName || '', 
          text,
          timestamp: Timestamp.now(),
          read: false,
        },
        updatedAt: Timestamp.now(),
      });

      // Crear notificación para el otro participante (solo si no es una reserva)
      if (chatData && !text.includes('🚗 SOLICITUD DE RESERVA') && !text.includes('RESERVA CONFIRMADA') && !text.includes('RESERVA RECHAZADA')) {
        const participants = chatData.participants || [];
        const otherUserId = participants.find((id: string) => id !== senderId);
        
        if (otherUserId && senderName) {
          const vehicleTitle = chatData.vehicleTitle || 'un vehículo';
          await notificationService.createNotification({
            userId: otherUserId,
            title: 'Nuevo mensaje',
            message: `${senderName} te ha enviado un mensaje sobre ${vehicleTitle}`,
            type: 'message',
            data: {
              chatId,
              senderId,
              senderName,
              vehicleId: chatData.vehicleId, // Agregar ID del vehículo si está disponible
              otherUserId: senderId, // ID del remitente para el chat
            }
          });
        }
      }
    } catch (error) {
      throw new Error(`Error sending message: ${error}`);
    }
  },

  // Escuchar mensajes en tiempo real
  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Message[];
      callback(messages);
    });
  },

  // Marcar mensajes como leídos
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        where('senderId', '!=', userId),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);
      
      const updatePromises = querySnapshot.docs.map(doc =>
        updateDoc(doc.ref, { read: true })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      throw new Error(`Error marking messages as read: ${error}`);
    }
  },

  // Contar mensajes no leídos para un usuario
  async getUnreadMessagesCount(userId: string): Promise<number> {
    try {
      const userChats = await this.getUserChatsFallback(userId);
      let unreadCount = 0;
      
      for (const chat of userChats) {
        if (chat.lastMessage && 
            chat.lastMessage.senderId !== userId && 
            !chat.lastMessage.read) {
          unreadCount++;
        }
      }
      
      return unreadCount;
    } catch (error) {
      console.error('Error counting unread messages:', error);
      return 0;
    }
  },
};

// Servicios para Reservas
export const bookingService = {
  // Crear reserva
  async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'bookings'), {
        ...bookingData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Error creating booking: ${error}`);
    }
  },

  // Obtener reservas del usuario
  async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      // Obtener todas las reservas y filtrar en JavaScript para evitar índices
      const querySnapshot = await getDocs(collection(db, 'bookings'));
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate.toDate(),
        endDate: doc.data().endDate.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Booking[];
      
      // Filtrar y ordenar en JavaScript
      return bookings
        .filter(booking => booking.renterId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      throw new Error(`Error fetching bookings: ${error}`);
    }
  },

  // Actualizar estado de reserva
  async updateBookingStatus(bookingId: string, status: Booking['status']): Promise<void> {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      throw new Error(`Error updating booking status: ${error}`);
    }
  },
};

// Servicios para Usuarios
export const userService = {
  // Obtener usuario por ID
  async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return {
          id: userDoc.id,
          ...userDoc.data(),
          createdAt: userDoc.data().createdAt.toDate(),
          updatedAt: userDoc.data().updatedAt.toDate(),
        } as User;
      }
      return null;
    } catch (error) {
      throw new Error(`Error fetching user: ${error}`);
    }
  },

  // Actualizar usuario
  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {

      
      // Verificar si el documento existe
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {

        await updateDoc(doc(db, 'users', userId), {
          ...updates,
          updatedAt: Timestamp.now(),
        });

      } else {

        // Si no existe, crear el documento con datos básicos
        const newUserData = {
          id: userId,
          email: updates.email || '',
          displayName: updates.displayName || 'Usuario',
          phoneNumber: updates.phoneNumber || '',
          photoURL: updates.photoURL || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await setDoc(doc(db, 'users', userId), newUserData);

      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Error updating user: ${error}`);
    }
  },
};

// Servicios para Notificaciones
export const notificationService = {
  // Crear una nueva notificación
  async createNotification(notification: {
    userId: string;
    title: string;
    message: string;
    type: 'message' | 'booking_request' | 'booking_confirmed' | 'booking_cancelled' | 'payment_received' | 'payment';
    data?: any;
  }): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      throw new Error(`Error creating notification: ${error}`);
    }
  },

  // Obtener notificaciones de un usuario
  async getUserNotifications(userId: string): Promise<any[]> {
    try {
      // Intentar con índice compuesto
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
    } catch (error) {
      console.error('Error getting notifications with index, using fallback:', error);
      return await this.getUserNotificationsFallback(userId);
    }
  },

  // Función fallback sin orderBy
  async getUserNotificationsFallback(userId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      // Ordenar en JavaScript
      return notifications.sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error in notifications fallback:', error);
      return [];
    }
  },

  // Marcar notificación como leída
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      throw new Error(`Error marking notification as read: ${error}`);
    }
  },

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const updates = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      );
      
      await Promise.all(updates);
    } catch (error) {
      throw new Error(`Error marking all notifications as read: ${error}`);
    }
  },

  // Escuchar notificaciones en tiempo real
  subscribeToNotifications(userId: string, callback: (notifications: any[]) => void) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (querySnapshot) => {
        const notifications = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        callback(notifications);
      }, (error) => {
        console.error('Error in notifications subscription:', error);
        // Usar fallback sin orderBy
        this.subscribeToNotificationsFallback(userId, callback);
      });
    } catch (error) {
      console.error('Error setting up notifications subscription:', error);
      this.subscribeToNotificationsFallback(userId, callback);
    }
  },

  // Función fallback para subscription sin orderBy
  subscribeToNotificationsFallback(userId: string, callback: (notifications: any[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      // Ordenar en JavaScript
      notifications.sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA;
      });

      callback(notifications);
    }, (error) => {
      console.error('Error in notifications fallback subscription:', error);
      callback([]);
    });
  },
};