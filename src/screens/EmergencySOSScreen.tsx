/**
 * Emergency Panic SOS Trigger & Campus Hotline Screen
 *
 * Non-Technical Explanation for Non-Tech Users:
 * This screen gives students a fast, one-tap emergency panic button if they face medical,
 * security, or fire distress in their hostel room. Tapping the big red Panic SOS button
 * immediately alerts hostel porters and campus security. It also displays direct tap-to-call
 * phone numbers for UNILAG security patrols, health centers, and fire services.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { EmergencyAlertType } from '../types/emergency';

export const EmergencySOSScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    activeAlert,
    hotlines,
    isLoading,
    errorMessage,
    successMessage,
    fetchHotlines,
    fetchStudentActiveAlert,
    triggerSOS,
    cancelActiveAlert,
    clearMessages
  } = useEmergencyStore();

  const [selectedType, setSelectedType] = useState<EmergencyAlertType>('GENERAL_PANIC');
  const [notes, setNotes] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Student room details
  const studentId = session?.user.id || 'demo_student_id';
  const hostelId = 'hostel_jaja';
  const roomNumber = 'Room 302';

  useEffect(() => {
    fetchHotlines('MAIN_CAMPUS');
    if (studentId) {
      fetchStudentActiveAlert(studentId);
    }
  }, [studentId]);

  /**
   * Triggers the emergency panic SOS alert upon user confirmation
   */
  const handleTriggerSOS = async () => {
    setShowConfirmModal(false);
    clearMessages();

    await triggerSOS({
      studentId,
      hostelId,
      roomNumber,
      alertType: selectedType,
      additionalNotes: notes
    });
  };

  /**
   * Cancels the currently active panic alert
   */
  const handleCancelSOS = async () => {
    Alert.alert(
      'Cancel Emergency Alert',
      'Are you sure you want to cancel your active emergency alarm?',
      [
        { text: 'No, Keep Alert Active', style: 'cancel' },
        {
          text: 'Yes, Cancel Alert',
          style: 'destructive',
          onPress: async () => {
            await cancelActiveAlert(studentId);
          }
        }
      ]
    );
  };

  /**
   * Opens phone dialer with hotline phone number
   */
  const handleCallHotline = (phone: string) => {
    const formattedPhone = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${formattedPhone}`).catch(() => {
      Alert.alert('Phone Call Failed', `Please dial manually: ${phone}`);
    });
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      {/* Top Banner Header */}
      <View className="bg-red-700 p-5 rounded-2xl mb-5 shadow-lg">
        <Text className="text-white text-2xl font-bold text-center">
          🚨 EMERGENCY PANIC SOS
        </Text>
        <Text className="text-red-100 text-sm text-center mt-1 font-medium">
          Instant Security & Medical Help for UNILAG Hostels
        </Text>
      </View>

      {/* Alert Messages Feedback */}
      {errorMessage && (
        <View className="bg-red-100 border border-red-400 p-4 rounded-xl mb-4">
          <Text className="text-red-800 font-bold text-center">{errorMessage}</Text>
        </View>
      )}

      {successMessage && (
        <View className="bg-green-100 border border-green-400 p-4 rounded-xl mb-4">
          <Text className="text-green-800 font-bold text-center">{successMessage}</Text>
        </View>
      )}

      {/* ACTIVE SOS STATUS CARD */}
      {activeAlert ? (
        <View className="bg-red-50 border-2 border-red-600 p-5 rounded-2xl mb-6 shadow-md">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-red-600 animate-ping mr-2" />
              <Text className="text-red-700 font-black text-lg">
                ACTIVE SOS ALARM IN PROGRESS
              </Text>
            </View>
            <View className="bg-red-600 px-3 py-1 rounded-full">
              <Text className="text-white font-bold text-xs uppercase">
                {activeAlert.alertType}
              </Text>
            </View>
          </View>

          <Text className="text-gray-800 text-base mb-1">
            <Text className="font-bold">Location:</Text> King Jaja Hall - {activeAlert.roomNumber}
          </Text>
          <Text className="text-gray-800 text-sm mb-1">
            <Text className="font-bold">Triggered At:</Text> {new Date(activeAlert.createdAt).toLocaleTimeString()}
          </Text>
          <Text className="text-gray-700 text-sm mb-4">
            <Text className="font-bold">Status:</Text> Security & Porter Desk Alerted (Broadcasting...)
          </Text>

          <TouchableOpacity
            onPress={handleCancelSOS}
            disabled={isLoading}
            className="bg-gray-800 p-4 rounded-xl items-center"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-base">
                CANCEL EMERGENCY SOS ALARM
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* TRIGGER NEW SOS SECTION */
        <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-gray-200">
          <Text className="text-gray-900 font-bold text-lg mb-2">
            Select Emergency Type
          </Text>

          {/* Emergency Category Selector Buttons */}
          <View className="flex-row flex-wrap justify-between mb-4">
            <TouchableOpacity
              onPress={() => setSelectedType('MEDICAL')}
              className={`w-[48%] p-3 rounded-xl mb-2 border-2 items-center ${
                selectedType === 'MEDICAL'
                  ? 'bg-emerald-50 border-emerald-600'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className="text-2xl mb-1">🚑</Text>
              <Text className={`font-bold ${selectedType === 'MEDICAL' ? 'text-emerald-800' : 'text-gray-700'}`}>
                Medical Crisis
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedType('SECURITY')}
              className={`w-[48%] p-3 rounded-xl mb-2 border-2 items-center ${
                selectedType === 'SECURITY'
                  ? 'bg-red-50 border-red-600'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className="text-2xl mb-1">🛡️</Text>
              <Text className={`font-bold ${selectedType === 'SECURITY' ? 'text-red-800' : 'text-gray-700'}`}>
                Security Threat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedType('FIRE')}
              className={`w-[48%] p-3 rounded-xl border-2 items-center ${
                selectedType === 'FIRE'
                  ? 'bg-amber-50 border-amber-600'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className="text-2xl mb-1">🔥</Text>
              <Text className={`font-bold ${selectedType === 'FIRE' ? 'text-amber-800' : 'text-gray-700'}`}>
                Fire Outbreak
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedType('GENERAL_PANIC')}
              className={`w-[48%] p-3 rounded-xl border-2 items-center ${
                selectedType === 'GENERAL_PANIC'
                  ? 'bg-purple-50 border-purple-600'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className="text-2xl mb-1">⚠️</Text>
              <Text className={`font-bold ${selectedType === 'GENERAL_PANIC' ? 'text-purple-800' : 'text-gray-700'}`}>
                General Distress
              </Text>
            </TouchableOpacity>
          </View>

          {/* Optional Notes Input */}
          <Text className="text-gray-700 font-semibold mb-1 text-sm">
            Quick Situation Details (Optional)
          </Text>
          <TextInput
            placeholder="e.g. Asthma attack in Room 302, need immediate doctor"
            value={notes}
            onChangeText={setNotes}
            className="bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 mb-5"
          />

          {/* LARGE RED PANIC SOS BUTTON */}
          <TouchableOpacity
            onPress={() => setShowConfirmModal(true)}
            disabled={isLoading}
            className="bg-red-600 p-5 rounded-2xl items-center shadow-lg border-2 border-red-700 active:bg-red-700"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <View className="items-center">
                <Text className="text-white font-black text-2xl tracking-wider">
                  PRESS FOR SOS EMERGENCY
                </Text>
                <Text className="text-red-100 text-xs font-semibold mt-1">
                  TAP TO ALERT PORTER & SECURITY INSTANTLY
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* CONFIRMATION DIALOG MODAL STUB */}
      {showConfirmModal && (
        <View className="bg-red-900 p-5 rounded-2xl mb-6 shadow-2xl border-2 border-red-500">
          <Text className="text-white font-bold text-xl text-center mb-2">
            Confirm Panic Alarm Dispatch
          </Text>
          <Text className="text-red-100 text-center text-sm mb-4">
            Are you sure you want to broadcast an urgent {selectedType} distress alarm to King Jaja Hall Porters & Security?
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={() => setShowConfirmModal(false)}
              className="bg-gray-700 px-5 py-3 rounded-xl w-[48%] items-center"
            >
              <Text className="text-white font-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleTriggerSOS}
              className="bg-red-500 px-5 py-3 rounded-xl w-[48%] items-center"
            >
              <Text className="text-white font-extrabold">CONFIRM SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* EMERGENCY CAMPUS HOTLINES DIRECTORY */}
      <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <Text className="text-gray-900 font-bold text-lg mb-1">
          UNILAG Emergency Direct Hotlines
        </Text>
        <Text className="text-gray-500 text-xs mb-4">
          Tap any number below to dial immediately from your mobile phone.
        </Text>

        {hotlines.map((hotline) => (
          <View key={hotline.id} className="border-b border-gray-100 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-gray-900 font-bold text-sm">
                {hotline.title}
              </Text>
              <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={2}>
                {hotline.description}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleCallHotline(hotline.phoneNumber)}
              className="bg-emerald-600 px-4 py-2.5 rounded-xl flex-row items-center"
            >
              <Text className="text-white font-bold text-xs mr-1">📞 CALL</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
