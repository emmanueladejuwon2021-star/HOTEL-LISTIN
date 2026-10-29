import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WardenStackParamList } from './types';
import { WardenDashboardScreen } from '../screens/WardenDashboardScreen';

const Stack = createNativeStackNavigator<WardenStackParamList>();

/**
 * WardenNavigator Component.
 * Isolated navigation stack for Hall Wardens enforcing strict Role-Based Access Control.
 */
export const WardenNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#7A0000' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="WardenDashboard"
        component={WardenDashboardScreen}
        options={{ title: 'Warden Executive Portal' }}
      />
    </Stack.Navigator>
  );
};
