import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { realGooglePayService } from '../services/realGooglePayService';
import { Alert } from 'react-native';

// Clave pública de Stripe (debes obtenerla de tu cuenta de Stripe)
// NOTA: En producción, debes usar variables de entorno
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY; // Cargada desde variables de entorno

export type PaymentMethod = 'stripe' | 'googlePay';

interface PaymentContextType {
  initializePayment: (amount: number, description: string) => Promise<any>;
  processPayment: (paymentMethodId: string, amount: number) => Promise<any>;
  processGooglePayPayment: (amount: number, description: string) => Promise<any>;
  isGooglePayAvailable: () => Promise<boolean>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

interface PaymentProviderProps {
  children: ReactNode;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children }) => {
  const initializePayment = async (amount: number, description: string) => {
    try {
      // Aquí llamaremos a nuestro backend para crear el Payment Intent
      const response = await fetch('http://your-backend.com/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Stripe usa centavos
          currency: 'usd',
          description,
        }),
      });
      
      const { client_secret } = await response.json();
      return client_secret;
    } catch (error) {
      console.error('Error initializing payment:', error);
      throw error;
    }
  };

  const processPayment = async (paymentMethodId: string, amount: number) => {
    try {
      // Procesar el pago a través de nuestro backend
      const response = await fetch('http://your-backend.com/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: paymentMethodId,
          amount: amount * 100,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  };

  const isGooglePayAvailable = async (): Promise<boolean> => {
    try {
      return await realGooglePayService.isReadyToPay();
    } catch (error) {
      console.error('Error checking Google Pay availability:', error);
      return false;
    }
  };

  const processGooglePayPayment = async (amount: number, description: string): Promise<any> => {
    try {
      console.log(`🚀 Procesando Google Pay REAL - Cantidad: $${amount}, Descripción: ${description}`);
      
      const paymentResult = await realGooglePayService.requestPayment({
        amount,
        currencyCode: 'USD',
        description,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Error al procesar el pago');
      }
      
      console.log('✅ Google Pay payment successful:', paymentResult.paymentMethodData);
      return paymentResult.paymentMethodData;
    } catch (error) {
      console.error('❌ Error processing Google Pay payment:', error);
      throw error;
    }
  };

  const value: PaymentContextType = useMemo(() => ({
    initializePayment,
    processPayment,
    processGooglePayPayment,
    isGooglePayAvailable,
  }), []);

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <PaymentContext.Provider value={value}>
        {children}
      </PaymentContext.Provider>
    </StripeProvider>
  );
};