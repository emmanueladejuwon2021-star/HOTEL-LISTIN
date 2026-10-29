import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useWardenStore } from '../store/useWardenStore';

/**
 * WardenDashboardScreen Component.
 * Executive Overview Dashboard for Hall Wardens and Student Affairs Division.
 * Features occupancy progress ring/percentage, action queue badge summary, clearance & exeat review queues, and recent activity logs.
 */
export const WardenDashboardScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();
  const {
    occupancyMetrics,
    actionQueueSummary,
    pendingClearances,
    pendingExeats,
    activityLogs,
    isLoading,
    error,
    successMessage,
    fetchDashboardData,
    reviewClearance,
    reviewExeat,
    clearStatusMessages,
  } = useWardenStore();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CLEARANCE_QUEUE' | 'EXEAT_QUEUE'>('OVERVIEW');
  const [reviewNote, setReviewNote] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleClearanceAction = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!session?.user.id) return;
    const success = await reviewClearance({
      userId,
      wardenId: session.user.id,
      status,
      notes: reviewNote || (status === 'APPROVED' ? 'Approved by Warden' : 'Rejected by Warden'),
    });
    if (success) {
      setReviewNote('');
    }
  };

  const handleExeatAction = async (exeatId: string, status: 'APPROVED' | 'DECLINED') => {
    if (!session?.user.id) return;
    const success = await reviewExeat({
      exeatId,
      wardenId: session.user.id,
      status,
      notes: reviewNote || (status === 'APPROVED' ? 'Exeat Granted' : 'Exeat Declined'),
    });
    if (success) {
      setReviewNote('');
    }
  };

  return (
    <SafeAreaView className="bg-slate-100 flex-1">
      <ScrollView contentContainerClassName="p-4">
        {/* Top Executive Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-2xl font-bold text-[#7A0000]">HALL WARDEN DASHBOARD</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Hostel Occupancy, Clearance Review & Overnight Exeat Governance
          </Text>
          <Text className="text-slate-700 text-xs mt-3 font-semibold">
            Warden: {session?.user.fullName} ({session?.user.email})
          </Text>
        </View>

        {/* Status Banners */}
        {error ? (
          <TouchableOpacity
            className="bg-red-100 border border-red-300 p-3 rounded-xl mb-4"
            onPress={clearStatusMessages}
          >
            <Text className="text-red-800 text-xs font-semibold">{error}</Text>
          </TouchableOpacity>
        ) : null}

        {successMessage ? (
          <TouchableOpacity
            className="bg-emerald-100 border border-emerald-300 p-3 rounded-xl mb-4"
            onPress={clearStatusMessages}
          >
            <Text className="text-emerald-800 text-xs font-semibold">{successMessage}</Text>
          </TouchableOpacity>
        ) : null}

        {/* PRD W-01: Occupancy Metric Card */}
        <View className="bg-emerald-800 text-white p-6 rounded-3xl mb-4 shadow-md">
          <Text className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            {occupancyMetrics?.hostelName || 'Hall Occupancy Rate'}
          </Text>
          <View className="flex-row items-baseline justify-between">
            <Text className="text-4xl font-extrabold text-white">
              {occupancyMetrics?.percentageOccupied || 0}% Occupied
            </Text>
            <Text className="text-emerald-200 text-xs">
              {occupancyMetrics?.occupiedBeds || 0} / {occupancyMetrics?.totalBeds || 0} Beds
            </Text>
          </View>
          <Text className="text-emerald-100 text-xs mt-3">
            Confirmed Allocations: {occupancyMetrics?.allocatedBeds || 0} | Vacant Beds:{' '}
            {occupancyMetrics?.vacantBeds || 0}
          </Text>
        </View>

        {/* PRD W-01: Action Queue Summary Badges */}
        <View className="flex-row space-x-2 mb-6">
          <TouchableOpacity
            className={`flex-1 p-3 rounded-2xl items-center border ${
              activeTab === 'CLEARANCE_QUEUE' ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-white border-slate-200'
            }`}
            onPress={() => setActiveTab('CLEARANCE_QUEUE')}
          >
            <Text
              className={`text-xl font-bold ${
                activeTab === 'CLEARANCE_QUEUE' ? 'text-white' : 'text-amber-600'
              }`}
            >
              {actionQueueSummary?.pendingClearancesCount || pendingClearances.length}
            </Text>
            <Text
              className={`text-[10px] font-semibold text-center mt-1 ${
                activeTab === 'CLEARANCE_QUEUE' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Pending Clearances
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-3 rounded-2xl items-center border ${
              activeTab === 'EXEAT_QUEUE' ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-white border-slate-200'
            }`}
            onPress={() => setActiveTab('EXEAT_QUEUE')}
          >
            <Text
              className={`text-xl font-bold ${
                activeTab === 'EXEAT_QUEUE' ? 'text-white' : 'text-blue-700'
              }`}
            >
              {actionQueueSummary?.pendingExeatCount || pendingExeats.length}
            </Text>
            <Text
              className={`text-[10px] font-semibold text-center mt-1 ${
                activeTab === 'EXEAT_QUEUE' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Exeat Requests
            </Text>
          </TouchableOpacity>

          <View className="flex-1 p-3 rounded-2xl items-center bg-white border border-slate-200">
            <Text className="text-xl font-bold text-red-600">
              {actionQueueSummary?.activeSosAlertsCount || 0}
            </Text>
            <Text className="text-[10px] font-semibold text-slate-600 text-center mt-1">
              Active SOS
            </Text>
          </View>
        </View>

        {/* View Toggle Tabs */}
        <View className="flex-row bg-slate-200 p-1 rounded-xl mb-4">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === 'OVERVIEW' ? 'bg-white shadow-xs' : ''
            }`}
            onPress={() => setActiveTab('OVERVIEW')}
          >
            <Text className="text-xs font-bold text-slate-700">Overview Log</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === 'CLEARANCE_QUEUE' ? 'bg-white shadow-xs' : ''
            }`}
            onPress={() => setActiveTab('CLEARANCE_QUEUE')}
          >
            <Text className="text-xs font-bold text-slate-700">Clearances</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === 'EXEAT_QUEUE' ? 'bg-white shadow-xs' : ''
            }`}
            onPress={() => setActiveTab('EXEAT_QUEUE')}
          >
            <Text className="text-xs font-bold text-slate-700">Exeat Requests</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-xs text-slate-500 mt-2">Updating Warden Dashboard...</Text>
          </View>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'OVERVIEW' && (
              <View className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-slate-200">
                <Text className="text-sm font-bold text-slate-800 mb-3">Recent Activity Log</Text>
                {activityLogs.length === 0 ? (
                  <Text className="text-xs text-slate-500 italic py-4 text-center">
                    No recent Warden activity recorded.
                  </Text>
                ) : (
                  activityLogs.map((log) => (
                    <View key={log.id} className="py-3 border-b border-slate-100">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-bold text-slate-800">{log.title}</Text>
                        <Text className="text-[10px] text-slate-400">{log.timestamp.substring(0, 10)}</Text>
                      </View>
                      <Text className="text-xs text-slate-600 mt-1">{log.description}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* CLEARANCE QUEUE TAB */}
            {activeTab === 'CLEARANCE_QUEUE' && (
              <View className="space-y-4 mb-6">
                <Text className="text-sm font-bold text-slate-800 mb-2">
                  Pending Clearance Review Queue ({pendingClearances.length})
                </Text>
                {pendingClearances.length === 0 ? (
                  <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
                    <Text className="text-xs text-slate-500 italic">
                      No clearance packages currently awaiting Warden review.
                    </Text>
                  </View>
                ) : (
                  pendingClearances.map((item) => (
                    <View
                      key={item.userId}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3"
                    >
                      <Text className="text-base font-bold text-slate-900">{item.studentName}</Text>
                      <Text className="text-xs text-slate-500 mb-2">
                        Matric: {item.matricNumber} • Level {item.level} ({item.department})
                      </Text>

                      <Text className="text-xs font-semibold text-slate-700 mb-2">
                        Uploaded Documents: Medical Cert, Passport Photo, Code of Conduct
                      </Text>

                      <TextInput
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mb-3 text-slate-800"
                        placeholder="Optional Warden review note or reason..."
                        value={reviewNote}
                        onChangeText={setReviewNote}
                      />

                      <View className="flex-row space-x-2">
                        <TouchableOpacity
                          className="flex-1 bg-emerald-700 py-3 rounded-xl items-center"
                          onPress={() => handleClearanceAction(item.userId, 'APPROVED')}
                        >
                          <Text className="text-white text-xs font-bold">Approve Clearance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          className="flex-1 bg-red-700 py-3 rounded-xl items-center"
                          onPress={() => handleClearanceAction(item.userId, 'REJECTED')}
                        >
                          <Text className="text-white text-xs font-bold">Reject Clearance</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* EXEAT QUEUE TAB */}
            {activeTab === 'EXEAT_QUEUE' && (
              <View className="space-y-4 mb-6">
                <Text className="text-sm font-bold text-slate-800 mb-2">
                  Pending Overnight Exeat Permission Requests ({pendingExeats.length})
                </Text>
                {pendingExeats.length === 0 ? (
                  <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
                    <Text className="text-xs text-slate-500 italic">
                      No overnight exeat requests currently awaiting Warden review.
                    </Text>
                  </View>
                ) : (
                  pendingExeats.map((item) => (
                    <View
                      key={item.exeatId}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3"
                    >
                      <Text className="text-base font-bold text-slate-900">{item.studentName}</Text>
                      <Text className="text-xs text-slate-500 mb-2">
                        Matric: {item.matricNumber} • Room: {item.roomNumber}
                      </Text>

                      <View className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-200">
                        <Text className="text-xs font-semibold text-slate-800 mb-1">
                          Destination: {item.destinationAddress}
                        </Text>
                        <Text className="text-xs text-slate-600 mb-1">Reason: {item.reason}</Text>
                        <Text className="text-[11px] text-slate-500">
                          Dates: {item.departureDate} to {item.returnDate}
                        </Text>
                      </View>

                      <TextInput
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mb-3 text-slate-800"
                        placeholder="Optional Warden remark for exeat permission..."
                        value={reviewNote}
                        onChangeText={setReviewNote}
                      />

                      <View className="flex-row space-x-2">
                        <TouchableOpacity
                          className="flex-1 bg-emerald-700 py-3 rounded-xl items-center"
                          onPress={() => handleExeatAction(item.exeatId, 'APPROVED')}
                        >
                          <Text className="text-white text-xs font-bold">Grant Exeat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          className="flex-1 bg-red-700 py-3 rounded-xl items-center"
                          onPress={() => handleExeatAction(item.exeatId, 'DECLINED')}
                        >
                          <Text className="text-white text-xs font-bold">Decline Exeat</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md active:opacity-90 mb-6"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Warden Portal)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
