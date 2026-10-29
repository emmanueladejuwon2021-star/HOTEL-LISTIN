import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { WardenStackParamList } from './types';
import { useAuthStore } from '../store/useAuthStore';
import { DisciplinaryManagementScreen } from '../screens/DisciplinaryManagementScreen';

const Stack = createNativeStackNavigator<WardenStackParamList>();

type WardenDashboardProps = NativeStackScreenProps<WardenStackParamList, 'WardenDashboard'>;

/**
 * WardenDashboardScreen Component.
 * Executive overview dashboard for Hall Wardens and Student Affairs Division officials.
 * Allows clearance document approval, exeat requests processing, and disciplinary flag governance.
 */
const WardenDashboardScreen: React.FC<WardenDashboardProps> = ({ navigation }) => {
  const { session, logoutUser } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Top Executive Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-2xl font-bold text-[#7A0000]">HALL WARDEN DASHBOARD</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Student Clearance Review, Occupancy Metrics & Disciplinary Governance
          </Text>
          <Text className="text-slate-700 text-xs mt-3 font-semibold">
            Warden: {session?.user.fullName} ({session?.user.email})
          </Text>
        </View>

        {/* Operational Overview Cards */}
        <View className="space-y-4 mb-6">
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Hall Occupancy Overview
            </Text>
            <Text className="text-3xl font-extrabold text-emerald-800">92% Capacity</Text>
            <Text className="text-xs text-slate-500 mt-1">1,104 of 1,200 beds allocated and verified</Text>
          </View>

          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pending Clearance Submissions
            </Text>
            <Text className="text-3xl font-extrabold text-amber-600">14 Packages</Text>
            <Text className="text-xs text-slate-500 mt-1">Awaiting Warden document inspection and certificate hash issuance</Text>
          </View>

          {/* Disciplinary Governance Navigation CTA */}
          <TouchableOpacity
            className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm active:bg-red-50"
            onPress={() => navigation.navigate('DisciplinaryManagement')}
          >
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs font-bold text-red-600 uppercase tracking-wider">
                Disciplinary Governance & Blacklists
              </Text>
              <Text className="text-xs font-extrabold text-[#7A0000]">Manage →</Text>
            </View>
            <Text className="text-2xl font-extrabold text-[#7A0000]">Disciplinary Control</Text>
            <Text className="text-xs text-slate-500 mt-1">
              Flag rule infractions, suspend students, and manage hall blacklists
            </Text>
          </TouchableOpacity>

          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Overnight Exeat Requests
            </Text>
            <Text className="text-3xl font-extrabold text-blue-700">6 Requests</Text>
            <Text className="text-xs text-slate-500 mt-1">Pending single-tap warden departure permission</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md active:opacity-90"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Warden Portal)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

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
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen
        name="WardenDashboard"
        component={WardenDashboardScreen}
        options={{ title: 'Warden Executive Portal' }}
      />
      <Stack.Screen
        name="DisciplinaryManagement"
        component={DisciplinaryManagementScreen}
        options={{ title: 'Disciplinary Governance' }}
      />
    </Stack.Navigator>
  );
};
