import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useExeatStore } from '../store/useExeatStore';

/**
 * ExeatScreen Component.
 * Allows UNILAG students to submit overnight hostel leave (Night Exeat) applications,
 * view active approved leave status banners for curfew gate passage,
 * and track past exeat request history with Warden feedback.
 */
export const ExeatScreen: React.FC = () => {
  const { session } = useAuthStore();
  const userId = session?.user.id || '';
  const fullName = session?.user.fullName || 'Student';

  const {
    studentRequests,
    activeApprovedExeat,
    isLoading,
    isSubmitting,
    errorMessage,
    successMessage,
    fetchStudentRequests,
    fetchActiveExeat,
    submitExeat,
    clearMessages
  } = useExeatStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const [destinationAddress, setDestinationAddress] = useState('');
  const [reason, setReason] = useState('');
  const [departureDate, setDepartureDate] = useState(todayStr);
  const [returnDate, setReturnDate] = useState(todayStr);

  useEffect(() => {
    if (userId) {
      fetchStudentRequests(userId);
      fetchActiveExeat(userId);
    }
  }, [userId]);

  const handleSubmit = async () => {
    clearMessages();

    if (!destinationAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter your destination address.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter the reason for your overnight leave.');
      return;
    }
    if (!departureDate.trim()) {
      Alert.alert('Validation Error', 'Please select your departure date.');
      return;
    }
    if (!returnDate.trim()) {
      Alert.alert('Validation Error', 'Please select your expected return date.');
      return;
    }

    if (new Date(departureDate) > new Date(returnDate)) {
      Alert.alert('Invalid Dates', 'Departure date cannot be later than your return date.');
      return;
    }

    const success = await submitExeat({
      studentId: userId,
      destinationAddress: destinationAddress.trim(),
      reason: reason.trim(),
      departureDate: departureDate.trim(),
      returnDate: returnDate.trim()
    });

    if (success) {
      setDestinationAddress('');
      setReason('');
      setDepartureDate(todayStr);
      setReturnDate(todayStr);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DECLINED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView
        contentContainerClassName="p-5 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              if (userId) {
                fetchStudentRequests(userId);
                fetchActiveExeat(userId);
              }
            }}
            tintColor="#7A0000"
          />
        }
      >
        {/* Screen Header */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-2xl font-extrabold text-[#7A0000]">NIGHT EXEAT PERMISSION</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Apply for Warden approval for overnight leave. Approved passes grant gate curfew access.
          </Text>
          <Text className="text-slate-700 text-xs mt-3 font-semibold">
            Applicant: {fullName} ({session?.user.email})
          </Text>
        </View>

        {/* Active Approved Permit Banner */}
        {activeApprovedExeat ? (
          <View className="bg-emerald-800 p-5 rounded-2xl border border-emerald-900 shadow-sm mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center space-x-2">
                <Text className="text-xl">🌙</Text>
                <Text className="text-white font-extrabold text-base">ACTIVE OVERNIGHT PERMIT</Text>
              </View>
              <View className="bg-emerald-600 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">APPROVED</Text>
              </View>
            </View>
            <Text className="text-emerald-100 text-xs mb-3">
              Your overnight leave permission is active. Present your dynamic QR gate pass to porters during curfew hours (10:00 PM - 5:00 AM).
            </Text>
            <View className="bg-emerald-900/60 p-3 rounded-xl border border-emerald-700/50">
              <Text className="text-emerald-200 text-xs font-semibold">
                📍 Destination: {activeApprovedExeat.destinationAddress}
              </Text>
              <Text className="text-emerald-200 text-xs font-semibold mt-1">
                📅 Period: {activeApprovedExeat.departureDate} to {activeApprovedExeat.returnDate}
              </Text>
            </View>
          </View>
        ) : (
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-5">
            <Text className="text-amber-800 text-xs font-semibold">
              ⚠️ No active overnight permit for today. Entry past 10:00 PM will trigger a curfew flag unless an approved exeat is on file.
            </Text>
          </View>
        )}

        {/* Feedback Banners */}
        {errorMessage && (
          <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
            <Text className="text-red-700 text-xs font-semibold">{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
            <Text className="text-emerald-800 text-xs font-semibold">{successMessage}</Text>
          </View>
        )}

        {/* Night Exeat Application Form */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-base font-bold text-slate-900 mb-4">New Exeat Request</Text>

          {/* Destination Address */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1">Destination Address *</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
              placeholder="e.g., 12 Victoria Island Road, Lagos"
              value={destinationAddress}
              onChangeText={setDestinationAddress}
            />
          </View>

          {/* Reason */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1">Reason for Leave *</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
              placeholder="e.g., Family event / Medical appointment"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Date Grid */}
          <View className="flex-row space-x-3 mb-5">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-600 mb-1">Departure Date *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
                placeholder="YYYY-MM-DD"
                value={departureDate}
                onChangeText={setDepartureDate}
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-600 mb-1">Expected Return Date *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
                placeholder="YYYY-MM-DD"
                value={returnDate}
                onChangeText={setReturnDate}
              />
            </View>
          </View>

          {/* Submit CTA */}
          <TouchableOpacity
            className="bg-[#7A0000] py-4 rounded-xl items-center shadow-md active:opacity-90"
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-base">Submit Exeat Application</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* History Feed */}
        <View className="mb-4">
          <Text className="text-base font-bold text-slate-900 mb-3">Application History</Text>

          {isLoading ? (
            <ActivityIndicator color="#7A0000" className="py-6" />
          ) : studentRequests.length === 0 ? (
            <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
              <Text className="text-slate-400 text-xs">No exeat applications submitted yet.</Text>
            </View>
          ) : (
            studentRequests.map(req => (
              <View
                key={req.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-bold text-slate-500">
                    ID: {req.id.substring(0, 14)}...
                  </Text>
                  <View className={`px-2.5 py-1 rounded-full border ${getStatusBadgeClass(req.wardenApprovalStatus)}`}>
                    <Text className="text-xs font-extrabold">{req.wardenApprovalStatus}</Text>
                  </View>
                </View>

                <Text className="text-sm font-semibold text-slate-800 mb-1">
                  📍 {req.destinationAddress}
                </Text>
                <Text className="text-xs text-slate-600 mb-2">
                  📝 {req.reason}
                </Text>

                <View className="bg-slate-50 p-2.5 rounded-xl flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500">
                    📅 {req.departureDate} → {req.returnDate}
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    {req.createdAt.split('T')[0]}
                  </Text>
                </View>

                {req.wardenComment && (
                  <View className="mt-2.5 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    <Text className="text-xs font-bold text-slate-700">Warden Comment:</Text>
                    <Text className="text-xs text-slate-600 mt-0.5">{req.wardenComment}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
