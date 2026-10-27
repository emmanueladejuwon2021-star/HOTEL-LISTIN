/**
 * Emergency Panic SOS & Security Alert Screen for UNILAG Hostel Management App ("UnilagStay").
 *
 * Provides a high-visibility, rapid-response interface allowing students to trigger a 3-second
 * long-press Emergency Panic SOS alert, notify hall porters and campus security, cancel false alarms,
 * and dial UNILAG emergency hotlines (Medical Center, Security Control Room, Porter Desk).
 *
 * Implements:
 * - [EMERGENCY-01] Emergency Panic SOS Trigger & Porter Alarm - Feature Component 1 (Issue #66)
 *
 * Adheres strictly to PRD Section 4.10, 6 (Spec S-02), 12 (TC-007), and 15 (UAT-0066).
 * Styled with NativeWind v4 (Tailwind CSS) for mobile responsiveness.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useEmergencyStore } from '../store/useEmergencyStore';

export const EmergencySosScreen: React.FC = () => {
  const { session } = useAuthStore();
  const studentId = session?.user?.id || 'usr_student_jaja_01';

  const {
    activeAlert,
    emergencyContacts,
    holdProgress,
    isTriggering,
    isLoading,
    errorMessage,
    setHoldProgress,
    triggerSos,
    fetchActiveAlert,
    cancelSos,
  } = useEmergencyStore();

  const [holdTimeMs, setHoldTimeMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchActiveAlert(studentId);
  }, [studentId]);

  /**
   * Starts press timer for 3-second long-press panic trigger.
   */
  const handlePressIn = () => {
    if (activeAlert) return;
    setHoldTimeMs(0);
    setHoldProgress(0);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 3000, 1);
      setHoldTimeMs(elapsed);
      setHoldProgress(progress);

      if (elapsed >= 3000) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        executeTrigger();
      }
    }, 100);
  };

  /**
   * Clears press timer when user releases button before 3 seconds.
   */
  const handlePressOut = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (holdTimeMs < 3000) {
      setHoldProgress(0);
      setHoldTimeMs(0);
    }
  };

  /**
   * Executes SOS panic alert trigger upon 3-second press completion.
   */
  const executeTrigger = async () => {
    try {
      await triggerSos({ studentId, alertType: 'MEDICAL_OR_SECURITY' });
      Alert.alert(
        '🚨 EMERGENCY ALERT ACTIVATED',
        'Your Emergency Panic SOS alert has been sent to Hall Porters, UNILAG Campus Security, and Medical Centre.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to dispatch SOS alert.');
    }
  };

  /**
   * Handles cancellation of false-alarm SOS alert.
   */
  const handleCancelAlert = () => {
    if (!activeAlert) return;
    Alert.alert(
      'Cancel Emergency Alert',
      'Are you sure you want to cancel this emergency alert? This will inform porters that you are safe.',
      [
        { text: 'No, Keep Alert Active', style: 'cancel' },
        {
          text: 'Yes, Cancel False Alarm',
          style: 'destructive',
          onPress: async () => {
            await cancelSos(activeAlert.id, studentId);
            Alert.alert('Alert Cancelled', 'Emergency alert has been cancelled.');
          },
        },
      ]
    );
  };

  /**
   * Launches phone dialer for emergency contact numbers.
   */
  const handleCallContact = (phone: string, title: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Emergency Contact Phone', `${title}\nPhone: ${phone}`);
    });
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-6 pb-20">
      {/* Header Banner */}
      <View className="bg-slate-800 p-5 rounded-3xl mb-6 border border-slate-700 shadow-md">
        <Text className="text-red-500 font-extrabold text-2xl mb-1">
          🚨 Emergency SOS & Security
        </Text>
        <Text className="text-slate-300 text-sm">
          UNILAG Campus Panic Trigger & Porter Alarm System
        </Text>
      </View>

      {/* Active Alert Banner */}
      {activeAlert ? (
        <View className="bg-red-900/90 border-2 border-red-500 p-6 rounded-3xl mb-8 items-center shadow-xl">
          <Text className="text-white text-3xl mb-2">🚨 EMERGENCY ACTIVE</Text>
          <Text className="text-red-100 font-bold text-center text-lg mb-2">
            Hall Porter & Campus Security Notified!
          </Text>
          <Text className="text-red-200 text-center text-sm mb-4">
            Alert ID: {activeAlert.id}{'\n'}
            Room: {activeAlert.roomNumber} ({activeAlert.hostelName}){'\n'}
            Time: {new Date(activeAlert.createdAt).toLocaleTimeString()}
          </Text>
          <TouchableOpacity
            onPress={handleCancelAlert}
            className="bg-white py-3 px-6 rounded-xl border border-red-300 shadow-sm"
          >
            <Text className="text-red-700 font-extrabold text-base">
              CANCEL FALSE ALARM
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* 3-Second Panic SOS Button */
        <View className="bg-slate-800 p-6 rounded-3xl border border-slate-700 items-center mb-8 shadow-lg">
          <Text className="text-slate-200 font-bold text-lg text-center mb-2">
            Press and Hold for 3 Seconds
          </Text>
          <Text className="text-slate-400 text-xs text-center mb-6 px-4">
            Pressing the panic button for 3 seconds dispatches an urgent alarm to your Hostel Porter Desk and Security Control Room.
          </Text>

          {/* Animated Hold Ring / Button */}
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isTriggering}
            className="w-44 h-44 rounded-full bg-red-600 justify-center items-center shadow-2xl active:bg-red-700"
            style={{
              borderWidth: 6,
              borderColor: holdProgress > 0 ? '#EF4444' : '#7F1D1D',
            }}
          >
            {isTriggering ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <View className="items-center px-2">
                <Text className="text-white text-4xl font-extrabold mb-1">SOS</Text>
                <Text className="text-red-100 font-bold text-xs text-center">
                  {holdProgress > 0
                    ? `${Math.ceil((1 - holdProgress) * 3)}s HOLD`
                    : 'HOLD 3s'}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Progress Bar */}
          <View className="w-full bg-slate-700 h-3 rounded-full mt-6 overflow-hidden">
            <View
              className="bg-red-500 h-full rounded-full"
              style={{ width: `${holdProgress * 100}%` }}
            />
          </View>
        </View>
      )}

      {/* Emergency Hotline Directory */}
      <Text className="text-white font-extrabold text-xl mb-4 px-1">
        ☎️ UNILAG Emergency Hotlines
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#EF4444" className="my-6" />
      ) : (
        emergencyContacts.map((contact) => (
          <View
            key={contact.id}
            className="bg-slate-800 p-5 rounded-2xl mb-4 border border-slate-700 flex-row justify-between items-center shadow-sm"
          >
            <View className="flex-1 pr-3">
              <Text className="text-white font-bold text-base mb-1">
                {contact.title}
              </Text>
              <Text className="text-slate-400 text-xs mb-1">
                📍 {contact.location}
              </Text>
              <Text className="text-red-400 font-bold text-sm">
                📞 {contact.phone}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCallContact(contact.phone, contact.title)}
              className="bg-red-600 py-3 px-4 rounded-xl shadow-md active:bg-red-700"
            >
              <Text className="text-white font-extrabold text-xs">DIAL</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {errorMessage && (
        <Text className="text-red-400 text-center text-sm mt-2 mb-6">
          {errorMessage}
        </Text>
      )}
    </ScrollView>
  );
};

export default EmergencySosScreen;
