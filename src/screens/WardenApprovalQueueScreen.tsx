import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  RefreshControl
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useWardenStore } from '../store/useWardenStore';
import { ClearanceApprovalItem, ExeatApprovalItem } from '../types/admin';

/**
 * WardenApprovalQueueScreen Component.
 * Allows Hall Wardens and Student Affairs officials to review and execute single-tap
 * digital approvals or rejection feedback for student clearance packages and night exeat requests.
 */
export const WardenApprovalQueueScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    pendingClearances,
    pendingExeats,
    isLoading,
    actionInProgress,
    error,
    successMessage,
    fetchDashboardData,
    approveClearance,
    rejectClearance,
    approveExeat,
    rejectExeat,
    clearFeedback
  } = useWardenStore();

  const wardenId = session?.user.id || 'usr_warden_101';

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'CLEARANCES' | 'EXEATS'>('CLEARANCES');

  // Modal State for Reject Feedback
  const [rejectModalVisible, setRejectModalVisible] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'CLEARANCE' | 'EXEAT'; studentName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveClearanceItem = async (item: ClearanceApprovalItem) => {
    const success = await approveClearance(item.id, wardenId, 'Clearance verified and approved by Hall Warden.');
    if (success) {
      Alert.alert('Clearance Approved', `Digital clearance for ${item.studentName} has been approved.`);
    }
  };

  const handleApproveExeatItem = async (item: ExeatApprovalItem) => {
    const success = await approveExeat(item.id, wardenId, 'Overnight exeat permitted by Hall Warden.');
    if (success) {
      Alert.alert('Exeat Granted', `Night exeat for ${item.studentName} has been approved.`);
    }
  };

  const openRejectModal = (id: string, type: 'CLEARANCE' | 'EXEAT', studentName: string) => {
    setSelectedItem({ id, type, studentName });
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Feedback Required', 'Please type a reason for rejecting this request.');
      return;
    }

    if (!selectedItem) return;

    let success = false;
    if (selectedItem.type === 'CLEARANCE') {
      success = await rejectClearance(selectedItem.id, wardenId, rejectionReason.trim());
    } else {
      success = await rejectExeat(selectedItem.id, wardenId, rejectionReason.trim());
    }

    if (success) {
      setRejectModalVisible(false);
      setSelectedItem(null);
      setRejectionReason('');
      Alert.alert('Request Rejected', 'Feedback submitted to student.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <View className="p-4 bg-white border-b border-slate-200">
        <Text className="text-xl font-bold text-[#7A0000]">WARDEN APPROVAL QUEUE</Text>
        <Text className="text-xs text-slate-500 mt-0.5">
          Single-tap clearance verification & night exeat processing
        </Text>

        {/* Tab Selector */}
        <View className="flex-row bg-slate-100 p-1 rounded-xl mt-3">
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'CLEARANCES' ? 'bg-[#7A0000]' : ''}`}
            onPress={() => {
              clearFeedback();
              setActiveTab('CLEARANCES');
            }}
          >
            <Text
              className={`text-xs font-bold ${activeTab === 'CLEARANCES' ? 'text-white' : 'text-slate-600'}`}
            >
              Pending Clearances ({pendingClearances.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'EXEATS' ? 'bg-[#7A0000]' : ''}`}
            onPress={() => {
              clearFeedback();
              setActiveTab('EXEATS');
            }}
          >
            <Text
              className={`text-xs font-bold ${activeTab === 'EXEATS' ? 'text-white' : 'text-slate-600'}`}
            >
              Night Exeats ({pendingExeats.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="p-4 pb-12"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} tintColor="#7A0000" />
        }
      >
        {/* Feedback Banners */}
        {error ? (
          <View className="bg-red-100 border border-red-300 p-3 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-red-900 text-xs flex-1 pr-2">{error}</Text>
            <TouchableOpacity onPress={clearFeedback}>
              <Text className="text-red-700 text-xs font-bold">Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {successMessage ? (
          <View className="bg-emerald-100 border border-emerald-300 p-3 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-emerald-900 text-xs flex-1 pr-2">{successMessage}</Text>
            <TouchableOpacity onPress={clearFeedback}>
              <Text className="text-emerald-700 text-xs font-bold">Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {actionInProgress ? (
          <View className="bg-white p-4 rounded-xl border border-slate-200 mb-4 flex-row items-center justify-center space-x-2">
            <ActivityIndicator size="small" color="#7A0000" />
            <Text className="text-xs font-bold text-slate-700">Executing Warden Decision...</Text>
          </View>
        ) : null}

        {/* TAB 1: PENDING CLEARANCES */}
        {activeTab === 'CLEARANCES' && (
          <View className="space-y-4">
            {pendingClearances.length > 0 ? (
              pendingClearances.map((item) => (
                <View
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <View className="flex-row justify-between items-start border-b border-slate-100 pb-2 mb-2">
                    <View>
                      <Text className="text-base font-bold text-slate-900">{item.studentName}</Text>
                      <Text className="text-xs font-semibold text-[#7A0000]">
                        Matric: {item.matricNo}
                      </Text>
                    </View>
                    <View className="bg-amber-100 px-2.5 py-1 rounded-md">
                      <Text className="text-[10px] font-extrabold text-amber-800">PENDING</Text>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-600 mb-1">
                    <Text className="font-bold">Faculty/Dept:</Text> {item.faculty} | Level {item.level}
                  </Text>
                  <Text className="text-xs text-slate-600 mb-3">
                    <Text className="font-bold">Submitted:</Text>{' '}
                    {new Date(item.submittedAt).toLocaleDateString()}
                  </Text>

                  {item.notes ? (
                    <View className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                      <Text className="text-[11px] text-slate-600 italic">{item.notes}</Text>
                    </View>
                  ) : null}

                  {/* Single Tap Action Buttons */}
                  <View className="flex-row space-x-2 pt-1">
                    <TouchableOpacity
                      className="flex-1 bg-emerald-700 py-3 rounded-xl items-center shadow-xs active:opacity-90"
                      onPress={() => handleApproveClearanceItem(item)}
                      disabled={actionInProgress}
                    >
                      <Text className="text-white text-xs font-bold">Approve Package</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 bg-red-700 py-3 rounded-xl items-center shadow-xs active:opacity-90"
                      onPress={() => openRejectModal(item.id, 'CLEARANCE', item.studentName)}
                      disabled={actionInProgress}
                    >
                      <Text className="text-white text-xs font-bold">Reject Package</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center justify-center my-6">
                <Text className="text-slate-800 font-bold text-base mb-1">No Pending Clearances</Text>
                <Text className="text-slate-500 text-xs text-center">
                  All student digital document clearance submissions for this hall have been processed.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: NIGHT EXEAT REQUESTS */}
        {activeTab === 'EXEATS' && (
          <View className="space-y-4">
            {pendingExeats.length > 0 ? (
              pendingExeats.map((item) => (
                <View
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <View className="flex-row justify-between items-start border-b border-slate-100 pb-2 mb-2">
                    <View>
                      <Text className="text-base font-bold text-slate-900">{item.studentName}</Text>
                      <Text className="text-xs font-semibold text-[#7A0000]">
                        Matric: {item.matricNo}
                      </Text>
                    </View>
                    <View className="bg-blue-100 px-2.5 py-1 rounded-md">
                      <Text className="text-[10px] font-extrabold text-blue-800">NIGHT EXEAT</Text>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-700 mb-1">
                    <Text className="font-bold">Destination:</Text> {item.destination}
                  </Text>
                  <Text className="text-xs text-slate-700 mb-1">
                    <Text className="font-bold">Period:</Text> {item.departureDate} to {item.returnDate}
                  </Text>
                  <Text className="text-xs text-slate-600 mb-3">
                    <Text className="font-bold">Reason:</Text> {item.reason}
                  </Text>

                  {/* Single Tap Action Buttons */}
                  <View className="flex-row space-x-2 pt-1">
                    <TouchableOpacity
                      className="flex-1 bg-emerald-700 py-3 rounded-xl items-center shadow-xs active:opacity-90"
                      onPress={() => handleApproveExeatItem(item)}
                      disabled={actionInProgress}
                    >
                      <Text className="text-white text-xs font-bold">Grant Exeat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 bg-red-700 py-3 rounded-xl items-center shadow-xs active:opacity-90"
                      onPress={() => openRejectModal(item.id, 'EXEAT', item.studentName)}
                      disabled={actionInProgress}
                    >
                      <Text className="text-white text-xs font-bold">Decline Request</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center justify-center my-6">
                <Text className="text-slate-800 font-bold text-base mb-1">No Pending Night Exeats</Text>
                <Text className="text-slate-500 text-xs text-center">
                  There are no overnight departure requests awaiting Warden signature at this time.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal Input */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white w-full max-w-sm rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-lg font-bold text-slate-900 mb-1">
              Reject {selectedItem?.type === 'CLEARANCE' ? 'Clearance' : 'Night Exeat'}
            </Text>
            <Text className="text-xs text-slate-500 mb-4">
              Providing mandatory rejection feedback for {selectedItem?.studentName}
            </Text>

            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 mb-4 h-24"
              placeholder="Type rejection reason (e.g. Missing clinic stamp or unverified document)"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View className="flex-row space-x-2">
              <TouchableOpacity
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
                onPress={() => setRejectModalVisible(false)}
              >
                <Text className="text-slate-700 text-xs font-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-red-700 py-3 rounded-xl items-center"
                onPress={submitRejection}
              >
                <Text className="text-white text-xs font-bold">Submit Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
