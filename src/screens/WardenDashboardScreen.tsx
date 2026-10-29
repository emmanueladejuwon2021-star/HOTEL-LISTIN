import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useWardenStore } from '../store/useWardenStore';

/**
 * WardenDashboardScreen Component.
 * Executive overview dashboard for Hall Wardens and Student Affairs Division officials.
 * Provides real-time occupancy metric cards, action queue summary badges,
 * pending clearance document package reviews, and single-tap exeat permission processing.
 *
 * Styled using NativeWind (Tailwind CSS) conforming strictly to PRD Section 6 (W-01: Warden Executive Dashboard).
 */
export const WardenDashboardScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();
  const {
    occupancyMetrics,
    queueSummary,
    pendingClearances,
    pendingExeats,
    isLoading,
    errorMessage,
    successMessage,
    fetchDashboardData,
    reviewClearance,
    reviewExeat,
    clearMessages
  } = useWardenStore();

  const [refreshing, setRefreshing] = useState(false);
  const wardenId = session?.user.id || 'warden_default_id';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const primaryMetric = occupancyMetrics[0] || {
    hostelName: 'King Jaja Hall',
    occupiedBedspaces: 1104,
    totalBedspaces: 1200,
    occupancyPercentage: 92
  };

  const handleApproveClearance = async (userId: string, studentName: string) => {
    Alert.alert(
      'Approve Student Clearance',
      `Are you sure you want to approve clearance for ${studentName}? This will issue an official digital certificate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Clearance',
          style: 'default',
          onPress: async () => {
            await reviewClearance(userId, wardenId, 'APPROVED');
          }
        }
      ]
    );
  };

  const handleRejectClearance = async (userId: string, studentName: string) => {
    Alert.alert(
      'Reject Student Clearance',
      `Are you sure you want to reject clearance for ${studentName}? Feedback will be sent to the student to re-upload documents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject Clearance',
          style: 'destructive',
          onPress: async () => {
            await reviewClearance(userId, wardenId, 'REJECTED', 'Missing or illegible document scan.');
          }
        }
      ]
    );
  };

  const handleApproveExeat = async (exeatId: string, studentName: string) => {
    Alert.alert(
      'Approve Exeat Request',
      `Approve overnight departure permission for ${studentName}? Gate scanners will grant passage during curfew hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Exeat',
          style: 'default',
          onPress: async () => {
            await reviewExeat(exeatId, wardenId, 'APPROVED');
          }
        }
      ]
    );
  };

  const handleDeclineExeat = async (exeatId: string, studentName: string) => {
    Alert.alert(
      'Decline Exeat Request',
      `Decline overnight exeat permission for ${studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline Exeat',
          style: 'destructive',
          onPress: async () => {
            await reviewExeat(exeatId, wardenId, 'DECLINED', 'Hostel exeat quota exceeded.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Top Executive Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-2xl font-extrabold text-[#7A0000]">WARDEN EXECUTIVE PORTAL</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Student Clearance Review, Hall Occupancy Metrics & Exeat Governance
          </Text>
          <Text className="text-slate-800 text-xs mt-3 font-semibold">
            Warden: {session?.user.fullName || 'Hall Warden'} ({session?.user.email || 'warden@unilag.edu.ng'})
          </Text>
        </View>

        {/* Feedback Banners */}
        {errorMessage ? (
          <TouchableOpacity
            className="bg-red-100 border border-red-300 p-4 rounded-xl mb-4"
            onPress={clearMessages}
          >
            <Text className="text-red-900 font-bold text-xs">{errorMessage}</Text>
          </TouchableOpacity>
        ) : null}

        {successMessage ? (
          <TouchableOpacity
            className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl mb-4"
            onPress={clearMessages}
          >
            <Text className="text-emerald-900 font-bold text-xs">{successMessage}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Occupancy Metric Card (PRD W-01 Spec) */}
        <View className="bg-emerald-800 text-white p-6 rounded-3xl mb-4 shadow-md">
          <Text className="text-emerald-200 text-xs uppercase font-bold tracking-wider mb-1">
            Hall Occupancy Progress
          </Text>
          <Text className="text-white text-3xl font-extrabold mb-1">
            {primaryMetric.occupancyPercentage}% Occupied
          </Text>
          <Text className="text-emerald-100 text-xs">
            {primaryMetric.occupiedBedspaces} of {primaryMetric.totalBedspaces} total bedspaces allocated & verified
          </Text>
          <View className="w-full bg-emerald-950 h-3 rounded-full mt-4 overflow-hidden">
            <View
              className="bg-emerald-400 h-full rounded-full"
              style={{ width: `${Math.min(100, primaryMetric.occupancyPercentage)}%` }}
            />
          </View>
        </View>

        {/* Action Queue Summary Badges (PRD W-01 Spec) */}
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Action Queue Summary
        </Text>
        <View className="flex-row space-x-2 mb-6">
          <View className="flex-1 bg-amber-500 p-3 rounded-2xl items-center justify-center">
            <Text className="text-white text-2xl font-black">{queueSummary.pendingClearancesCount}</Text>
            <Text className="text-slate-900 text-[10px] font-bold uppercase text-center mt-1">
              Pending Clearances
            </Text>
          </View>

          <View className="flex-1 bg-blue-600 p-3 rounded-2xl items-center justify-center">
            <Text className="text-white text-2xl font-black">{queueSummary.pendingExeatsCount}</Text>
            <Text className="text-white text-[10px] font-bold uppercase text-center mt-1">
              Exeat Requests
            </Text>
          </View>

          <View className="flex-1 bg-red-600 p-3 rounded-2xl items-center justify-center">
            <Text className="text-white text-2xl font-black">{queueSummary.openSosAlertsCount}</Text>
            <Text className="text-white text-[10px] font-bold uppercase text-center mt-1">
              SOS Alerts
            </Text>
          </View>
        </View>

        {/* Pending Clearance Document Submissions Section */}
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-slate-200">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold text-slate-800">Pending Clearance Reviews</Text>
            <View className="bg-amber-100 px-2 py-1 rounded-full">
              <Text className="text-amber-800 text-[10px] font-bold">
                {pendingClearances.length} Awaiting Inspection
              </Text>
            </View>
          </View>

          {isLoading && pendingClearances.length === 0 ? (
            <ActivityIndicator size="small" color="#7A0000" className="py-4" />
          ) : pendingClearances.length === 0 ? (
            <Text className="text-slate-400 text-xs py-3 text-center">
              No pending student clearance document packages awaiting review.
            </Text>
          ) : (
            pendingClearances.map((item) => (
              <View
                key={item.userId}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-sm font-bold text-slate-900">{item.fullName}</Text>
                    <Text className="text-xs text-slate-500">{item.matricNo} • {item.department}</Text>
                    <Text className="text-xs text-slate-500 font-medium mt-1">{item.hostelName} ({item.roomNumber})</Text>
                  </View>
                  <View className="bg-emerald-100 px-2.5 py-1 rounded-md">
                    <Text className="text-emerald-800 text-[10px] font-bold">
                      {item.documentCount}/3 Verified Docs
                    </Text>
                  </View>
                </View>

                {/* Review Action Buttons */}
                <View className="flex-row space-x-2 mt-3">
                  <TouchableOpacity
                    className="flex-1 bg-emerald-700 py-2.5 rounded-xl items-center"
                    onPress={() => handleApproveClearance(item.userId, item.fullName)}
                  >
                    <Text className="text-white text-xs font-bold">Approve Clearance</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-red-700 py-2.5 rounded-xl items-center"
                    onPress={() => handleRejectClearance(item.userId, item.fullName)}
                  >
                    <Text className="text-white text-xs font-bold">Reject Package</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Overnight Exeat Departure Requests Section */}
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-slate-200">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold text-slate-800">Overnight Exeat Permission Queue</Text>
            <View className="bg-blue-100 px-2 py-1 rounded-full">
              <Text className="text-blue-800 text-[10px] font-bold">
                {pendingExeats.length} Exeat Requests
              </Text>
            </View>
          </View>

          {isLoading && pendingExeats.length === 0 ? (
            <ActivityIndicator size="small" color="#7A0000" className="py-4" />
          ) : pendingExeats.length === 0 ? (
            <Text className="text-slate-400 text-xs py-3 text-center">
              No overnight exeat departure permissions currently pending review.
            </Text>
          ) : (
            pendingExeats.map((exeat) => (
              <View
                key={exeat.exeatId}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3"
              >
                <Text className="text-sm font-bold text-slate-900">{exeat.studentName}</Text>
                <Text className="text-xs text-slate-500 mb-1">{exeat.matricNo} • {exeat.roomNumber}</Text>

                <View className="bg-white p-2.5 rounded-lg border border-slate-200 my-2">
                  <Text className="text-xs font-semibold text-slate-700">
                    Destination: {exeat.destinationAddress}
                  </Text>
                  <Text className="text-xs text-slate-600 mt-0.5">
                    Reason: {exeat.reason}
                  </Text>
                  <Text className="text-[11px] text-blue-700 font-medium mt-1">
                    Dates: {exeat.departureDate} to {exeat.returnDate}
                  </Text>
                </View>

                {/* Single-Tap Exeat Action Buttons */}
                <View className="flex-row space-x-2 mt-2">
                  <TouchableOpacity
                    className="flex-1 bg-emerald-600 py-2.5 rounded-xl items-center"
                    onPress={() => handleApproveExeat(exeat.exeatId, exeat.studentName)}
                  >
                    <Text className="text-white text-xs font-bold">Approve Exeat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-slate-700 py-2.5 rounded-xl items-center"
                    onPress={() => handleDeclineExeat(exeat.exeatId, exeat.studentName)}
                  >
                    <Text className="text-white text-xs font-bold">Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md my-4 active:opacity-90"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Warden Portal)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
