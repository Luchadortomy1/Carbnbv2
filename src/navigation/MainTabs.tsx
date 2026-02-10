import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/main/HomeScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { AddCarScreen } from '../screens/main/AddCarScreen';
import { MessagesScreen } from '../screens/main/MessagesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { useMessages } from '../contexts/MessagesContext';
import { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
  routeName: keyof MainTabParamList;
}

const MessagesTabIcon: React.FC<{ focused: boolean; color: string; size: number }> = ({ focused, color, size }) => {
  const { unreadCount } = useMessages();
  const iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons name={iconName} size={size} color={color} />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          right: -6,
          top: -3,
          backgroundColor: '#EF4444',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const TabBarIcon: React.FC<TabBarIconProps> = ({ focused, color, size, routeName }) => {
  let iconName: keyof typeof Ionicons.glyphMap;

  switch (routeName) {
    case 'Home':
      iconName = focused ? 'home' : 'home-outline';
      break;
    case 'Search':
      iconName = focused ? 'search' : 'search-outline';
      break;
    case 'AddCar':
      iconName = focused ? 'add-circle' : 'add-circle-outline';
      break;
    case 'Messages':
      return <MessagesTabIcon focused={focused} color={color} size={size} />;
    case 'Profile':
      iconName = focused ? 'person' : 'person-outline';
      break;
    default:
      iconName = 'help-outline';
  }

  return <Ionicons name={iconName} size={size} color={color} />;
};

export const MainTabs: React.FC = () => {
  const getTabBarIcon = useCallback((props: { focused: boolean; color: string; size: number }, routeName: keyof MainTabParamList) => (
    <TabBarIcon 
      focused={props.focused} 
      color={props.color} 
      size={props.size} 
      routeName={routeName} 
    />
  ), []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: (props) => getTabBarIcon(props, route.name),
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          tabBarLabel: 'Buscar',
        }}
      />
      <Tab.Screen 
        name="AddCar" 
        component={AddCarScreen}
        options={{
          tabBarLabel: 'Publicar',
          tabBarIconStyle: {
            transform: [{ scale: 1.2 }],
          },
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Mensajes',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
};