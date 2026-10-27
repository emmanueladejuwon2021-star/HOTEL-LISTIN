import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useExeatStore } from '../store/useExeatStore';
import { useAuthStore } from '../store/useAuthStore';
import { ExeatApprovalStatus } from '../types/exeat';

/**
 * Screen Component for Night Exeat Application & Overnight Pass [EXEAT-01 - EXEAT-05].
 * Allows UNILAG hostel students to apply for overnight leave outside the hostel,
 * input destination address, reason, departure date, return date, and guardian emergency contact number.
 * Displays real-time status of exeat requests (PENDING, APPROVED, DECLINED, CANCELLED) with Warden notes.
 */
export const ExeatApplicationScreen: React.FC = () => {
  const { session } = useAuthStore();
  const { requests, isLoading, error, successMessage, fetchRequests, submitExeat, cancelExeat, clearMessages } = useExeatStore();

  const userId = session?.user.id || 'usr_student_01';

  const [destinationAddress, setDestinationAddress] = useState('');
  const [reason, setReason] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  useEffect(() => {
    fetchRequests(userId);

    // Default dates for convenience (e.g. today and tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setDepartureDate(today.toISOString().split('T')[0]);
    setReturnDate(tomorrow.toISOString().split('T')[0]);
    if (session?.user.phoneNumber) {
      setEmergencyContactPhone(session.user.phoneNumber);
    }
  }, [userId]);

  const handleSubmit = async () => {
    clearMessages();

    if (!destinationAddress.trim() || destinationAddress.trim().length < 5) {
      Alert.alert('Validation Error', 'Please enter a complete destination address (minimum 5 characters).');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      Alert.alert('Validation Error', 'Please state a valid reason for overnight absence (minimum 5 characters).');
      return;
    }
    if (!departureDate.trim() || !returnDate.trim()) {
      Alert.alert('Validation Error', 'Please select valid departure and return dates.');
      return;
    }
    if (new Date(returnDate).getTime() < new Date(departureDate).getTime()) {
      Alert.alert('Validation Error', 'Expected return date cannot be earlier than departure date.');
      return;
    }
    if (!emergencyContactPhone.trim() || emergencyContactPhone.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid emergency contact phone number (minimum 10 digits).');
      return;
    }

    try {
      await submitExeat({
        studentId: userId,
        destinationAddress: destinationAddress.trim(),
        reason: reason.trim(),
        departureDate: departureDate.trim(),
        returnDate: returnDate.trim(),
        emergencyContactPhone: emergencyContactPhone.trim()
      });

      // Clear form inputs on success
      setDestinationAddress('');
      setReason('');
      Alert.alert('Application Submitted', 'Your night exeat request has been submitted to your Hall Warden for review.');
    } catch (err: any) {
      // Error handled by store
    }
  };

  const handleCancel = (exeatId: string) => {
    Alert.alert(
      'Cancel Exeat Request',
      'Are you sure you want to cancel this pending exeat application?',
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelExeat(exeatId, userId);
            } catch (err) {}
          }
        }
      ]
    );
  };

  const renderStatusBadge = (status: ExeatApprovalStatus) => {
    let bg = 'bg-amber-100 text-amber-800 border-amber-300';
    let label = 'PENDING WARDEN REVIEW';

    if (status === 'APPROVED') {
      bg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      label = 'APPROVED BY WARDEN';
    } else if (status === 'DECLINED') {
      bg = 'bg-red-100 text-red-800 border-red-300';
      label = 'DECLINED BY WARDEN';
    } else if (status === 'CANCELLED') {
      bg = 'bg-slate-100 text-slate-700 border-slate-300';
      label = 'CANCELLED BY STUDENT';
    }

    return (
      <View className={`px-3 py-1 rounded-full border self-start my-1`}>
        <Text className={`font-bold text-xs ${bg}`}>{label}</Text>
      </View>
    );
  };

  return (
    <ScrollView className="bg-slate-50 flex-1 px-4 py-6">
      {/* Header Info Card */}
      <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
        <Text className="text-2xl font-bold text-[#7A0000] mb-1">
          Night Exeat & Overnight Pass
        </Text>
        <Text className="text-slate-600 text-sm">
          Apply for official permission to stay outside your UNILAG hostel overnight. Approved exeat status overrides gate curfew checks.
        </Text>
      </View>

      {/* Alert Banners */}
      {error && (
        <View className="bg-red-100 border border-red-300 p-4 rounded-xl mb-4">
          <Text className="text-red-800 text-sm font-semibold">{error}</Text>
        </View>
      )}

      {successMessage && (
        <View className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl mb-4">
          <Text className="text-emerald-800 text-sm font-semibold">{successMessage}</Text>
        </View>
      )}

      {/* Application Form */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <Text className="text-lg font-bold text-slate-800 mb-4">
          Submit New Exeat Request
        </Text>

        <Text className="text-xs font-bold text-slate-700 mb-1">Destination Address *</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-3"
          placeholder="Full address where you will be staying (e.g. 12 Yaba Road, Lagos)"
          placeholderTextColor="#94A3B8"
          value={destinationAddress}
          onChangeText={setDestinationAddress}
        />

        <Text className="text-xs font-bold text-slate-700 mb-1">Reason for Overnight Leave *</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-3"
          placeholder="State reason (e.g. Family emergency, Medical appointment)"
          placeholderTextColor="#94A3B8"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={2}
        />

        <View className="flex-row space-x-3 mb-3">
          <View className="flex-1">
            <Text className="text-xs font-bold text-slate-700 mb-1">Departure Date (YYYY-MM-DD) *</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={departureDate}
              onChangeText={setDepartureDate}
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-slate-700 mb-1">Expected Return Date *</Text>
            <TextInput
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={returnDate}
              onChangeText={setReturnDate}
            />
          </View>
        </View>

        <Text className="text-xs font-bold text-slate-700 mb-1">Emergency Guardian Phone Number *</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-5"
          placeholder="Parent / Guardian phone number (e.g. 08031234567)"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
        />

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

      {/* Exeat History Feed */}
      <View className="mb-12">
        <Text className="text-lg font-bold text-slate-800 mb-3">Your Exeat Request History</Text>
        {requests.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-slate-200 items-center">
            <Text className="text-slate-500 text-sm">No night exeat requests submitted yet.</Text>
          </View>
        ) : (
          requests.map((item) => (
            <View key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900">{item.reason}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">Destination: {item.destinationAddress}</Text>
                </View>
                {renderStatusBadge(item.wardenApprovalStatus)}
              </View>

              <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 my-2">
                <Text className="text-xs text-slate-700">
                  <Text className="font-bold">Date Range:</Text> {item.departureDate} to {item.returnDate}
                </Text>
                <Text className="text-xs text-slate-700 mt-1">
                  <Text className="font-bold">Emergency Contact:</Text> {item.emergencyContactPhone}
                </Text>
                <Text className="text-slate-400 text-[10px] mt-1">Submitted: {new Date(item.createdAt).toLocaleString()}</Text>
              </View>

              {item.wardenComments ? (
                <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mt-2">
                  <Text className="text-amber-900 font-bold text-xs">Warden Remark:</Text>
                  <Text className="text-amber-800 text-xs mt-0.5">{item.wardenComments}</Text>
                </View>
              ) : null}

              {item.wardenApprovalStatus === 'PENDING' && (
                <TouchableOpacity
                  className="bg-red-50 border border-red-200 rounded-xl py-2 mt-3 items-center active:opacity-80"
                  onPress={() => handleCancel(item.id)}
                >
                  <Text className="text-red-700 font-bold text-xs">Cancel Pending Exeat</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
