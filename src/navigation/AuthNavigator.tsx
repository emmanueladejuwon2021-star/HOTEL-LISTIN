import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * AuthNavigator component.
 * Manages authentication screens (Login Screen) when no active user session exists.
 * Styled with clean NativeWind headers and accessible title banners for non-technical users.
 */
export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' }
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'UNILAG Portal Sign In' }}
      />
    </Stack.Navigator>
  );
};
