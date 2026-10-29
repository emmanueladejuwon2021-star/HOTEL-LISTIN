import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { useDisciplinaryStore } from '../store/useDisciplinaryStore';
import { useAuthStore } from '../store/useAuthStore';
import { DisciplinaryStatus, DisciplinaryRecord } from '../types/disciplinary';

/**
 * High-visibility Warden screen for managing student disciplinary flags, blacklists, and sanctions.
 * Designed using NativeWind v4 (Tailwind CSS) with clear color badges and quick action controls.
 *
 * Allows Hall Wardens to:
 * 1. Filter disciplinary records by status (ALL, FLAGGED, SUSPENDED, BLACK_LISTED, RUSTICATED, CLEARED).
 * 2. Search students by matriculation number or name.
 * 3. Flag/Blacklist students with infraction reasons.
 * 4. Lift active sanctions with official resolution notes.
 */
export const DisciplinaryManagementScreen: React.FC = () => {
  const { session } = useAuthStore();
  const wardenId = session?.user?.id || 'warden_admin';

  const {
    records,
    isLoading,
    errorMessage,
    activeFilter,
    searchQuery,
    fetchRecords,
    flagStudent,
    liftFlag,
    setFilter,
    setSearchQuery,
    clearError
  } = useDisciplinaryStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [liftModalVisible, setLiftModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DisciplinaryRecord | null>(null);

  // Form states for flagging
  const [targetStudentId, setTargetStudentId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DisciplinaryStatus>('FLAGGED');
  const [infractionReason, setInfractionReason] = useState('');

  // Form states for lifting flag
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleOpenFlagModal = () => {
    setTargetStudentId('');
    setSelectedStatus('FLAGGED');
    setInfractionReason('');
    setModalVisible(true);
  };

  const handleSubmitFlag = async () => {
    if (!targetStudentId.trim()) {
      Alert.alert('Missing Input', 'Please enter a valid Student User ID.');
      return;
    }
    if (!infractionReason.trim()) {
      Alert.alert('Missing Input', 'Please enter the infraction reason.');
      return;
    }

    try {
      await flagStudent({
        userId: targetStudentId.trim(),
        status: selectedStatus,
        reason: infractionReason.trim(),
        wardenId
      });
      setModalVisible(false);
      Alert.alert('Sanction Applied', `Student successfully marked as ${selectedStatus}.`);
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Could not apply disciplinary flag.');
    }
  };

  const handleOpenLiftModal = (record: DisciplinaryRecord) => {
    setSelectedRecord(record);
    setResolutionNotes('');
    setLiftModalVisible(true);
  };

  const handleSubmitLift = async () => {
    if (!selectedRecord) return;
    if (!resolutionNotes.trim()) {
      Alert.alert('Missing Input', 'Please enter official resolution notes.');
      return;
    }

    try {
      await liftFlag({
        userId: selectedRecord.userId,
        wardenId,
        resolutionNotes: resolutionNotes.trim()
      });
      setLiftModalVisible(false);
      setSelectedRecord(null);
      Alert.alert('Sanction Lifted', 'Student disciplinary status updated to CLEARED.');
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Could not lift disciplinary flag.');
    }
  };

  const getBadgeStyle = (status: DisciplinaryStatus) => {
    switch (status) {
      case 'CLEARED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'FLAGGED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'RUSTICATED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'BLACK_LISTED':
        return 'bg-gray-900 text-white border-gray-900';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <View className="flex-1 bg-slate-50 p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-2xl font-bold text-slate-900">Disciplinary Control</Text>
          <Text className="text-sm text-slate-500">Hall Warden Sanctions & Blacklists</Text>
        </View>
        <TouchableOpacity
          onPress={handleOpenFlagModal}
          className="bg-red-600 px-4 py-2.5 rounded-xl shadow-sm"
        >
          <Text className="text-white font-semibold text-sm">+ Issue Flag</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View className="mb-3">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by student name or matric number..."
          placeholderTextColor="#94a3b8"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm shadow-sm"
        />
      </View>

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 max-h-10">
        {(['ALL', 'FLAGGED', 'SUSPENDED', 'BLACK_LISTED', 'RUSTICATED', 'CLEARED'] as const).map(
          (status) => {
            const isActive = activeFilter === status;
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setFilter(status)}
                className={`mr-2 px-3.5 py-1.5 rounded-full border ${
                  isActive
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </ScrollView>

      {/* Error Message */}
      {errorMessage && (
        <View className="bg-red-50 border border-red-200 p-3 rounded-xl mb-3 flex-row items-center justify-between">
          <Text className="text-red-700 text-xs flex-1 mr-2">{errorMessage}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text className="text-red-800 font-bold text-xs">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-10">
          <ActivityIndicator size="large" color="#dc2626" />
          <Text className="text-slate-500 text-xs mt-2">Loading records from Turso DB...</Text>
        </View>
      ) : records.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6 bg-white rounded-2xl border border-slate-200 border-dashed my-2">
          <Text className="text-slate-700 font-semibold text-base mb-1">No Disciplinary Records Found</Text>
          <Text className="text-slate-400 text-xs text-center">
            No active flags or blacklists match your filter criteria.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {records.map((item) => (
            <View
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 mb-3 shadow-sm"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-base font-bold text-slate-900">
                    {item.studentName || 'Student ID: ' + item.userId}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {item.matricOrStaffNo ? `Matric: ${item.matricOrStaffNo}` : `ID: ${item.userId}`}
                    {item.department ? ` • ${item.department} (L${item.level})` : ''}
                  </Text>
                </View>

                {/* Status Badge */}
                <View className={`px-2.5 py-1 rounded-full border ${getBadgeStyle(item.status)}`}>
                  <Text className="text-xs font-bold">{item.status}</Text>
                </View>
              </View>

              {/* Infraction Reason */}
              <View className="bg-slate-50 p-2.5 rounded-xl my-1 border border-slate-100">
                <Text className="text-xs text-slate-700 font-medium">
                  <Text className="font-bold text-slate-900">Infraction: </Text>
                  {item.reason}
                </Text>
                {item.resolutionNotes && (
                  <Text className="text-xs text-emerald-700 font-medium mt-1">
                    <Text className="font-bold">Resolution: </Text>
                    {item.resolutionNotes}
                  </Text>
                )}
              </View>

              {/* Footer Meta & Lift Action */}
              <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <Text className="text-[10px] text-slate-400">
                  Flagged: {new Date(item.flaggedAt).toLocaleDateString()}
                  {item.wardenName ? ` by ${item.wardenName}` : ''}
                </Text>

                {item.status !== 'CLEARED' && (
                  <TouchableOpacity
                    onPress={() => handleOpenLiftModal(item)}
                    className="bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-lg"
                  >
                    <Text className="text-emerald-800 text-xs font-semibold">Lift Sanction</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal: Issue Disciplinary Flag */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-slate-900 mb-4">Issue Disciplinary Sanction</Text>

            <Text className="text-xs font-semibold text-slate-700 mb-1">Student User ID</Text>
            <TextInput
              value={targetStudentId}
              onChangeText={setTargetStudentId}
              placeholder="Enter Student User ID (e.g., usr_student_1)"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm mb-3"
            />

            <Text className="text-xs font-semibold text-slate-700 mb-1">Sanction Severity Level</Text>
            <View className="flex-row flex-wrap mb-3">
              {(['FLAGGED', 'SUSPENDED', 'BLACK_LISTED', 'RUSTICATED'] as DisciplinaryStatus[]).map(
                (st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setSelectedStatus(st)}
                    className={`mr-2 mb-2 px-3 py-1.5 rounded-lg border ${
                      selectedStatus === st
                        ? 'bg-red-600 border-red-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selectedStatus === st ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text className="text-xs font-semibold text-slate-700 mb-1">Reason / Infraction Details</Text>
            <TextInput
              value={infractionReason}
              onChangeText={setInfractionReason}
              placeholder="Detail the hostel rule violation or incident..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm mb-4"
            />

            <View className="flex-row items-center justify-end space-x-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300"
              >
                <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitFlag}
                className="bg-red-600 px-5 py-2.5 rounded-xl ml-2"
              >
                <Text className="text-white text-sm font-semibold">Apply Flag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Lift Disciplinary Flag */}
      <Modal visible={liftModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-slate-900 mb-2">Lift Disciplinary Flag</Text>
            <Text className="text-xs text-slate-500 mb-4">
              Clearing sanction for student: {selectedRecord?.studentName || selectedRecord?.userId}
            </Text>

            <Text className="text-xs font-semibold text-slate-700 mb-1">Resolution Notes</Text>
            <TextInput
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              placeholder="Explain why sanction is being lifted (e.g. Apology accepted, fine paid)..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm mb-4"
            />

            <View className="flex-row items-center justify-end space-x-3">
              <TouchableOpacity
                onPress={() => setLiftModalVisible(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300"
              >
                <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitLift}
                className="bg-emerald-600 px-5 py-2.5 rounded-xl ml-2"
              >
                <Text className="text-white text-sm font-semibold">Confirm Clearance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
