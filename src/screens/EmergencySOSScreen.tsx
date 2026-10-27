import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { EmergencyType } from '../types/emergency';

/**
 * Emergency SOS Panic Trigger & Campus Hotline Directory Screen for Students.
 * Implements [EMERGENCY-02] (Issue #67 / UAT-0067) for UnilagStay.
 *
 * Provides resident students with high-visibility emergency triggers (Medical, Fire, Security, General Panic),
 * instant porter alert broadcasting, live status banner tracking, false alarm cancellation,
 * and direct UNILAG emergency hotline phone numbers.
 */
export const EmergencySOSScreen: React.FC = () => {
  const { session } = useAuthStore();
  const student = session?.user;

  const {
    activeAlert,
    alertHistory,
    hotlines,
    isLoading,
    error,
    triggerSOS,
    cancelSOS,
    loadHotlines,
    loadStudentHistory,
    clearError
  } = useEmergencyStore();

  const [selectedType, setSelectedType] = useState<EmergencyType>('GENERAL_PANIC');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (student?.id) {
      loadHotlines();
      loadStudentHistory(student.id);
    }
  }, [student?.id]);

  useEffect(() => {
    if (error) {
      Alert.alert('Emergency Alert Error', error, [
        { text: 'OK', onPress: () => clearError() }
      ]);
    }
  }, [error]);

  const handleTriggerSOS = async () => {
    if (!student?.id) return;

    Alert.alert(
      '🚨 TRIGGER EMERGENCY SOS 🚨',
      `Are you sure you want to broadcast an urgent ${selectedType} panic alert to UNILAG Hostel Porters & Security?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'BROADCAST SOS NOW',
          style: 'destructive',
          onPress: async () => {
            try {
              await triggerSOS({
                studentId: student.id,
                emergencyType: selectedType,
                description: description.trim() || undefined
              });
              setDescription('');
              Alert.alert(
                '🚨 SOS BROADCAST SENT',
                'Emergency responders, hostel porters, and campus security have been notified of your location.'
              );
            } catch (err: any) {
              // Handled by store error listener
            }
          }
        }
      ]
    );
  };

  const handleCancelSOS = () => {
    if (!student?.id || !activeAlert) return;

    Alert.alert(
      'Cancel Emergency Alert',
      'Are you safe now? Cancel this SOS alert if it was triggered by accident or resolved.',
      [
        { text: 'Keep Alert Active', style: 'cancel' },
        {
          text: 'Yes, Cancel SOS',
          onPress: async () => {
            await cancelSOS(student.id);
            Alert.alert('Alert Cancelled', 'Emergency panic alert has been marked as cancelled (False Alarm).');
          }
        }
      ]
    );
  };

  const handleCallHotline = (phone: string, dept: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Phone Call', `Call UNILAG Emergency Unit: ${dept} at ${phone}`);
    });
  };

  return (
    <ScrollView className="flex-1 bg-gray-900 p-4">
      <View className="mb-6 bg-red-950/60 p-4 rounded-xl border border-red-700/60">
        <Text className="text-2xl font-bold text-red-500 text-center uppercase tracking-wider">
          🚨 Campus Emergency SOS 🚨
        </Text>
        <Text className="text-red-200 text-center mt-1 text-sm font-medium">
          Instant 24/7 Panic Trigger for Hostel Porters, Medical, & Campus Security
        </Text>
      </View>

      {/* ACTIVE SOS BANNER */}
      {activeAlert && (
        <View className="mb-6 bg-red-600 p-5 rounded-xl border-2 border-yellow-400 shadow-lg">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-yellow-300 text-xs font-black uppercase tracking-widest bg-red-950 px-2 py-1 rounded">
              STATUS: {activeAlert.status}
            </Text>
            <Text className="text-white text-xs font-semibold">
              {new Date(activeAlert.triggeredAt).toLocaleTimeString()}
            </Text>
          </View>

          <Text className="text-white text-xl font-extrabold uppercase">
            🚨 ACTIVE {activeAlert.emergencyType} SOS
          </Text>
          <Text className="text-red-100 text-sm mt-1">
            Resident: {activeAlert.studentName} ({activeAlert.studentMatric})
          </Text>
          <Text className="text-yellow-200 text-sm font-bold">
            Location: {activeAlert.hostelName}, {activeAlert.roomNumber}
          </Text>

          {activeAlert.description ? (
            <Text className="text-white bg-red-800/80 p-2 rounded mt-2 text-xs italic">
              "{activeAlert.description}"
            </Text>
          ) : null}

          {activeAlert.acknowledgedByPorterName && (
            <View className="mt-3 bg-red-900/90 p-2 rounded border border-yellow-300/40">
              <Text className="text-yellow-300 text-xs font-bold">
                ✓ Acknowledged by Porter: {activeAlert.acknowledgedByPorterName}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleCancelSOS}
            className="mt-4 bg-gray-900 py-3 rounded-lg border border-red-400 active:bg-gray-800"
          >
            <Text className="text-red-400 text-center font-bold uppercase text-xs tracking-wider">
              CANCEL SOS (FALSE ALARM / I AM SAFE)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* EMERGENCY CATEGORY SELECTOR */}
      <View className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
        <Text className="text-gray-200 font-bold mb-3 text-sm uppercase tracking-wide">
          Select Emergency Panic Category
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {(['GENERAL_PANIC', 'MEDICAL', 'SECURITY', 'FIRE'] as EmergencyType[]).map(type => {
            const isSelected = selectedType === type;
            let bgColor = 'bg-gray-700';
            let borderColor = 'border-gray-600';
            let label = type.replace('_', ' ');

            if (type === 'MEDICAL') {
              bgColor = isSelected ? 'bg-red-600' : 'bg-gray-700';
              borderColor = isSelected ? 'border-red-400' : 'border-gray-600';
            } else if (type === 'FIRE') {
              bgColor = isSelected ? 'bg-orange-600' : 'bg-gray-700';
              borderColor = isSelected ? 'border-orange-400' : 'border-gray-600';
            } else if (type === 'SECURITY') {
              bgColor = isSelected ? 'bg-blue-600' : 'bg-gray-700';
              borderColor = isSelected ? 'border-blue-400' : 'border-gray-600';
            } else {
              bgColor = isSelected ? 'bg-purple-600' : 'bg-gray-700';
              borderColor = isSelected ? 'border-purple-400' : 'border-gray-600';
            }

            return (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                className={`w-[48%] p-3 rounded-lg border-2 ${bgColor} ${borderColor} mb-3`}
              >
                <Text className="text-white font-extrabold text-xs uppercase text-center">
                  {type === 'MEDICAL' && '🏥 '}
                  {type === 'FIRE' && '🔥 '}
                  {type === 'SECURITY' && '🛡️ '}
                  {type === 'GENERAL_PANIC' && '⚠️ '}
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-gray-400 text-xs mb-1 font-medium">Optional Situation Notes:</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Asthma attack in Room 204, need medical team"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-900 text-white p-3 rounded-lg border border-gray-700 text-sm mb-4"
        />

        <TouchableOpacity
          onPress={handleTriggerSOS}
          disabled={isLoading}
          className="bg-red-600 py-4 rounded-xl border-2 border-red-400 active:bg-red-700"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-center font-black text-lg uppercase tracking-widest">
              🚨 TRIGGER SOS ALARM NOW 🚨
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* UNILAG CAMPUS HOTLINES */}
      <View className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
        <Text className="text-gray-200 font-bold text-sm uppercase tracking-wide mb-3">
          📞 UNILAG Campus Emergency Directory
        </Text>

        {hotlines.map(h => (
          <TouchableOpacity
            key={h.id}
            onPress={() => handleCallHotline(h.phoneNumber, h.department)}
            className="bg-gray-900 p-3 rounded-lg border border-gray-700 mb-3 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-2">
              <Text className="text-yellow-400 font-bold text-sm">{h.department}</Text>
              <Text className="text-gray-300 text-xs mt-0.5">{h.description}</Text>
              <Text className="text-green-400 text-xs font-bold mt-1">📞 {h.phoneNumber}</Text>
            </View>

            <View className="bg-green-600 px-3 py-2 rounded-lg">
              <Text className="text-white font-black text-xs uppercase">CALL</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ALERT HISTORY */}
      {alertHistory.length > 0 && (
        <View className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-10">
          <Text className="text-gray-200 font-bold text-sm uppercase tracking-wide mb-3">
            📜 Recent SOS Trigger Log
          </Text>

          {alertHistory.map(alert => (
            <View key={alert.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 mb-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-bold text-xs uppercase">
                  {alert.emergencyType} ALARM
                </Text>
                <Text
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    alert.status === 'ACTIVE'
                      ? 'bg-red-600 text-white'
                      : alert.status === 'RESOLVED'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {alert.status}
                </Text>
              </View>
              <Text className="text-gray-400 text-[11px] mt-1">
                Triggered: {new Date(alert.triggeredAt).toLocaleString()}
              </Text>
              {alert.resolutionNotes && (
                <Text className="text-gray-300 text-[11px] italic mt-0.5">
                  Notes: {alert.resolutionNotes}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};
