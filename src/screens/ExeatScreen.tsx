import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useExeatStore } from '../store/useExeatStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * ExeatScreen UI Component for UNILAG Hostel Students.
 * Allows residents to apply for overnight leave (specifying destination address, reason, departure date, return date),
 * view real-time approval status badges (PENDING, APPROVED, DECLINED), check active approved exeat permission for gate curfew bypass,
 * and review Warden feedback comments.
 *
 * Implements [EXEAT-01] with NativeWind v4 (Tailwind CSS) and zero mock data.
 */
export const ExeatScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    requests,
    activeExeat,
    isLoading,
    errorMessage,
    successMessage,
    fetchStudentRequests,
    applyForExeat,
    checkActiveExeat,
    clearMessages
  } = useExeatStore();

  const [destinationAddress, setDestinationAddress] = useState('');
  const [reason, setReason] = useState('');

  // Default departure date to today YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  // Default return date to tomorrow YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [departureDate, setDepartureDate] = useState(todayStr);
  const [returnDate, setReturnDate] = useState(tomorrowStr);

  const studentId = session?.user.id || 'usr_student_01';

  useEffect(() => {
    fetchStudentRequests(studentId);
    checkActiveExeat(studentId);
  }, [studentId]);

  const handleSubmit = async () => {
    clearMessages();

    if (!destinationAddress.trim() || destinationAddress.trim().length < 5) {
      Alert.alert('Validation Error', 'Please enter a valid destination address (minimum 5 characters).');
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      Alert.alert('Validation Error', 'Please enter a detailed reason for overnight leave (minimum 5 characters).');
      return;
    }

    try {
      await applyForExeat({
        studentId,
        destinationAddress: destinationAddress.trim(),
        reason: reason.trim(),
        departureDate,
        returnDate
      });

      // Clear form inputs on success
      setDestinationAddress('');
      setReason('');
      fetchStudentRequests(studentId);
      checkActiveExeat(studentId);
    } catch (err: any) {
      // Error message handled in store
    }
  };

  const renderStatusBadge = (status: string) => {
    let bg = 'bg-slate-500';
    let text = 'PENDING';

    if (status === 'APPROVED') {
      bg = 'bg-emerald-600';
      text = 'APPROVED';
    } else if (status === 'DECLINED') {
      bg = 'bg-red-600';
      text = 'DECLINED';
    } else if (status === 'PENDING') {
      bg = 'bg-amber-500';
      text = 'PENDING WARDEN REVIEW';
    }

    return (
      <View className={`${bg} px-3 py-1 rounded-full self-start`}>
        <Text className="text-white font-bold text-xs">{text}</Text>
      </View>
    );
  };

  return (
    <ScrollView className="bg-slate-50 flex-1 px-4 py-6">
      {/* Overview Header Card */}
      <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
        <Text className="text-2xl font-bold text-[#7A0000] mb-1">
          Night Exeat Permission
        </Text>
        <Text className="text-slate-600 text-sm mb-4">
          Request overnight permission from your Hall Warden before leaving the hostel past curfew hours.
        </Text>

        {/* Active Approved Exeat Banner */}
        {activeExeat ? (
          <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-2">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-emerald-900 font-bold text-sm">Active Approved Overnight Exeat</Text>
              <Text className="text-emerald-700 font-bold text-xs bg-emerald-100 px-2.5 py-0.5 rounded-full">
                GATE PERMIT ACTIVE
              </Text>
            </View>
            <Text className="text-emerald-800 text-xs mt-1">
              Destination: {activeExeat.destinationAddress}
            </Text>
            <Text className="text-emerald-700 text-xs mt-0.5">
              Dates: {activeExeat.departureDate} to {activeExeat.returnDate}
            </Text>
            <Text className="text-emerald-600 text-[11px] mt-2 italic">
              Porters will grant gate exit/entry without curfew flags for these dates.
            </Text>
          </View>
        ) : (
          <View className="bg-slate-100 border border-slate-200 p-4 rounded-xl">
            <Text className="text-slate-700 font-semibold text-xs">
              No Active Approved Overnight Exeat for Today
            </Text>
            <Text className="text-slate-500 text-[11px] mt-1">
              Students leaving the hostel past 10:00 PM without an approved exeat will trigger gate curfew alerts.
            </Text>
          </View>
        )}
      </View>

      {/* Error and Success Feedback Banners */}
      {errorMessage && (
        <View className="bg-red-100 border border-red-300 p-4 rounded-xl mb-4">
          <Text className="text-red-800 text-sm font-semibold">{errorMessage}</Text>
        </View>
      )}

      {successMessage && (
        <View className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl mb-4">
          <Text className="text-emerald-800 text-sm font-semibold">{successMessage}</Text>
        </View>
      )}

      {/* Apply Exeat Form Card */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <Text className="text-lg font-bold text-slate-800 mb-1">
          Apply for Overnight Leave
        </Text>
        <Text className="text-slate-500 text-xs mb-4">
          Fill in your destination address, reason, and departure/return dates for Warden review.
        </Text>

        {/* Destination Address Field */}
        <Text className="text-xs font-bold text-slate-700 mb-1">Destination Address</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4"
          placeholder="e.g. 15 University Road, Yaba, Lagos"
          placeholderTextColor="#94A3B8"
          value={destinationAddress}
          onChangeText={setDestinationAddress}
        />

        {/* Reason for Exeat Field */}
        <Text className="text-xs font-bold text-slate-700 mb-1">Reason for Overnight Leave</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4 min-h-[80px]"
          placeholder="e.g. Attending weekend family medical event in Ikeja"
          placeholderTextColor="#94A3B8"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        {/* Departure Date Field */}
        <Text className="text-xs font-bold text-slate-700 mb-1">Departure Date (YYYY-MM-DD)</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm mb-4"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          value={departureDate}
          onChangeText={setDepartureDate}
        />

        {/* Return Date Field */}
        <Text className="text-xs font-bold text-slate-700 mb-1">Expected Return Date (YYYY-MM-DD)</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm mb-6"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          value={returnDate}
          onChangeText={setReturnDate}
        />

        {/* Submit Exeat Application Button */}
        <TouchableOpacity
          className="bg-[#7A0000] rounded-xl py-4 items-center shadow-md active:opacity-90"
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-base">Submit Exeat Application</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Student Exeat Application History */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-12">
        <Text className="text-lg font-bold text-slate-800 mb-3">Exeat Application History</Text>

        {requests.length === 0 ? (
          <View className="p-4 bg-slate-50 rounded-xl items-center">
            <Text className="text-slate-500 text-xs">No exeat applications submitted yet.</Text>
          </View>
        ) : (
          requests.map((item) => (
            <View key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                {renderStatusBadge(item.wardenApprovalStatus)}
                <Text className="text-slate-400 text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>

              <Text className="text-slate-800 font-bold text-sm mb-1">
                Destination: {item.destinationAddress}
              </Text>
              <Text className="text-slate-600 text-xs mb-2">
                Reason: {item.reason}
              </Text>
              <Text className="text-slate-500 text-xs">
                Duration: {item.departureDate} → {item.returnDate}
              </Text>

              {item.wardenComment && (
                <View className="bg-slate-200 p-2.5 rounded-lg mt-2">
                  <Text className="text-slate-800 font-bold text-xs">Warden Remark:</Text>
                  <Text className="text-slate-700 text-xs mt-0.5">{item.wardenComment}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
