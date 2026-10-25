import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useGatePassStore } from '../store/useGatePassStore';
import { validateVisitorInput } from '../utils/validation';

/**
 * VisitorScreen Component.
 * Implements Issue #46 ([VISITOR-01]) - Student Visitor Pass PIN Generation & Log Management.
 *
 * Provides a user-friendly interface for UNILAG resident students to:
 * - Generate temporary 6-digit visitor access PINs for guests.
 * - View guest details (Full Name, Phone Number, Scheduled Visit Date).
 * - Monitor real-time guest status transitions ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED').
 * - Access past visitor history with high-visibility badges and status indicators.
 *
 * Written with plain-language, non-technical English comments.
 */
export const VisitorScreen: React.FC = () => {
  const { session } = useAuthStore();
  const user = session?.user;
  const { visitorPasses = [], createVisitorPass, loadVisitorPasses } = useGatePassStore();
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);

  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generatedPinModal, setGeneratedPinModal] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id && loadVisitorPasses) {
      loadVisitorPasses(user.id);
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    if (!user?.id || !loadVisitorPasses) return;
    setIsRefreshing(true);
    await loadVisitorPasses(user.id);
    setIsRefreshing(false);
  };

  const handleCreatePass = async () => {
    setValidationError(null);

    // Validate inputs using global validator
    const valResult = validateVisitorInput(visitorName, visitorPhone, visitDate);
    if (!valResult.isValid) {
      setValidationError(valResult.error || 'Please check your visitor input details.');
      return;
    }

    if (!user?.id || !createVisitorPass) {
      setValidationError('User session not active. Please sign in again.');
      return;
    }

    try {
      setIsGeneratingPass(true);
      const pass = await createVisitorPass(
        user.id,
        visitorName.trim(),
        visitorPhone.trim(),
        visitDate.trim() || undefined
      );

      setGeneratedPinModal(pass.passCode);
      setVisitorName('');
      setVisitorPhone('');
      setVisitDate('');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create visitor pass. Please try again.');
    } finally {
      setIsGeneratingPass(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'EXPECTED':
        return { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'Expected' };
      case 'CHECKED_IN':
        return { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', label: 'Checked In' };
      case 'CHECKED_OUT':
        return { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', label: 'Checked Out' };
      default:
        return { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Expired / Invalid' };
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Screen Header Banner */}
      <View className="bg-slate-900 rounded-2xl p-5 mb-5 shadow-sm border border-slate-800">
        <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
          UNILAG Visitor Management System
        </Text>
        <Text className="text-white text-xl font-black">
          Hostel Guest Passes
        </Text>
        <Text className="text-slate-300 text-xs mt-1 leading-relaxed">
          Generate temporary 6-digit gate entrance PINs for your visiting friends, family, and guardians. Give this PIN to your guest to present at the gatehouse.
        </Text>
      </View>

      {/* Visitor Pass Creation Form */}
      <View className="bg-white rounded-2xl p-5 mb-5 border border-slate-200 shadow-sm">
        <Text className="text-slate-900 font-bold text-base mb-4">
          ➕ Issue New Visitor Access Pass
        </Text>

        {validationError && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-700 text-xs font-semibold">{validationError}</Text>
          </View>
        )}

        <Text className="text-slate-700 text-xs font-bold mb-1">Visitor's Full Name *</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm mb-3"
          placeholder="e.g. Adebayo Ogunlesi"
          placeholderTextColor="#94A3B8"
          value={visitorName}
          onChangeText={setVisitorName}
        />

        <Text className="text-slate-700 text-xs font-bold mb-1">Visitor's Phone Number *</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm mb-3"
          placeholder="e.g. 08012345678"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          value={visitorPhone}
          onChangeText={setVisitorPhone}
        />

        <Text className="text-slate-700 text-xs font-bold mb-1">Expected Visit Date (Optional)</Text>
        <TextInput
          className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm mb-4"
          placeholder="YYYY-MM-DD (Defaults to Today)"
          placeholderTextColor="#94A3B8"
          value={visitDate}
          onChangeText={setVisitDate}
        />

        <TouchableOpacity
          className="bg-red-800 rounded-xl py-3.5 items-center justify-center active:opacity-90"
          onPress={handleCreatePass}
          disabled={isGeneratingPass}
        >
          {isGeneratingPass ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-white text-sm font-bold">Generate 6-Digit Gate PIN</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Visitor Log History List */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-slate-900 font-bold text-base">
            📋 Issued Visitor Passes ({visitorPasses.length})
          </Text>
          <TouchableOpacity onPress={handleRefresh} className="px-2 py-1">
            <Text className="text-red-800 text-xs font-bold">
              {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {visitorPasses.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200">
            <Text className="text-2xl mb-2">👤</Text>
            <Text className="text-slate-700 font-bold text-sm">No Guest Passes Created Yet</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              Issue a 6-digit visitor access code above for your guest to present to the gate porter.
            </Text>
          </View>
        ) : (
          visitorPasses.map((pass) => {
            const badge = getStatusBadgeStyle(pass.status);
            return (
              <View
                key={pass.id}
                className="bg-white rounded-2xl p-4 mb-3 border border-slate-200 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-slate-900 font-bold text-base mr-2">
                      {pass.visitorName}
                    </Text>
                    <View className={`px-2 py-0.5 rounded-full border ${badge.bg}`}>
                      <Text className={`text-[10px] font-bold ${badge.text}`}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text className="text-slate-600 text-xs mb-1">
                    📱 {pass.visitorPhone} • 📅 {pass.visitDate}
                  </Text>
                  {pass.checkInTime && (
                    <Text className="text-slate-500 text-[11px]">
                      Entry Time: {new Date(pass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                  {pass.checkOutTime && (
                    <Text className="text-slate-500 text-[11px]">
                      Exit Time: {new Date(pass.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>

                {/* PIN Display */}
                <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 items-center min-w-[80px]">
                  <Text className="text-amber-800 text-[10px] font-bold uppercase">Gate PIN</Text>
                  <Text className="text-amber-950 font-black text-lg tracking-widest">{pass.passCode}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* PIN Generation Success Modal */}
      <Modal
        visible={Boolean(generatedPinModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setGeneratedPinModal(null)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-xl">
            <Text className="text-4xl mb-2">🔑</Text>
            <Text className="text-slate-900 font-bold text-lg text-center">
              Visitor Access PIN Issued
            </Text>
            <Text className="text-slate-600 text-xs text-center mt-1 mb-4">
              Share this 6-digit pass PIN with your visitor. The porter at the hostel gatehouse will enter this PIN to grant entry.
            </Text>

            <View className="bg-amber-100 border-2 border-amber-400 rounded-2xl px-6 py-4 mb-5 items-center w-full">
              <Text className="text-amber-900 text-xs font-bold uppercase tracking-widest mb-1">
                6-DIGIT GATE ACCESS PIN
              </Text>
              <Text className="text-amber-950 font-black text-3xl tracking-widest">
                {generatedPinModal}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-slate-900 rounded-xl py-3 px-8 w-full items-center active:opacity-90"
              onPress={() => setGeneratedPinModal(null)}
            >
              <Text className="text-white font-bold text-sm">Done & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
