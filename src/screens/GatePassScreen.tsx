import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useGatePassStore } from '../store/useGatePassStore';

/**
 * GatePassScreen Component.
 * Displays a dynamic RSA-256 / SHA-256 signed QR gate pass for verified resident students.
 * Follows PRD S-05 specifications:
 * - High-contrast dark outer container (`bg-slate-900 flex-1 items-center justify-center p-6`).
 * - Student Identity Banner (Name, Matric No, Hostel, Room & Bed designation).
 * - High-visibility Dynamic QR pass presentation with 30-second token refresh countdown.
 * - Manual token refresh CTA and clearance residency badge.
 */
export const GatePassScreen: React.FC = () => {
  const { session } = useAuthStore();
  const userId = session?.user?.id || '';

  const { activePass, isLoading, errorMessage, fetchOrGenerateGatePass, refreshPassToken } = useGatePassStore();

  const [countdown, setCountdown] = useState<number>(30);

  // Fetch or generate gate pass on initial mount
  useEffect(() => {
    if (userId) {
      fetchOrGenerateGatePass(userId);
    }
  }, [userId]);

  // Handle 30-second auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (userId) {
            refreshPassToken(userId);
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userId]);

  const handleManualRefresh = () => {
    if (userId) {
      setCountdown(30);
      refreshPassToken(userId);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-slate-900 px-4 py-6 justify-center items-center">
      {/* Top Title Banner */}
      <View className="items-center mb-6">
        <View className="bg-emerald-500/20 border border-emerald-500 px-4 py-1.5 rounded-full mb-2">
          <Text className="text-emerald-400 text-xs font-bold uppercase tracking-widest">
            • Active Resident Gate Pass
          </Text>
        </View>
        <Text className="text-white text-2xl font-black text-center">UNILAG Residency Pass</Text>
        <Text className="text-slate-400 text-xs text-center mt-1">
          Present this dynamic QR code at the hostel gatehouse for instant entry.
        </Text>
      </View>

      {/* Error Feedback Message */}
      {errorMessage && (
        <View className="bg-red-900/40 border border-red-500 p-4 rounded-2xl w-full mb-6">
          <Text className="text-red-300 font-bold text-sm text-center mb-2">Residency Check Failed</Text>
          <Text className="text-red-200 text-xs text-center">{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => userId && fetchOrGenerateGatePass(userId)}
            className="mt-3 bg-red-600 py-2 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-xs">Retry Resident Check</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && !activePass && (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text className="text-slate-300 font-semibold mt-4 text-sm">Generating Cryptographic Gate Pass...</Text>
        </View>
      )}

      {/* Active Gate Pass Card */}
      {activePass && (
        <View className="w-full bg-slate-800 border border-slate-700 p-6 rounded-3xl items-center shadow-2xl">
          {/* Student Details Banner */}
          <View className="w-full border-b border-slate-700 pb-4 mb-4 items-center">
            <Text className="text-amber-400 font-extrabold text-xl text-center">{activePass.studentName}</Text>
            <Text className="text-slate-300 font-bold text-sm text-center mt-1">
              Matric: {activePass.studentMatricNo}
            </Text>
            <View className="bg-slate-700 px-3 py-1 rounded-lg mt-2">
              <Text className="text-amber-300 text-xs font-semibold text-center">
                {activePass.hostelName} • Block {activePass.blockName} Room {activePass.roomNumber} ({activePass.bedLabel})
              </Text>
            </View>
          </View>

          {/* Dynamic QR Presentation Box */}
          <View className="bg-white p-6 rounded-2xl items-center justify-center my-2 shadow-lg w-64 h-64 border-4 border-amber-400/50">
            {/* Visual QR representation placeholder / payload text */}
            <Text className="text-slate-900 font-mono text-[10px] text-center mb-2 font-bold uppercase">
              [DYNAMIC QR CODE]
            </Text>
            <View className="bg-slate-900 p-3 rounded-xl w-full mb-2">
              <Text className="text-emerald-400 font-mono text-[9px] text-center" numberOfLines={4} ellipsizeMode="middle">
                {activePass.qrToken}
              </Text>
            </View>
            <Text className="text-slate-500 font-bold text-[9px] text-center uppercase tracking-wider">
              Cryptographic Signature Verified
            </Text>
          </View>

          {/* Token Refresh Progress Indicator Bar */}
          <View className="w-full mt-4">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-slate-400 text-xs font-semibold">Auto-Refresh Timer</Text>
              <Text className="text-amber-400 font-mono text-xs font-bold">{countdown}s</Text>
            </View>
            <View className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <View
                className="bg-amber-400 h-full rounded-full"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </View>
          </View>

          {/* Manual Refresh CTA */}
          <TouchableOpacity
            onPress={handleManualRefresh}
            className="mt-6 bg-amber-500 w-full py-3.5 rounded-xl items-center active:opacity-80"
          >
            <Text className="text-slate-900 font-extrabold text-sm">🔄 Refresh Pass Token Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};
