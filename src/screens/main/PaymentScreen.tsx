import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { usePayment, PaymentMethod } from '../../contexts/PaymentContext';
import { hybridBookingService } from '../../services/hybridBookingService';
import { notificationService } from '../../services/notificationService';
import { firebaseVehicleAvailabilityService } from '../../services/firebaseVehicleAvailabilityService';
import { userService } from '../../services/userService';
import { receiptService } from '../../services/receiptService';
import { chatService } from '../../services/firebaseService';

import { CustomButton } from '../../components/CustomButton';
import { Vehicle } from '../../types';

interface PaymentScreenProps {
  route: {
    params: {
      bookingDetails: {
        vehicle: Vehicle;
        startDate: Date;
        endDate: Date;
        totalPrice: number;
        days: number;
        ownerId: string;
        ownerName: string;
      };
      chatId: string;
    };
  };
  navigation: any;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ route, navigation }) => {
  const { bookingDetails, chatId } = route.params;
  const { user } = useAuth();
  const { confirmPayment } = useConfirmPayment();
  const { processGooglePayPayment, isGooglePayAvailable } = usePayment();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('stripe');
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  // Verificar si Google Pay está disponible cuando se monta el componente
  useEffect(() => {
    const checkGooglePayAvailability = async () => {
      try {
        const available = await isGooglePayAvailable();
        setGooglePayAvailable(available);
      } catch (error) {
        console.error('Error checking Google Pay availability:', error);
        setGooglePayAvailable(false);
      }
    };
    
    checkGooglePayAvailability();
  }, []);

  // Simulación de backend - En producción, debes tener tu propio servidor
  const createPaymentIntent = async (amount: number) => {
    try {
      // NOTA: Esto es solo para demostración. En producción necesitas un backend real
      // Por ahora simularemos el client_secret
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay de red
      
      // Para demo, retornamos un client_secret simulado
      return `pi_demo_${Date.now()}_secret_demo`;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    if (!isFree && selectedPaymentMethod === 'stripe' && !cardComplete) {
      Alert.alert('Error', 'Por favor, completa la información de tu tarjeta');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes estar logueado para realizar una reserva');
      return;
    }

    setLoading(true);
    try {
      // Verificación de disponibilidad en tiempo real (igual para ambos métodos)
      const availability = await firebaseVehicleAvailabilityService.getVehicleAvailability(
        bookingDetails.vehicle.id
      );
      
      const isCurrentlyRented = availability && !availability.isAvailable;
      const hasActiveReservations = availability?.reservations?.some(r => r.status === 'active') || false;
      
      if (isCurrentlyRented || hasActiveReservations) {
        const activeReservation = availability?.reservations?.find(r => r.status === 'active');
        const renterName = activeReservation?.renterName || 'Otro usuario';
        
        Alert.alert(
          '🚫 Vehículo No Disponible',
          `Lo sentimos, este vehículo ya fue rentado mientras procesabas tu pago.\n\nTe recomendamos buscar otros vehículos similares.`,
          [
            { text: 'Entendido', onPress: () => navigation.goBack() }
          ]
        );
        return;
      }
      
      // Delay aleatorio para prevenir pagos simultáneos (2-5 segundos)
      const randomDelay = Math.floor(Math.random() * 3000) + 2000; // 2000-5000ms
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      
      // Segunda verificación después del delay
      const finalAvailability = await firebaseVehicleAvailabilityService.getVehicleAvailability(
        bookingDetails.vehicle.id
      );
      
      const finalIsRented = finalAvailability && !finalAvailability.isAvailable;
      const finalHasReservations = finalAvailability?.reservations?.some(r => r.status === 'active') || false;
      
      if (finalIsRented || finalHasReservations) {
        Alert.alert(
          '🚫 Reserva Conflictiva',
          'Alguien más completó la reserva de este vehículo justo antes que tú. Por favor, busca otros vehículos disponibles.',
          [
            { text: 'Buscar Otros', onPress: () => navigation.goBack() }
          ]
        );
        return;
      }

      // Procesar según si es gratuito o tiene costo
      if (fees.total === 0) {
        // Reserva gratuita - procesar directamente
        await handleFreeReservation();
      } else {
        // Reserva con costo - procesar según el método de pago seleccionado
        if (selectedPaymentMethod === 'googlePay') {
          await handleGooglePayPayment();
        } else {
          await handleStripePayment();
        }
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'No se pudo procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePayPayment = async () => {
    try {
      console.log('🚀 Iniciando flujo de Google Pay...');
      
      const vehicleInfo = `${bookingDetails.vehicle.brand} ${bookingDetails.vehicle.model}`;
      const description = `Reserva ${vehicleInfo} - ${bookingDetails.days} días`;
      
      console.log(`💰 Monto a cobrar: $${fees.total}`);
      console.log(`📝 Descripción: ${description}`);
      
      const paymentResult = await processGooglePayPayment(fees.total, description);
      
      console.log('✅ Google Pay payment result:', paymentResult);
      
      // Si el pago fue exitoso, usar el ID del token de Google Pay
      const paymentId = paymentResult.id || `googlepay_${Date.now()}`;
      console.log(`🆔 Payment ID generado: ${paymentId}`);
      
      await handleSuccessfulPayment(paymentId, 'googlePay');
      
    } catch (error) {
      console.error('❌ Error with Google Pay:', error);
      
      if (error.message?.includes('cancelado') || error.message?.includes('canceled')) {
        Alert.alert('💳 Pago Cancelado', 'El pago con Google Pay fue cancelado por el usuario');
      } else {
        Alert.alert(
          '❌ Error con Google Pay', 
          error.message || 'Error procesando el pago con Google Pay. Intenta de nuevo o usa otro método de pago.'
        );
      }
    }
  };

  const handleFreeReservation = async () => {
    try {
      console.log('🆓 Procesando reserva gratuita...');
      const freeReservationId = `free_reservation_${Date.now()}`;
      await handleSuccessfulPayment(freeReservationId, 'free');
    } catch (error) {
      console.error('❌ Error processing free reservation:', error);
      throw error;
    }
  };

  const handleStripePayment = async () => {
    try {
      // 1. Crear Payment Intent en el backend
      const clientSecret = await createPaymentIntent(bookingDetails.totalPrice);

      // Para demo, simularemos un pago exitoso
      if (clientSecret.includes('demo')) {
        await simulateSuccessfulPayment();
        return;
      }

      // 2. Confirmar el pago con Stripe (código real)
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Error en el pago:', error);
        Alert.alert('Error en el pago', error.message);
        return;
      }

      if (paymentIntent?.status === 'Succeeded') {
        await handleSuccessfulPayment(paymentIntent.id, 'stripe');
      }
    } catch (error) {
      console.error('Error with Stripe payment:', error);
      throw error;
    }
  };

  const simulateSuccessfulPayment = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular procesamiento
      await handleSuccessfulPayment('demo_payment_' + Date.now(), 'stripe');
    } catch (error) {
      console.error('Error in simulated payment:', error);
      Alert.alert('Error', 'Error en el pago simulado');
    }
  };

  const handleSuccessfulPayment = async (paymentId: string, method: PaymentMethod | 'free' = 'stripe') => {
    try {

      
      // 1. Crear la reserva en Firebase

      const bookingId = await createBookingRecord(paymentId);

      
      // 2. Marcar el vehículo como no disponible

      await updateVehicleAvailability(bookingId, paymentId);

      
      // 3. Enviar notificación al propietario

      await notifyOwnerOfPayment(paymentId);

      
      // 4. Enviar mensaje al chat confirmando el pago

      await sendPaymentConfirmationMessage(paymentId);

      // Determinar el emoji y método de pago para mostrar
      let paymentMethodText: string;
      let successIcon: string;
      let totalText: string;
      
      if (method === 'free') {
        paymentMethodText = '🆓 Reserva Gratuita';
        successIcon = '🎉🆓';
        totalText = 'Gratis - Sin cargo';
      } else if (method === 'googlePay') {
        paymentMethodText = '💳 Google Pay';
        successIcon = '🎉💳';
        totalText = `$${fees.total.toFixed(2)}`;
      } else {
        paymentMethodText = '💎 Tarjeta de Crédito';
        successIcon = '🎉💎';
        totalText = `$${fees.total.toFixed(2)}`;
      }

      const actionText = method === 'free' ? 'reservado' : 'pagado';

      Alert.alert(
        `${successIcon} ¡Reserva Exitosa!`,
        `✅ Tu reserva ha sido confirmada y ${actionText} exitosamente con ${paymentMethodText}.

🚗 Vehículo: ${bookingDetails.vehicle.brand} ${bookingDetails.vehicle.model}
📅 Fechas: ${bookingDetails.startDate.toLocaleDateString()} - ${bookingDetails.endDate.toLocaleDateString()}
💰 Total ${actionText}: ${totalText}
🆔 ID de reserva: ${paymentId.slice(-8)}

📱 El propietario ha sido notificado automáticamente.
🔔 Recibirás instrucciones de entrega pronto.

¡Gracias por usar Carbnb!`,
        [
          {
            text: 'Ver Mis Reservas',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error handling successful payment:', error);
      Alert.alert('Error', `${method === 'free' ? 'Reserva' : 'Pago'} procesado pero hubo un error guardando la reserva`);
    }
  };

  const createBookingRecord = async (paymentId: string) => {
    try {
      // Obtener información real del propietario y renter
      const [ownerInfo, renterInfo] = await Promise.all([
        userService.getUserContactInfo(bookingDetails.ownerId),
        userService.getUserContactInfo(user?.id || 'unknown')
      ]);

      const bookingId = await hybridBookingService.createBooking({
        vehicleId: bookingDetails.vehicle.id,
        ownerId: bookingDetails.ownerId,
        ownerName: ownerInfo.name,
        ownerEmail: ownerInfo.email,
        ownerContact: ownerInfo.phone,
        renterId: user?.id || 'unknown',
        renterName: renterInfo.name,
        renterEmail: renterInfo.email,
        renterContact: renterInfo.phone,
        startDate: bookingDetails.startDate,
        endDate: bookingDetails.endDate,
        totalPrice: fees.total,
        paymentId,
        vehicle: {
          brand: bookingDetails.vehicle.brand,
          model: bookingDetails.vehicle.model,
          year: bookingDetails.vehicle.year,
          imageUrl: bookingDetails.vehicle.images[0] || '',
        },
      });
      

      return bookingId;
    } catch (error) {
      console.error('Error creating booking record:', error);
      throw error;
    }
  };

  const updateVehicleAvailability = async (bookingId: string, paymentId: string) => {
    try {
      await firebaseVehicleAvailabilityService.markVehicleAsReserved(
        bookingDetails.vehicle.id,
        {
          bookingId,
          startDate: bookingDetails.startDate,
          endDate: bookingDetails.endDate,
          renterId: user?.id || 'unknown',
          renterName: user?.email || 'Usuario desconocido',
          paymentId,
          totalPrice: fees.total,
        }
      );
      

    } catch (error) {
      console.error('❌ Error updating vehicle availability in Firebase:', error);
      throw error;
    }
  };

  const notifyOwnerOfPayment = async (paymentId: string) => {
    try {
      const vehicleInfo = `${bookingDetails.vehicle.brand} ${bookingDetails.vehicle.model} ${bookingDetails.vehicle.year}`;
      const bookingDates = `${bookingDetails.startDate.toLocaleDateString()} - ${bookingDetails.endDate.toLocaleDateString()}`;
      
      // Obtener información del usuario que está pagando
      const renterName = user?.email || 'Usuario desconocido';
      
      // Enviar notificación
      await notificationService.notifyPaymentReceived(
        bookingDetails.ownerId,
        {
          paymentId,
          amount: fees.total,
          renterName,
          vehicleInfo,
          bookingDates,
        }
      );
      

    } catch (error) {
      console.error('Error notifying owner of payment:', error);
      throw error;
    }
  };

  const sendPaymentConfirmationMessage = async (paymentId: string) => {
    try {
      const vehicleInfo = `${bookingDetails.vehicle.brand} ${bookingDetails.vehicle.model} ${bookingDetails.vehicle.year}`;
      const bookingDates = `${bookingDetails.startDate.toLocaleDateString()} - ${bookingDetails.endDate.toLocaleDateString()}`;
      const days = bookingDetails.days;
      
      // Obtener información real de ambos usuarios
      const [ownerInfo, renterInfo] = await Promise.all([
        userService.getUserContactInfo(bookingDetails.ownerId),
        userService.getUserContactInfo(user?.id || 'unknown')
      ]);

      // 1. Enviar mensaje al chat confirmando el pago completado
      await sendPaymentCompletedMessage(paymentId, vehicleInfo, bookingDates, fees.total);

      // 2. Crear recibo personalizado para el comprador (renter)
      await receiptService.createRenterReceipt(user?.id || 'unknown', {
        paymentId,
        amount: fees.total,
        vehicleInfo,
        bookingDates,
        days,
        serviceFee: 0, // No se usa más por separado
        processingFee: fees.allFees, // Todas las comisiones juntas
        subtotal: fees.subtotal,
        ownerInfo,
      });

      // 3. Crear recibo personalizado para el propietario (owner)
      await receiptService.createOwnerReceipt(bookingDetails.ownerId, {
        paymentId,
        amount: fees.total,
        vehicleInfo,
        bookingDates,
        days,
        serviceFee: 0, // No se usa más por separado
        processingFee: fees.allFees, // Todas las comisiones juntas
        subtotal: fees.subtotal,
        renterInfo,
      });
      

    } catch (error) {
      console.error('Error creating payment receipts:', error);
      throw error;
    }
  };

  const sendPaymentCompletedMessage = async (paymentId: string, vehicleInfo: string, bookingDates: string, amount: number) => {
    try {
      const confirmationMessage = `🎉 ¡PAGO COMPLETADO!

✅ La reserva ha sido confirmada y pagada exitosamente.

🚗 Vehículo: ${vehicleInfo}
📅 Fechas: ${bookingDates}
💰 Total pagado: $${amount.toLocaleString()}
🆔 ID de pago: ${paymentId.slice(-8)}

📱 Ambas partes han sido notificadas automáticamente.
🔔 El propietario recibirá instrucciones para coordinar la entrega.

¡Gracias por usar Carbnb! 🚙`;

      // Enviar mensaje al chat existente
      await chatService.sendMessage(
        chatId,
        'system', // senderId - Mensaje del sistema
        confirmationMessage,
        'CarBnb System' // senderName
      );


    } catch (error) {
      console.error('Error sending payment completion message to chat:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  };

  const calculateFees = () => {
    const subtotal = Number.parseFloat(bookingDetails.totalPrice.toFixed(2));
    
    // Si el subtotal es $0 (carro gratuito), no cobrar comisiones
    if (subtotal === 0) {
      return { subtotal: 0, allFees: 0, total: 0 };
    }
    
    // Para carros con precio, aplicar comisiones normales
    const allFees = Number.parseFloat((subtotal * 0.05 + subtotal * 0.029 + 0.3 + 5).toFixed(2)); 
    const total = Number.parseFloat((subtotal + allFees).toFixed(2));
    
    return { subtotal, allFees, total };
  };

  const fees = calculateFees();

  const getPaymentButtonText = () => {
    const total = fees.total.toFixed(2);
    const isFree = fees.total === 0;
    
    if (isFree) {
      return selectedPaymentMethod === 'googlePay' 
        ? '🆓 Confirmar Reserva Gratuita con Google Pay'
        : '🆓 Confirmar Reserva Gratuita';
    }
    
    if (selectedPaymentMethod === 'googlePay') {
      return `Pagar con Google Pay $${total}`;
    }
    return `Pagar con Tarjeta $${total}`;
  };

  const isPaymentReady = () => {
    const isFree = fees.total === 0;
    
    // Para pagos gratuitos, siempre está listo
    if (isFree) return true;
    
    // Para pagos con costo, verificar método seleccionado
    if (selectedPaymentMethod === 'stripe') {
      return cardComplete;
    }
    if (selectedPaymentMethod === 'googlePay') {
      return googlePayAvailable;
    }
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirmar Pago</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Resumen de la reserva */}
          <View style={styles.bookingSummary}>
            <Text style={styles.sectionTitle}>Resumen de tu reserva</Text>
            
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {bookingDetails.vehicle.brand} {bookingDetails.vehicle.model}
              </Text>
              <Text style={styles.vehicleDetails}>
                {bookingDetails.vehicle.year} • {bookingDetails.vehicle.color}
              </Text>
            </View>

            <View style={styles.dateInfo}>
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.dateText}>
                  {bookingDetails.startDate.toLocaleDateString()} - {bookingDetails.endDate.toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.dateItem}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.dateText}>
                  {bookingDetails.days} día{bookingDetails.days > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.ownerInfo}>
              <Text style={styles.ownerLabel}>Propietario:</Text>
              <Text style={styles.ownerName}>{bookingDetails.ownerName}</Text>
            </View>
          </View>

          {/* Desglose de precios */}
          <View style={styles.priceBreakdown}>
            <Text style={styles.sectionTitle}>Desglose de precios</Text>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                ${bookingDetails.vehicle.pricePerDay.toFixed(2)}/día x {bookingDetails.days} días
              </Text>
              <Text style={styles.priceValue}>${fees.subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Comisiones</Text>
              <Text style={styles.priceValue}>${fees.allFees.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${fees.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Información de pago */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Método de pago</Text>
            
            {/* Selector de método de pago */}
            <View style={styles.paymentMethodContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodOption,
                  selectedPaymentMethod === 'stripe' && styles.paymentMethodSelected
                ]}
                onPress={() => setSelectedPaymentMethod('stripe')}
              >
                <View style={styles.paymentMethodIcon}>
                  <Ionicons 
                    name="card-outline" 
                    size={24} 
                    color={selectedPaymentMethod === 'stripe' ? '#3B82F6' : '#6B7280'} 
                  />
                </View>
                <View style={styles.paymentMethodText}>
                  <Text style={[
                    styles.paymentMethodTitle,
                    selectedPaymentMethod === 'stripe' && styles.paymentMethodTitleSelected
                  ]}>
                    Tarjeta de Crédito/Débito
                  </Text>
                  <Text style={styles.paymentMethodSubtitle}>
                    Visa, Mastercard, American Express
                  </Text>
                </View>
                <View style={styles.radioButton}>
                  {selectedPaymentMethod === 'stripe' && (
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  )}
                </View>
              </TouchableOpacity>

              {googlePayAvailable && (
                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    selectedPaymentMethod === 'googlePay' && styles.paymentMethodSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod('googlePay')}
                >
                  <View style={styles.paymentMethodIcon}>
                    <Text style={[
                      styles.googlePayIcon,
                      { color: selectedPaymentMethod === 'googlePay' ? '#4285F4' : '#6B7280' }
                    ]}>
                      G
                    </Text>
                  </View>
                  <View style={styles.paymentMethodText}>
                    <Text style={[
                      styles.paymentMethodTitle,
                      selectedPaymentMethod === 'googlePay' && styles.paymentMethodTitleSelected
                    ]}>
                      Google Pay
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      Pago rápido y seguro
                    </Text>
                  </View>
                  <View style={styles.radioButton}>
                    {selectedPaymentMethod === 'googlePay' && (
                      <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Mostrar campos de tarjeta solo si Stripe está seleccionado */}
            {selectedPaymentMethod === 'stripe' && (
              <View style={styles.cardContainer}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{
                    number: '4242 4242 4242 4242',
                  }}
                  cardStyle={styles.cardField}
                  style={styles.cardFieldContainer}
                  onCardChange={(cardDetails) => {
                    setCardComplete(cardDetails.complete);
                  }}
                />
              </View>
            )}

            {/* Información de Google Pay si está seleccionado */}
            {selectedPaymentMethod === 'googlePay' && (
              <View style={styles.googlePayInfo}>
                <View style={styles.googlePayInfoContent}>
                  <Ionicons name="shield-checkmark" size={20} color="#4285F4" />
                  <Text style={styles.googlePayInfoText}>
                    Se abrirá Google Pay para completar el pago de forma segura
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.securityInfo}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.securityText}>
                Tu información de pago está protegida con encriptación de 256 bits
              </Text>
            </View>
          </View>

          {/* Términos y condiciones */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              Al confirmar el pago, aceptas nuestros{' '}
              <Text style={styles.termsLink}>Términos de Servicio</Text> y{' '}
              <Text style={styles.termsLink}>Política de Cancelación</Text>.
            </Text>
          </View>
        </ScrollView>

        {/* Botón de pago */}
        <View style={styles.paymentButtonContainer}>
          <CustomButton
            title={loading ? 'Procesando...' : getPaymentButtonText()}
            onPress={handlePayment}
            disabled={loading || !isPaymentReady()}
            style={styles.paymentButton}
          />
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>
                {selectedPaymentMethod === 'googlePay' 
                  ? '💳 Procesando con Google Pay...' 
                  : '💎 Verificando y procesando con Stripe...'}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  bookingSummary: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  vehicleInfo: {
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dateInfo: {
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  priceBreakdown: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  paymentSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContainer: {
    marginBottom: 16,
  },
  cardFieldContainer: {
    height: 50,
  },
  cardField: {
    backgroundColor: '#FFFFFF',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 8,
    flex: 1,
  },
  termsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  paymentButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paymentButton: {
    marginBottom: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  // Nuevos estilos para métodos de pago
  paymentMethodContainer: {
    marginBottom: 16,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  paymentMethodSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginRight: 12,
  },
  paymentMethodText: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  paymentMethodTitleSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googlePayIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  googlePayInfo: {
    marginBottom: 16,
  },
  googlePayInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
  },
  googlePayInfoText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
});