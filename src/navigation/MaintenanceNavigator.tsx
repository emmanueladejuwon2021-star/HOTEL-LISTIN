import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaintenanceStackParamList } from './types';
import { useAuthStore } from '../store/useAuthStore';

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

/**
 * ArtisanQueueScreen Component.
 * Work queue interface for university maintenance artisans (Plumbers, Electricians, Carpenters).
 * Displays open defect tickets, room numbers, student issue photos, and proof-of-completion upload triggers.
 */
const ArtisanQueueScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Title Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-2xl font-bold text-amber-800">ARTISAN WORK QUEUE</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Hostel Facility Maintenance & Defect Resolution Dispatch
          </Text>
          <Text className="text-slate-700 text-xs mt-3 font-semibold">
            Artisan: {session?.user.fullName} ({session?.user.matricOrStaffNo})
          </Text>
        </View>

        {/* Assigned Ticket Queue Cards */}
        <View className="space-y-4 mb-6">
          <View className="bg-white p-5 rounded-2xl border-l-4 border-amber-500 shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-bold text-slate-900">King Jaja Hall — Room 204</Text>
              <View className="bg-amber-100 px-2.5 py-0.5 rounded-full">
                <Text className="text-amber-800 text-[10px] font-bold">PLUMBING</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-600 mb-3">Leaking washroom tap fixture requiring washer replacement.</Text>
            <TouchableOpacity className="bg-amber-600 py-2.5 rounded-xl items-center active:opacity-90">
              <Text className="text-white text-xs font-bold">Start Job & Upload Fix Photo</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white p-5 rounded-2xl border-l-4 border-rose-500 shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-bold text-slate-900">Moremi Hall — Room 112</Text>
              <View className="bg-rose-100 px-2.5 py-0.5 rounded-full">
                <Text className="text-rose-800 text-[10px] font-bold">ELECTRICAL</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-600 mb-3">Ceiling fan regulator short circuit. High priority response.</Text>
            <TouchableOpacity className="bg-rose-700 py-2.5 rounded-xl items-center active:opacity-90">
              <Text className="text-white text-xs font-bold">Start Job & Upload Fix Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-slate-800 py-4 rounded-xl items-center shadow-md active:opacity-90"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Maintenance Dispatch)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

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
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen
        name="ArtisanQueue"
        component={ArtisanQueueScreen}
        options={{ title: 'Artisan Repair Queue' }}
      />
    </Stack.Navigator>
  );
};
