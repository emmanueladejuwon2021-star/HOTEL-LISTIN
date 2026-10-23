import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useReservationStore } from '../store/useReservationStore';

/**
 * Screen Component S-04: 72-Hour Payment Hold Status Screen
 * Displays a student's provisional hostel room booking summary, 72-hour countdown timer ring,
 * and direct Remita payment confirmation action button.
 */
export const PaymentHoldScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    paymentHold,
    isLoading,
    isConfirmingPayment,
    error,
    fetchPaymentHoldDetails,
    confirmPayment,
    releaseHold
  } = useReservationStore();

  const userId = session?.user.id;
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Load payment hold details from Turso DB on mount
  useEffect(() => {
    if (userId) {
      fetchPaymentHoldDetails(userId).then((hold) => {
        if (hold) {
          setSecondsLeft(hold.secondsRemaining);
        }
      }).catch(() => {});
    }
  }, [userId]);

  // Active 1-second interval timer for the countdown ring
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (userId) {
            fetchPaymentHoldDetails(userId).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, userId]);

  // Format seconds into HH:MM:SS
  const formatTimer = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  const handleConfirmPayNow = async () => {
    if (!userId || !paymentHold) return;
    try {
      await confirmPayment(userId, paymentHold.paymentId);
      Alert.alert('Payment Successful', 'Your Remita payment has been confirmed and your hostel space is secured!');
    } catch (err) {
      // Error message set in store
    }
  };

  const handleCancelHold = async () => {
    if (!userId || !paymentHold) return;
    try {
      await releaseHold(userId, paymentHold.bedspaceId);
      Alert.alert('Hold Released', 'Your provisional bedspace hold has been released.');
    } catch (err) {
      // Error message set in store
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-6 items-center pb-12">
        {/* Header Title */}
        <View className="w-full mb-6 items-center">
          <Text className="text-2xl font-bold text-slate-900">72-Hour Payment Hold</Text>
          <Text className="text-sm text-slate-500 mt-1 text-center">
            Complete your Remita fee payment before the timer expires to secure your hostel bedspace.
          </Text>
        </View>

        {isLoading && !paymentHold && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-3">Fetching hold status from Turso DB...</Text>
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 w-full">
            <Text className="text-red-800 font-semibold text-base mb-1">Notice</Text>
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {!isLoading && !paymentHold && (
          <View className="bg-white p-6 rounded-2xl border border-slate-200 w-full items-center mb-6">
            <Text className="text-slate-800 font-bold text-lg mb-2">No Active Payment Hold</Text>
            <Text className="text-slate-500 text-sm text-center">
              You do not currently have a pending 72-hour bedspace hold. Please proceed to balloting to reserve a bed.
            </Text>
          </View>
        )}

        {paymentHold && (
          <>
            {/* Countdown Timer Ring (S-04 PRD Spec: w-48 h-48 rounded-full border-4 border-[#D4AF37]) */}
            <View className="w-48 h-48 rounded-full border-4 border-[#D4AF37] justify-center items-center mb-6 bg-white shadow-sm">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {secondsLeft > 0 ? 'Hold Time Left' : 'Hold Expired'}
              </Text>
              <Text className={`text-2xl font-extrabold ${secondsLeft > 0 ? 'text-slate-900' : 'text-red-600'}`}>
                {formatTimer(secondsLeft)}
              </Text>
              <Text className="text-xs text-amber-600 font-medium mt-1">72-Hour Window</Text>
            </View>

            {/* Provisional Room Summary Card (S-04 PRD Spec: bg-white w-full p-6 rounded-2xl shadow-sm mb-6) */}
            <View className="bg-white w-full p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Provisional Allocation Summary
              </Text>

              <View className="flex-row justify-between py-2 border-b border-slate-100">
                <Text className="text-slate-500 text-sm font-medium">Hostel Name</Text>
                <Text className="text-slate-900 font-bold text-sm">{paymentHold.hostelName}</Text>
              </View>

              <View className="flex-row justify-between py-2 border-b border-slate-100">
                <Text className="text-slate-500 text-sm font-medium">Block & Room</Text>
                <Text className="text-slate-900 font-bold text-sm">
                  Block {paymentHold.blockName} — Room {paymentHold.roomNumber}
                </Text>
              </View>

              <View className="flex-row justify-between py-2 border-b border-slate-100">
                <Text className="text-slate-500 text-sm font-medium">Bedspace Designation</Text>
                <Text className="text-slate-900 font-bold text-sm">{paymentHold.bedLabel}</Text>
              </View>

              <View className="flex-row justify-between py-2 border-b border-slate-100">
                <Text className="text-slate-500 text-sm font-medium">Remita Reference</Text>
                <Text className="text-slate-700 font-mono text-xs">{paymentHold.transactionReference}</Text>
              </View>

              <View className="flex-row justify-between py-2 pt-3">
                <Text className="text-slate-800 text-base font-bold">Accommodation Fee</Text>
                <Text className="text-emerald-700 font-extrabold text-xl">
                  ₦{paymentHold.amount.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Pay Now Button (S-04 PRD Spec: bg-emerald-600 w-full py-4 rounded-xl items-center text-white font-bold text-lg) */}
            <TouchableOpacity
              className={`w-full py-4 rounded-xl items-center shadow-md active:opacity-90 mb-4 ${
                secondsLeft > 0 ? 'bg-emerald-600' : 'bg-slate-400'
              }`}
              disabled={secondsLeft <= 0 || isConfirmingPayment}
              onPress={handleConfirmPayNow}
            >
              {isConfirmingPayment ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  {secondsLeft > 0 ? 'Pay Now with Remita Gateway' : 'Hold Expired'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Hold Action */}
            {secondsLeft > 0 && (
              <TouchableOpacity
                className="w-full py-3 items-center"
                disabled={isConfirmingPayment}
                onPress={handleCancelHold}
              >
                <Text className="text-slate-500 font-semibold text-sm">Cancel Provisional Hold</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
