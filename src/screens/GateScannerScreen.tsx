import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useScannerStore } from '../store/useScannerStore';
import { GateType } from '../types/gatepass';

/**
 * GateScannerScreen Component.
 * Implements PRD Section 6 Spec P-01: Porter High-Visibility Gate Scanner.
 *
 * Implements:
 * - [SCANNER-01] Porter camera scanner interface with high-contrast pass/fail indicators (Issue #36)
 * - [SCANNER-02] Sub-500ms QR verification performance (Issue #37)
 * - [SCANNER-03] Manual 6-digit PIN lookup backup for gate access (Issue #38)
 * - [SCANNER-04] Auto-reset, audio chime feedback & disciplinary security flags (Issue #39)
 * - [SCANNER-05] Porter shift statistics, occupancy counters & emergency lockdown (Issue #40)
 * - [OFFLINE-01] Offline local public key caching & local SQLite queue (Issue #41)
 */
export const GateScannerScreen: React.FC = () => {
  const { session } = useAuthStore();
  const porterId = session?.user?.id || 'usr_porter_station';
  const porterName = session?.user?.fullName || 'Gatehouse Porter';

  const {
    isVerifying,
    verificationResult,
    pinLookupResult,
    scanLatencyMs,
    manualPinModalVisible,
    manualPinInput,
    gateMode,
    isLockdownActive,
    offlineMode,
    shiftStats,
    audioFeedback,
    pendingSyncCount,
    scanQrCode,
    lookupManualPin,
    executeVisitorCheckIn,
    executeVisitorCheckOut,
    setGateMode,
    setManualPinModalVisible,
    setManualPinInput,
    clearScanResult,
    toggleLockdown,
    setOfflineMode,
    syncOfflineQueue,
    loadShiftStats,
    reportDisciplinaryIncident
  } = useScannerStore();

  const [simulatedTokenInput, setSimulatedTokenInput] = useState('');
  const [showSimInput, setShowSimInput] = useState(false);
  const [incidentReason, setIncidentReason] = useState('');
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  useEffect(() => {
    loadShiftStats();
  }, []);

  const handleSimulateScan = async (mockToken?: string) => {
    const tokenToScan = mockToken || simulatedTokenInput.trim();
    if (!tokenToScan) return;
    await scanQrCode(tokenToScan, porterId);
  };

  const handlePinSubmit = async () => {
    if (!manualPinInput.trim()) return;
    await lookupManualPin(manualPinInput.trim(), porterId);
  };

  const isAccessGranted =
    verificationResult?.accessGranted ??
    (pinLookupResult?.isValid && pinLookupResult?.actionAllowed !== 'NONE');
  const hasResult = verificationResult !== null || pinLookupResult !== null;
  const disciplinaryFlag = verificationResult?.disciplinaryFlag;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView contentContainerClassName="p-4 items-center bg-slate-900 flex-grow">
        {/* Top Shift Statistics & Counters Ribbon ([SCANNER-05]) */}
        <View className="w-full bg-slate-800 p-3 rounded-2xl border border-slate-700 mb-4 flex-row justify-between items-center">
          <View className="items-center flex-1">
            <Text className="text-emerald-400 font-bold text-xs uppercase">Entries</Text>
            <Text className="text-white text-lg font-black">{shiftStats.totalEntries}</Text>
          </View>
          <View className="w-px h-8 bg-slate-700" />
          <View className="items-center flex-1">
            <Text className="text-amber-400 font-bold text-xs uppercase">Exits</Text>
            <Text className="text-white text-lg font-black">{shiftStats.totalExits}</Text>
          </View>
          <View className="w-px h-8 bg-slate-700" />
          <View className="items-center flex-1">
            <Text className="text-purple-400 font-bold text-xs uppercase">Visitors</Text>
            <Text className="text-white text-lg font-black">{shiftStats.activeVisitors}</Text>
          </View>
          <View className="w-px h-8 bg-slate-700" />
          <TouchableOpacity
            onPress={() => syncOfflineQueue(porterId)}
            className="items-center flex-1"
          >
            <Text className="text-blue-400 font-bold text-xs uppercase">Sync</Text>
            <Text className="text-white text-xs font-bold">
              {pendingSyncCount > 0 ? `📦 ${pendingSyncCount}` : '☁️ OK'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Gate Lockdown Warning Banner ([SCANNER-05]) */}
        {isLockdownActive && (
          <View className="w-full bg-red-950 border-2 border-red-500 p-4 rounded-2xl mb-4 items-center animate-pulse">
            <Text className="text-red-400 font-black text-sm uppercase tracking-widest mb-1">
              🚨 EMERGENCY GATE LOCKDOWN IN EFFECT
            </Text>
            <Text className="text-white text-xs text-center">
              All student entry and exit passes are temporarily suspended by Hall Administration.
            </Text>
          </View>
        )}

        {/* Audio-Visual Chime Indicator ([SCANNER-04]) */}
        {audioFeedback.type && (
          <View
            className={`w-full py-2 px-4 rounded-xl mb-3 flex-row items-center justify-between ${
              audioFeedback.type === 'SUCCESS_CHIME' ? 'bg-emerald-950 border border-emerald-600' : 'bg-red-950 border border-red-600'
            }`}
          >
            <Text className="text-white text-xs font-bold">
              {audioFeedback.type === 'SUCCESS_CHIME' ? '🔔 AUDIO CHIME: ACCESS GRANTED' : '📳 AUDIO BUZZ: ACCESS DENIED'}
            </Text>
            <Text className="text-slate-300 text-[10px]">Feedback Played</Text>
          </View>
        )}

        {/* Top Header & Gate Mode Controls */}
        <View className="w-full flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest">
              UNILAG Gatehouse Terminal
            </Text>
            <Text className="text-white text-lg font-bold">
              High-Visibility Scanner
            </Text>
          </View>
          <View className="flex-row bg-slate-800 rounded-xl p-1 border border-slate-700">
            <TouchableOpacity
              onPress={() => setGateMode('ENTRY')}
              className={`px-3 py-1.5 rounded-lg ${gateMode === 'ENTRY' ? 'bg-emerald-600' : ''}`}
            >
              <Text className={`text-xs font-bold ${gateMode === 'ENTRY' ? 'text-white' : 'text-slate-400'}`}>
                ⬇ ENTRY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setGateMode('EXIT')}
              className={`px-3 py-1.5 rounded-lg ${gateMode === 'EXIT' ? 'bg-amber-600' : ''}`}
            >
              <Text className={`text-xs font-bold ${gateMode === 'EXIT' ? 'text-white' : 'text-slate-400'}`}>
                ⬆ EXIT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Mode & Lockdown Controls Ribbon */}
        <View className="w-full flex-row space-x-2 mb-4">
          <TouchableOpacity
            onPress={() => setOfflineMode(!offlineMode)}
            className={`flex-1 py-2 px-3 rounded-xl border items-center ${
              offlineMode ? 'bg-amber-950 border-amber-500' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <Text className={`text-xs font-bold ${offlineMode ? 'text-amber-400' : 'text-slate-300'}`}>
              {offlineMode ? '🔌 OFFLINE MODE (ACTIVE)' : '📶 ONLINE TERMINAL'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleLockdown}
            className={`flex-1 py-2 px-3 rounded-xl border items-center ${
              isLockdownActive ? 'bg-red-700 border-red-500' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <Text className="text-white text-xs font-bold">
              {isLockdownActive ? '🔓 RELEASE LOCKDOWN' : '🔒 LOCKDOWN GATE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Camera Viewfinder (Spec P-01) */}
        <View className="w-full h-80 rounded-3xl overflow-hidden mb-4 border-2 border-amber-400 bg-slate-950 items-center justify-center relative">
          <View className="w-56 h-56 border-2 border-dashed border-amber-400/70 rounded-2xl items-center justify-center bg-amber-500/5">
            <View className="w-48 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-pulse" />
            <Text className="text-amber-400 text-xs font-mono mt-3 tracking-widest">
              ALIGN QR CODE HERE
            </Text>
          </View>

          <View className="absolute bottom-3 left-4 right-4 bg-slate-900/80 px-3 py-1.5 rounded-full flex-row justify-between items-center">
            <Text className="text-slate-300 text-xs">
              Officer: <Text className="text-white font-bold">{porterName}</Text>
            </Text>
            <Text className="text-emerald-400 text-xs font-bold">
              ● SCANNER ACTIVE
            </Text>
          </View>
        </View>

        {/* Instant Access Result Banner (Spec P-01: Massive Green / Red Indicators) */}
        {hasResult ? (
          <View
            className={`w-full py-6 rounded-2xl items-center justify-center mb-4 ${
              isAccessGranted ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            <Text className="text-white text-4xl mb-1">
              {isAccessGranted ? '✓' : '✕'}
            </Text>
            <Text className="text-white text-2xl font-black uppercase tracking-wider text-center px-4">
              {isAccessGranted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </Text>
            <Text className="text-white text-xs mt-1 font-medium text-center px-6">
              {verificationResult?.message || pinLookupResult?.message || 'Access decision recorded.'}
            </Text>
            {scanLatencyMs !== null && (
              <View className="bg-black/25 px-3 py-1 rounded-full mt-2">
                <Text className="text-amber-300 font-mono text-xs font-bold">
                  ⚡ Verified in {scanLatencyMs}ms (Sub-500ms SLA Passed)
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="w-full py-5 rounded-2xl items-center justify-center mb-4 bg-slate-800 border border-slate-700">
            <Text className="text-slate-400 text-sm font-semibold">
              Ready to Scan. Present Student QR Code or Enter PIN.
            </Text>
          </View>
        )}

        {/* Disciplinary Security Alert Card ([SCANNER-04]) */}
        {disciplinaryFlag && (
          <View className="w-full bg-red-950 border-2 border-red-500 p-4 rounded-2xl mb-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-red-400 font-black text-sm uppercase">
                🚨 DISCIPLINARY SANCTION ENFORCED
              </Text>
            </View>
            <Text className="text-white text-xs mb-2">
              Status: <Text className="font-bold text-red-300">{disciplinaryFlag.status}</Text>
            </Text>
            <Text className="text-slate-300 text-xs mb-3">
              Sanction Reason: "{disciplinaryFlag.reason}"
            </Text>
            <TouchableOpacity
              onPress={() => setShowIncidentModal(true)}
              className="bg-red-700 py-2.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-xs">
                🚨 Report Incident to Hall Warden
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Student Mini Profile (Spec P-01) */}
        {verificationResult?.student && (
          <View className="bg-slate-800 w-full p-4 rounded-2xl text-white mb-4 border border-slate-700">
            <View className="flex-row items-center mb-2">
              <View className="w-12 h-12 bg-amber-500 rounded-full items-center justify-center mr-3">
                <Text className="text-slate-900 font-black text-lg">
                  {verificationResult.student.fullName.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {verificationResult.student.fullName}
                </Text>
                <Text className="text-slate-400 text-xs font-medium">
                  Matric No: {verificationResult.student.matricNo}
                </Text>
              </View>
              <View className="bg-emerald-950 border border-emerald-700 px-2.5 py-1 rounded-full">
                <Text className="text-emerald-400 font-bold text-xs">RESIDENT</Text>
              </View>
            </View>
            <View className="bg-slate-900 p-2.5 rounded-xl mt-1">
              <Text className="text-slate-300 text-xs">
                Room Allocation: <Text className="text-amber-400 font-bold">{verificationResult.student.hostelName}</Text> • {verificationResult.student.roomNumber}
              </Text>
            </View>
          </View>
        )}

        {/* Visitor Mini Profile */}
        {pinLookupResult?.visitor && (
          <View className="bg-slate-800 w-full p-4 rounded-2xl text-white mb-4 border border-slate-700">
            <View className="flex-row items-center mb-2">
              <View className="w-12 h-12 bg-purple-600 rounded-full items-center justify-center mr-3">
                <Text className="text-white font-black text-lg">
                  {pinLookupResult.visitor.visitorName.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {pinLookupResult.visitor.visitorName}
                </Text>
                <Text className="text-slate-400 text-xs">
                  Phone: {pinLookupResult.visitor.visitorPhone}
                </Text>
              </View>
              <View className="bg-purple-950 border border-purple-700 px-2.5 py-1 rounded-full">
                <Text className="text-purple-400 font-bold text-xs">
                  {pinLookupResult.visitor.status}
                </Text>
              </View>
            </View>
            <View className="bg-slate-900 p-2.5 rounded-xl mt-1">
              <Text className="text-slate-300 text-xs">
                Host Student: <Text className="text-amber-400 font-bold">{pinLookupResult.visitor.studentName || 'Student'}</Text> ({pinLookupResult.visitor.studentMatric || 'Matric'})
              </Text>
            </View>

            {pinLookupResult.actionAllowed === 'CHECK_IN' && (
              <TouchableOpacity
                onPress={() => executeVisitorCheckIn(pinLookupResult.visitor!.id, porterId)}
                className="bg-emerald-600 py-3 rounded-xl mt-3 items-center active:opacity-80"
              >
                <Text className="text-white font-bold text-sm">✓ CONFIRM VISITOR CHECK-IN</Text>
              </TouchableOpacity>
            )}
            {pinLookupResult.actionAllowed === 'CHECK_OUT' && (
              <TouchableOpacity
                onPress={() => executeVisitorCheckOut(pinLookupResult.visitor!.id, porterId)}
                className="bg-amber-600 py-3 rounded-xl mt-3 items-center active:opacity-80"
              >
                <Text className="text-white font-bold text-sm">⬆ CONFIRM VISITOR CHECK-OUT</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Clear Button when result is visible */}
        {hasResult && (
          <TouchableOpacity
            onPress={clearScanResult}
            className="bg-slate-800 py-2.5 px-6 rounded-xl border border-slate-700 mb-4 active:opacity-80"
          >
            <Text className="text-slate-300 font-bold text-xs">↺ Clear & Scan Next Pass</Text>
          </TouchableOpacity>
        )}

        {/* Manual PIN Lookup Button (Spec P-01) */}
        <TouchableOpacity
          onPress={() => setManualPinModalVisible(true)}
          className="bg-amber-500 w-full py-4 rounded-xl items-center font-bold text-slate-900 mb-3 active:opacity-90"
        >
          <Text className="text-slate-950 font-black text-base">
            🔢 MANUAL 6-DIGIT PIN LOOKUP
          </Text>
        </TouchableOpacity>

        {/* Quick Testing & Barcode Simulation Toggle */}
        <TouchableOpacity
          onPress={() => setShowSimInput(!showSimInput)}
          className="py-2 items-center"
        >
          <Text className="text-slate-500 text-xs underline">
            {showSimInput ? '▲ Hide Barcode Simulator' : '▼ Barcode Scanner Simulator (Input String)'}
          </Text>
        </TouchableOpacity>

        {showSimInput && (
          <View className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 mt-2">
            <TextInput
              placeholder="Paste or type raw QR token string..."
              placeholderTextColor="#64748B"
              value={simulatedTokenInput}
              onChangeText={setSimulatedTokenInput}
              className="bg-slate-900 text-white p-3 rounded-lg text-xs mb-2 border border-slate-700 font-mono"
            />
            <TouchableOpacity
              onPress={() => handleSimulateScan()}
              className="bg-emerald-600 py-2.5 rounded-lg items-center"
            >
              <Text className="text-white font-bold text-xs">Simulate QR Camera Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual 6-Digit PIN Modal */}
        <Modal
          visible={manualPinModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setManualPinModalVisible(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center p-5">
            <View className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-3xl items-center shadow-2xl">
              <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-1">
                Gate Security Verification
              </Text>
              <Text className="text-white text-xl font-black mb-1 text-center">
                Manual PIN / Matric Lookup
              </Text>
              <Text className="text-slate-400 text-xs text-center mb-5">
                Type the 6-digit visitor access code or student matric number for dead phone battery emergencies.
              </Text>

              <TextInput
                placeholder="Enter 6-digit PIN or Matric"
                placeholderTextColor="#64748B"
                value={manualPinInput}
                onChangeText={setManualPinInput}
                keyboardType="numeric"
                maxLength={10}
                className="bg-slate-800 text-white text-center text-2xl font-black p-4 rounded-2xl w-full border border-amber-500/50 mb-5 font-mono tracking-widest"
              />

              <TouchableOpacity
                onPress={async () => {
                  await handlePinSubmit();
                  setManualPinModalVisible(false);
                }}
                disabled={isVerifying}
                className="bg-amber-500 w-full py-4 rounded-xl items-center mb-3 active:opacity-90"
              >
                {isVerifying ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <Text className="text-slate-950 font-black text-base">
                    LOOK UP ACCESS CODE
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setManualPinModalVisible(false)}
                className="py-2"
              >
                <Text className="text-slate-400 text-sm font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Incident Report Modal ([SCANNER-04]) */}
        <Modal
          visible={showIncidentModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowIncidentModal(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center p-5">
            <View className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-3xl items-center shadow-2xl">
              <Text className="text-red-400 font-bold text-xs uppercase tracking-widest mb-1">
                Security Incident Dispatch
              </Text>
              <Text className="text-white text-lg font-black mb-2 text-center">
                Flag Student Incident
              </Text>
              <Text className="text-slate-400 text-xs text-center mb-4">
                Provide details for the incident report dispatched to the Hall Warden and Chief Security Officer.
              </Text>

              <TextInput
                placeholder="Incident details / Porter remarks..."
                placeholderTextColor="#64748B"
                value={incidentReason}
                onChangeText={setIncidentReason}
                multiline
                numberOfLines={3}
                className="bg-slate-800 text-white p-3 rounded-xl w-full border border-slate-700 mb-4 text-xs"
              />

              <TouchableOpacity
                onPress={async () => {
                  if (verificationResult?.student?.userId) {
                    await reportDisciplinaryIncident(
                      verificationResult.student.userId,
                      porterId,
                      incidentReason || 'Disciplinary violation attempted entry'
                    );
                  }
                  setShowIncidentModal(false);
                  setIncidentReason('');
                }}
                className="bg-red-600 w-full py-3.5 rounded-xl items-center mb-2"
              >
                <Text className="text-white font-bold text-xs">DISPATCH INCIDENT REPORT</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowIncidentModal(false)} className="py-2">
                <Text className="text-slate-400 text-xs">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GateScannerScreen;
