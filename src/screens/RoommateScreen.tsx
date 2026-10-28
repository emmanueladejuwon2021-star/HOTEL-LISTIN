import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useRoommateStore } from '../store/useRoommateStore';
import { SleepSchedule, StudyHabit, CleanlinessLevel, NoiseTolerance, GuestFrequency, RoommateSurvey } from '../types/roommate';

export const RoommateScreen: React.FC = () => {
  const { session } = useAuthStore();
  const user = session?.user;
  const {
    survey,
    matches,
    bedswapRequests,
    isLoading,
    error,
    fetchSurvey,
    saveSurvey,
    fetchMatches,
    fetchBedswapRequests,
    createBedswapRequest,
    respondToBedswapRequest,
    clearError
  } = useRoommateStore();

  const [activeTab, setActiveTab] = useState<'SURVEY' | 'MATCHES' | 'REQUESTS'>('SURVEY');

  // Form states
  const [sleepSchedule, setSleepSchedule] = useState<SleepSchedule>('EARLY_BIRD');
  const [studyHabit, setStudyHabit] = useState<StudyHabit>('QUIET_STUDY');
  const [cleanlinessLevel, setCleanlinessLevel] = useState<CleanlinessLevel>('NEAT_FREAK');
  const [noiseTolerance, setNoiseTolerance] = useState<NoiseTolerance>('SILENT');
  const [guestFrequency, setGuestFrequency] = useState<GuestFrequency>('NEVER');
  const [smokingOrAlcohol, setSmokingOrAlcohol] = useState<boolean>(false);
  const [hobbies, setHobbies] = useState<string>('');

  // Swap modal state
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [swapReason, setSwapReason] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      fetchSurvey(user.id);
      fetchMatches(user.id);
      fetchBedswapRequests(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (survey) {
      setSleepSchedule(survey.sleepSchedule);
      setStudyHabit(survey.studyHabit);
      setCleanlinessLevel(survey.cleanlinessLevel);
      setNoiseTolerance(survey.noiseTolerance);
      setGuestFrequency(survey.guestFrequency);
      setSmokingOrAlcohol(survey.smokingOrAlcohol);
      setHobbies(survey.hobbies || '');
    }
  }, [survey]);

  const handleSaveSurvey = async () => {
    if (!user?.id) return;
    const surveyData: RoommateSurvey = {
      userId: user.id,
      sleepSchedule,
      studyHabit,
      cleanlinessLevel,
      noiseTolerance,
      guestFrequency,
      smokingOrAlcohol,
      hobbies
    };
    await saveSurvey(surveyData);
    Alert.alert('Survey Saved', 'Your roommate lifestyle preferences have been updated!');
    setActiveTab('MATCHES');
  };

  const handleInitiateSwap = async () => {
    if (!user?.id || !selectedTargetId) return;
    if (!swapReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for your bed swap request.');
      return;
    }
    await createBedswapRequest(user.id, selectedTargetId, swapReason);
    setSelectedTargetId(null);
    setSwapReason('');
    Alert.alert('Swap Request Sent', 'Your mutual bed swap request has been sent to the student!');
    setActiveTab('REQUESTS');
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Header */}
      <View className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Roommate Compatibility & Bedswap</Text>
        <Text className="text-sm text-slate-500">
          Find lifestyle-compatible roommates and execute mutual room swap requests.
        </Text>
      </View>

      {/* Error Alert */}
      {error && (
        <View className="bg-red-100 border border-red-300 p-4 rounded-2xl mb-4 flex-row justify-between items-center">
          <Text className="text-red-700 text-sm flex-1 font-medium">{error}</Text>
          <TouchableOpacity onPress={clearError} className="ml-2 bg-red-200 px-3 py-1 rounded-lg">
            <Text className="text-red-800 font-bold text-xs">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Tabs */}
      <View className="flex-row bg-slate-200 p-1.5 rounded-2xl mb-4">
        <TouchableOpacity
          onPress={() => setActiveTab('SURVEY')}
          className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'SURVEY' ? 'bg-[#7A0000]' : ''}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'SURVEY' ? 'text-white' : 'text-slate-700'}`}>
            Lifestyle Survey
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('MATCHES')}
          className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'MATCHES' ? 'bg-[#7A0000]' : ''}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'MATCHES' ? 'text-white' : 'text-slate-700'}`}>
            Matches ({matches.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('REQUESTS')}
          className={`flex-1 py-3 items-center rounded-xl ${activeTab === 'REQUESTS' ? 'bg-[#7A0000]' : ''}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'REQUESTS' ? 'text-white' : 'text-slate-700'}`}>
            Swap Queue ({bedswapRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator size="large" color="#7A0000" className="my-6" />}

      {/* Tab 1: Lifestyle Survey Form */}
      {activeTab === 'SURVEY' && (
        <View className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-8 space-y-4">
          <Text className="text-lg font-bold text-slate-800 mb-2">1. Sleep Schedule</Text>
          <View className="flex-row space-x-2 mb-4">
            {(['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE'] as SleepSchedule[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSleepSchedule(opt)}
                className={`flex-1 py-3 px-2 rounded-xl border items-center ${
                  sleepSchedule === opt ? 'bg-amber-100 border-amber-600' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <Text className={`font-semibold text-xs ${sleepSchedule === opt ? 'text-amber-900' : 'text-slate-700'}`}>
                  {opt.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-lg font-bold text-slate-800 mb-2">2. Study Habits</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {(['QUIET_STUDY', 'GROUP_STUDY', 'BACKGROUND_MUSIC', 'LIBRARY_ONLY'] as StudyHabit[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setStudyHabit(opt)}
                className={`py-2.5 px-3 rounded-xl border items-center ${
                  studyHabit === opt ? 'bg-amber-100 border-amber-600' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <Text className={`font-semibold text-xs ${studyHabit === opt ? 'text-amber-900' : 'text-slate-700'}`}>
                  {opt.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-lg font-bold text-slate-800 mb-2">3. Cleanliness Preference</Text>
          <View className="flex-row space-x-2 mb-4">
            {(['NEAT_FREAK', 'MODERATELY_CLEAN', 'CASUAL'] as CleanlinessLevel[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setCleanlinessLevel(opt)}
                className={`flex-1 py-3 px-2 rounded-xl border items-center ${
                  cleanlinessLevel === opt ? 'bg-amber-100 border-amber-600' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <Text className={`font-semibold text-xs ${cleanlinessLevel === opt ? 'text-amber-900' : 'text-slate-700'}`}>
                  {opt.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-lg font-bold text-slate-800 mb-2">4. Noise Tolerance</Text>
          <View className="flex-row space-x-2 mb-4">
            {(['SILENT', 'MODERATE', 'LOUD_OK'] as NoiseTolerance[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setNoiseTolerance(opt)}
                className={`flex-1 py-3 px-2 rounded-xl border items-center ${
                  noiseTolerance === opt ? 'bg-amber-100 border-amber-600' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <Text className={`font-semibold text-xs ${noiseTolerance === opt ? 'text-amber-900' : 'text-slate-700'}`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-lg font-bold text-slate-800 mb-2">5. Guest Frequency</Text>
          <View className="flex-row space-x-2 mb-4">
            {(['NEVER', 'OCCASIONAL', 'FREQUENT'] as GuestFrequency[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setGuestFrequency(opt)}
                className={`flex-1 py-3 px-2 rounded-xl border items-center ${
                  guestFrequency === opt ? 'bg-amber-100 border-amber-600' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <Text className={`font-semibold text-xs ${guestFrequency === opt ? 'text-amber-900' : 'text-slate-700'}`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-lg font-bold text-slate-800 mb-2">6. Hobbies & Interests</Text>
          <TextInput
            value={hobbies}
            onChangeText={setHobbies}
            placeholder="e.g. Football, Reading, Coding, Gaming"
            className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-sm mb-6"
          />

          <TouchableOpacity
            onPress={handleSaveSurvey}
            className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md active:opacity-90"
          >
            <Text className="text-white font-bold text-base">Save Preferences & Find Matches</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab 2: Compatibility Matches */}
      {activeTab === 'MATCHES' && (
        <View className="mb-8">
          {matches.length === 0 ? (
            <View className="bg-white p-6 rounded-3xl border border-slate-200 items-center">
              <Text className="text-slate-600 font-medium text-center">
                No roommate matches found yet. Please complete your lifestyle survey first or check back later!
              </Text>
            </View>
          ) : (
            matches.map((m) => (
              <View key={m.userId} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-lg font-bold text-slate-900">{m.fullName}</Text>
                  <View className="bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                    <Text className="text-emerald-800 font-extrabold text-xs">
                      {m.compatibilityScore}% Match
                    </Text>
                  </View>
                </View>

                <Text className="text-xs text-slate-500 mb-1">
                  {m.faculty} • {m.department} ({m.level}L)
                </Text>
                <Text className="text-xs text-amber-800 font-semibold mb-3">
                  Allocated: {m.hostelName} - Room {m.roomNumber} ({m.bedLabel})
                </Text>

                <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-4 flex-row flex-wrap gap-2">
                  <Text className="text-xs text-slate-600 font-medium">💤 {m.survey.sleepSchedule}</Text>
                  <Text className="text-xs text-slate-600 font-medium">📚 {m.survey.studyHabit}</Text>
                  <Text className="text-xs text-slate-600 font-medium">🧹 {m.survey.cleanlinessLevel}</Text>
                </View>

                {selectedTargetId === m.userId ? (
                  <View className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3">
                    <Text className="text-sm font-bold text-amber-900 mb-1">Reason for Bed Swap Request:</Text>
                    <TextInput
                      value={swapReason}
                      onChangeText={setSwapReason}
                      placeholder="e.g. Seeking quieter study environment in same hostel block"
                      className="bg-white border border-amber-300 rounded-xl p-3 text-sm text-slate-800"
                    />
                    <View className="flex-row space-x-2 pt-2">
                      <TouchableOpacity
                        onPress={() => setSelectedTargetId(null)}
                        className="flex-1 bg-slate-300 py-3 rounded-xl items-center"
                      >
                        <Text className="text-slate-800 font-bold text-xs">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleInitiateSwap}
                        className="flex-1 bg-emerald-700 py-3 rounded-xl items-center"
                      >
                        <Text className="text-white font-bold text-xs">Send Swap Request</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setSelectedTargetId(m.userId)}
                    className="bg-[#7A0000] py-3 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs">Request Bed Swap</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Tab 3: Bedswap Request Manager Queue */}
      {activeTab === 'REQUESTS' && (
        <View className="mb-8">
          {bedswapRequests.length === 0 ? (
            <View className="bg-white p-6 rounded-3xl border border-slate-200 items-center">
              <Text className="text-slate-600 font-medium text-center">
                No bedswap requests found in your history.
              </Text>
            </View>
          ) : (
            bedswapRequests.map((req) => {
              const isTarget = req.targetStudentId === user?.id;
              return (
                <View key={req.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-bold text-slate-800">
                      {isTarget ? `Incoming Swap from ${req.requesterName}` : `Outgoing Swap to ${req.targetStudentName}`}
                    </Text>
                    <View className="bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                      <Text className="text-amber-900 font-bold text-xs">{req.status}</Text>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-600 mb-1">
                    Requester Room: <Text className="font-semibold text-slate-800">{req.requesterRoom}</Text> ↔ Target Room: <Text className="font-semibold text-slate-800">{req.targetRoom}</Text>
                  </Text>
                  <Text className="text-xs text-slate-500 italic mb-3">"{req.reason}"</Text>

                  {/* Partner Action Buttons if incoming pending partner */}
                  {isTarget && req.status === 'PENDING_PARTNER' && (
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={() => respondToBedswapRequest(req.id, user.id, false)}
                        className="flex-1 bg-red-600 py-3 rounded-xl items-center"
                      >
                        <Text className="text-white font-bold text-xs">Decline Swap</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => respondToBedswapRequest(req.id, user.id, true)}
                        className="flex-1 bg-emerald-700 py-3 rounded-xl items-center"
                      >
                        <Text className="text-white font-bold text-xs">Accept Swap</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
};
