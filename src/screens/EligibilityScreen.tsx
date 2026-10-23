import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useEligibilityStore } from '../store/useEligibilityStore';

/**
 * EligibilityScreen Component.
 * Displays student hostel application eligibility status, school fee payment verification status,
 * priority quota tag, and disciplinary standing.
 * Allows students to manually sync tuition fee payment using their Remita RRR or payment reference.
 */
export const EligibilityScreen: React.FC = () => {
  // Get active user session from global auth store
  const { session } = useAuthStore();
  // Get eligibility actions and state from eligibility store
  const { eligibilityResult, isVerifying, error, checkEligibility, syncFees } = useEligibilityStore();

  // Local state for typed Remita payment reference code
  const [remitaRef, setRemitaRef] = useState('');
  // Local state for success message notification upon fee sync
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const userId = session?.user.id;

  // Automatically check eligibility when screen opens or active user ID changes
  useEffect(() => {
    if (userId) {
      checkEligibility(userId).catch(() => {});
    }
  }, [userId]);

  /**
   * Triggers fee sync when user taps 'Sync & Verify Payment'.
   */
  const handleSyncFee = async () => {
    if (!userId) return;
    if (!remitaRef.trim()) return;

    setSyncSuccessMsg(null);
    try {
      const updated = await syncFees(userId, remitaRef.trim(), 25000);
      if (updated.feesPaid) {
        setSyncSuccessMsg('Tuition fee payment verified and synced successfully!');
        setRemitaRef('');
      }
    } catch {
      // Store catches and sets error message state automatically
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Top Title Bar */}
        <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">Student Eligibility Status</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Hostel Application Eligibility & Tuition Fees Sync
          </Text>
        </View>

        {/* Loading Indicator */}
        {isVerifying && !eligibilityResult && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-3">Verifying records against Turso DB...</Text>
          </View>
        )}

        {/* Error Notification Box */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <Text className="text-red-800 font-semibold text-base mb-1">Verification Error</Text>
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Fee Sync Success Notification Box */}
        {syncSuccessMsg && (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
            <Text className="text-emerald-800 font-semibold text-base mb-1">Fee Sync Successful</Text>
            <Text className="text-emerald-700 text-sm">{syncSuccessMsg}</Text>
          </View>
        )}

        {/* Main Verification Details */}
        {eligibilityResult && (
          <>
            {/* Overall Eligibility Status Banner */}
            <View
              className={`p-5 rounded-2xl mb-4 border ${
                eligibilityResult.isEligible
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className={`text-lg font-bold ${
                    eligibilityResult.isEligible ? 'text-emerald-900' : 'text-amber-900'
                  }`}
                >
                  {eligibilityResult.isEligible ? 'ELIGIBLE FOR BALLOTING' : 'ACTION REQUIRED'}
                </Text>
                <View
                  className={`px-3 py-1 rounded-full ${
                    eligibilityResult.isEligible ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                >
                  <Text className="text-white text-xs font-bold uppercase">
                    {eligibilityResult.isEligible ? 'Approved' : 'Pending Sync'}
                  </Text>
                </View>
              </View>
              <Text
                className={`text-sm font-medium ${
                  eligibilityResult.isEligible ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                {eligibilityResult.statusMessage}
              </Text>
            </View>

            {/* Student Profile & Quota Tag Section */}
            <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Student Profile & Quota Tag
              </Text>

              <View className="space-y-3">
                <View className="flex-row justify-between py-1 border-b border-slate-100">
                  <Text className="text-slate-500 text-sm">Full Name</Text>
                  <Text className="text-slate-900 text-sm font-semibold">{eligibilityResult.fullName}</Text>
                </View>

                <View className="flex-row justify-between py-1 border-b border-slate-100">
                  <Text className="text-slate-500 text-sm">Matric / UTME No</Text>
                  <Text className="text-slate-900 text-sm font-semibold">{eligibilityResult.matricOrStaffNo}</Text>
                </View>

                <View className="flex-row justify-between py-1 border-b border-slate-100">
                  <Text className="text-slate-500 text-sm">Faculty & Dept</Text>
                  <Text className="text-slate-900 text-sm font-semibold">
                    {eligibilityResult.faculty} - {eligibilityResult.department}
                  </Text>
                </View>

                <View className="flex-row justify-between py-1 border-b border-slate-100">
                  <Text className="text-slate-500 text-sm">Level & Campus</Text>
                  <Text className="text-slate-900 text-sm font-semibold">
                    {eligibilityResult.level}L ({eligibilityResult.campus})
                  </Text>
                </View>

                <View className="flex-row justify-between py-1">
                  <Text className="text-slate-500 text-sm">Priority Quota Category</Text>
                  <View className="bg-[#7A0000] px-2.5 py-0.5 rounded-lg">
                    <Text className="text-white text-xs font-bold">{eligibilityResult.priorityCategory}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Verification Matrix Checklist */}
            <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Verification Matrix
              </Text>

              <View className="space-y-3">
                <View className="flex-row justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <View>
                    <Text className="text-slate-800 font-semibold text-sm">Tuition Fees Status</Text>
                    <Text className="text-xs text-slate-500">UNILAG Bursary Sync</Text>
                  </View>
                  <Text
                    className={`text-sm font-bold ${
                      eligibilityResult.feesPaid ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {eligibilityResult.feesPaid ? 'VERIFIED' : 'UNPAID'}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <View>
                    <Text className="text-slate-800 font-semibold text-sm">Disciplinary Record</Text>
                    <Text className="text-xs text-slate-500">Student Affairs Division</Text>
                  </View>
                  <Text
                    className={`text-sm font-bold ${
                      eligibilityResult.disciplinaryStatus === 'CLEARED' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {eligibilityResult.disciplinaryStatus}
                  </Text>
                </View>
              </View>
            </View>

            {/* Remita Fee Sync Section (Shown when fees are unpaid) */}
            {!eligibilityResult.feesPaid && (
              <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
                <Text className="text-sm font-bold text-slate-900 mb-1">Sync Tuition Fee Payment</Text>
                <Text className="text-xs text-slate-500 mb-3">
                  If you have paid your tuition fees, enter your Remita RRR or Transaction Reference to sync with the database.
                </Text>

                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm mb-3"
                  placeholder="Enter Remita RRR / Transaction Reference"
                  value={remitaRef}
                  onChangeText={setRemitaRef}
                  autoCapitalize="characters"
                />

                <TouchableOpacity
                  className="bg-[#7A0000] h-12 rounded-xl justify-center items-center active:opacity-90"
                  onPress={handleSyncFee}
                  disabled={isVerifying || !remitaRef.trim()}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-bold">Sync & Verify Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Refresh Eligibility Button */}
            <TouchableOpacity
              className="bg-slate-800 h-12 rounded-xl justify-center items-center active:opacity-90"
              onPress={() => userId && checkEligibility(userId)}
              disabled={isVerifying}
            >
              <Text className="text-white text-sm font-semibold">Re-check Eligibility Status</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
