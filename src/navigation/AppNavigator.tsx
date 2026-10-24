import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { PorterNavigator } from './PorterNavigator';
import { WardenNavigator } from './WardenNavigator';
import { MaintenanceNavigator } from './MaintenanceNavigator';

/**
 * AppNavigator Component.
 * Root navigator managing authentication and strict Role-Based Access Control (RBAC) navigation routing.
 * Switches dynamically between AuthNavigator (unauthenticated) and role-isolated navigators (Student, Porter, Warden, Maintenance).
 */
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, activeRole, isLoading } = useAuthStore();

  // Render loading splash screen when authentication state is verifying session token
  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center p-6">
        <View className="w-20 h-20 bg-[#7A0000] rounded-full justify-center items-center mb-4 shadow-lg">
          <Text className="text-white text-2xl font-bold">UNILAG</Text>
        </View>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="text-slate-300 font-semibold text-sm mt-4">
          Verifying UnilagStay Session...
        </Text>
      </View>
    );
  }

  // When user is not authenticated, render AuthNavigator (Login Screen)
  if (!isAuthenticated || !activeRole) {
    return <AuthNavigator />;
  }

  // Render isolated role-based navigation tree based on active user role
  switch (activeRole) {
    case 'STUDENT':
      return <StudentNavigator />;

    case 'PORTER':
      return <PorterNavigator />;

    case 'WARDEN':
    case 'ADMIN':
      return <WardenNavigator />;

    case 'MAINTENANCE':
      return <MaintenanceNavigator />;

    default:
      return <AuthNavigator />;
  }
};
