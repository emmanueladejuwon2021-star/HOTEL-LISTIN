/**
 * MaintenanceTicketScreen Component (PRD Section 4.8 / TC-005 & UAT-0055).
 * Implements Photo-Backed Repair Request Creator for UNILAG students.
 * Allows students to report facility defects in their assigned hostel room, select issue category
 * (Plumbing, Electrical, Carpentry, Masonry, Janitorial), attach defect photos, and track resolution status.
 *
 * Enforces mandatory photo upload before submission (TC-005).
 * Designed with simple, accessible UI for non-technical university students.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { TicketCategory } from '../types/maintenance';

// Category option config with labels and icons for student view
const CATEGORIES: { key: TicketCategory; label: string; icon: string; desc: string }[] = [
  { key: 'PLUMBING', label: 'Plumbing', icon: '🚰', desc: 'Leaking taps, toilets, clogged drains' },
  { key: 'ELECTRICAL', label: 'Electrical', icon: '⚡', desc: 'Blown lights, sockets, ceiling fans' },
  { key: 'CARPENTRY', label: 'Carpentry', icon: '🪚', desc: 'Broken doors, wardrobes, study desks' },
  { key: 'MASONRY', label: 'Masonry', icon: '🧱', desc: 'Wall cracks, broken tiles, plaster' },
  { key: 'JANITORIAL', label: 'Janitorial', icon: '🧹', desc: 'Deep cleaning, waste hazards, sanitation' }
];

export const MaintenanceTicketScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    tickets,
    selectedCategory,
    description,
    photoUrl,
    isLoading,
    errorMessage,
    successMessage,
    setSelectedCategory,
    setDescription,
    setPhotoUrl,
    loadStudentTickets,
    submitTicket
  } = useMaintenanceStore();

  const studentId = session?.user?.id || 'demo_student_id';
  const hostelId = 'JAJA_HALL';
  const roomNumber = 'Room A-102';

  useEffect(() => {
    loadStudentTickets(studentId);
  }, [studentId]);

  const handleSimulatePhotoUpload = () => {
    // Simulates taking or selecting a photo by attaching a sample URI
    const samplePhotoUrl = `https://unilagstay.edu.ng/uploads/defects/photo_${Date.now()}.jpg`;
    setPhotoUrl(samplePhotoUrl);
  };

  const handleSubmit = async () => {
    await submitTicket(studentId, hostelId, roomNumber);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header Banner */}
        <View className="bg-amber-800 p-5 rounded-2xl shadow-md mb-6">
          <Text className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">
            UNILAG Facility Maintenance
          </Text>
          <Text className="text-white text-2xl font-black">Report a Room Defect</Text>
          <Text className="text-amber-100 text-xs mt-1">
            Submit a photo-backed repair ticket to alert university artisans.
          </Text>
          <View className="bg-amber-900/60 px-3 py-1.5 rounded-lg mt-3 self-start">
            <Text className="text-amber-200 font-bold text-xs">
              Location: King Jaja Hall • {roomNumber}
            </Text>
          </View>
        </View>

        {/* Success Banner */}
        {successMessage ? (
          <View className="bg-emerald-100 border border-emerald-400 p-4 rounded-xl mb-6 flex-row items-center">
            <Text className="text-emerald-800 text-lg mr-3">✅</Text>
            <Text className="text-emerald-900 text-xs font-bold flex-1">{successMessage}</Text>
          </View>
        ) : null}

        {/* Error / Validation Banner (PRD TC-005) */}
        {errorMessage ? (
          <View className="bg-rose-100 border border-rose-400 p-4 rounded-xl mb-6 flex-row items-center">
            <Text className="text-rose-800 text-lg mr-3">⚠️</Text>
            <Text className="text-rose-900 text-xs font-bold flex-1">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Step 1: Category Selection */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-slate-900 text-sm font-bold mb-1">1. Select Defect Category</Text>
          <Text className="text-slate-500 text-xs mb-4">Choose the type of repair required in your room.</Text>

          <View className="flex-row flex-wrap justify-between">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  className={`w-[48%] p-3 rounded-xl mb-3 border ${
                    isSelected
                      ? 'bg-amber-50 border-amber-600'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text className="text-xl mb-1">{cat.icon}</Text>
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-amber-900' : 'text-slate-800'
                    }`}
                  >
                    {cat.label}
                  </Text>
                  <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>
                    {cat.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Description & Photo Attachment */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-slate-900 text-sm font-bold mb-1">2. Describe Problem & Attach Photo</Text>
          <Text className="text-slate-500 text-xs mb-4">
            Provide details and attach a clear photo of the broken item before submitting.
          </Text>

          <Text className="text-slate-700 text-xs font-semibold mb-1">Problem Description</Text>
          <TextInput
            placeholder="e.g., Washroom faucet is leaking heavily onto the floor."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline={true}
            numberOfLines={3}
            style={{ textAlignVertical: 'top' }}
            className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-xs mb-4 min-h-[80px]"
          />

          <Text className="text-slate-700 text-xs font-semibold mb-1">
            Defect Photo <Text className="text-rose-600 font-bold">* (Required)</Text>
          </Text>

          {photoUrl ? (
            <View className="bg-amber-50 border border-amber-300 p-3 rounded-xl mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Text className="text-lg mr-2">📷</Text>
                <View className="flex-1">
                  <Text className="text-amber-900 text-xs font-bold">Defect Photo Attached</Text>
                  <Text className="text-amber-700 text-[10px]" numberOfLines={1}>
                    {photoUrl}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setPhotoUrl('')}
                className="bg-rose-200 px-2 py-1 rounded-lg"
              >
                <Text className="text-rose-800 text-[10px] font-bold">Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSimulatePhotoUpload}
              className="bg-slate-100 border-2 border-dashed border-slate-300 p-4 rounded-xl items-center justify-center mb-4 active:opacity-80"
            >
              <Text className="text-2xl mb-1">📸</Text>
              <Text className="text-slate-700 text-xs font-bold">Tap to Attach Defect Photo</Text>
              <Text className="text-slate-400 text-[10px] mt-0.5">
                Camera or photo gallery upload required (TC-005)
              </Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className="bg-amber-600 py-3.5 rounded-xl items-center shadow-md active:opacity-90"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white text-sm font-bold">Submit Repair Ticket</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Step 3: Submitted Tickets List */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Text className="text-slate-900 text-sm font-bold mb-1">3. Your Repair Tickets</Text>
          <Text className="text-slate-500 text-xs mb-4">
            Track status updates as maintenance artisans work on your requests.
          </Text>

          {tickets.length === 0 ? (
            <View className="p-6 items-center justify-center bg-slate-50 rounded-xl">
              <Text className="text-slate-400 text-xs font-semibold">No repair tickets submitted yet.</Text>
            </View>
          ) : (
            tickets.map((t) => {
              let badgeBg = 'bg-amber-100';
              let badgeText = 'text-amber-800';
              if (t.status === 'IN_PROGRESS') {
                badgeBg = 'bg-blue-100';
                badgeText = 'text-blue-800';
              } else if (t.status === 'RESOLVED') {
                badgeBg = 'bg-emerald-100';
                badgeText = 'text-emerald-800';
              } else if (t.status === 'REJECTED') {
                badgeBg = 'bg-rose-100';
                badgeText = 'text-rose-800';
              }

              return (
                <View key={t.id} className="border-b border-slate-200 py-3 last:border-b-0">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs font-bold text-slate-800">{t.id}</Text>
                    <View className={`${badgeBg} px-2.5 py-0.5 rounded-full`}>
                      <Text className={`${badgeText} text-[10px] font-bold`}>{t.status}</Text>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-700 font-medium mb-1">{t.description}</Text>

                  <View className="flex-row justify-between items-center">
                    <Text className="text-[10px] text-slate-500">Category: {t.category}</Text>
                    <Text className="text-[10px] text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MaintenanceTicketScreen;
