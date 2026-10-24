import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useInventoryStore } from '../store/useInventoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { ItemCondition, AuditType } from '../types/inventory';

/**
 * Screen P-02 / Room Check-In Audit UI Component for UNILAG Hostel Porters.
 * Handles joint physical inspection of assigned student rooms:
 * - Mattress, Ceiling Fan, Electrical Wall Sockets, Door Locks, Ceiling Lights, Window Louvers (PRD Section 4.5).
 * - Joint touchscreen signature confirmation.
 * - Key handover and tag recording.
 * - Auto-defect maintenance ticket dispatch when items are marked POOR.
 * - Permanent cryptographic SHA-256 digital audit certificate generation and verification.
 * - Residency activation (ACTIVE_RESIDENT status transition).
 *
 * Styled using NativeWind v4 (Tailwind CSS) with clear comments for non-technical team members.
 */
export const RoomInventoryScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    audits,
    selectedAudit,
    verifiedAudit,
    activationResult,
    isLoading,
    errorMessage,
    successMessage,
    recordAudit,
    issueRoomKey,
    completeCheckIn,
    verifyCertificate,
    clearMessages
  } = useInventoryStore();

  const [roomId, setRoomId] = useState('rm_jaja_a_101');
  const [studentId, setStudentId] = useState('usr_student_01');
  const [auditType, setAuditType] = useState<AuditType>('CHECK_IN');

  // Condition checklist states for all 6 PRD 4.5 room fixtures
  const [mattressCondition, setMattressCondition] = useState<ItemCondition>('GOOD');
  const [fanCondition, setFanCondition] = useState<ItemCondition>('GOOD');
  const [socketsCondition, setSocketsCondition] = useState<ItemCondition>('GOOD');
  const [locksCondition, setLocksCondition] = useState<ItemCondition>('GOOD');
  const [lightsCondition, setLightsCondition] = useState<ItemCondition>('GOOD');
  const [windowsCondition, setWindowsCondition] = useState<ItemCondition>('GOOD');

  // Digital touchscreen signatures
  const [studentSig, setStudentSig] = useState('sig_student_verified_touch');
  const [porterSig, setPorterSig] = useState('sig_porter_verified_touch');
  const [notes, setNotes] = useState('');

  // Physical key handover state
  const [issueKeyNow, setIssueKeyNow] = useState(true);
  const [keyTagNumber, setKeyTagNumber] = useState('KEY-JAJA-101-A');

  // Certificate lookup state
  const [searchCertHash, setSearchCertHash] = useState('');

  const porterId = session?.user.id || 'usr_porter_01';

  const hasAnyPoor =
    mattressCondition === 'POOR' ||
    fanCondition === 'POOR' ||
    socketsCondition === 'POOR' ||
    locksCondition === 'POOR' ||
    lightsCondition === 'POOR' ||
    windowsCondition === 'POOR';

  const handleSubmitAudit = async () => {
    if (!roomId.trim() || !studentId.trim()) {
      Alert.alert('Validation Error', 'Please enter valid Room ID and Student ID.');
      return;
    }

    const audit = await recordAudit({
      roomId: roomId.trim(),
      studentId: studentId.trim(),
      porterId,
      mattressCondition,
      fanCondition,
      socketsCondition,
      locksCondition,
      lightsCondition,
      windowsCondition,
      auditType,
      keyIssued: issueKeyNow,
      keyTagNumber: issueKeyNow ? keyTagNumber.trim() : undefined,
      studentSignatureUrl: studentSig.trim() || undefined,
      porterSignatureUrl: porterSig.trim() || undefined,
      notes: notes.trim() || undefined
    });

    if (audit) {
      Alert.alert(
        'Audit Certificate Generated',
        `Digital room ${auditType.toLowerCase()} audit certificate generated for Room ${roomId}.\nSecurity Hash: ${audit.certificateHash}`
      );
      setNotes('');
    }
  };

  const handleIssueKey = async (auditId: string) => {
    if (!keyTagNumber.trim()) {
      Alert.alert('Validation Error', 'Please provide a valid key tag label.');
      return;
    }
    await issueRoomKey(auditId, keyTagNumber.trim());
  };

  const handleActivateResident = async (auditId: string) => {
    const result = await completeCheckIn(auditId);
    if (result) {
      Alert.alert('Residency Activated', result.message);
    }
  };

  const handleVerifySearch = async () => {
    if (!searchCertHash.trim()) {
      Alert.alert('Validation Error', 'Please enter a certificate verification hash.');
      return;
    }
    await verifyCertificate(searchCertHash.trim());
  };

  const renderConditionSelector = (label: string, current: ItemCondition, setter: (val: ItemCondition) => void) => {
    return (
      <View className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <Text className="text-slate-800 font-bold text-sm mb-2">{label}</Text>
        <View className="flex-row space-x-2">
          {(['GOOD', 'FAIR', 'POOR'] as ItemCondition[]).map((cond) => {
            const isSelected = current === cond;
            let bg = isSelected ? 'bg-slate-800' : 'bg-white border border-slate-300';
            let textColor = isSelected ? 'text-white' : 'text-slate-700';

            if (isSelected && cond === 'GOOD') bg = 'bg-emerald-700';
            if (isSelected && cond === 'FAIR') bg = 'bg-amber-600';
            if (isSelected && cond === 'POOR') bg = 'bg-red-700';

            return (
              <TouchableOpacity
                key={cond}
                className={`flex-1 py-2.5 rounded-lg items-center ${bg}`}
                onPress={() => setter(cond)}
              >
                <Text className={`font-bold text-xs ${textColor}`}>{cond}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView className="bg-slate-100 flex-1 px-4 py-6">
      {/* Header Banner */}
      <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <Text className="text-2xl font-bold text-[#7A0000] mb-1">
          Room Check-In Property Audit
        </Text>
        <Text className="text-slate-600 text-xs">
          Conduct joint physical check-in inspection of assigned student room fixtures, verify signatures, issue room key, and activate resident standing.
        </Text>
      </View>

      {/* Error & Success Messages */}
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

      {/* Form Card */}
      <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <Text className="text-lg font-bold text-slate-800 mb-3">1. Student & Room Identification</Text>

        {/* Audit Type Picker */}
        <View className="flex-row space-x-2 mb-3">
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-xl items-center ${auditType === 'CHECK_IN' ? 'bg-[#7A0000]' : 'bg-slate-200'}`}
            onPress={() => setAuditType('CHECK_IN')}
          >
            <Text className={`text-xs font-bold ${auditType === 'CHECK_IN' ? 'text-white' : 'text-slate-700'}`}>
              Check-In (Move-In)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-xl items-center ${auditType === 'CHECK_OUT' ? 'bg-[#7A0000]' : 'bg-slate-200'}`}
            onPress={() => setAuditType('CHECK_OUT')}
          >
            <Text className={`text-xs font-bold ${auditType === 'CHECK_OUT' ? 'text-white' : 'text-slate-700'}`}>
              Check-Out (Move-Out)
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs font-semibold text-slate-600 mb-1">Room ID / Room Number</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-3"
          placeholder="Enter Room ID (e.g. rm_jaja_a_101)"
          placeholderTextColor="#94A3B8"
          value={roomId}
          onChangeText={setRoomId}
        />

        <Text className="text-xs font-semibold text-slate-600 mb-1">Student User ID / Matric No</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm mb-4"
          placeholder="Enter Student ID (e.g. usr_student_01)"
          placeholderTextColor="#94A3B8"
          value={studentId}
          onChangeText={setStudentId}
        />

        <Text className="text-lg font-bold text-slate-800 mb-3 pt-2 border-t border-slate-100">
          2. Physical Property Condition Checklist (PRD 4.5)
        </Text>

        {renderConditionSelector('Mattress Condition', mattressCondition, setMattressCondition)}
        {renderConditionSelector('Ceiling Fan & Regulator Condition', fanCondition, setFanCondition)}
        {renderConditionSelector('Electrical Wall Sockets Condition', socketsCondition, setSocketsCondition)}
        {renderConditionSelector('Door Locks & Latches Condition', locksCondition, setLocksCondition)}
        {renderConditionSelector('Ceiling Lights & Fluorescent Lamps', lightsCondition, setLightsCondition)}
        {renderConditionSelector('Window Louvers & Mosquito Netting', windowsCondition, setWindowsCondition)}

        {/* Property Defect Auto-Dispatch Alert Banner */}
        {hasAnyPoor && (
          <View className="bg-amber-50 p-4 rounded-xl border border-amber-300 mb-4">
            <Text className="text-amber-900 font-bold text-xs mb-1">
              ⚠️ Property Defect Flagged
            </Text>
            <Text className="text-amber-800 text-[11px]">
              One or more room items are marked POOR. Submitting this check-in audit will automatically dispatch priority maintenance tickets to the electrical and carpentry teams.
            </Text>
          </View>
        )}

        <Text className="text-lg font-bold text-slate-800 mb-3 pt-2 border-t border-slate-100">
          3. Room Key Handover
        </Text>

        <View className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-bold text-slate-700">Issue Room Key Upon Check-In:</Text>
            <TouchableOpacity
              className={`px-3 py-1.5 rounded-lg ${issueKeyNow ? 'bg-emerald-600' : 'bg-slate-400'}`}
              onPress={() => setIssueKeyNow(!issueKeyNow)}
            >
              <Text className="text-white font-bold text-xs">{issueKeyNow ? 'YES - Issue Key' : 'NO - Hold Key'}</Text>
            </TouchableOpacity>
          </View>

          {issueKeyNow && (
            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">Physical Key Tag Identifier</Text>
              <TextInput
                className="bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 text-xs"
                placeholder="Key Tag Number (e.g. KEY-JAJA-101-A)"
                placeholderTextColor="#94A3B8"
                value={keyTagNumber}
                onChangeText={setKeyTagNumber}
                autoCapitalize="characters"
              />
            </View>
          )}
        </View>

        <Text className="text-lg font-bold text-slate-800 mb-3 pt-2 border-t border-slate-100">
          4. Joint Touchscreen Signatures
        </Text>

        <View className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-xs font-bold text-slate-700">Student Touchscreen Signature:</Text>
            <TouchableOpacity
              className={`px-3 py-1.5 rounded-lg ${studentSig ? 'bg-emerald-600' : 'bg-slate-700'}`}
              onPress={() => setStudentSig(`sig_student_${Date.now()}`)}
            >
              <Text className="text-white font-bold text-xs">{studentSig ? 'Verified ✓' : 'Sign Touchscreen'}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center pt-2 border-t border-slate-200">
            <Text className="text-xs font-bold text-slate-700">Porter Station Signature:</Text>
            <TouchableOpacity
              className={`px-3 py-1.5 rounded-lg ${porterSig ? 'bg-emerald-600' : 'bg-slate-700'}`}
              onPress={() => setPorterSig(`sig_porter_${Date.now()}`)}
            >
              <Text className="text-white font-bold text-xs">{porterSig ? 'Verified ✓' : 'Sign Touchscreen'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-lg font-bold text-slate-800 mb-2 pt-2 border-t border-slate-100">
          5. Inspection Remarks
        </Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-xs mb-4"
          placeholder="Optional remarks (e.g. Minor scratch on closet, key given to resident)"
          placeholderTextColor="#94A3B8"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          className="bg-[#7A0000] rounded-xl py-4 items-center shadow-lg active:opacity-90"
          onPress={handleSubmitAudit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-base">
              Generate & Save Audit Certificate
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Generated Cryptographic Certificate Card */}
      {selectedAudit && (
        <View className="bg-emerald-950 p-5 rounded-2xl shadow-sm mb-6 border border-emerald-800">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Verified Digital Room Audit Pass
            </Text>
            <View className="bg-emerald-600 px-2 py-0.5 rounded-full">
              <Text className="text-white text-[10px] font-bold">IMMUTABLE RECORD</Text>
            </View>
          </View>
          <Text className="text-white text-lg font-bold mb-1">Room: {selectedAudit.roomId}</Text>
          <Text className="text-emerald-300 text-xs mb-3">
            Student: {selectedAudit.studentName || selectedAudit.studentId} • Porter: {selectedAudit.porterName || selectedAudit.porterId}
          </Text>
          <View className="bg-emerald-900 p-3 rounded-xl border border-emerald-700 mb-3">
            <Text className="text-emerald-400 text-[10px] uppercase font-bold mb-1">
              Cryptographic Security Hash
            </Text>
            <Text className="text-white font-mono text-xs font-bold">
              {selectedAudit.certificateHash}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center space-x-1">
              <Text className="text-emerald-300 text-xs">Key Status:</Text>
              <Text className={`text-xs font-bold ${selectedAudit.keyIssued ? 'text-emerald-400' : 'text-amber-400'}`}>
                {selectedAudit.keyIssued ? `ISSUED (${selectedAudit.keyTagNumber})` : 'NOT ISSUED'}
              </Text>
            </View>
            {!selectedAudit.keyIssued && (
              <TouchableOpacity
                className="bg-emerald-600 px-3 py-1 rounded-lg"
                onPress={() => handleIssueKey(selectedAudit.id)}
              >
                <Text className="text-white text-xs font-bold">Handover Key Now</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Activate Resident Button */}
          {selectedAudit.keyIssued && selectedAudit.hasStudentSignature && selectedAudit.hasPorterSignature && (
            <TouchableOpacity
              className="bg-emerald-500 py-3 rounded-xl items-center shadow active:opacity-90 mt-1"
              onPress={() => handleActivateResident(selectedAudit.id)}
              disabled={isLoading}
            >
              <Text className="text-emerald-950 font-bold text-xs uppercase tracking-wider">
                ✓ Complete Check-In & Activate Resident
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Certificate Verification Lookup Box */}
      <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <Text className="text-lg font-bold text-slate-800 mb-1">Verify Audit Certificate Authenticity</Text>
        <Text className="text-xs text-slate-500 mb-3">
          Enter an audit certificate hash to independently verify move-in or checkout inspection records.
        </Text>
        <View className="flex-row space-x-2">
          <TextInput
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-mono"
            placeholder="Enter AUDIT-CERT-..."
            placeholderTextColor="#94A3B8"
            value={searchCertHash}
            onChangeText={setSearchCertHash}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            className="bg-slate-800 px-4 py-2.5 rounded-xl justify-center items-center"
            onPress={handleVerifySearch}
            disabled={isLoading}
          >
            <Text className="text-white text-xs font-bold">Verify</Text>
          </TouchableOpacity>
        </View>

        {verifiedAudit && (
          <View className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Text className="text-xs font-bold text-emerald-800 mb-1">✓ Certificate Authentic</Text>
            <Text className="text-slate-700 text-xs">Room: {verifiedAudit.roomId} | Student: {verifiedAudit.studentId}</Text>
            <Text className="text-slate-500 text-[10px] mt-1">Audited on: {new Date(verifiedAudit.auditedAt).toLocaleString()}</Text>
          </View>
        )}
      </View>

      {/* Recent Audits Log List */}
      {audits.length > 0 && (
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-12">
          <Text className="text-lg font-bold text-slate-800 mb-3">Recent Room Check-In Certificates</Text>
          {audits.map((item) => (
            <View key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-bold text-sm text-slate-800">Room: {item.roomId}</Text>
                <Text className="text-slate-400 text-[10px]">{new Date(item.auditedAt).toLocaleDateString()}</Text>
              </View>
              <Text className="text-slate-600 text-xs mb-2">Student ID: {item.studentId} | Type: {item.auditType}</Text>
              <View className="flex-row flex-wrap gap-1 mb-2">
                <Text className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Mattress: {item.mattressCondition}</Text>
                <Text className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Fan: {item.fanCondition}</Text>
                <Text className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Sockets: {item.socketsCondition}</Text>
                <Text className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Locks: {item.locksCondition}</Text>
                <Text className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Lights: {item.lightsCondition}</Text>
                <Text className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Windows: {item.windowsCondition}</Text>
              </View>
              {item.certificateHash && (
                <Text className="text-emerald-700 font-mono text-[10px] font-semibold">
                  Cert: {item.certificateHash}
                </Text>
              )}
              {item.keyIssued && (
                <Text className="text-slate-700 text-[10px] mt-0.5">
                  Key Issued: {item.keyTagNumber || 'YES'}
                </Text>
              )}
              {item.notes ? <Text className="text-slate-500 text-xs italic mt-1">Remark: "{item.notes}"</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};
