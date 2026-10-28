import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useRoommateStore } from '../store/useRoommateStore';
import {
  SleepSchedule,
  CleanlinessLevel,
  StudyHabits,
  GuestPreference,
  SmokingTolerance,
  BedswapRequestStatus
} from '../types/roommate';

/**
 * Student-facing UI screen for completing the Roommate Lifestyle Survey,
 * viewing top compatibility match candidates, and managing mutual bedspace swaps.
 */
export const RoommateSurveyScreen: React.FC = () => {
  const { session } = useAuthStore();
  const user = session?.user;
  const {
    survey,
    matches,
    bedswapRequests,
    isLoading,
    errorMessage,
    fetchSurvey,
    submitSurvey,
    fetchCompatibilityMatches,
    createBedswapRequest,
    fetchBedswapRequests,
    respondToBedswapRequest
  } = useRoommateStore();

  const [activeTab, setActiveTab] = useState<'SURVEY' | 'MATCHES' | 'BEDSWAP'>('SURVEY');

  // Form state options
  const [sleepSchedule, setSleepSchedule] = useState<SleepSchedule>('EARLY_BIRD');
  const [cleanlinessLevel, setCleanlinessLevel] = useState<CleanlinessLevel>('VERY_NEAT');
  const [studyHabits, setStudyHabits] = useState<StudyHabits>('QUIET_ROOM');
  const [guestPreference, setGuestPreference] = useState<GuestPreference>('WEEKENDS_ONLY');
  const [smokingTolerance, setSmokingTolerance] = useState<SmokingTolerance>('STRICTLY_NO');
  const [bioNotes, setBioNotes] = useState<string>('');

  // Bedswap form
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [swapReason, setSwapReason] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BedswapRequestStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (user?.id) {
      fetchSurvey(user.id);
      fetchBedswapRequests(user.id, statusFilter);
    }
  }, [user?.id, statusFilter]);

  useEffect(() => {
    if (survey) {
      setSleepSchedule(survey.sleepSchedule);
      setCleanlinessLevel(survey.cleanlinessLevel);
      setStudyHabits(survey.studyHabits);
      setGuestPreference(survey.guestPreference);
      setSmokingTolerance(survey.smokingTolerance);
      setBioNotes(survey.bioNotes || '');
    }
  }, [survey]);

  const handleSubmitSurvey = async () => {
    if (!user?.id) return;

    try {
      await submitSurvey({
        userId: user.id,
        sleepSchedule,
        cleanlinessLevel,
        studyHabits,
        guestPreference,
        smokingTolerance,
        bioNotes
      });
      Alert.alert('Survey Saved', 'Your roommate lifestyle preferences have been updated successfully!');
      fetchCompatibilityMatches(user.id);
      setActiveTab('MATCHES');
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to save lifestyle survey.');
    }
  };

  const handleCreateSwap = async () => {
    if (!user?.id || !selectedTargetId || !swapReason.trim()) {
      Alert.alert('Missing Info', 'Please select a student and provide a reason for the bedswap.');
      return;
    }

    try {
      await createBedswapRequest({
        applicantUserId: user.id,
        targetUserId: selectedTargetId,
        reason: swapReason
      });
      Alert.alert('Bedswap Requested', 'Mutual bedswap request sent successfully!');
      setSelectedTargetId('');
      setSwapReason('');
    } catch (err: any) {
      Alert.alert('Swap Error', err.message || 'Failed to submit bedswap request.');
    }
  };

  const handleRespondToSwap = async (requestId: string, actionStatus: BedswapRequestStatus) => {
    if (!user?.id) return;

    try {
      await respondToBedswapRequest(requestId, user.id, actionStatus);
      Alert.alert('Status Updated', `Bedswap request has been updated to ${actionStatus}.`);
      fetchBedswapRequests(user.id, statusFilter);
    } catch (err: any) {
      Alert.alert('Action Error', err.message || 'Failed to update bedswap request status.');
    }
  };

  return (
    <View className="flex-1 bg-slate-50 p-4">
      {/* Top Header */}
      <View className="bg-white p-4 rounded-2xl shadow-sm mb-4">
        <Text className="text-xl font-bold text-slate-800">Roommate Compatibility Match</Text>
        <Text className="text-sm text-slate-500 mt-1">
          Complete your survey to discover compatible roommates and request mutual bedspace swaps.
        </Text>
      </View>

      {/* Navigation Tabs */}
      <View className="flex-row bg-slate-200 p-1 rounded-xl mb-4">
        <TouchableOpacity
          onPress={() => setActiveTab('SURVEY')}
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'SURVEY' ? 'bg-[#7A0000]' : ''}`}
        >
          <Text className={`font-semibold text-sm ${activeTab === 'SURVEY' ? 'text-white' : 'text-slate-700'}`}>
            1. Survey
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (user?.id) fetchCompatibilityMatches(user.id);
            setActiveTab('MATCHES');
          }}
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'MATCHES' ? 'bg-[#7A0000]' : ''}`}
        >
          <Text className={`font-semibold text-sm ${activeTab === 'MATCHES' ? 'text-white' : 'text-slate-700'}`}>
            2. Matches
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (user?.id) fetchBedswapRequests(user.id, statusFilter);
            setActiveTab('BEDSWAP');
          }}
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'BEDSWAP' ? 'bg-[#7A0000]' : ''}`}
        >
          <Text className={`font-semibold text-sm ${activeTab === 'BEDSWAP' ? 'text-white' : 'text-slate-700'}`}>
            3. Bedswap
          </Text>
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <View className="bg-red-100 border border-red-300 p-3 rounded-xl mb-4">
          <Text className="text-red-700 text-sm font-semibold">{errorMessage}</Text>
        </View>
      )}

      {/* Tab 1: Survey Form */}
      {activeTab === 'SURVEY' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="bg-white p-5 rounded-2xl shadow-sm space-y-4 mb-6">
            {/* Sleep Schedule */}
            <View>
              <Text className="text-slate-800 font-bold text-base mb-2">Sleep Schedule</Text>
              <View className="flex-row space-x-2">
                {(['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE'] as SleepSchedule[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setSleepSchedule(opt)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${sleepSchedule === opt ? 'bg-[#7A0000] border-[#7A0000]' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <Text className={`text-xs font-bold ${sleepSchedule === opt ? 'text-white' : 'text-slate-700'}`}>
                      {opt.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cleanliness Level */}
            <View className="mt-3">
              <Text className="text-slate-800 font-bold text-base mb-2">Cleanliness Standard</Text>
              <View className="flex-row space-x-2">
                {(['VERY_NEAT', 'MODERATE', 'CASUAL'] as CleanlinessLevel[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setCleanlinessLevel(opt)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${cleanlinessLevel === opt ? 'bg-[#7A0000] border-[#7A0000]' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <Text className={`text-xs font-bold ${cleanlinessLevel === opt ? 'text-white' : 'text-slate-700'}`}>
                      {opt.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Study Habits */}
            <View className="mt-3">
              <Text className="text-slate-800 font-bold text-base mb-2">Study Environment</Text>
              <View className="flex-row space-x-2">
                {(['QUIET_ROOM', 'GROUP_STUDY', 'LIBRARY_ONLY'] as StudyHabits[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setStudyHabits(opt)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${studyHabits === opt ? 'bg-[#7A0000] border-[#7A0000]' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <Text className={`text-xs font-bold ${studyHabits === opt ? 'text-white' : 'text-slate-700'}`}>
                      {opt.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Guest Policy */}
            <View className="mt-3">
              <Text className="text-slate-800 font-bold text-base mb-2">Guest Policy</Text>
              <View className="flex-row space-x-2">
                {(['NO_GUESTS', 'WEEKENDS_ONLY', 'ANYTIME'] as GuestPreference[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setGuestPreference(opt)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${guestPreference === opt ? 'bg-[#7A0000] border-[#7A0000]' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <Text className={`text-xs font-bold ${guestPreference === opt ? 'text-white' : 'text-slate-700'}`}>
                      {opt.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Smoking Tolerance */}
            <View className="mt-3">
              <Text className="text-slate-800 font-bold text-base mb-2">Smoking Tolerance</Text>
              <View className="flex-row space-x-2">
                {(['STRICTLY_NO', 'OUTSIDE_ONLY'] as SmokingTolerance[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setSmokingTolerance(opt)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${smokingTolerance === opt ? 'bg-[#7A0000] border-[#7A0000]' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <Text className={`text-xs font-bold ${smokingTolerance === opt ? 'text-white' : 'text-slate-700'}`}>
                      {opt.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bio Notes */}
            <View className="mt-3">
              <Text className="text-slate-800 font-bold text-base mb-2">Personal Bio & Notes</Text>
              <TextInput
                value={bioNotes}
                onChangeText={setBioNotes}
                placeholder="Share a short intro or roommate expectations..."
                multiline
                numberOfLines={3}
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-sm"
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmitSurvey}
              disabled={isLoading}
              className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md mt-4 active:opacity-90"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">Save Survey & View Matches</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Tab 2: Compatibility Matches */}
      {activeTab === 'MATCHES' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {isLoading && <ActivityIndicator size="large" color="#7A0000" className="my-6" />}

          {!isLoading && matches.length === 0 && (
            <View className="bg-white p-6 rounded-2xl items-center justify-center border border-slate-200">
              <Text className="text-slate-600 font-bold text-base text-center">No Roommate Matches Found</Text>
              <Text className="text-slate-400 text-xs text-center mt-2">
                Make sure you have saved your survey or check back later as other students submit their preferences.
              </Text>
            </View>
          )}

          {matches.map((item) => (
            <View key={item.studentId} className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-slate-800 font-bold text-base">{item.fullName}</Text>
                  <Text className="text-slate-500 text-xs">Matric: {item.matricNo}</Text>
                </View>
                <View className="bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300">
                  <Text className="text-emerald-800 font-extrabold text-sm">{item.matchScorePercentage}% Match</Text>
                </View>
              </View>

              {item.hostelName && (
                <View className="bg-slate-100 p-2.5 rounded-xl mb-3">
                  <Text className="text-slate-700 text-xs font-semibold">
                    Allocated Room: {item.hostelName} - Rm {item.roomNumber} ({item.bedLabel})
                  </Text>
                </View>
              )}

              <View className="flex-row flex-wrap gap-2 mb-3">
                <View className="bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Text className="text-slate-600 text-xs font-medium">Sleep: {item.survey.sleepSchedule}</Text>
                </View>
                <View className="bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Text className="text-slate-600 text-xs font-medium">Cleanliness: {item.survey.cleanlinessLevel}</Text>
                </View>
                <View className="bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Text className="text-slate-600 text-xs font-medium">Study: {item.survey.studyHabits}</Text>
                </View>
              </View>

              {item.survey.bioNotes && (
                <Text className="text-slate-500 text-xs italic mb-3">"{item.survey.bioNotes}"</Text>
              )}

              {item.bedspaceId && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTargetId(item.studentId);
                    setActiveTab('BEDSWAP');
                  }}
                  className="bg-[#7A0000] py-2.5 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-xs">Request Bedspace Swap</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Tab 3: Mutual Bedswap Requests */}
      {activeTab === 'BEDSWAP' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* New Swap Request Form */}
          <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
            <Text className="text-slate-800 font-bold text-base mb-3">Initiate Bedspace Swap</Text>

            <Text className="text-slate-600 font-semibold text-xs mb-1">Target Student User ID / Matric No</Text>
            <TextInput
              value={selectedTargetId}
              onChangeText={setSelectedTargetId}
              placeholder="Enter candidate student User ID"
              className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-sm mb-3"
            />

            <Text className="text-slate-600 font-semibold text-xs mb-1">Reason for Bedswap</Text>
            <TextInput
              value={swapReason}
              onChangeText={setSwapReason}
              placeholder="e.g. Matching study schedules and faculty proximity"
              multiline
              numberOfLines={2}
              className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-sm mb-4"
            />

            <TouchableOpacity
              onPress={handleCreateSwap}
              disabled={isLoading}
              className="bg-[#7A0000] py-3.5 rounded-xl items-center shadow-sm"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-sm">Send Bedswap Request</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Active Bedswap Requests List */}
          <Text className="text-slate-800 font-bold text-base mb-3">Bedswap Requests History</Text>

          {/* Status Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
            {(['ALL', 'PENDING', 'ACCEPTED', 'APPROVED_BY_WARDEN', 'DECLINED', 'CANCELLED'] as (BedswapRequestStatus | 'ALL')[]).map((st) => (
              <TouchableOpacity
                key={st}
                onPress={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full mr-2 border ${statusFilter === st ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-white border-slate-300'}`}
              >
                <Text className={`text-xs font-bold ${statusFilter === st ? 'text-white' : 'text-slate-700'}`}>
                  {st.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {bedswapRequests.length === 0 && (
            <View className="bg-white p-5 rounded-2xl items-center border border-slate-200">
              <Text className="text-slate-500 text-sm">No bedswap requests found.</Text>
            </View>
          )}

          {bedswapRequests.map((req) => (
            <View key={req.id} className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-slate-800 font-bold text-sm">
                  {req.applicantUserId === user?.id ? `To: ${req.targetName || req.targetUserId}` : `From: ${req.applicantName || req.applicantUserId}`}
                </Text>
                <View className={`px-2.5 py-1 rounded-full ${req.status === 'APPROVED_BY_WARDEN' || req.status === 'ACCEPTED' ? 'bg-emerald-100' : req.status === 'PENDING' ? 'bg-amber-100' : 'bg-red-100'}`}>
                  <Text className={`font-bold text-xs ${req.status === 'APPROVED_BY_WARDEN' || req.status === 'ACCEPTED' ? 'text-emerald-800' : req.status === 'PENDING' ? 'text-amber-800' : 'text-red-800'}`}>
                    {req.status}
                  </Text>
                </View>
              </View>

              <Text className="text-slate-600 text-xs mb-1">Applicant Room: {req.applicantRoomDetails}</Text>
              <Text className="text-slate-600 text-xs mb-2">Target Room: {req.targetRoomDetails}</Text>
              <Text className="text-slate-500 text-xs italic mb-3">Reason: "{req.reason}"</Text>

              {req.status === 'PENDING' && req.targetUserId === user?.id && (
                <View className="flex-row space-x-2 mt-2">
                  <TouchableOpacity
                    onPress={() => handleRespondToSwap(req.id, 'ACCEPTED')}
                    className="flex-1 bg-emerald-600 py-2.5 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs">Accept Swap</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRespondToSwap(req.id, 'DECLINED')}
                    className="flex-1 bg-red-600 py-2.5 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs">Decline</Text>
                  </TouchableOpacity>
                </View>
              )}

              {req.status === 'PENDING' && req.applicantUserId === user?.id && (
                <TouchableOpacity
                  onPress={() => handleRespondToSwap(req.id, 'CANCELLED')}
                  className="bg-slate-500 py-2 rounded-xl items-center mt-2"
                >
                  <Text className="text-white font-bold text-xs">Cancel Request</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
