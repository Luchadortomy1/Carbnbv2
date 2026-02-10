import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { MessagesProvider } from '../contexts/MessagesContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { RootStackParamList } from '../types';
import { View, ActivityIndicator } from 'react-native';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main">
          {() => (
            <NotificationsProvider>
              <MessagesProvider>
                <MainStack />
              </MessagesProvider>
            </NotificationsProvider>
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};