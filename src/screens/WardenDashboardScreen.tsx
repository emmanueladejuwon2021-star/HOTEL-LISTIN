import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useWardenStore } from '../store/useWardenStore';
import { ApprovalCategory, WardenQueueItem } from '../types/warden';

/**
 * WardenDashboardScreen Component.
 * Executive overview dashboard for Hall Wardens and Student Affairs Division officials.
 * Implements [ADMIN-01] conforming strictly to Section 6 (W-01: Warden Executive Dashboard) of PRD.md.
 */
export const WardenDashboardScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();
  const {
    metrics,
    queue,
    isLoading,
    isProcessing,
    error,
    successMessage,
    fetchOccupancyMetrics,
    fetchPendingQueue,
    processAction,
    clearStatusMessages
  } = useWardenStore();

  const [activeTab, setActiveTab] = useState<'ALL' | ApprovalCategory>('ALL');
  const [rejectionNotes, setRejectionNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchOccupancyMetrics();
    fetchPendingQueue();
  }, []);

  const wardenId = session?.user.id || 'usr_warden_default';

  const handleApprove = async (item: WardenQueueItem) => {
    const success = await processAction({
      itemId: item.id,
      category: item.category,
      action: 'APPROVE',
      wardenId
    });
    if (success) {
      Alert.alert('Approved', `Request for ${item.studentName} has been approved.`);
    }
  };

  const handleReject = async (item: WardenQueueItem) => {
    const note = rejectionNotes[item.id] || '';
    if (!note.trim() && item.category === 'CLEARANCE') {
      Alert.alert('Note Required', 'Please type a reason/remark for rejecting clearance.');
      return;
    }
    const success = await processAction({
      itemId: item.id,
      category: item.category,
      action: 'REJECT',
      wardenId,
      notes: note
    });
    if (success) {
      Alert.alert('Rejected', `Request for ${item.studentName} has been declined.`);
    }
  };

  const filteredQueue = queue.filter(item => {
    if (activeTab === 'ALL') return true;
    return item.category === activeTab;
  });

  const clearanceCount = queue.filter(i => i.category === 'CLEARANCE').length;
  const exeatCount = queue.filter(i => i.category === 'EXEAT').length;
  const sosCount = queue.filter(i => i.category === 'EMERGENCY_SOS').length;

  return (
    <SafeAreaView className="bg-slate-100 flex-1 p-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Header Title Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-2xl font-bold text-[#7A0000]">HALL WARDEN DASHBOARD</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Student Clearance Review, Occupancy Metrics & Disciplinary Governance
          </Text>
          <Text className="text-slate-700 text-xs mt-2 font-semibold">
            Warden: {session?.user.fullName} ({session?.user.email})
          </Text>
        </View>

        {/* Status Alerts */}
        {error && (
          <View className="bg-red-100 border border-red-300 p-3 rounded-xl mb-4">
            <Text className="text-red-800 text-xs font-semibold">{error}</Text>
          </View>
        )}
        {successMessage && (
          <View className="bg-emerald-100 border border-emerald-300 p-3 rounded-xl mb-4">
            <Text className="text-emerald-800 text-xs font-semibold">{successMessage}</Text>
          </View>
        )}

        {/* Occupancy Metric Card (PRD W-01 Spec: bg-emerald-800 text-white p-6 rounded-3xl mb-4) */}
        <View className="bg-emerald-800 text-white p-6 rounded-3xl mb-4 shadow-md">
          <Text className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1">
            {metrics?.hostelName || 'King Jaja Hall'} Occupancy
          </Text>
          <Text className="text-4xl font-extrabold text-white">
            {metrics ? `${metrics.occupancyPercentage}% Capacity` : '92% Capacity'}
          </Text>
          <Text className="text-xs text-emerald-100 mt-2 font-medium">
            {metrics
              ? `${metrics.allocatedBeds} of ${metrics.totalBeds} beds allocated (${metrics.reservedBeds} reserved, ${metrics.vacantBeds} vacant)`
              : '1,104 of 1,200 beds allocated and verified'}
          </Text>
        </View>

        {/* Action Queue Summary Badges (PRD W-01 Spec: grid grid-cols-3 gap-3 mb-6) */}
        <View className="flex-row gap-2 mb-6">
          <TouchableOpacity
            className={`flex-1 p-3 rounded-2xl items-center ${activeTab === 'CLEARANCE' ? 'bg-amber-600' : 'bg-white border border-slate-200'}`}
            onPress={() => setActiveTab(activeTab === 'CLEARANCE' ? 'ALL' : 'CLEARANCE')}
          >
            <Text className={`text-xl font-bold ${activeTab === 'CLEARANCE' ? 'text-white' : 'text-amber-600'}`}>
              {clearanceCount}
            </Text>
            <Text className={`text-[10px] font-semibold text-center mt-1 ${activeTab === 'CLEARANCE' ? 'text-white' : 'text-slate-600'}`}>
              Clearances
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-3 rounded-2xl items-center ${activeTab === 'EXEAT' ? 'bg-blue-700' : 'bg-white border border-slate-200'}`}
            onPress={() => setActiveTab(activeTab === 'EXEAT' ? 'ALL' : 'EXEAT')}
          >
            <Text className={`text-xl font-bold ${activeTab === 'EXEAT' ? 'text-white' : 'text-blue-700'}`}>
              {exeatCount}
            </Text>
            <Text className={`text-[10px] font-semibold text-center mt-1 ${activeTab === 'EXEAT' ? 'text-white' : 'text-slate-600'}`}>
              Exeats
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-3 rounded-2xl items-center ${activeTab === 'EMERGENCY_SOS' ? 'bg-red-700' : 'bg-white border border-slate-200'}`}
            onPress={() => setActiveTab(activeTab === 'EMERGENCY_SOS' ? 'ALL' : 'EMERGENCY_SOS')}
          >
            <Text className={`text-xl font-bold ${activeTab === 'EMERGENCY_SOS' ? 'text-white' : 'text-red-700'}`}>
              {sosCount}
            </Text>
            <Text className={`text-[10px] font-semibold text-center mt-1 ${activeTab === 'EMERGENCY_SOS' ? 'text-white' : 'text-slate-600'}`}>
              SOS Alerts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity / Action Queue Section (PRD W-01 Spec: bg-white p-4 rounded-2xl shadow-sm) */}
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-bold text-slate-800">Warden Approval Queue</Text>
            {isLoading && <ActivityIndicator size="small" color="#7A0000" />}
          </View>

          {filteredQueue.length === 0 ? (
            <View className="p-6 items-center">
              <Text className="text-slate-400 text-sm">No pending approval requests in this category.</Text>
            </View>
          ) : (
            filteredQueue.map(item => (
              <View key={item.id} className="border border-slate-200 rounded-xl p-4 mb-3 bg-slate-50">
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="font-bold text-slate-900 text-sm">{item.studentName}</Text>
                    <Text className="text-slate-500 text-xs">{item.studentMatricNo} • {item.hostelName}</Text>
                  </View>
                  <View className={`px-2 py-1 rounded-md ${
                    item.category === 'CLEARANCE' ? 'bg-amber-100' :
                    item.category === 'EXEAT' ? 'bg-blue-100' : 'bg-red-100'
                  }`}>
                    <Text className={`text-[10px] font-bold ${
                      item.category === 'CLEARANCE' ? 'text-amber-800' :
                      item.category === 'EXEAT' ? 'text-blue-800' : 'text-red-800'
                    }`}>
                      {item.category}
                    </Text>
                  </View>
                </View>

                <Text className="text-slate-700 text-xs mb-3">{item.details}</Text>

                {item.category === 'CLEARANCE' && (
                  <TextInput
                    className="bg-white border border-slate-300 rounded-lg p-2 text-xs mb-3 text-slate-800"
                    placeholder="Optional remarks/notes for student..."
                    value={rejectionNotes[item.id] || ''}
                    onChangeText={text => setRejectionNotes(prev => ({ ...prev, [item.id]: text }))}
                  />
                )}

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 bg-emerald-700 py-2.5 rounded-lg items-center"
                    onPress={() => handleApprove(item)}
                    disabled={isProcessing}
                  >
                    <Text className="text-white text-xs font-bold">Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-red-700 py-2.5 rounded-lg items-center"
                    onPress={() => handleReject(item)}
                    disabled={isProcessing}
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
          className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md active:opacity-90"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Warden Portal)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
