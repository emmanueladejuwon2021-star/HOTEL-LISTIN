import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { usePaymentStore } from '../store/usePaymentStore';

/**
 * 72-Hour Payment Hold & Remita Gateway Screen (PRD S-04).
 * Displays a countdown timer ring, provisional room reservation details,
 * Remita reference input field, and payment confirmation status.
 */
export const PaymentHoldScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    holdDetails,
    paymentResult,
    isLoading,
    isProcessing,
    error,
    formattedCountdown,
    fetchHoldStatus,
    payHostelFee,
    updateCountdownTimer
  } = usePaymentStore();

  const [remitaRefInput, setRemitaRefInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const userId = session?.user.id;

  // Fetch hold status on screen mount
  useEffect(() => {
    if (userId) {
      fetchHoldStatus(userId).catch(() => {});
    }
  }, [userId]);

  // Interval timer for 1-second countdown updates
  useEffect(() => {
    const timer = setInterval(() => {
      updateCountdownTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePayNow = async () => {
    setLocalError(null);
    if (!userId) {
      setLocalError('User session invalid. Please log in.');
      return;
    }

    if (!remitaRefInput.trim()) {
      setLocalError('Please enter a valid 12-digit Remita RRR or transaction reference.');
      return;
    }

    try {
      await payHostelFee(userId, remitaRefInput.trim());
      setRemitaRefInput('');
    } catch (e: any) {
      // Error is caught in store state or local error
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-6 items-center pb-12">
        {/* Header Title */}
        <View className="w-full bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900 text-center">Hostel Fee Payment</Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            72-Hour Provisional Reservation Hold & Remita Gateway
          </Text>
        </View>

        {isLoading && !holdDetails && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-3">Loading reservation hold status...</Text>
          </View>
        )}

        {(error || localError) && (
          <View className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <Text className="text-red-800 font-semibold text-base mb-1">Notice</Text>
            <Text className="text-red-700 text-sm">{localError || error}</Text>
          </View>
        )}

        {/* Successful Confirmation Banner */}
        {paymentResult && paymentResult.success && (
          <View className="w-full bg-emerald-50 border border-emerald-300 p-5 rounded-2xl mb-6 shadow-sm">
            <Text className="text-emerald-900 text-lg font-bold mb-1">PAYMENT CONFIRMED</Text>
            <Text className="text-emerald-800 text-sm mb-3">{paymentResult.message}</Text>
            <View className="bg-white p-4 rounded-xl border border-emerald-200">
              <Text className="text-xs text-slate-500">Transaction Reference</Text>
              <Text className="text-slate-900 font-bold text-sm mb-2">{paymentResult.transactionReference}</Text>
              <Text className="text-xs text-slate-500">Amount Paid</Text>
              <Text className="text-emerald-700 font-extrabold text-lg mb-2">₦{paymentResult.amount.toLocaleString()}</Text>
              <Text className="text-xs text-slate-500">Status</Text>
              <Text className="text-emerald-800 font-bold text-sm">Bedspace Status: CONFIRMED</Text>
            </View>
          </View>
        )}

        {/* Main Countdown Timer Ring (PRD S-04 Spec: w-48 h-48 rounded-full border-4 border-[#D4AF37]) */}
        {holdDetails && !holdDetails.isExpired && holdDetails.paymentStatus !== 'SUCCESSFUL' && (
          <>
            <View className="w-48 h-48 rounded-full border-4 border-[#D4AF37] justify-center items-center mb-6 bg-white shadow-lg">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Hold Time Left</Text>
              <Text className="text-2xl font-black text-slate-900 tracking-wider">{formattedCountdown}</Text>
              <Text className="text-[10px] text-amber-700 font-semibold mt-1">72-HR PAYMENT LOCK</Text>
            </View>

            {/* Provisional Room Summary Card (PRD S-04 Spec) */}
            <View className="bg-white w-full p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Provisional Accommodation Details
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600 text-sm font-medium">Hostel Name:</Text>
                <Text className="text-slate-900 font-bold text-sm">{holdDetails.hostelName}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600 text-sm font-medium">Block & Room:</Text>
                <Text className="text-slate-900 font-bold text-sm">
                  Block {holdDetails.blockName} — Room {holdDetails.roomNumber}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600 text-sm font-medium">Bedspace Position:</Text>
                <Text className="text-slate-900 font-bold text-sm">{holdDetails.bedLabel}</Text>
              </View>
              <View className="flex-row justify-between pt-3 border-t border-slate-100">
                <Text className="text-slate-600 text-sm font-medium">Hostel Fee Amount:</Text>
                <Text className="text-[#7A0000] font-extrabold text-lg">₦{holdDetails.amount.toLocaleString()}</Text>
              </View>
            </View>

            {/* Remita Payment Entry */}
            <View className="bg-white w-full p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
              <Text className="text-sm font-bold text-slate-800 mb-2">
                Enter Remita RRR or Transaction Reference
              </Text>
              <TextInput
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base mb-4"
                placeholder="e.g. 123456789012"
                placeholderTextColor="#94A3B8"
                value={remitaRefInput}
                onChangeText={setRemitaRefInput}
                autoCapitalize="characters"
              />

              {/* Pay Now Button (PRD S-04 Spec: bg-emerald-600) */}
              <TouchableOpacity
                className="bg-emerald-600 w-full py-4 rounded-xl items-center justify-center shadow-md active:opacity-90"
                disabled={isProcessing}
                onPress={handlePayNow}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-lg">Pay Hostel Fee (Confirm Reservation)</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Expired Hold Banner */}
        {holdDetails && holdDetails.isExpired && (
          <View className="bg-amber-50 border border-amber-300 p-6 rounded-2xl w-full items-center mb-6">
            <Text className="text-amber-900 font-bold text-lg mb-2">RESERVATION HOLD EXPIRED</Text>
            <Text className="text-amber-800 text-sm text-center mb-4">
              Your 72-hour bedspace hold time has elapsed. The bedspace position has been automatically recycled back to the available pool.
            </Text>
          </View>
        )}

        {/* Empty State when no active hold exists */}
        {!isLoading && !holdDetails && (
          <View className="bg-white p-8 rounded-2xl w-full items-center border border-slate-200">
            <Text className="text-slate-800 font-bold text-lg mb-2">No Active Bedspace Hold</Text>
            <Text className="text-slate-500 text-sm text-center">
              You do not currently have a provisional bedspace hold. Please go to the Balloting screen to select and lock an available bedspace.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
