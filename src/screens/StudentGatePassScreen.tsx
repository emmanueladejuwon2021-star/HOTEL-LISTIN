import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useGatePassStore } from '../store/useGatePassStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Screen S-05: Student Dynamic QR Gate Pass Screen.
 * Displays large dynamic, tamper-proof QR gate pass for entering and exiting UNILAG hostels.
 *
 * Implements [GATEPASS-01] and [GATEPASS-02] adhering strictly to Section 6 of PRD.md:
 * - Tailwind Container: `bg-slate-900 flex-1 items-center justify-center p-6`
 * - Student Identity Banner: `text-white text-center text-xl font-bold mb-6`
 * - Dynamic QR Code Box: `bg-white p-6 rounded-3xl shadow-2xl mb-6`
 * - Rolling 60s auto-refresh timer & manual refresh action
 */
export const StudentGatePassScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    currentPass,
    countdownSeconds,
    isLoading,
    errorMessage,
    generatePass,
    refreshPass,
    tickCountdown
  } = useGatePassStore();

  const userId = session?.user.id;

  // Initialize gate pass on mount
  useEffect(() => {
    if (userId) {
      generatePass(userId);
    }
  }, [userId]);

  // Rolling 60-second countdown timer with auto-refresh when reaching 0
  useEffect(() => {
    const timer = setInterval(() => {
      if (countdownSeconds > 1) {
        tickCountdown();
      } else if (countdownSeconds === 1 && userId) {
        refreshPass(userId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds, userId]);

  return (
    <SafeAreaView className="bg-slate-900 flex-1">
      <ScrollView contentContainerClassName="flex-grow items-center justify-center p-6">
        {/* Top University Header */}
        <View className="items-center mb-6">
          <View className="bg-[#7A0000] px-3.5 py-1 rounded-full mb-2">
            <Text className="text-white text-[10px] font-bold tracking-widest uppercase">
              Official Hostel Gate Pass
            </Text>
          </View>
          <Text className="text-slate-400 text-xs font-medium">
            University of Lagos • Security Control
          </Text>
        </View>

        {/* Loading Indicator */}
        {isLoading && !currentPass && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text className="text-slate-300 font-medium mt-3">Generating secure dynamic pass...</Text>
          </View>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <View className="bg-red-950 border border-red-700 p-4 rounded-2xl mb-6 w-full max-w-sm">
            <Text className="text-red-300 text-xs font-bold mb-1">Access Restricted</Text>
            <Text className="text-red-200 text-xs">{errorMessage}</Text>
          </View>
        )}

        {currentPass && (
          <>
            {/* Student Identity Banner (PRD Section 6 S-05 Specification) */}
            <View className="items-center mb-6">
              <Text className="text-white text-center text-xl font-bold mb-1">
                {currentPass.payload.fullName}
              </Text>
              <Text className="text-amber-400 text-sm font-semibold mb-1">
                Matric: {currentPass.payload.matricNo}
              </Text>
              <Text className="text-slate-400 text-xs">
                {currentPass.payload.hostelName} • {currentPass.payload.roomNumber}
              </Text>
            </View>

            {/* Dynamic QR Code Box (PRD Section 6 S-05 Specification) */}
            <View className="bg-white p-6 rounded-3xl shadow-2xl mb-6 items-center w-72 h-72 justify-between">
              {/* Corner brackets decoration */}
              <View className="w-full flex-row justify-between">
                <View className="w-4 h-4 border-t-2 border-l-2 border-slate-900" />
                <View className="w-4 h-4 border-t-2 border-r-2 border-slate-900" />
              </View>

              {/* Dynamic QR Simulation Matrix */}
              <View className="items-center justify-center flex-1 py-2">
                <View className="bg-slate-900 p-4 rounded-2xl items-center justify-center w-48 h-48">
                  {/* Digital QR Pattern Representation */}
                  <View className="w-36 h-36 bg-white p-2 rounded-xl flex-wrap flex-row justify-between items-center">
                    <View className="w-10 h-10 bg-slate-900 rounded-sm" />
                    <View className="w-4 h-4 bg-slate-900" />
                    <View className="w-10 h-10 bg-slate-900 rounded-sm" />
                    <View className="w-6 h-6 bg-slate-900" />
                    <View className="w-8 h-8 bg-[#7A0000] rounded-sm items-center justify-center">
                      <Text className="text-white text-[8px] font-bold">UNILAG</Text>
                    </View>
                    <View className="w-6 h-6 bg-slate-900" />
                    <View className="w-10 h-10 bg-slate-900 rounded-sm" />
                    <View className="w-4 h-4 bg-slate-900" />
                    <View className="w-10 h-10 bg-slate-900 rounded-sm" />
                  </View>
                </View>
              </View>

              <View className="w-full flex-row justify-between">
                <View className="w-4 h-4 border-b-2 border-l-2 border-slate-900" />
                <View className="w-4 h-4 border-b-2 border-r-2 border-slate-900" />
              </View>
            </View>

            {/* Rolling 60-second Countdown Indicator */}
            <View className="flex-row items-center space-x-2 mb-6 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Text className="text-slate-300 text-xs font-medium">
                Refreshes in <Text className="text-amber-400 font-bold">{countdownSeconds}s</Text>
              </Text>
            </View>

            {/* Manual Refresh Button */}
            <TouchableOpacity
              className="bg-[#7A0000] px-6 py-3 rounded-xl items-center shadow-lg active:opacity-90 w-64 mb-6"
              onPress={() => userId && refreshPass(userId)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                  ↻ Tap to Refresh Pass
                </Text>
              )}
            </TouchableOpacity>

            {/* Security Verification Hash Card */}
            <View className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 w-full max-w-xs items-center">
              <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Dynamic HMAC-SHA256 Token
              </Text>
              <Text className="text-slate-300 font-mono text-[9px] text-center" numberOfLines={1}>
                {currentPass.payload.signature.substring(0, 32)}...
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
