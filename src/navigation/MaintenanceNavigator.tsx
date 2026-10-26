import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaintenanceStackParamList } from './types';
import { ArtisanQueueScreen } from '../screens/ArtisanQueueScreen';
import { ProofOfFixScreen } from '../screens/ProofOfFixScreen';

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

/**
 * MaintenanceNavigator Component.
 * Isolated navigation stack for Maintenance Artisans enforcing strict Role-Based Access Control.
 */
export const MaintenanceNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#D97706' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="ArtisanQueue"
        component={ArtisanQueueScreen}
        options={{ title: 'Artisan Repair Queue' }}
      />
      <Stack.Screen
        name="ProofOfFixUpload"
        component={ProofOfFixScreen}
        options={{ title: 'Upload Proof of Fix' }}
      />
    </Stack.Navigator>
  );
};
