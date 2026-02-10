import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';  
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { PaymentProvider } from './src/contexts/PaymentContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { bookingExpirationService } from './src/services/bookingExpirationService';

export default function App() {
  useEffect(() => {
    // Iniciar el servicio de verificación automática de reservas vencidas
    // Se ejecuta cada hora (60 minutos)
    const interval = bookingExpirationService.startPeriodicCheck(60);
    
    // Cleanup cuando la app se cierre
    return () => {
      bookingExpirationService.stopPeriodicCheck(interval);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PaymentProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </PaymentProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
