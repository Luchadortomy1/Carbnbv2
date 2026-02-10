import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'payment_confirmation' | 'booking_confirmation' | 'system';
  metadata?: any;
}

export const chatService = {
  async sendMessage(messageData: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const newMessage: ChatMessage = {
        ...messageData,
        id: messageId,
        timestamp: new Date(),
      };

      // Obtener mensajes existentes del chat
      const existingMessages = await this.getChatMessages(messageData.chatId);
      const updatedMessages = [...existingMessages, newMessage];
      
      // Guardar mensajes actualizados
      await AsyncStorage.setItem(`chat_${messageData.chatId}`, JSON.stringify(updatedMessages));


      return messageId;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const messagesData = await AsyncStorage.getItem(`chat_${chatId}`);
      const messages = messagesData ? JSON.parse(messagesData) : [];
      
      // Ordenar por timestamp
      return messages.sort((a: ChatMessage, b: ChatMessage) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  },

  async sendPaymentConfirmationMessage(
    chatId: string, 
    paymentDetails: {
      paymentId: string;
      amount: number;
      vehicleInfo: string;
      bookingDates: string;
      renterName: string;
    }
  ): Promise<string> {
    try {
      const confirmationMessage = `💳 ¡PAGO COMPLETADO!

Tu reserva ha sido confirmada y pagada exitosamente.

🚗 Vehículo: ${paymentDetails.vehicleInfo}
📅 Fechas: ${paymentDetails.bookingDates}
💰 Total pagado: $${paymentDetails.amount}
🔑 ID de pago: ${paymentDetails.paymentId.slice(-8)}

¡El propietario ha sido notificado! Pronto recibirás instrucciones para recoger el vehículo.`;

      return await this.sendMessage({
        chatId,
        senderId: 'system',
        senderName: 'Sistema',
        message: confirmationMessage,
        type: 'payment_confirmation',
        metadata: {
          paymentId: paymentDetails.paymentId,
          amount: paymentDetails.amount,
          vehicleInfo: paymentDetails.vehicleInfo,
          bookingDates: paymentDetails.bookingDates,
        },
      });
    } catch (error) {
      console.error('Error sending payment confirmation message:', error);
      throw error;
    }
  },

  async sendOwnerNotificationMessage(
    chatId: string,
    paymentDetails: {
      paymentId: string;
      amount: number;
      vehicleInfo: string;
      bookingDates: string;
      renterName: string;
    }
  ): Promise<string> {
    try {
      const ownerMessage = `🎉 ¡HAS RECIBIDO UN PAGO!

${paymentDetails.renterName} ha completado el pago por tu vehículo.

🚗 Vehículo: ${paymentDetails.vehicleInfo}
📅 Fechas reservadas: ${paymentDetails.bookingDates}
💰 Cantidad recibida: $${paymentDetails.amount}
🔑 ID de pago: ${paymentDetails.paymentId.slice(-8)}

Tu vehículo ahora está marcado como "Reservado" y no aparecerá en las búsquedas públicas durante estas fechas.

¡Prepárate para entregar el vehículo!`;

      return await this.sendMessage({
        chatId,
        senderId: 'system',
        senderName: 'Sistema',
        message: ownerMessage,
        type: 'payment_confirmation',
        metadata: {
          paymentId: paymentDetails.paymentId,
          amount: paymentDetails.amount,
          vehicleInfo: paymentDetails.vehicleInfo,
          bookingDates: paymentDetails.bookingDates,
          forOwner: true,
        },
      });
    } catch (error) {
      console.error('Error sending owner notification message:', error);
      throw error;
    }
  },
};