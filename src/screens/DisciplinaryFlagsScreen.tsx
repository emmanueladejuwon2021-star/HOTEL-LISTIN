import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDisciplinaryStore } from '../store/useDisciplinaryStore';
import { useAuthStore } from '../store/useAuthStore';
import { DisciplinaryStatus } from '../types/eligibility';

/**
 * DisciplinaryFlagsScreen Component.
 * Allows Hall Wardens to search students, enforce disciplinary flags/blacklists,
 * view disciplinary histories, and lift sanctions.
 * Styled according to Section 6 of PRD.md using NativeWind/Tailwind.
 */
export const DisciplinaryFlagsScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    records,
    isLoading,
    error,
    searchQuery,
    selectedStatusFilter,
    setSearchQuery,
    setSelectedStatusFilter,
    fetchDisciplinaryRecords,
    flagStudent,
    clearFlag
  } = useDisciplinaryStore();

  const [matricInput, setMatricInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [statusInput, setStatusInput] = useState<DisciplinaryStatus>('SUSPENDED');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDisciplinaryRecords();
  }, [searchQuery, selectedStatusFilter]);

  const handleApplySanction = async () => {
    if (!matricInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a student matriculation number or staff ID.');
      return;
    }
    if (!reasonInput.trim()) {
      Alert.alert('Validation Error', 'Please provide an official justification reason.');
      return;
    }

    const wardenId = session?.user.id || 'WARDEN_ADMIN';
    const success = await flagStudent(matricInput.trim(), statusInput, reasonInput.trim(), wardenId);

    if (success) {
      setSuccessMessage(`Disciplinary status '${statusInput}' successfully applied to student ${matricInput.trim()}.`);
      setMatricInput('');
      setReasonInput('');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleLiftSanction = async (userId: string, studentName: string) => {
    const wardenId = session?.user.id || 'WARDEN_ADMIN';
    const success = await clearFlag(userId, wardenId);
    if (success) {
      setSuccessMessage(`Disciplinary sanctions cleared for ${studentName}.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const getStatusBadgeStyle = (status: DisciplinaryStatus) => {
    switch (status) {
      case 'CLEARED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'FLAGGED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SUSPENDED':
      case 'RUSTICATED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Header Title Section */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-2xl font-bold text-[#7A0000]">DISCIPLINARY GOVERNANCE</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Student Disciplinary Flagging, Blacklist Management & Sanction Audits
          </Text>
        </View>

        {/* Feedback Messages */}
        {error && (
          <View className="bg-rose-50 border border-rose-200 p-4 rounded-xl mb-4">
            <Text className="text-rose-700 text-sm font-semibold">{error}</Text>
          </View>
        )}

        {successMessage && (
          <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
            <Text className="text-emerald-700 text-sm font-semibold">{successMessage}</Text>
          </View>
        )}

        {/* Issue Sanction Form */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-base font-bold text-slate-800 mb-3">Issue Student Sanction / Flag</Text>

          <Text className="text-xs font-semibold text-slate-500 mb-1">Student Matric / Staff Number</Text>
          <TextInput
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 mb-3"
            placeholder="e.g. 190407001 or 180805022"
            value={matricInput}
            onChangeText={setMatricInput}
            autoCapitalize="characters"
          />

          <Text className="text-xs font-semibold text-slate-500 mb-1">Select Sanction Status</Text>
          <View className="flex-row space-x-2 mb-3">
            {(['FLAGGED', 'SUSPENDED', 'RUSTICATED', 'CLEARED'] as DisciplinaryStatus[]).map((st) => (
              <TouchableOpacity
                key={st}
                className={`flex-1 py-2 rounded-xl border items-center ${
                  statusInput === st ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-50 border-slate-300'
                }`}
                onPress={() => setStatusInput(st)}
              >
                <Text
                  className={`text-xs font-bold ${
                    statusInput === st ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-xs font-semibold text-slate-500 mb-1">Official Justification Reason</Text>
          <TextInput
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 mb-4 h-20"
            placeholder="Describe the infraction or policy violation..."
            value={reasonInput}
            onChangeText={setReasonInput}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            className="bg-[#7A0000] py-3 rounded-xl items-center shadow-md active:opacity-90"
            onPress={handleApplySanction}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-base">Enforce Disciplinary Action</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter & Search Section */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-base font-bold text-slate-800 mb-3">Disciplinary Blacklist & Record Directory</Text>

          <TextInput
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 mb-3"
            placeholder="Search by student name, matric no, or reason..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Status Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 mb-2">
            {(['ALL', 'FLAGGED', 'SUSPENDED', 'RUSTICATED', 'CLEARED'] as const).map((filterOpt) => (
              <TouchableOpacity
                key={filterOpt}
                className={`px-4 py-2 rounded-full border ${
                  selectedStatusFilter === filterOpt ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-100 border-slate-300'
                }`}
                onPress={() => setSelectedStatusFilter(filterOpt)}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedStatusFilter === filterOpt ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {filterOpt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Disciplinary Records List */}
        {isLoading && records.length === 0 ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-500 text-xs mt-2">Loading disciplinary records...</Text>
          </View>
        ) : records.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
            <Text className="text-slate-500 text-sm font-semibold">No disciplinary records match your criteria.</Text>
          </View>
        ) : (
          <View className="space-y-4">
            {records.map((item) => (
              <View key={item.userId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-slate-900">{item.fullName}</Text>
                    <Text className="text-xs text-slate-500 font-medium">Matric No: {item.matricOrStaffNo}</Text>
                    {item.faculty && (
                      <Text className="text-xs text-slate-400 mt-0.5">
                        {item.faculty} - {item.department} ({item.campus})
                      </Text>
                    )}
                  </View>
                  <View className={`px-3 py-1 rounded-full border ${getStatusBadgeStyle(item.status)}`}>
                    <Text className="text-xs font-bold">{item.status}</Text>
                  </View>
                </View>

                <View className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100">
                  <Text className="text-xs font-semibold text-slate-600 mb-1">Official Reason / Sanction Notes:</Text>
                  <Text className="text-xs text-slate-800">{item.reason}</Text>
                </View>

                <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
                  <Text className="text-[10px] text-slate-400">
                    Flagged: {new Date(item.flaggedAt).toLocaleDateString()}
                  </Text>

                  {item.status !== 'CLEARED' && (
                    <TouchableOpacity
                      className="bg-emerald-600 px-4 py-2 rounded-xl"
                      onPress={() => handleLiftSanction(item.userId, item.fullName)}
                    >
                      <Text className="text-white text-xs font-bold">Lift Sanction & Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
