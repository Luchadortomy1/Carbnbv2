import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  RefreshControl,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../contexts/MessagesContext';
import { useNotifications } from '../../contexts/NotificationsContext';

import { chatService, userService, vehicleService } from '../../services/firebaseService';
import { chatService as localChatService } from '../../services/chatService';
import { hybridBookingService } from '../../services/hybridBookingService';
import { Message, User, Vehicle } from '../../types';

interface ChatScreenProps {
  route: {
    params: {
      chatId?: string;
      otherUserId?: string;
      vehicleId?: string;
      vehicle?: Vehicle;
    };
  };
  navigation: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { chatId, otherUserId, vehicleId, vehicle } = route.params;
  const { user } = useAuth();
  const { refreshUnreadCount } = useMessages();
  const { addNotificationForUser } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);
  const [loading, setLoading] = useState(true);
  
  // Booking states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [hasExistingBooking, setHasExistingBooking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  // Efecto para verificar reservas existentes
  useEffect(() => {
    const checkExistingBookings = async () => {
      if (!user || !vehicleId || !currentChatId) return;
      
      try {
        const bookings = await hybridBookingService.getUserBookings(user.id);
        const hasBooking = bookings.some(booking => 
          booking.vehicleId === vehicleId && 
          (booking.status === 'active' || booking.status === 'pending')
        );
        setHasExistingBooking(hasBooking);
      } catch (error) {
        console.error('Error checking existing bookings:', error);
      }
    };

    if (user && vehicleId && currentChatId) {
      checkExistingBookings();
    }
  }, [user, vehicleId, currentChatId, messages]);

  useEffect(() => {
    if (currentChatId) {
      const unsubscribe = chatService.subscribeToMessages(currentChatId, async (newMessages) => {
        // Cargar mensajes de Firebase
        let allMessages = [...newMessages];
        
        try {
          // Cargar mensajes locales del sistema (notificaciones de pago)
          const localMessages = await localChatService.getChatMessages(currentChatId);
          
          // Convertir mensajes locales al formato esperado
          const convertedLocalMessages = localMessages.map(msg => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderPhoto: undefined,
            text: msg.message,
            timestamp: new Date(msg.timestamp),
            read: false,
          }));
          
          // Combinar y ordenar mensajes por timestamp
          allMessages = [...allMessages, ...convertedLocalMessages]
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        } catch (error) {
          console.error('Error loading local messages:', error);
        }
        
        setMessages(allMessages);
        
        // Marcar mensajes como leídos
        if (user) {
          chatService.markMessagesAsRead(currentChatId, user.id);
        }
      });

      return unsubscribe;
    }
  }, [currentChatId, user]);

  // Verificar si ya existe una reserva para este vehículo
  useEffect(() => {
    checkExistingBooking();
  }, [vehicle, user]);

  const checkExistingBooking = async () => {
    if (!vehicle || !user || user.id === vehicle.ownerId) {
      setHasExistingBooking(false);
      return;
    }

    try {
      const userBookings = await hybridBookingService.getUserBookings(user.id);
      const vehicleBookings = userBookings.filter(booking => 
        booking.vehicleId === vehicle.id && 
        (booking.status === 'active' || booking.status === 'completed')
      );
      
      setHasExistingBooking(vehicleBookings.length > 0);
    } catch (error) {
      console.error('Error checking existing bookings:', error);
      setHasExistingBooking(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Forzar reinicialización del chat para recargar mensajes
      await initializeChat();
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const initializeChat = async () => {
    try {
      if (!user) return;



      // Si no tenemos chatId pero tenemos otherUserId, crear o buscar el chat
      if (!currentChatId && otherUserId) {
        const newChatId = await chatService.getOrCreateChat(user.id, otherUserId, vehicleId, vehicle);
        setCurrentChatId(newChatId);
      }

      // Si tenemos chatId pero no tenemos vehículo, obtenerlo del chat
      if (currentChatId && !vehicle && vehicleId) {
        try {

          const vehicleData = await vehicleService.getVehicleById(vehicleId);
          if (vehicleData) {

            // Actualizar el vehículo en los parámetros de navegación
            navigation.setParams({ vehicle: vehicleData });
          } else {

          }
        } catch (error) {
          console.error('Error getting vehicle data:', error);
        }
      }

      // Obtener información del otro usuario
      if (otherUserId) {
        const userData = await userService.getUser(otherUserId);
        setOtherUser(userData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'No se pudo inicializar el chat');
      navigation.goBack();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChatId || !user) return;

    try {
      await chatService.sendMessage(currentChatId, user.id, newMessage.trim(), user.displayName);
      setNewMessage('');
      
      // Actualizar contador de mensajes no leídos
      refreshUnreadCount();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  };

  const handleBookingRequest = () => {
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
    // Resetear fechas a valores por defecto
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  };

  const showDatePickerForStart = () => {
    if (Platform.OS === 'ios') {
      // Usar ActionSheetIOS con opciones de días
      const today = new Date();
      const options = [];
      for (let i = 1; i <= 30; i++) {
        const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        options.push(date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        }));
      }
      options.push('Cancelar');
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Selecciona fecha de inicio',
          options: options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex < options.length - 1) {
            const selectedDate = new Date(today.getTime() + (buttonIndex + 1) * 24 * 60 * 60 * 1000);
            setStartDate(selectedDate);
            // Ajustar fecha de fin si es necesario
            if (selectedDate >= endDate) {
              const nextDay = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
              setEndDate(nextDay);
            }
          }
        }
      );
    } else {
      setShowStartPicker(true);
    }
  };

  const showDatePickerForEnd = () => {
    if (Platform.OS === 'ios') {
      // Usar ActionSheetIOS con opciones limitadas basadas en fecha de inicio
      const minDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      const maxDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // Máximo 14 días
      const options = [];
      
      for (let date = new Date(minDate); date <= maxDate; date.setDate(date.getDate() + 1)) {
        options.push(new Date(date).toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        }));
      }
      options.push('Cancelar');
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Selecciona fecha de fin',
          options: options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex < options.length - 1) {
            const selectedDate = new Date(minDate.getTime() + buttonIndex * 24 * 60 * 60 * 1000);
            setEndDate(selectedDate);
          }
        }
      );
    } else {
      setShowEndPicker(true);
    }
  };



  const calculateTotalPrice = () => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const pricePerDay = vehicle?.pricePerDay || 0;

    return pricePerDay * Math.max(1, days);
  };

  // Función para validar restricciones de renta
  const getBookingValidation = () => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = calculateTotalPrice();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const errors = [];
    const warnings = [];

    // Validar fecha de inicio
    if (startDate <= today) {
      errors.push('La fecha de inicio debe ser posterior a hoy');
    }

    // Validar duración máxima
    if (days > 14) {
      errors.push(`Máximo 14 días (seleccionaste ${days} días)`);
    }

    // Permitir cualquier precio, incluyendo $0
    // Sin restricción de monto mínimo

    // Advertencias
    if (days >= 7) {
      warnings.push(`Renta larga: ${days} días`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      days,
      totalPrice
    };
  };

  const sendBookingRequest = async () => {
    if (!currentChatId || !user || !vehicle || !otherUser) return;

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = calculateTotalPrice();

    // Validación de duración máxima (14 días = 2 semanas)
    if (days > 14) {
      Alert.alert(
        '⏰ Duración Máxima Excedida',
        'Lo sentimos, el periodo máximo de renta es de 2 semanas (14 días).\n\nPor favor, ajusta las fechas para un periodo más corto.',
        [
          { text: 'Entendido', style: 'default' }
        ]
      );
      return;
    }

    // Permitir cualquier monto total, incluyendo $0 para carros gratuitos
    // Sin restricción de monto mínimo

    // Validación adicional: las fechas deben ser futuras
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate <= today) {
      Alert.alert(
        '📅 Fecha Inválida',
        'La fecha de inicio debe ser posterior al día de hoy.',
        [
          { text: 'Entendido', style: 'default' }
        ]
      );
      return;
    }

    const bookingMessage = `🚗 SOLICITUD DE RESERVA
    
Vehículo: ${vehicle.brand} ${vehicle.model}
📅 Fechas: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
⏰ Duración: ${days} día${days > 1 ? 's' : ''}
💰 Total: $${totalPrice.toFixed(2)}

¡Espero tu confirmación! 😊`;

    try {
      // Enviar mensaje con la solicitud
      await chatService.sendMessage(currentChatId, user.id, bookingMessage, user.displayName);
      
      // Crear notificación para el propietario con información completa
      await addNotificationForUser(vehicle.ownerId, {
        title: 'Nueva Solicitud de Reserva',
        message: `${user.displayName} quiere rentar tu ${vehicle.brand} ${vehicle.model} por ${days} días. Total: $${totalPrice.toFixed(2)}`,
        type: 'booking_request',
        read: false,
        data: {
          chatId: currentChatId,
          vehicleId: vehicle.id,
          otherUserId: user.id, // ID del usuario que quiere rentar (para el chat)
          renterName: user.displayName,
          vehicleInfo: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
          totalPrice: totalPrice,
          days: days,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      closeBookingModal();
      Alert.alert(
        'Solicitud Enviada',
        'Tu solicitud de reserva ha sido enviada al propietario. Te notificaremos cuando respondan.'
      );
      
      // Actualizar contador de mensajes no leídos
      refreshUnreadCount();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending booking request:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud de reserva');
    }
  };

  const handleConfirmBooking = async (accept: boolean) => {
    if (!currentChatId || !user || !vehicle) return;

    try {
      // Obtener información actualizada del usuario
      const currentUserData = await userService.getUser(user.id);
      const contactInfo = currentUserData?.phoneNumber || 'No disponible';

      const confirmationMessage = accept 
        ? `✅ RESERVA CONFIRMADA
        
¡Perfecto! He aceptado tu solicitud de reserva.
        
📞 Mi contacto: ${contactInfo}
        
Por favor, coordina conmigo los detalles de entrega. ¡Nos vemos pronto! 🚗`
        : `❌ RESERVA RECHAZADA
        
Lo siento, no puedo confirmar esta reserva en las fechas solicitadas.
        
Si tienes otras fechas disponibles, no dudes en preguntar. 😊`;

      await chatService.sendMessage(currentChatId, user.id, confirmationMessage, user.displayName);
      
      if (accept && otherUser) {
        // Crear notificación para el solicitante
        await addNotificationForUser(otherUser.id, {
          title: accept ? 'Reserva Confirmada' : 'Reserva Rechazada',
          message: accept 
            ? `Tu reserva del ${vehicle.brand} ${vehicle.model} ha sido confirmada`
            : `Tu reserva del ${vehicle.brand} ${vehicle.model} ha sido rechazada`,
          type: accept ? 'booking_confirmed' : 'booking_cancelled',
          read: false,
          data: {
            chatId: currentChatId,
            vehicleId: vehicle.id,
            ownerId: user.id,
            ownerName: user.displayName,
            otherUserId: user.id, // ID del propietario para el chat
            renterName: otherUser.displayName,
            vehicleInfo: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
          }
        });
      }

      // Actualizar contador de mensajes no leídos
      refreshUnreadCount();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending confirmation:', error);
      Alert.alert('Error', 'No se pudo enviar la confirmación');
    }
  };

  const isBookingRequest = (message: string): boolean => {
    return message.includes('🚗 SOLICITUD DE RESERVA') && message.includes('Vehículo:');
  };

  const isBookingConfirmation = (message: string): boolean => {
    return message.includes('✅ RESERVA CONFIRMADA') || message.includes('❌ RESERVA RECHAZADA');
  };

  const hasBookingBeenResponded = (requestMessage: Message): boolean => {
    // Buscar si existe una respuesta (confirmación o rechazo) después de esta solicitud
    const laterMessages = messages.filter(msg => 
      msg.timestamp > requestMessage.timestamp &&
      msg.senderId === user?.id && 
      isBookingConfirmation(msg.text)
    );
    return laterMessages.length > 0;
  };

  const hasPaymentBeenCompleted = (confirmationMessage: Message): boolean => {
    // Buscar si existe un mensaje de pago completado después de esta confirmación
    const laterMessages = messages.filter(msg => 
      msg.timestamp > confirmationMessage.timestamp &&
      (msg.text.includes('🎉 ¡PAGO COMPLETADO!') || msg.senderId === 'system')
    );
    return laterMessages.length > 0;
  };

  const handlePaymentNavigation = (confirmationMessage: Message) => {
    if (!vehicle || !user) return;

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = calculateTotalPrice();

    // Validación de duración máxima antes del pago
    if (days > 14) {
      Alert.alert(
        '⏰ Duración Máxima Excedida',
        'Lo sentimos, el periodo máximo de renta es de 2 semanas (14 días).\n\nEsta reserva no puede procesarse.',
        [
          { text: 'Entendido', style: 'default' }
        ]
      );
      return;
    }

    // Validación de precio mínimo antes del pago
    if (totalPrice < 100) {
      Alert.alert(
        '💰 Monto Mínimo No Alcanzado',
        `El monto mínimo para rentar es de $100.\n\nTotal de esta reserva: $${totalPrice.toFixed(2)}\n\nEsta reserva no puede procesarse.`,
        [
          { text: 'Entendido', style: 'default' }
        ]
      );
      return;
    }

    // Extraer información de la confirmación para crear los detalles de reserva
    const bookingDetails = {
      vehicle: vehicle,
      startDate: startDate, // Usar las fechas del estado actual o extraer del mensaje
      endDate: endDate,
      totalPrice: totalPrice,
      days: days,
      ownerId: vehicle.ownerId,
      ownerName: vehicle.ownerName,
    };

    navigation.navigate('Payment', {
      bookingDetails,
      chatId: currentChatId,
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const isBookingMsg = isBookingRequest(item.text);
    const isConfirmationMsg = isBookingConfirmation(item.text);
    const isPaymentMsg = item.text.includes('💳 ¡PAGO COMPLETADO!');
    const isOwnerNotificationMsg = item.text.includes('🎉 ¡HAS RECIBIDO UN PAGO!');
    const isOwner = vehicle?.ownerId === user?.id;
    const alreadyResponded = isBookingMsg ? hasBookingBeenResponded(item) : false;
    
    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
        <View style={[
          styles.messageBubble, 
          isMe ? styles.myBubble : styles.otherBubble,
          (isBookingMsg || isConfirmationMsg) && styles.specialMessageBubble,
          (isPaymentMsg || isOwnerNotificationMsg) && styles.paymentMessageBubble
        ]}>
          <Text style={[
            styles.messageText, 
            isMe ? styles.myMessageText : styles.otherMessageText,
            (isPaymentMsg || isOwnerNotificationMsg) && styles.paymentMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        {/* Botones de acción para propietarios en mensajes de reserva */}
        {isBookingMsg && !isMe && isOwner && !alreadyResponded && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleConfirmBooking(false)}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleConfirmBooking(true)}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mostrar mensaje cuando ya se ha respondido */}
        {isBookingMsg && !isMe && isOwner && alreadyResponded && (
          <View style={styles.respondedContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.respondedText}>Ya has respondido a esta solicitud</Text>
          </View>
        )}

        {/* Botón de pago para confirmaciones aceptadas - solo si no se ha completado el pago */}
        {isConfirmationMsg && !isMe && item.text.includes('✅ RESERVA CONFIRMADA') && !isOwner && !hasPaymentBeenCompleted(item) && (
          <View style={styles.paymentContainer}>
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => handlePaymentNavigation(item)}
            >
              <Ionicons name="card" size={18} color="#FFFFFF" />
              <Text style={styles.paymentButtonText}>Proceder al Pago</Text>
            </TouchableOpacity>
            <Text style={styles.paymentHint}>
              Completa tu pago para confirmar la reserva
            </Text>
          </View>
        )}

        {/* Mensaje de pago completado si ya se hizo el pago */}
        {isConfirmationMsg && !isMe && item.text.includes('✅ RESERVA CONFIRMADA') && !isOwner && hasPaymentBeenCompleted(item) && (
          <View style={styles.paymentCompletedContainer}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.paymentCompletedText}>Pago completado ✅</Text>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    // Determinar el rol del OTRO usuario
    // Si yo soy el owner del vehículo, el otro es comprador
    // Si yo NO soy el owner, el otro es propietario
    const isOwner = vehicle?.ownerId === user?.id;
    const roleText = isOwner ? 'Comprador interesado' : 'Propietario del vehículo';
    
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {otherUser?.displayName || 'Usuario'}
          </Text>
          <Text style={styles.headerRole}>
            {roleText}
          </Text>
          {vehicle && (
            <Text style={styles.headerSubtitle}>
              🚗 {vehicle.brand} {vehicle.model}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Ionicons name="chatbubbles" size={50} color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, vehicle && user?.id !== vehicle.ownerId && styles.textInputWithButton]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Escribe un mensaje..."
            multiline
            maxLength={500}
          />
          
          {/* Botón de reserva - solo visible para clientes potenciales sin reserva existente */}
          {vehicle && user?.id !== vehicle.ownerId && !hasExistingBooking && (
            <TouchableOpacity
              style={styles.bookingButton}
              onPress={handleBookingRequest}
            >
              <Ionicons name="calendar" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Indicador de reserva existente */}
          {vehicle && user?.id !== vehicle.ownerId && hasExistingBooking && (
            <View style={styles.bookedIndicator}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Reserva */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => closeBookingModal()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solicitar Reserva</Text>
              <TouchableOpacity
                onPress={() => closeBookingModal()}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {vehicle && (
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleTitle}>{vehicle.brand} {vehicle.model}</Text>
                <Text style={styles.vehiclePrice}>${vehicle.pricePerDay.toFixed(2)}/día</Text>
              </View>
            )}

            <View style={styles.dateSection}>
              <Text style={styles.sectionTitle}>Fechas de renta</Text>
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={showDatePickerForStart}
              >
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                <Text style={styles.dateButtonText}>
                  Desde: {startDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={showDatePickerForEnd}
              >
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                <Text style={styles.dateButtonText}>
                  Hasta: {endDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.priceSection}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total:</Text>
                <Text style={styles.priceTotal}>${calculateTotalPrice().toFixed(2)}</Text>
              </View>
              
              {/* Indicadores de validación */}
              {(() => {
                const validation = getBookingValidation();
                return (
                  <>
                    {validation.errors.length > 0 && (
                      <View style={styles.validationContainer}>
                        {validation.errors.map((error, index) => (
                          <View key={`error-${index}-${error.slice(0, 10)}`} style={styles.errorRow}>
                            <Ionicons name="warning" size={16} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {validation.warnings.length > 0 && validation.errors.length === 0 && (
                      <View style={styles.validationContainer}>
                        {validation.warnings.map((warning, index) => (
                          <View key={`warning-${index}-${warning.slice(0, 10)}`} style={styles.warningRow}>
                            <Ionicons name="information-circle" size={16} color="#F59E0B" />
                            <Text style={styles.warningText}>{warning}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {validation.isValid && (
                      <View style={styles.validationContainer}>
                        <View style={styles.successRow}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.successText}>
                            Reserva válida - {validation.days} día{validation.days > 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => closeBookingModal()}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  getBookingValidation().errors.length > 0 && styles.disabledButton
                ]}
                onPress={sendBookingRequest}
                disabled={getBookingValidation().errors.length > 0}
              >
                <Text style={[
                  styles.confirmButtonText,
                  getBookingValidation().errors.length > 0 && styles.disabledButtonText
                ]}>
                  Enviar Solicitud
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers para iOS con modal mejorado */}
      {showStartPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (event.type === 'set' && selectedDate) {
              setStartDate(selectedDate);
              if (selectedDate >= endDate) {
                const nextDay = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
                setEndDate(nextDay);
              }
            }
          }}
        />
      )}

      {showEndPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
          maximumDate={new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)}
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (event.type === 'set' && selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}

      {/* Date Pickers para Android (mantener el comportamiento original) */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (event.type === 'set' && selectedDate) {
              setStartDate(selectedDate);

              if (selectedDate >= endDate) {
                const nextDay = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
                setEndDate(nextDay);

              }
            }
          }}
        />
      )}

      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (event.type === 'set' && selectedDate) {
              setEndDate(selectedDate);

            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRole: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#374151',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#E5E7EB',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  textInputWithButton: {
    paddingRight: 60, // Más espacio para el botón de reserva
  },
  bookingButton: {
    marginLeft: 8,
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  vehicleInfo: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  vehiclePrice: {
    fontSize: 16,
    color: '#3B82F6',
    marginTop: 4,
  },
  dateSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  priceSection: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  priceTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Special message styles
  specialMessageBubble: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },



  respondedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    gap: 6,
  },
  respondedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  paymentContainer: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 6,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentHint: {
    fontSize: 12,
    color: '#3B82F6',
    textAlign: 'center',
  },
  paymentCompletedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
  },
  paymentCompletedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  paymentMessageBubble: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
    borderWidth: 2,
  },
  paymentMessageText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Estilos para validación de reservas
  validationContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  successText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#6B7280',
  },
  bookedIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});