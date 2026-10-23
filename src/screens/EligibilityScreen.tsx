import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useEligibilityStore } from '../store/useEligibilityStore';
import { validateRemitaRef } from '../utils/validation';

/**
 * EligibilityScreen Component.
 * Displays student hostel application eligibility status, school fee payment verification status,
 * course registration verification, priority quota tag, disciplinary standing, fee payment audit trail, and digital clearance progress.
 * Allows students to manually sync tuition fee payment using Remita RRR references and submit documents for digital clearance.
 */
export const EligibilityScreen: React.FC = () => {
  // Get active user session from global auth store
  const { session } = useAuthStore();
  // Get eligibility actions and state from eligibility store
  const { eligibilityResult, isVerifying, error, checkEligibility, syncFees, updateClearance } = useEligibilityStore();

  // Local state for typed Remita payment reference code
  const [remitaRef, setRemitaRef] = useState('');
  // Local state for input validation error
  const [validationError, setValidationError] = useState<string | null>(null);
  // Local state for success message notification upon fee sync or clearance submission
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const userId = session?.user.id;

  // Automatically check eligibility when screen opens or active user ID changes
  useEffect(() => {
    if (userId) {
      checkEligibility(userId).catch(() => {});
    }
  }, [userId]);

  /**
   * Triggers fee sync when user taps 'Sync & Verify Payment'.
   * Validates Remita RRR format before sending request to Turso DB.
   */
  const handleSyncFee = async () => {
    if (!userId) return;

    setValidationError(null);
    setSuccessMsg(null);

    // Validate Remita RRR / Transaction Reference format
    const val = validateRemitaRef(remitaRef);
    if (!val.isValid) {
      setValidationError(val.error || 'Invalid Remita reference format.');
      return;
    }

    try {
      const updated = await syncFees(userId, remitaRef.trim(), 25000, 'TUITION_FEE');
      if (updated.feesPaid) {
        setSuccessMsg('Tuition fee payment verified and synced successfully!');
        setRemitaRef('');
      }
    } catch {
      // Store catches and sets error message state automatically
    }
  };

  /**
   * Triggers digital document clearance submission when student taps 'Submit for Digital Clearance'.
   */
  const handleSubmitClearance = async () => {
    if (!userId) return;

    setValidationError(null);
    setSuccessMsg(null);
    try {
      const updated = await updateClearance(userId, 'PENDING');
      if (updated.clearanceStatus === 'PENDING') {
        setSuccessMsg('Digital clearance request submitted successfully! Pending warden review.');
      }
    } catch {
      // Store catches error automatically
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Top Title Bar */}
        <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">Student Eligibility & Clearance</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Hostel Application Eligibility, Fee Sync & Digital Clearance
          </Text>
        </View>

        {/* Loading Indicator */}
        {isVerifying && !eligibilityResult && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-3">Verifying records against Turso DB...</Text>
          </View>
        )}

        {/* Local Input Validation Error */}
        {validationError && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <Text className="text-amber-800 font-semibold text-base mb-1">Input Validation Error</Text>
            <Text className="text-amber-700 text-sm">{validationError}</Text>
          </View>
        )}

        {/* Error Notification Box */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <Text className="text-red-800 font-semibold text-base mb-1">Verification Error</Text>
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Success Notification Box */}
        {successMsg && (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
            <Text className="text-emerald-800 font-semibold text-base mb-1">Action Successful</Text>
            <Text className="text-emerald-700 text-sm">{successMsg}</Text>
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
                    {eligibilityResult.isEligible ? 'Approved' : 'Pending Verification'}
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
                {/* Tuition Fees Check */}
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

                {/* Semester Course Registration Check */}
                <View className="flex-row justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <View>
                    <Text className="text-slate-800 font-semibold text-sm">Course Registration</Text>
                    <Text className="text-xs text-slate-500">Academic Affairs Portal</Text>
                  </View>
                  <Text
                    className={`text-sm font-bold ${
                      eligibilityResult.courseRegistered ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {eligibilityResult.courseRegistered ? 'VERIFIED' : 'UNREGISTERED'}
                  </Text>
                </View>

                {/* Disciplinary Standing Check */}
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

            {/* Verified Fee Payment History Section */}
            {eligibilityResult.paymentHistory && eligibilityResult.paymentHistory.length > 0 && (
              <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Fee Payment History
                </Text>
                <View className="space-y-2">
                  {eligibilityResult.paymentHistory.map((item) => (
                    <View key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-900 font-semibold text-xs">{item.transactionReference}</Text>
                        <Text className="text-emerald-700 font-bold text-xs">₦{item.amount.toLocaleString()}</Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-slate-500 text-xs">{item.paymentType}</Text>
                        <Text className="text-slate-400 text-xs">{new Date(item.paidAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Digital Document Clearance Section */}
            <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-bold text-slate-900">Digital Document Clearance</Text>
                <View
                  className={`px-2.5 py-0.5 rounded-lg ${
                    eligibilityResult.clearanceStatus === 'APPROVED'
                      ? 'bg-emerald-600'
                      : eligibilityResult.clearanceStatus === 'PENDING'
                      ? 'bg-amber-500'
                      : eligibilityResult.clearanceStatus === 'REJECTED'
                      ? 'bg-red-600'
                      : 'bg-slate-500'
                  }`}
                >
                  <Text className="text-white text-xs font-bold uppercase">{eligibilityResult.clearanceStatus}</Text>
                </View>
              </View>

              <Text className="text-xs text-slate-500 mb-4">
                {eligibilityResult.clearanceStatus === 'APPROVED'
                  ? 'Your clearance documents have been approved by the Hall Warden.'
                  : eligibilityResult.clearanceStatus === 'PENDING'
                  ? 'Your clearance package is under review by the Hall Warden & Porter team.'
                  : eligibilityResult.clearanceStatus === 'REJECTED'
                  ? 'Clearance rejected. Please re-submit valid document records.'
                  : 'Submit your student medical certificate and passport photo for warden screening.'}
              </Text>

              {eligibilityResult.clearanceStatus === 'NOT_STARTED' && (
                <TouchableOpacity
                  className="bg-[#7A0000] h-12 rounded-xl justify-center items-center active:opacity-90"
                  onPress={handleSubmitClearance}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-bold">Submit Documents for Clearance</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Remita Fee Sync Section (Shown when fees are unpaid) */}
            {!eligibilityResult.feesPaid && (
              <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
                <Text className="text-sm font-bold text-slate-900 mb-1">Sync Tuition Fee Payment</Text>
                <Text className="text-xs text-slate-500 mb-3">
                  If you have paid your tuition fees, enter your 12-digit Remita Retrieval Reference (RRR) to sync with the database.
                </Text>

                <TextInput
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm mb-3"
                  placeholder="Enter Remita RRR (e.g. 123456789012)"
                  value={remitaRef}
                  onChangeText={(text) => {
                    setRemitaRef(text);
                    if (validationError) setValidationError(null);
                  }}
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
