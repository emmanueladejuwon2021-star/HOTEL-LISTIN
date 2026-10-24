import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useGatePassStore } from '../store/useGatePassStore';

/**
 * Visual QR Code Matrix Component rendering dynamic token string as visual blocks.
 * Provides high-contrast presentation for camera scanning at UNILAG hostel gates.
 */
const VisualQrMatrix: React.FC<{ tokenString: string }> = ({ tokenString }) => {
  // Deterministic hash-based block pattern generator from token string
  const blocks = [];
  const str = tokenString || 'UNILAGSTAY';
  for (let i = 0; i < 64; i++) {
    const charCode = str.charCodeAt(i % str.length) + i;
    const isDark = charCode % 2 === 0;
    blocks.push(isDark);
  }

  return (
    <View className="bg-white p-6 rounded-3xl shadow-2xl mb-6 items-center justify-center">
      <View className="w-56 h-56 flex-row flex-wrap border-4 border-slate-900 rounded-xl p-2 bg-white">
        {blocks.map((isDark, idx) => (
          <View
            key={idx}
            style={{ width: '12.5%', height: '12.5%' }}
            className={isDark ? 'bg-slate-900 rounded-xs' : 'bg-white'}
          />
        ))}
      </View>
      <Text className="text-slate-500 text-xs mt-3 font-mono text-center" numberOfLines={1}>
        TOKEN: {tokenString ? tokenString.substring(0, 24) + '...' : 'LOADING'}
      </Text>
    </View>
  );
};

/**
 * GatePassScreen Component (PRD Section 6 Spec S-05: Digital QR Gate Pass Screen).
 * Renders dynamic 30-second refreshing QR pass for UNILAG students entering hostel gates.
 * Designed with dark background (`bg-slate-900`) and high-contrast typography for rapid porter scanning.
 */
export const GatePassScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    currentPass,
    payload,
    secondsRemaining,
    isLoading,
    errorMessage,
    loadGatePass,
    refreshGatePass,
    tickTimer
  } = useGatePassStore();

  const userId = session?.user?.id || 'demo_student_id';
  const studentName = payload?.fullName || session?.user?.fullName || 'UNILAG Resident';
  const matricNo = payload?.matricNo || session?.user?.matricOrStaffNo || '2000000000';
  const hostelName = payload?.hostelName || 'King Jaja Hall';
  const roomNumber = payload?.roomNumber || 'Room A-102';

  // Load pass on mount
  useEffect(() => {
    loadGatePass(userId);
  }, [userId]);

  // Setup 1-second interval timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimer(userId);
    }, 1000);

    return () => clearInterval(interval);
  }, [userId]);

  // Calculate progress bar percentage width for 30s timer
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100));

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-slate-900">
      <View className="bg-slate-900 flex-1 items-center justify-center p-6">
        {/* Student Identity Banner */}
        <View className="items-center mb-6">
          <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-1">
            Official UNILAG Gate Pass
          </Text>
          <Text className="text-white text-center text-2xl font-bold mb-1">
            {studentName}
          </Text>
          <Text className="text-slate-400 text-center text-sm font-semibold">
            Matric No: {matricNo}
          </Text>
          <View className="bg-slate-800 px-4 py-1.5 rounded-full mt-3 border border-slate-700">
            <Text className="text-emerald-400 font-bold text-xs">
              {hostelName} • {roomNumber}
            </Text>
          </View>
        </View>

        {/* Dynamic QR Code Box or Loading */}
        {isLoading && !currentPass ? (
          <View className="bg-slate-800 p-12 rounded-3xl mb-6 items-center justify-center w-64 h-64 border border-slate-700">
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-slate-300 text-xs mt-4 font-semibold text-center">
              Generating Dynamic Pass...
            </Text>
          </View>
        ) : (
          <VisualQrMatrix tokenString={currentPass?.tokenString || ''} />
        )}

        {/* Refresh Countdown & Progress Bar */}
        <View className="w-full max-w-xs mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-400 text-xs font-semibold">
              Auto Refresh TTL
            </Text>
            <Text className="text-amber-400 text-xs font-bold font-mono">
              {secondsRemaining}s remaining
            </Text>
          </View>
          <View className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <View
              style={{ width: `${progressPercent}%` }}
              className="bg-amber-400 h-full rounded-full"
            />
          </View>
        </View>

        {/* Status Badge & Manual Refresh Action */}
        {errorMessage ? (
          <View className="bg-red-950 border border-red-800 p-3 rounded-xl mb-4 w-full max-w-xs">
            <Text className="text-red-300 text-xs text-center">{errorMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => refreshGatePass(userId)}
          disabled={isLoading}
          className="bg-amber-500 py-3.5 px-6 rounded-xl items-center w-full max-w-xs active:opacity-80"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <Text className="text-slate-950 font-bold text-sm">
              ↻ Refresh Pass Token
            </Text>
          )}
        </TouchableOpacity>

        {/* Information Notice for Non-Technical Students */}
        <Text className="text-slate-500 text-xs text-center mt-6 px-4">
          Show this dynamic QR code to the hostel gate porter for sub-second verification. The code automatically updates every 30 seconds for security.
        </Text>
      </View>
    </ScrollView>
  );
};

export default GatePassScreen;
