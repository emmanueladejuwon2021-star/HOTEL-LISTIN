import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal
} from 'react-native';
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
 *
 * Implements [GATEPASS-01], [GATEPASS-03], [GATEPASS-04], and [GATEPASS-05].
 * Supports dynamic rolling tokens, offline cached pass mode, and 6-digit visitor pass generation.
 */
export const GatePassScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    currentPass,
    payload,
    secondsRemaining,
    isLoading,
    errorMessage,
    visitorPasses,
    curfewAlerts,
    loadGatePass,
    refreshGatePass,
    tickTimer,
    createVisitorPass,
    loadVisitorPasses,
    checkCurfewAlerts,
    sendVisitorCurfewReminder
  } = useGatePassStore();

  const userId = session?.user?.id || 'demo_student_id';
  const studentName = payload?.fullName || session?.user?.fullName || 'UNILAG Resident';
  const matricNo = payload?.matricNo || session?.user?.matricOrStaffNo || '2000000000';
  const hostelName = payload?.hostelName || 'King Jaja Hall';
  const roomNumber = payload?.roomNumber || 'Room A-102';

  // Visitor pass modal state
  const [visitorModalVisible, setVisitorModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [generatedVisitorPin, setGeneratedVisitorPin] = useState<string | null>(null);

  // Reminder feedback message state
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  // Load pass, visitor list, and check curfew alerts on mount
  useEffect(() => {
    loadGatePass(userId);
    if (loadVisitorPasses) {
      loadVisitorPasses(userId);
    }
    if (checkCurfewAlerts) {
      checkCurfewAlerts(userId);
    }
  }, [userId]);

  // Setup 1-second interval timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimer(userId);
    }, 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const handleCreateVisitorPass = async () => {
    if (!visitorName.trim() || !visitorPhone.trim() || !createVisitorPass) return;
    try {
      const pass = await createVisitorPass(userId, visitorName, visitorPhone);
      setGeneratedVisitorPin(pass.passCode);
      setVisitorName('');
      setVisitorPhone('');
      if (checkCurfewAlerts) {
        checkCurfewAlerts(userId);
      }
    } catch {}
  };

  const handleSendReminder = async (passId: string) => {
    if (!sendVisitorCurfewReminder) return;
    try {
      const res = await sendVisitorCurfewReminder(passId);
      setReminderMessage(res.message);
      setTimeout(() => setReminderMessage(null), 5000);
    } catch (e: any) {
      setReminderMessage(e.message || 'Failed to send reminder.');
      setTimeout(() => setReminderMessage(null), 5000);
    }
  };

  // Calculate progress bar percentage width for 30s timer
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100));

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-slate-900">
      <View className="bg-slate-900 flex-1 items-center justify-center p-6">
        {/* Offline / Online Status Badge (Component 5 / Spec S-05) */}
        <View className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 mb-3 flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
          <Text className="text-slate-300 text-xs font-semibold">
            Live Dynamic Pass (Auto 30s TTL)
          </Text>
        </View>

        {/* Student Identity Banner (Spec S-05) */}
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

        {/* Refresh Countdown & Progress Bar (Spec S-05) */}
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

        {/* Visitor Curfew & Overstay Alert Banner ([VISITOR-04]) */}
        {curfewAlerts && curfewAlerts.length > 0 ? (
          <View className="bg-rose-950 border-2 border-rose-600 p-4 rounded-2xl mb-5 w-full max-w-xs shadow-lg">
            <View className="flex-row items-center mb-1">
              <Text className="text-rose-400 font-black text-sm uppercase tracking-wide">
                ⚠️ Visitor Curfew Warning
              </Text>
            </View>
            {curfewAlerts.map((alert, idx) => (
              <View key={idx} className="mt-1">
                <Text className="text-rose-200 text-xs font-semibold">
                  {alert.visitorName} ({alert.visitorPhone})
                </Text>
                <Text className="text-rose-300 text-xs mt-0.5">
                  Overstayed by {alert.overstayMinutes} mins past 8:00 PM curfew limit.
                </Text>
                <TouchableOpacity
                  onPress={() => handleSendReminder(alert.passId)}
                  className="bg-rose-600 px-3 py-1.5 rounded-lg mt-2 items-center active:opacity-80"
                >
                  <Text className="text-white text-xs font-bold">Send Curfew Reminder</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {/* Reminder Notification Toast Banner */}
        {reminderMessage ? (
          <View className="bg-emerald-950 border border-emerald-600 p-3 rounded-xl mb-4 w-full max-w-xs">
            <Text className="text-emerald-300 text-xs text-center font-semibold">{reminderMessage}</Text>
          </View>
        ) : null}

        {/* Error Badge */}
        {errorMessage ? (
          <View className="bg-red-950 border border-red-800 p-3 rounded-xl mb-4 w-full max-w-xs">
            <Text className="text-red-300 text-xs text-center">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Action Buttons: Refresh Pass & Create Visitor Pass */}
        <View className="w-full max-w-xs space-y-3">
          <TouchableOpacity
            onPress={() => refreshGatePass(userId)}
            disabled={isLoading}
            className="bg-amber-500 py-3.5 px-6 rounded-xl items-center w-full active:opacity-80"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Text className="text-slate-950 font-bold text-sm">
                ↻ Refresh Pass Token
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setGeneratedVisitorPin(null);
              setVisitorModalVisible(true);
            }}
            className="bg-slate-800 border border-slate-700 py-3 rounded-xl items-center w-full mt-2 active:opacity-80"
          >
            <Text className="text-amber-400 font-bold text-xs">
              + Generate 6-Digit Visitor Pass PIN
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active & Historical Visitor Passes Section ([VISITOR-04]) */}
        {visitorPasses && visitorPasses.length > 0 ? (
          <View className="w-full max-w-xs mt-8">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                My Visitor Pass Log ({visitorPasses.length})
              </Text>
              <TouchableOpacity
                onPress={() => checkCurfewAlerts && checkCurfewAlerts(userId)}
                className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700"
              >
                <Text className="text-slate-300 text-xs">↻ Curfew Check</Text>
              </TouchableOpacity>
            </View>

            {visitorPasses.slice(0, 5).map((pass) => {
              const isOverstayed = pass.status === 'OVERSTAYED';
              const isCheckedIn = pass.status === 'CHECKED_IN';
              const isExpected = pass.status === 'EXPECTED';

              let badgeColor = 'bg-slate-800 border-slate-700 text-slate-300';
              if (isOverstayed) badgeColor = 'bg-rose-950 border-rose-500 text-rose-300';
              if (isCheckedIn) badgeColor = 'bg-emerald-950 border-emerald-500 text-emerald-300';
              if (isExpected) badgeColor = 'bg-amber-950 border-amber-500 text-amber-300';

              return (
                <View
                  key={pass.id}
                  className="bg-slate-800 border border-slate-700 p-3.5 rounded-2xl mb-2.5"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-white font-bold text-sm">{pass.visitorName}</Text>
                      <Text className="text-slate-400 text-xs">{pass.visitorPhone}</Text>
                      <Text className="text-slate-500 text-xs mt-1">PIN: {pass.passCode} | Date: {pass.visitDate}</Text>
                    </View>

                    <View className={`px-2.5 py-1 rounded-full border ${badgeColor}`}>
                      <Text className="text-xs font-bold">{pass.status}</Text>
                    </View>
                  </View>

                  {isOverstayed ? (
                    <View className="mt-2.5 pt-2 border-t border-slate-700 flex-row items-center justify-between">
                      <Text className="text-rose-400 text-xs font-semibold">
                        Overstayed Visiting Hours
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleSendReminder(pass.id)}
                        className="bg-rose-600 px-2.5 py-1 rounded-lg"
                      >
                        <Text className="text-white text-xs font-bold">Remind</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Information Notice for Non-Technical Students */}
        <Text className="text-slate-500 text-xs text-center mt-6 px-4">
          Show this dynamic QR code to the hostel gate porter for sub-second verification. The code automatically updates every 30 seconds for security.
        </Text>

        {/* Visitor Pass Modal */}
        <Modal
          visible={visitorModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setVisitorModalVisible(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center p-5">
            <View className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-3xl shadow-2xl">
              <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-1 text-center">
                UNILAG Visitor Management
              </Text>
              <Text className="text-white text-xl font-black mb-1 text-center">
                Create Visitor Access Pass
              </Text>
              <Text className="text-slate-400 text-xs text-center mb-5">
                Generate an official 6-digit access PIN for your guest to present at the gatehouse.
              </Text>

              {generatedVisitorPin ? (
                <View className="items-center my-4">
                  <Text className="text-slate-300 text-xs mb-1">Generated 6-Digit PIN:</Text>
                  <View className="bg-emerald-950 border border-emerald-500 px-6 py-3 rounded-2xl mb-3">
                    <Text className="text-emerald-400 text-3xl font-black font-mono tracking-widest">
                      {generatedVisitorPin}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-xs text-center">
                    Share this PIN with your visitor. Porter will verify it at the gatehouse.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setVisitorModalVisible(false)}
                    className="bg-emerald-600 w-full py-3 rounded-xl items-center mt-5"
                  >
                    <Text className="text-white font-bold text-sm">Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text className="text-slate-300 text-xs font-semibold mb-1">Visitor's Full Name</Text>
                  <TextInput
                    placeholder="e.g. Babatunde Adeyemi"
                    placeholderTextColor="#64748B"
                    value={visitorName}
                    onChangeText={setVisitorName}
                    className="bg-slate-800 text-white p-3 rounded-xl border border-slate-700 mb-3 text-sm"
                  />

                  <Text className="text-slate-300 text-xs font-semibold mb-1">Visitor's Phone Number</Text>
                  <TextInput
                    placeholder="e.g. 08012345678"
                    placeholderTextColor="#64748B"
                    value={visitorPhone}
                    onChangeText={setVisitorPhone}
                    keyboardType="phone-pad"
                    className="bg-slate-800 text-white p-3 rounded-xl border border-slate-700 mb-5 text-sm"
                  />

                  <TouchableOpacity
                    onPress={handleCreateVisitorPass}
                    disabled={isLoading || !visitorName.trim() || !visitorPhone.trim()}
                    className="bg-amber-500 py-3.5 rounded-xl items-center mb-3 active:opacity-90"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0F172A" />
                    ) : (
                      <Text className="text-slate-950 font-black text-sm">
                        GENERATE VISITOR PIN
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setVisitorModalVisible(false)}
                    className="py-2 items-center"
                  >
                    <Text className="text-slate-400 text-xs font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

export default GatePassScreen;
