import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useDisciplinaryStore } from '../store/useDisciplinaryStore';
import { DisciplinaryStatus } from '../types/eligibility';
import { StudentSearchResult } from '../types/disciplinary';

/**
 * DisciplinaryScreen Component.
 * Executive Warden view for searching student profiles, viewing disciplinary history logs,
 * issuing disciplinary sanctions (FLAGGED, SUSPENDED, RUSTICATED), and reinstating cleared status.
 */
export const DisciplinaryScreen: React.FC = () => {
  const { session } = useAuthStore();
  const wardenId = session?.user.id || 'WARDEN-ADMIN';

  const {
    searchQuery,
    searchResults,
    selectedStudent,
    studentHistory,
    metrics,
    isLoading,
    isSubmitting,
    error,
    searchStudents,
    selectStudent,
    issueSanction,
    revokeSanction,
    fetchMetrics,
    clearError,
  } = useDisciplinaryStore();

  const [inputQuery, setInputQuery] = useState('');
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Form State
  const [selectedSanctionStatus, setSelectedSanctionStatus] = useState<'FLAGGED' | 'SUSPENDED' | 'RUSTICATED'>('FLAGGED');
  const [reason, setReason] = useState('');
  const [durationDays, setDurationDays] = useState('14');
  const [clearReason, setClearReason] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSearch = async () => {
    if (!inputQuery.trim()) {
      Alert.alert('Input Required', 'Please enter a student name, matriculation number, or email.');
      return;
    }
    await searchStudents(inputQuery);
  };

  const handleSelectStudent = (student: StudentSearchResult) => {
    selectStudent(student);
  };

  const handleOpenIssueModal = () => {
    if (!selectedStudent) return;
    setReason('');
    setDurationDays('14');
    setSelectedSanctionStatus('FLAGGED');
    setShowSanctionModal(true);
  };

  const handleOpenClearModal = () => {
    if (!selectedStudent) return;
    setClearReason('');
    setShowClearModal(true);
  };

  const handleConfirmIssueSanction = async () => {
    if (!selectedStudent) return;
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please specify the exact reason for this disciplinary sanction.');
      return;
    }

    const days = parseInt(durationDays, 10);
    const validDays = isNaN(days) ? undefined : days;

    const success = await issueSanction({
      userId: selectedStudent.userId,
      status: selectedSanctionStatus,
      reason: reason.trim(),
      durationDays: validDays,
      wardenId,
    });

    if (success) {
      setShowSanctionModal(false);
      Alert.alert('Sanction Enforced', `Successfully recorded ${selectedSanctionStatus} status for ${selectedStudent.fullName}.`);
    }
  };

  const handleConfirmRevokeSanction = async () => {
    if (!selectedStudent) return;
    if (!clearReason.trim()) {
      Alert.alert('Reason Required', 'Please state the justification for reinstating student eligibility.');
      return;
    }

    const success = await revokeSanction({
      userId: selectedStudent.userId,
      wardenId,
      reason: clearReason.trim(),
    });

    if (success) {
      setShowClearModal(false);
      Alert.alert('Status Reinstated', `Disciplinary sanction cleared for ${selectedStudent.fullName}. Student eligibility restored.`);
    }
  };

  const getStatusBadgeClass = (status: DisciplinaryStatus) => {
    switch (status) {
      case 'CLEARED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'FLAGGED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SUSPENDED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'RUSTICATED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Executive Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-xl font-bold text-[#7A0000]">DISCIPLINARY GOVERNANCE PORTAL</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Student Blacklisting, Infraction Flagging & Hostel Eligibility Sanctions
          </Text>
        </View>

        {/* Dashboard Overview Metrics Ribbon */}
        <View className="flex-row space-x-3 mb-5">
          <View className="flex-1 bg-amber-50 p-4 rounded-xl border border-amber-200 items-center">
            <Text className="text-2xl font-extrabold text-amber-800">{metrics.totalFlagged}</Text>
            <Text className="text-[10px] font-bold text-amber-700 uppercase mt-1">Flagged</Text>
          </View>
          <View className="flex-1 bg-rose-50 p-4 rounded-xl border border-rose-200 items-center">
            <Text className="text-2xl font-extrabold text-rose-800">{metrics.totalSuspended}</Text>
            <Text className="text-[10px] font-bold text-rose-700 uppercase mt-1">Suspended</Text>
          </View>
          <View className="flex-1 bg-purple-50 p-4 rounded-xl border border-purple-200 items-center">
            <Text className="text-2xl font-extrabold text-purple-800">{metrics.totalRusticated}</Text>
            <Text className="text-[10px] font-bold text-purple-700 uppercase mt-1">Rusticated</Text>
          </View>
        </View>

        {/* Error Notification */}
        {error && (
          <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-5 flex-row items-center justify-between">
            <Text className="text-red-700 text-xs flex-1 font-medium">{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text className="text-red-800 font-bold text-xs ml-2">Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Student Search Box */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-xs font-bold text-slate-500 uppercase mb-3">Lookup Student Profile</Text>
          <View className="flex-row space-x-2">
            <TextInput
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
              placeholder="Enter Matric No, Name or Email..."
              placeholderTextColor="#94A3B8"
              value={inputQuery}
              onChangeText={setInputQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              className="bg-[#7A0000] px-5 justify-center items-center rounded-xl active:opacity-90"
              onPress={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-bold text-sm">Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Results List */}
        {searchResults.length > 0 && !selectedStudent && (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
            <Text className="text-xs font-bold text-slate-500 uppercase mb-3">
              Search Results ({searchResults.length})
            </Text>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.userId}
                className="p-4 border-b border-slate-100 flex-row items-center justify-between active:bg-slate-50"
                onPress={() => handleSelectStudent(item)}
              >
                <View className="flex-1 pr-3">
                  <Text className="font-bold text-slate-800 text-base">{item.fullName}</Text>
                  <Text className="text-slate-500 text-xs">
                    Matric: {item.matricNumber} | {item.department} ({item.level}L)
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full border ${getStatusBadgeClass(item.currentStatus)}`}>
                  <Text className="text-xs font-extrabold">{item.currentStatus}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Student Profile & Actions */}
        {selectedStudent && (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <TouchableOpacity onPress={() => selectStudent(null)}>
                <Text className="text-[#7A0000] font-bold text-xs">← Back to Search</Text>
              </TouchableOpacity>
              <View className={`px-3 py-1 rounded-full border ${getStatusBadgeClass(selectedStudent.currentStatus)}`}>
                <Text className="text-xs font-extrabold">{selectedStudent.currentStatus}</Text>
              </View>
            </View>

            <Text className="text-xl font-bold text-slate-900">{selectedStudent.fullName}</Text>
            <Text className="text-slate-600 text-xs mt-1">
              Matriculation: <Text className="font-semibold text-slate-800">{selectedStudent.matricNumber}</Text>
            </Text>
            <Text className="text-slate-600 text-xs mt-0.5">
              Department: {selectedStudent.department} ({selectedStudent.level}L) | Faculty: {selectedStudent.faculty}
            </Text>

            {selectedStudent.latestReason && (
              <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mt-3">
                <Text className="text-xs font-bold text-amber-900">Current Disciplinary Reason:</Text>
                <Text className="text-xs text-amber-800 mt-0.5">{selectedStudent.latestReason}</Text>
              </View>
            )}

            {/* Warden Action CTAs */}
            <View className="flex-row space-x-3 mt-4">
              <TouchableOpacity
                className="flex-1 bg-red-700 py-3 rounded-xl items-center shadow-sm active:opacity-90"
                onPress={handleOpenIssueModal}
              >
                <Text className="text-white font-bold text-xs">Issue Sanction</Text>
              </TouchableOpacity>

              {selectedStudent.currentStatus !== 'CLEARED' && (
                <TouchableOpacity
                  className="flex-1 bg-emerald-700 py-3 rounded-xl items-center shadow-sm active:opacity-90"
                  onPress={handleOpenClearModal}
                >
                  <Text className="text-white font-bold text-xs">Clear Sanction</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Historical Disciplinary Infraction Timeline */}
        {selectedStudent && (
          <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
            <Text className="text-xs font-bold text-slate-500 uppercase mb-3">
              Disciplinary Infraction & Action Log
            </Text>

            {studentHistory.length === 0 ? (
              <Text className="text-slate-400 text-xs italic py-2">No historical disciplinary sanctions on record.</Text>
            ) : (
              studentHistory.map((log) => (
                <View key={log.id} className="mb-4 pl-3 border-l-2 border-slate-200">
                  <View className="flex-row items-center justify-between">
                    <View className={`px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(log.status)}`}>
                      <Text className="text-[10px] font-extrabold">{log.status}</Text>
                    </View>
                    <Text className="text-[10px] text-slate-400 font-medium">
                      {new Date(log.flaggedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-slate-800 text-xs font-semibold mt-1">{log.reason}</Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5">
                    Issued By: {log.flaggedBy} {log.durationDays ? `(${log.durationDays} Days)` : ''}
                  </Text>
                  {log.resolvedAt && (
                    <Text className="text-emerald-700 text-[10px] mt-1 font-medium">
                      ✓ Resolved on {new Date(log.resolvedAt).toLocaleDateString()}: {log.resolutionNote}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: Issue Disciplinary Sanction */}
      <Modal visible={showSanctionModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center p-5">
          <View className="bg-white p-6 rounded-2xl w-full max-w-md border border-slate-200">
            <Text className="text-lg font-bold text-[#7A0000] mb-1">Issue Disciplinary Sanction</Text>
            <Text className="text-slate-500 text-xs mb-4">
              Enforce a hostel penalty or access restriction for {selectedStudent?.fullName}.
            </Text>

            {/* Status Type Picker */}
            <Text className="text-xs font-bold text-slate-600 mb-2">Sanction Severity Level</Text>
            <View className="flex-row space-x-2 mb-4">
              {(['FLAGGED', 'SUSPENDED', 'RUSTICATED'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    selectedSanctionStatus === st
                      ? 'bg-[#7A0000] border-[#7A0000]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                  onPress={() => setSelectedSanctionStatus(st)}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedSanctionStatus === st ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reason Input */}
            <Text className="text-xs font-bold text-slate-600 mb-1">Specific Offense / Reason</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4"
              placeholder="e.g. Unauthorized night guest, violence, property damage..."
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />

            {/* Duration Input */}
            <Text className="text-xs font-bold text-slate-600 mb-1">Sanction Duration (Days)</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-5"
              placeholder="14"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={durationDays}
              onChangeText={setDurationDays}
            />

            {/* Modal Actions */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
                onPress={() => setShowSanctionModal(false)}
                disabled={isSubmitting}
              >
                <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#7A0000] py-3 rounded-xl items-center"
                onPress={handleConfirmIssueSanction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-bold text-xs">Confirm Sanction</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Clear Sanction */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center p-5">
          <View className="bg-white p-6 rounded-2xl w-full max-w-md border border-slate-200">
            <Text className="text-lg font-bold text-emerald-800 mb-1">Clear Disciplinary Sanction</Text>
            <Text className="text-slate-500 text-xs mb-4">
              Reinstate full hostel eligibility for {selectedStudent?.fullName}.
            </Text>

            <Text className="text-xs font-bold text-slate-600 mb-1">Justification / Clearance Note</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-5"
              placeholder="e.g. Disciplinary board cleared, penalty period completed..."
              placeholderTextColor="#94A3B8"
              value={clearReason}
              onChangeText={setClearReason}
              multiline
              numberOfLines={3}
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
                onPress={() => setShowClearModal(false)}
                disabled={isSubmitting}
              >
                <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-emerald-700 py-3 rounded-xl items-center"
                onPress={handleConfirmRevokeSanction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-bold text-xs">Reconstruct & Clear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
