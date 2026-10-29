import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useDisciplinaryStore } from '../store/useDisciplinaryStore';
import { StudentDisciplinarySearchResult } from '../types/disciplinary';

/**
 * DisciplinaryScreen Component.
 * Allows Hall Wardens and Student Affairs Officers to search students, flag, suspend, or rusticate students,
 * view active blacklists, and clear sanctions directly in Turso DB.
 */
export const DisciplinaryScreen: React.FC = () => {
  const { session } = useAuthStore();
  const wardenId = session?.user.id || 'usr_warden_default';

  const {
    searchResults,
    activeBlacklist,
    selectedStudent,
    summaryMetrics,
    auditLogs,
    isLoading,
    errorMessage,
    successMessage,
    searchStudents,
    selectStudent,
    issueSanction,
    clearSanction,
    loadActiveBlacklist,
    loadSummaryMetrics,
    loadAuditLogs,
    clearMessages
  } = useDisciplinaryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSanctionType, setSelectedSanctionType] = useState<'FLAGGED' | 'SUSPENDED' | 'RUSTICATED'>('SUSPENDED');
  const [sanctionReason, setSanctionReason] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [clearanceNote, setClearanceNote] = useState('');
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'BLACKLIST' | 'AUDIT_LOGS'>('SEARCH');

  useEffect(() => {
    loadSummaryMetrics();
    loadActiveBlacklist();
  }, []);

  const handleSearch = () => {
    clearMessages();
    searchStudents(searchQuery);
  };

  const handleIssueSanction = async () => {
    if (!selectedStudent) return;
    if (!sanctionReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a detailed reason for issuing this disciplinary sanction.');
      return;
    }

    const days = parseInt(durationDays, 10) || 0;

    await issueSanction({
      wardenId,
      studentUserId: selectedStudent.userId,
      status: selectedSanctionType,
      reason: sanctionReason,
      durationDays: days
    });

    setSanctionReason('');
  };

  const handleClearSanction = async (student: StudentDisciplinarySearchResult) => {
    await clearSanction({
      wardenId,
      studentUserId: student.userId,
      clearanceNote: clearanceNote || 'Sanction cleared by Hall Warden.'
    });

    setClearanceNote('');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Top Header */}
        <View className="bg-[#7A0000] p-5 rounded-2xl mb-4 shadow-md">
          <Text className="text-white text-xl font-bold">STUDENT DISCIPLINARY & BLACKLIST MANAGEMENT</Text>
          <Text className="text-amber-200 text-xs mt-1">
            Hall Warden Disciplinary Sanctions, Suspensions, Rustications & Eligibility Overrides
          </Text>
        </View>

        {/* Status Messages */}
        {errorMessage && (
          <View className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-xl mb-4">
            <Text className="text-red-800 font-bold text-sm">Error</Text>
            <Text className="text-red-700 text-xs mt-1">{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View className="bg-emerald-100 border border-emerald-400 text-emerald-800 p-4 rounded-xl mb-4">
            <Text className="text-emerald-900 font-bold text-sm">Success</Text>
            <Text className="text-emerald-800 text-xs mt-1">{successMessage}</Text>
          </View>
        )}

        {/* Dashboard Summary Metrics Cards */}
        <View className="grid grid-cols-3 gap-2 mb-4">
          <View className="bg-white p-3 rounded-xl border border-slate-200 items-center">
            <Text className="text-xs font-semibold text-slate-500">Active Flags</Text>
            <Text className="text-xl font-extrabold text-amber-600">{summaryMetrics.totalFlaggedCount}</Text>
          </View>
          <View className="bg-white p-3 rounded-xl border border-slate-200 items-center">
            <Text className="text-xs font-semibold text-slate-500">Suspended</Text>
            <Text className="text-xl font-extrabold text-red-600">{summaryMetrics.totalSuspendedCount}</Text>
          </View>
          <View className="bg-white p-3 rounded-xl border border-slate-200 items-center">
            <Text className="text-xs font-semibold text-slate-500">Rusticated</Text>
            <Text className="text-xl font-extrabold text-slate-900">{summaryMetrics.totalRusticatedCount}</Text>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View className="flex-row bg-slate-200 p-1 rounded-xl mb-4">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'SEARCH' ? 'bg-[#7A0000]' : ''}`}
            onPress={() => setActiveTab('SEARCH')}
          >
            <Text className={`text-xs font-bold ${activeTab === 'SEARCH' ? 'text-white' : 'text-slate-700'}`}>
              Search & Flag
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'BLACKLIST' ? 'bg-[#7A0000]' : ''}`}
            onPress={() => {
              setActiveTab('BLACKLIST');
              loadActiveBlacklist();
            }}
          >
            <Text className={`text-xs font-bold ${activeTab === 'BLACKLIST' ? 'text-white' : 'text-slate-700'}`}>
              Active Blacklist ({summaryMetrics.totalActiveSanctions})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'AUDIT_LOGS' ? 'bg-[#7A0000]' : ''}`}
            onPress={() => {
              setActiveTab('AUDIT_LOGS');
              loadAuditLogs();
            }}
          >
            <Text className={`text-xs font-bold ${activeTab === 'AUDIT_LOGS' ? 'text-white' : 'text-slate-700'}`}>
              Audit Logs
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: SEARCH & FLAG STUDENT */}
        {activeTab === 'SEARCH' && (
          <View>
            <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
              <Text className="text-slate-800 font-bold text-sm mb-2">Search Student Profile</Text>
              <View className="flex-row space-x-2">
                <TextInput
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-800 text-sm"
                  placeholder="Enter Matric No. or Student Name"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity
                  className="bg-[#7A0000] px-4 py-2 rounded-xl justify-center items-center"
                  onPress={handleSearch}
                >
                  <Text className="text-white font-bold text-xs">Search</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading Indicator */}
            {isLoading && (
              <View className="py-6 items-center">
                <ActivityIndicator size="large" color="#7A0000" />
                <Text className="text-slate-500 text-xs mt-2">Processing Turso DB Query...</Text>
              </View>
            )}

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <View className="mb-4">
                <Text className="text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                  Matching Students ({searchResults.length})
                </Text>
                {searchResults.map((student) => (
                  <TouchableOpacity
                    key={student.userId}
                    className={`bg-white p-4 rounded-xl border mb-2 shadow-sm ${
                      selectedStudent?.userId === student.userId ? 'border-[#7A0000] bg-amber-50' : 'border-slate-200'
                    }`}
                    onPress={() => selectStudent(student)}
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-2">
                        <Text className="text-slate-900 font-bold text-base">{student.fullName}</Text>
                        <Text className="text-slate-600 text-xs">
                          {student.matricOrStaffNo} • {student.faculty} ({student.level}L)
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${
                          student.currentDisciplinaryStatus === 'CLEARED'
                            ? 'bg-emerald-100'
                            : student.currentDisciplinaryStatus === 'FLAGGED'
                            ? 'bg-amber-100'
                            : 'bg-red-100'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            student.currentDisciplinaryStatus === 'CLEARED'
                              ? 'text-emerald-800'
                              : student.currentDisciplinaryStatus === 'FLAGGED'
                              ? 'text-amber-800'
                              : 'text-red-800'
                          }`}
                        >
                          {student.currentDisciplinaryStatus}
                        </Text>
                      </View>
                    </View>
                    {student.currentReason && (
                      <Text className="text-slate-500 text-xs mt-2 bg-slate-100 p-2 rounded-lg">
                        Reason: {student.currentReason}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected Student Action Panel */}
            {selectedStudent && (
              <View className="bg-white p-5 rounded-2xl border border-[#7A0000] shadow-md mb-4">
                <Text className="text-[#7A0000] font-extrabold text-base mb-1">
                  Manage Disciplinary Sanction: {selectedStudent.fullName}
                </Text>
                <Text className="text-slate-500 text-xs mb-4">Matric No: {selectedStudent.matricOrStaffNo}</Text>

                {/* Sanction Selector */}
                <Text className="text-slate-700 font-bold text-xs mb-2">Select Sanction Action:</Text>
                <View className="flex-row space-x-2 mb-4">
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg border items-center ${
                      selectedSanctionType === 'FLAGGED' ? 'bg-amber-600 border-amber-600' : 'bg-slate-50 border-slate-300'
                    }`}
                    onPress={() => setSelectedSanctionType('FLAGGED')}
                  >
                    <Text className={`text-xs font-bold ${selectedSanctionType === 'FLAGGED' ? 'text-white' : 'text-slate-700'}`}>
                      FLAG (Warning)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg border items-center ${
                      selectedSanctionType === 'SUSPENDED' ? 'bg-red-600 border-red-600' : 'bg-slate-50 border-slate-300'
                    }`}
                    onPress={() => setSelectedSanctionType('SUSPENDED')}
                  >
                    <Text className={`text-xs font-bold ${selectedSanctionType === 'SUSPENDED' ? 'text-white' : 'text-slate-700'}`}>
                      SUSPEND
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg border items-center ${
                      selectedSanctionType === 'RUSTICATED' ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-300'
                    }`}
                    onPress={() => setSelectedSanctionType('RUSTICATED')}
                  >
                    <Text className={`text-xs font-bold ${selectedSanctionType === 'RUSTICATED' ? 'text-white' : 'text-slate-700'}`}>
                      RUSTICATE
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sanction Reason Input */}
                <Text className="text-slate-700 font-bold text-xs mb-1">Sanction Reason / Infraction Details:</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-sm mb-3"
                  placeholder="e.g. Broken hostel rules, illegal subletting, property damage"
                  multiline
                  numberOfLines={3}
                  value={sanctionReason}
                  onChangeText={setSanctionReason}
                />

                {/* Duration in Days */}
                {selectedSanctionType === 'SUSPENDED' && (
                  <View className="mb-4">
                    <Text className="text-slate-700 font-bold text-xs mb-1">Suspension Duration (Days):</Text>
                    <TextInput
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm"
                      keyboardType="numeric"
                      value={durationDays}
                      onChangeText={setDurationDays}
                    />
                  </View>
                )}

                <TouchableOpacity
                  className="bg-[#7A0000] py-3 rounded-xl items-center shadow-md mb-2"
                  onPress={handleIssueSanction}
                >
                  <Text className="text-white font-bold text-sm">Apply {selectedSanctionType} Sanction</Text>
                </TouchableOpacity>

                {selectedStudent.currentDisciplinaryStatus !== 'CLEARED' && (
                  <TouchableOpacity
                    className="bg-emerald-600 py-3 rounded-xl items-center shadow-md"
                    onPress={() => handleClearSanction(selectedStudent)}
                  >
                    <Text className="text-white font-bold text-sm">Clear Sanction & Restore Standing</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: ACTIVE BLACKLIST */}
        {activeTab === 'BLACKLIST' && (
          <View>
            <Text className="text-slate-800 font-bold text-sm mb-3">
              Currently Blacklisted / Sanctioned Students ({activeBlacklist.length})
            </Text>
            {activeBlacklist.length === 0 ? (
              <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
                <Text className="text-slate-500 text-xs">No active blacklisted or suspended students found.</Text>
              </View>
            ) : (
              activeBlacklist.map((student) => (
                <View key={student.userId} className="bg-white p-4 rounded-xl border border-red-200 mb-3 shadow-sm">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-slate-900 font-bold text-base">{student.fullName}</Text>
                      <Text className="text-slate-600 text-xs">
                        {student.matricOrStaffNo} • {student.faculty} ({student.level}L)
                      </Text>
                    </View>
                    <View className="bg-red-100 px-3 py-1 rounded-full">
                      <Text className="text-red-800 font-bold text-xs">{student.currentDisciplinaryStatus}</Text>
                    </View>
                  </View>
                  <Text className="text-slate-600 text-xs mt-2 bg-slate-50 p-2 rounded-lg">
                    Reason: {student.currentReason || 'N/A'}
                  </Text>

                  <TouchableOpacity
                    className="bg-emerald-600 mt-3 py-2 rounded-lg items-center"
                    onPress={() => handleClearSanction(student)}
                  >
                    <Text className="text-white font-bold text-xs">Clear Sanction</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'AUDIT_LOGS' && (
          <View>
            <Text className="text-slate-800 font-bold text-sm mb-3">Disciplinary Action Audit Trail</Text>
            {auditLogs.length === 0 ? (
              <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
                <Text className="text-slate-500 text-xs">No disciplinary log entries recorded yet.</Text>
              </View>
            ) : (
              auditLogs.map((log) => (
                <View key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 mb-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-900 font-bold text-xs">
                      {log.studentName || log.userId} ({log.matricNo || 'Student'})
                    </Text>
                    <Text className="text-xs font-bold text-red-600">{log.status}</Text>
                  </View>
                  <Text className="text-slate-600 text-xs mt-1">Reason: {log.reason}</Text>
                  <Text className="text-slate-400 text-[10px] mt-1">
                    Logged: {new Date(log.flaggedAt).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
