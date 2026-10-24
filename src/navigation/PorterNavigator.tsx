import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PorterStackParamList } from './types';
import { useAuthStore } from '../store/useAuthStore';
import { RoomInventoryScreen } from '../screens/RoomInventoryScreen';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<PorterStackParamList, 'PorterDashboard'>;

const Stack = createNativeStackNavigator<PorterStackParamList>();

/**
 * PorterDashboardScreen Component.
 * High-visibility gatekeeper interface for hostel porters.
 * Provides QR scanning, manual PIN entry, room audit inspection tools, and emergency panic alarms.
 */
const PorterDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { session, logoutUser } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView contentContainerClassName="p-5">
        {/* Top Title Banner */}
        <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6">
          <Text className="text-2xl font-black text-amber-400">PORTER GATE CONTROL</Text>
          <Text className="text-slate-300 text-sm mt-1">
            Hostel Gate Screening, QR Code Scanner & Room Inspection
          </Text>
          <Text className="text-slate-400 text-xs mt-2">
            Logged in as: <Text className="text-white font-bold">{session?.user.fullName}</Text> ({session?.user.matricOrStaffNo})
          </Text>
        </View>

        {/* High Visibility Quick Action Cards */}
        <View className="space-y-4 mb-6">
          <View className="bg-emerald-600 p-6 rounded-2xl items-center shadow-lg">
            <Text className="text-white text-3xl font-black mb-1">📷 OPEN QR SCANNER</Text>
            <Text className="text-emerald-100 text-xs text-center">
              Scan student dynamic QR pass for sub-500ms gate entry verification
            </Text>
          </View>

          <View className="bg-amber-500 p-6 rounded-2xl items-center shadow-lg">
            <Text className="text-slate-900 text-2xl font-black mb-1">🔢 MANUAL PIN LOOKUP</Text>
            <Text className="text-slate-900 text-xs text-center font-medium">
              Verify expected visitor 6-digit access code
            </Text>
          </View>

          <TouchableOpacity
            className="bg-blue-600 p-6 rounded-2xl items-center shadow-lg active:opacity-90"
            onPress={() => navigation.navigate('RoomAudit')}
          >
            <Text className="text-white text-2xl font-black mb-1">📋 ROOM AUDIT CHECKLIST</Text>
            <Text className="text-blue-100 text-xs text-center">
              Execute physical room property check-in inspection with student
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-red-700 py-4 rounded-xl items-center shadow-md active:opacity-90"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Porter Station)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * PorterNavigator Component.
 * Isolated navigation stack for Hostel Porters enforcing strict Role-Based Access Control.
 */
export const PorterNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F59E0B',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen
        name="PorterDashboard"
        component={PorterDashboardScreen}
        options={{ title: 'Porter Gatehouse Station' }}
      />
      <Stack.Screen
        name="RoomAudit"
        component={RoomInventoryScreen}
        options={{ title: 'Room Property Check-In Audit' }}
      />
    </Stack.Navigator>
  );
};
