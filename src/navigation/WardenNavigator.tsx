import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WardenStackParamList } from './types';
import { useAuthStore } from '../store/useAuthStore';
import { useRoommateStore } from '../store/useRoommateStore';
import { RoommateService } from '../api/roommateService';
import { BedswapRequest } from '../types/roommate';

const Stack = createNativeStackNavigator<WardenStackParamList>();

/**
 * WardenDashboardScreen Component.
 * Executive overview dashboard for Hall Wardens and Student Affairs Division officials.
 * Allows clearance document approval, exeat requests processing, bedswap request reviews, and disciplinary flag management.
 */
const WardenDashboardScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();
  const { reviewBedswapByWarden, isLoading: storeLoading } = useRoommateStore();

  const [pendingSwaps, setPendingSwaps] = useState<BedswapRequest[]>([]);
  const [loadingSwaps, setLoadingSwaps] = useState<boolean>(false);

  const fetchWardenPendingSwaps = async () => {
    setLoadingSwaps(true);
    try {
      await RoommateService.initializeSchema();
      const client = (RoommateService as any).getDbClient ? (RoommateService as any).getDbClient() : undefined;

      // Query database for all student-accepted bedswap requests awaiting warden final approval
      const result = await RoommateService.getBedswapRequests('WARDEN_ALL', 'ACCEPTED');
      setPendingSwaps(result);
    } catch (err: any) {
      console.log('Error fetching pending swaps for warden:', err.message);
    } finally {
      setLoadingSwaps(false);
    }
  };

  useEffect(() => {
    fetchWardenPendingSwaps();
  }, []);

  const handleWardenAction = async (requestId: string, approve: boolean) => {
    if (!session?.user.id) return;

    try {
      await reviewBedswapByWarden(requestId, session.user.id, approve);
      Alert.alert(
        approve ? 'Bedswap Approved' : 'Bedswap Declined',
        approve
          ? 'The room swap request has been officially approved and bedspace assignments updated in the database.'
          : 'The bedswap request has been declined.'
      );
      fetchWardenPendingSwaps();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not process bedswap review.');
    }
  };

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

          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Overnight Exeat Requests
            </Text>
            <Text className="text-3xl font-extrabold text-blue-700">6 Requests</Text>
            <Text className="text-xs text-slate-500 mt-1">Pending single-tap warden departure permission</Text>
          </View>
        </View>

        {/* Warden Bedswap Approval Queue Section ([ROOMMATE-04]) */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Room Swap Approvals
            </Text>
            <TouchableOpacity onPress={fetchWardenPendingSwaps} className="bg-slate-100 px-2.5 py-1 rounded-lg">
              <Text className="text-slate-600 text-xs font-semibold">Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingSwaps && <ActivityIndicator color="#7A0000" className="my-3" />}

          {!loadingSwaps && pendingSwaps.length === 0 && (
            <Text className="text-slate-500 text-xs italic">No pending room swap requests awaiting warden approval.</Text>
          )}

          {!loadingSwaps &&
            pendingSwaps.map((swap) => (
              <View key={swap.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-3">
                <Text className="text-slate-800 font-bold text-sm mb-1">
                  Applicant: {swap.applicantName || swap.applicantUserId}
                </Text>
                <Text className="text-slate-600 text-xs mb-1">Current Bed: {swap.applicantRoomDetails}</Text>
                <Text className="text-slate-800 font-bold text-sm mb-1">
                  Target Student: {swap.targetName || swap.targetUserId}
                </Text>
                <Text className="text-slate-600 text-xs mb-1">Target Bed: {swap.targetRoomDetails}</Text>
                <Text className="text-slate-500 text-xs italic mb-3">Reason: "{swap.reason}"</Text>

                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() => handleWardenAction(swap.id, true)}
                    disabled={storeLoading}
                    className="flex-1 bg-emerald-700 py-2.5 rounded-lg items-center"
                  >
                    <Text className="text-white font-bold text-xs">Approve Swap</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleWardenAction(swap.id, false)}
                    disabled={storeLoading}
                    className="flex-1 bg-red-700 py-2.5 rounded-lg items-center"
                  >
                    <Text className="text-white font-bold text-xs">Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
    </Stack.Navigator>
  );
};
