import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MainTabs } from './MainTabs';
import { ChatScreen } from '../screens/main/ChatScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { EditProfileScreen } from '../screens/main/EditProfileScreen';
import { PaymentScreen } from '../screens/main/PaymentScreen';
import BookingsScreen from '../screens/main/BookingsScreen';
import { BookingHistoryScreen } from '../screens/main/BookingHistoryScreen';
import { RentedVehiclesScreen } from '../screens/main/RentedVehiclesScreen';
import { MainStackParamList } from '../types';

const Stack = createStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Bookings" component={BookingsScreen} />
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
      <Stack.Screen name="RentedVehicles" component={RentedVehiclesScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
};