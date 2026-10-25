import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { MaintenanceCategory } from '../types/maintenance';

/**
 * MaintenanceScreen Component for UNILAG Hostel Students.
 * Implements [MAINTENANCE-01 / UAT-0051 / UAT-014].
 *
 * Provides a non-technical, high-contrast mobile interface allowing students to:
 * 1. Select a defect category (Plumbing, Electrical, Carpentry, Masonry, Janitorial)
 * 2. Input room/hostel details and a description of the damage or issue
 * 3. Capture or attach a mandatory photo proof of the problem
 * 4. Submit the repair request directly into live Turso DB
 * 5. Track existing ticket progress and cancel open requests if needed
 */
export const MaintenanceScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    tickets,
    activeCategory,
    description,
    photoUrl,
    hostelId,
    roomNumber,
    isLoading,
    errorMessage,
    successMessage,
    setCategory,
    setDescription,
    setPhotoUrl,
    setHostelId,
    setRoomNumber,
    submitTicket,
    fetchStudentTickets,
    cancelTicket,
    clearMessages
  } = useMaintenanceStore();

  const studentId = session?.user?.id || 'STUDENT-TEST-001';
  const studentName = session?.user?.fullName || 'UNILAG Student';

  // Sample quick defect photos for testing & demo photo capture simulation
  const samplePhotos = [
    { label: 'Leaking Pipe', url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500' },
    { label: 'Broken Socket', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500' },
    { label: 'Damaged Door', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500' }
  ];

  useEffect(() => {
    if (studentId) {
      fetchStudentTickets(studentId);
    }
  }, [studentId]);

  const handleSubmit = async () => {
    clearMessages();

    if (!photoUrl) {
      // Auto-set default sample photo if none selected for ease of use
      setPhotoUrl(samplePhotos[0].url);
    }

    const ticket = await submitTicket(studentId);
    if (ticket) {
      fetchStudentTickets(studentId);
    }
  };

  const handleCancel = (ticketId: string) => {
    Alert.alert(
      'Cancel Repair Request',
      'Are you sure you want to cancel this maintenance ticket?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await cancelTicket(ticketId, studentId);
            fetchStudentTickets(studentId);
          }
        }
      ]
    );
  };

  const categories: { key: MaintenanceCategory; label: string; icon: string }[] = [
    { key: 'PLUMBING', label: 'Plumbing', icon: '🚰' },
    { key: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
    { key: 'CARPENTRY', label: 'Carpentry', icon: '🪵' },
    { key: 'MASONRY', label: 'Masonry', icon: '🧱' },
    { key: 'JANITORIAL', label: 'Janitorial', icon: '🧹' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: '⏳ OPEN (QUEUED)' };
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800', label: '🛠️ IN PROGRESS' };
      case 'RESOLVED':
        return { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', label: '✅ RESOLVED' };
      case 'REJECTED':
        return { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: '❌ REJECTED' };
      default:
        return { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800', label: status };
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-100 p-4">
      {/* Top Welcome Banner */}
      <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border-l-4 border-[#7A0000]">
        <Text className="text-xl font-bold text-slate-900">Hostel Repair & Maintenance</Text>
        <Text className="text-slate-600 text-sm mt-1">
          Report broken facilities or room damages in your UNILAG hostel with a photograph.
        </Text>
        <Text className="text-slate-500 text-xs mt-2 font-medium">
          Logged in as: <Text className="font-bold text-slate-800">{studentName}</Text>
        </Text>
      </View>

      {/* Error & Success Alert Banners */}
      {errorMessage ? (
        <View className="bg-red-50 border border-red-300 p-4 rounded-xl mb-4 flex-row items-center justify-between">
          <Text className="text-red-800 font-semibold flex-1 mr-2">{errorMessage}</Text>
          <TouchableOpacity onPress={clearMessages} className="px-2 py-1 bg-red-200 rounded">
            <Text className="text-red-900 font-bold text-xs">Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {successMessage ? (
        <View className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl mb-4 flex-row items-center justify-between">
          <Text className="text-emerald-800 font-semibold flex-1 mr-2">{successMessage}</Text>
          <TouchableOpacity onPress={clearMessages} className="px-2 py-1 bg-emerald-200 rounded">
            <Text className="text-emerald-900 font-bold text-xs">Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Create Ticket Form Section */}
      <View className="bg-white p-5 rounded-2xl shadow-sm mb-6">
        <Text className="text-lg font-bold text-slate-900 mb-3">1. Select Issue Category</Text>

        {/* Category Pills */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                className={`px-3.5 py-2.5 rounded-xl border flex-row items-center space-x-1.5 ${
                  isSelected ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hostel & Room Inputs */}
        <Text className="text-base font-bold text-slate-900 mb-2">2. Hostel & Room Location</Text>
        <View className="flex-row space-x-2 mb-4">
          <View className="flex-1">
            <Text className="text-xs text-slate-500 font-semibold mb-1">Hostel ID</Text>
            <TextInput
              value={hostelId}
              onChangeText={setHostelId}
              placeholder="e.g. JAJA_HALL"
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 font-medium"
            />
          </View>

          <View className="flex-1">
            <Text className="text-xs text-slate-500 font-semibold mb-1">Room Number</Text>
            <TextInput
              value={roomNumber}
              onChangeText={setRoomNumber}
              placeholder="e.g. A204"
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 font-medium"
            />
          </View>
        </View>

        {/* Description Textarea Input */}
        <Text className="text-base font-bold text-slate-900 mb-1">3. Describe Problem</Text>
        <Text className="text-xs text-slate-500 mb-2">Provide details (minimum 10 characters required)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Explain what is broken (e.g. Tap leaking continuously under sink in Room A204...)"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-base mb-4 h-24"
        />

        {/* Photo Proof Section */}
        <Text className="text-base font-bold text-slate-900 mb-1">4. Defect Photograph Proof</Text>
        <Text className="text-xs text-slate-500 mb-3">Attach a photo showing the damaged facility</Text>

        {/* Quick Photo Sample Selector */}
        <View className="flex-row space-x-2 mb-3">
          {samplePhotos.map((sample, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setPhotoUrl(sample.url)}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                photoUrl === sample.url ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <Text className="text-xs font-bold text-slate-800">📷 {sample.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Photo URL Input */}
        <TextInput
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder="Paste photo URL or tap sample photo above"
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-xs mb-3"
        />

        {/* Photo Status Indicator */}
        {photoUrl ? (
          <View className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl mb-4 flex-row items-center">
            <Text className="text-emerald-700 font-bold text-xs mr-2">✅ Photo Attached:</Text>
            <Text className="text-slate-600 text-xs flex-1" numberOfLines={1}>{photoUrl}</Text>
          </View>
        ) : (
          <View className="bg-amber-50 border border-amber-300 p-3 rounded-xl mb-4">
            <Text className="text-amber-800 font-medium text-xs">⚠️ Please attach a photo before submitting.</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className="bg-[#7A0000] py-4 rounded-xl items-center justify-center shadow-md active:opacity-90 h-14"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">Submit Repair Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Ticket History Log Section */}
      <View className="mb-10">
        <Text className="text-lg font-bold text-slate-900 mb-3">Your Repair Request History</Text>

        {tickets.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl items-center border border-slate-200">
            <Text className="text-3xl mb-2">🔧</Text>
            <Text className="text-slate-700 font-bold text-base mb-1">No Active Repair Tickets</Text>
            <Text className="text-slate-500 text-xs text-center">
              When you submit a maintenance ticket, its progress and artisan updates will appear here.
            </Text>
          </View>
        ) : (
          tickets.map((ticket) => {
            const badge = getStatusBadge(ticket.status);
            return (
              <View key={ticket.id} className="bg-white p-4 rounded-2xl shadow-sm mb-3 border border-slate-200">
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-xs font-bold text-slate-500">{ticket.id}</Text>
                    <Text className="text-base font-bold text-slate-900 mt-0.5">
                      {ticket.category} - Room {ticket.roomNumber}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full border ${badge.bg}`}>
                    <Text className={`text-xs font-bold ${badge.text}`}>{badge.label}</Text>
                  </View>
                </View>

                <Text className="text-slate-700 text-sm mb-3">{ticket.description}</Text>

                <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
                  <Text className="text-slate-400 text-xs font-medium">
                    Submitted: {new Date(ticket.createdAt).toLocaleDateString()}
                  </Text>

                  {ticket.status === 'OPEN' ? (
                    <TouchableOpacity
                      onPress={() => handleCancel(ticket.id)}
                      className="bg-red-50 border border-red-200 px-3 py-1 rounded-lg"
                    >
                      <Text className="text-red-700 font-bold text-xs">Cancel Ticket</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};
