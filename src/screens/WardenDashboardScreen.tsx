import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WardenStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { useWardenStore } from '../store/useWardenStore';

type WardenNavProp = NativeStackNavigationProp<WardenStackParamList, 'WardenDashboard'>;

/**
 * WardenDashboardScreen Component.
 * Implements Section 6 `W-01: Warden Executive Dashboard` from PRD.md.
 * Displays live hostel occupancy metrics, action badge counts, recent activity logs,
 * and quick access buttons to the Approval Queue.
 */
export const WardenDashboardScreen: React.FC = () => {
  const navigation = useNavigation<WardenNavProp>();
  const { session, logoutUser } = useAuthStore();
  const {
    metrics,
    summary,
    activityLogs,
    isLoading,
    error,
    fetchDashboardData,
    clearFeedback
  } = useWardenStore();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const navigateToQueue = () => {
    navigation.navigate('ApprovalQueue');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView
        contentContainerClassName="p-4 pb-12"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#7A0000" />
        }
      >
        {/* Top Executive Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-2xl font-bold text-[#7A0000]">HALL WARDEN DASHBOARD</Text>
              <Text className="text-slate-500 text-xs mt-1">
                Student Clearance Review, Occupancy Metrics & Disciplinary Governance
              </Text>
            </View>
            <TouchableOpacity
              className="bg-red-100 px-3 py-2 rounded-lg border border-red-200"
              onPress={logoutUser}
            >
              <Text className="text-red-800 text-xs font-bold">Sign Out</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-700 text-xs mt-3 font-semibold">
            Official: {session?.user.fullName || 'Dr. Warden'} ({session?.user.email || 'warden@unilag.edu.ng'})
          </Text>
        </View>

        {/* Error Feedback Banner */}
        {error ? (
          <View className="bg-red-100 border border-red-300 p-4 rounded-xl mb-4 flex-row items-center justify-between">
            <Text className="text-red-900 text-xs flex-1 pr-2">{error}</Text>
            <TouchableOpacity onPress={clearFeedback}>
              <Text className="text-red-700 text-xs font-bold">Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* PRD W-01: Occupancy Metric Card (Progress Ring/Bar Spec: bg-emerald-800 text-white p-6 rounded-3xl mb-4) */}
        <View className="bg-emerald-800 text-white p-6 rounded-3xl mb-4 shadow-md">
          <Text className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1">
            {metrics?.hostelName || 'King Jaja Hall'} Occupancy
          </Text>

          <View className="flex-row items-baseline justify-between mt-2">
            <Text className="text-4xl font-extrabold text-white">
              {metrics ? `${metrics.occupancyRatePercentage}%` : '92%'}
            </Text>
            <Text className="text-emerald-100 text-sm font-semibold">
              {metrics ? `${metrics.occupiedBeds} / ${metrics.totalCapacity} Beds Occupied` : '1,104 / 1,200 Beds Occupied'}
            </Text>
          </View>

          {/* Progress Bar Visual Indicator */}
          <View className="w-full bg-emerald-950/50 h-3.5 rounded-full mt-4 overflow-hidden border border-emerald-700/50">
            <View
              className="bg-emerald-400 h-full rounded-full"
              style={{ width: `${metrics?.occupancyRatePercentage || 92}%` }}
            />
          </View>

          <View className="flex-row justify-between mt-3 text-xs text-emerald-200">
            <Text className="text-emerald-200 text-xs font-medium">
              Available Beds: {metrics?.availableBeds ?? 96}
            </Text>
            <Text className="text-emerald-200 text-xs font-medium">
              Pending Allocations: {metrics?.pendingAllocations ?? 0}
            </Text>
          </View>
        </View>

        {/* PRD W-01: Action Queue Summary Cards */}
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Action Queue & Priority Alerts
        </Text>

        <View className="flex-row space-x-2 mb-6">
          {/* Pending Clearances Card */}
          <TouchableOpacity
            className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm items-center justify-center active:bg-amber-50"
            onPress={navigateToQueue}
          >
            <Text className="text-2xl font-black text-amber-600">
              {summary ? summary.pendingClearanceCount : 0}
            </Text>
            <Text className="text-[11px] font-bold text-slate-700 text-center mt-1">
              Pending Clearances
            </Text>
            <Text className="text-[9px] text-slate-400 text-center mt-0.5">Tap to Review</Text>
          </TouchableOpacity>

          {/* Exeat Requests Card */}
          <TouchableOpacity
            className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm items-center justify-center active:bg-blue-50"
            onPress={navigateToQueue}
          >
            <Text className="text-2xl font-black text-blue-700">
              {summary ? summary.pendingExeatCount : 0}
            </Text>
            <Text className="text-[11px] font-bold text-slate-700 text-center mt-1">
              Exeat Requests
            </Text>
            <Text className="text-[9px] text-slate-400 text-center mt-0.5">Tap to Process</Text>
          </TouchableOpacity>

          {/* SOS Emergency Alerts Card */}
          <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm items-center justify-center">
            <Text className="text-2xl font-black text-red-600">
              {summary ? summary.openEmergencySosCount : 0}
            </Text>
            <Text className="text-[11px] font-bold text-slate-700 text-center mt-1">
              SOS Alerts
            </Text>
            <Text className="text-[9px] text-slate-400 text-center mt-0.5">Active Incidents</Text>
          </View>
        </View>

        {/* Main Action Button to Open Approval Queue */}
        <TouchableOpacity
          className="bg-[#7A0000] py-4 rounded-2xl items-center shadow-sm mb-6 flex-row justify-center space-x-2 active:opacity-90"
          onPress={navigateToQueue}
        >
          <Text className="text-white text-base font-bold">Open Warden Approval Queue</Text>
        </TouchableOpacity>

        {/* PRD W-01: Recent Activity Log */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <Text className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Recent Administrative Activity Log
          </Text>

          {isLoading ? (
            <ActivityIndicator size="small" color="#7A0000" className="py-4" />
          ) : activityLogs && activityLogs.length > 0 ? (
            activityLogs.map((log) => (
              <View key={log.id} className="py-2.5 border-b border-slate-100 last:border-b-0">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-slate-800">
                    {log.targetStudentName} ({log.actionType.replace('_', ' ')})
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text className="text-xs text-slate-600 mt-1">{log.details}</Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">By: {log.actorName}</Text>
              </View>
            ))
          ) : (
            <View className="py-4 items-center">
              <Text className="text-xs text-slate-500 italic">
                No recent administrative activity logged today.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
