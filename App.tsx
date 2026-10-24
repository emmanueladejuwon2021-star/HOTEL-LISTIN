import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';

/**
 * Main Root Application Component for UnilagStay Hostel Management Mobile Application.
 *
 * Configures top-level React Navigation container, Safe Area context providers,
 * and status bar styling. Dynamically routes users based on active authentication
 * session and Role-Based Access Control (RBAC) rules.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#7A0000" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
