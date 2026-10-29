import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { useDisciplinaryStore } from '../store/useDisciplinaryStore';
import { StudentDisciplinaryRecord } from '../api/disciplinaryService';
import { DisciplinaryStatus } from '../types/eligibility';
import { useAuthStore } from '../store/useAuthStore';

/**
 * DisciplinaryManagementScreen Component.
 * High-visibility Warden and Student Affairs administrative dashboard allowing
 * university officials to search students, filter by standing status,
 * issue disciplinary flags/suspensions with mandatory violation reasons,
 * and clear disciplinary blacklists in real-time.
 *
 * Implements:
 * - [ADMIN-01] Student Disciplinary Flagging & Blacklists (Issue #81)
 */
export const DisciplinaryManagementScreen: React.FC = () => {
  const { session } = useAuthStore();
  const wardenId = session?.user.id || 'usr_warden_admin';

  const {
    records,
    selectedStudent,
    filterStatus,
    searchQuery,
    isLoading,
    error,
    successMessage,
    fetchDisciplinaryList,
    selectStudent,
    setFilterStatus,
    setSearchQuery,
    flagStudentRecord,
    clearDisciplinaryRecord,
    resetMessages
  } = useDisciplinaryStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [targetStatus, setTargetStatus] = useState<DisciplinaryStatus>('FLAGGED');
  const [violationReason, setViolationReason] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    fetchDisciplinaryList();
  }, []);

  const handleSearchSubmit = () => {
    setSearchQuery(localSearch);
  };

  const handleOpenActionModal = (student: StudentDisciplinaryRecord, initialStatus: DisciplinaryStatus = 'FLAGGED') => {
    selectStudent(student);
    setTargetStatus(initialStatus);
    setViolationReason(student.status !== 'CLEARED' ? student.reason : '');
    resetMessages();
    setModalVisible(true);
  };

  const handleExecuteSanction = async () => {
    if (!selectedStudent) return;

    if (!violationReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a detailed violation reason before executing a disciplinary action.');
      return;
    }

    await flagStudentRecord(selectedStudent.userId, targetStatus, violationReason, wardenId);
    setModalVisible(false);
    setViolationReason('');
  };

  const handleLiftSanction = async (student: StudentDisciplinaryRecord) => {
    Alert.alert(
      'Clear Disciplinary Record',
      `Are you sure you want to lift all disciplinary sanctions for ${student.fullName} (${student.matricNo})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Clearance',
          style: 'destructive',
          onPress: async () => {
            await clearDisciplinaryRecord(student.userId, wardenId, 'Sanction cleared by Hall Warden review');
          }
        }
      ]
    );
  };

  const getStatusBadgeStyle = (status: DisciplinaryStatus) => {
    switch (status) {
      case 'CLEARED':
        return { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', label: 'CLEARED' };
      case 'FLAGGED':
        return { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'FLAGGED' };
      case 'SUSPENDED':
        return { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'SUSPENDED' };
      case 'RUSTICATED':
        return { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-900', label: 'RUSTICATED' };
      default:
        return { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800', label: status };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Header Title Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-xl font-bold text-[#7A0000]">STUDENT DISCIPLINARY GOVERNANCE</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Manage student disciplinary standings, flag infractions, enforce hall suspensions, and clear blacklists.
          </Text>
        </View>

        {/* Feedback Banners */}
        {error && (
          <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
            <Text className="text-red-800 text-sm font-semibold">{error}</Text>
          </View>
        )}

        {successMessage && (
          <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
            <Text className="text-emerald-800 text-sm font-semibold">{successMessage}</Text>
          </View>
        )}

        {/* Student Search & Lookup Bar */}
        <View className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4 flex-row items-center space-x-2">
          <TextInput
            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm"
            placeholder="Search by matric no, student name, or email..."
            value={localSearch}
            onChangeText={setLocalSearch}
            onSubmitEditing={handleSearchSubmit}
          />
          <TouchableOpacity
            className="bg-[#7A0000] px-4 py-2 rounded-lg"
            onPress={handleSearchSubmit}
          >
            <Text className="text-white font-bold text-xs">Search</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-row space-x-2">
          {['ALL', 'FLAGGED', 'SUSPENDED', 'RUSTICATED', 'CLEARED'].map((cat) => (
            <TouchableOpacity
              key={cat}
              className={`px-4 py-2 rounded-full border ${
                filterStatus === cat
                  ? 'bg-[#7A0000] border-[#7A0000]'
                  : 'bg-white border-slate-300'
              }`}
              onPress={() => setFilterStatus(cat)}
            >
              <Text
                className={`text-xs font-bold ${
                  filterStatus === cat ? 'text-white' : 'text-slate-700'
                }`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Loading Indicator */}
        {isLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-500 text-xs mt-2">Loading disciplinary records...</Text>
          </View>
        )}

        {/* Student Disciplinary Cards List */}
        {!isLoading && records.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center my-4">
            <Text className="text-slate-600 font-bold text-base">No Disciplinary Records Found</Text>
            <Text className="text-slate-400 text-xs text-center mt-1">
              No student profiles matched your search or status filter parameters.
            </Text>
          </View>
        ) : (
          records.map((student) => {
            const badge = getStatusBadgeStyle(student.status);
            return (
              <View
                key={student.userId}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3"
              >
                {/* Top Name and Status Row */}
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-slate-800">{student.fullName}</Text>
                    <Text className="text-xs font-semibold text-slate-500">
                      Matric: {student.matricNo} {student.faculty ? `• ${student.faculty}` : ''}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full border ${badge.bg}`}>
                    <Text className={`text-xs font-extrabold ${badge.text}`}>{badge.label}</Text>
                  </View>
                </View>

                {/* Violation Reason Box */}
                <View className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Current Disciplinary Note:
                  </Text>
                  <Text className="text-xs text-slate-700 italic">{student.reason}</Text>
                  {student.flaggedAt && (
                    <Text className="text-[10px] text-slate-400 mt-2">
                      Updated: {new Date(student.flaggedAt).toLocaleString()}
                    </Text>
                  )}
                </View>

                {/* Action CTA Buttons */}
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="flex-1 bg-amber-600 py-2.5 rounded-xl items-center"
                    onPress={() => handleOpenActionModal(student, 'FLAGGED')}
                  >
                    <Text className="text-white text-xs font-bold">Flag Violation</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-red-700 py-2.5 rounded-xl items-center"
                    onPress={() => handleOpenActionModal(student, 'SUSPENDED')}
                  >
                    <Text className="text-white text-xs font-bold">Suspend Hall</Text>
                  </TouchableOpacity>

                  {student.status !== 'CLEARED' && (
                    <TouchableOpacity
                      className="bg-emerald-600 px-3 py-2.5 rounded-xl items-center justify-center"
                      onPress={() => handleLiftSanction(student)}
                    >
                      <Text className="text-white text-xs font-bold">Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Disciplinary Action Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xl">
            <Text className="text-lg font-bold text-[#7A0000] mb-1">
              ISSUE DISCIPLINARY SANCTION
            </Text>
            {selectedStudent && (
              <Text className="text-slate-600 text-xs font-semibold mb-4">
                Student: {selectedStudent.fullName} ({selectedStudent.matricNo})
              </Text>
            )}

            {/* Status Type Picker */}
            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">
              Select Disciplinary Action Level:
            </Text>
            <View className="flex-row space-x-2 mb-4">
              {(['FLAGGED', 'SUSPENDED', 'RUSTICATED'] as DisciplinaryStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  className={`flex-1 py-2 rounded-xl border items-center ${
                    targetStatus === st
                      ? 'bg-[#7A0000] border-[#7A0000]'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                  onPress={() => setTargetStatus(st)}
                >
                  <Text
                    className={`text-xs font-bold ${
                      targetStatus === st ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mandatory Violation Reason Field */}
            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">
              Official Violation Ground / Reason:
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-xs mb-5"
              placeholder="Type official details of hostel rule violation..."
              value={violationReason}
              onChangeText={setViolationReason}
              multiline
              numberOfLines={4}
            />

            {/* Modal CTAs */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-[#7A0000] py-3 rounded-xl items-center"
                onPress={handleExecuteSanction}
              >
                <Text className="text-white font-bold text-xs">Apply Sanction</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
