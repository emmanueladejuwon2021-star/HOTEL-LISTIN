/**
 * Student Maintenance UI Screen for UnilagStay Hostel Management App
 * Allows students to report hostel defect issues categorized by Plumbing, Electrical, Carpentry,
 * Masonry, Appliance, and Structural with dynamic target SLA response times, photo proof,
 * and live ticket history tracking.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import {
  CATEGORY_METADATA,
  MaintenanceCategory,
  MaintenanceTicket,
} from '../types/maintenance';

export const StudentMaintenanceScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    selectedCategory,
    description,
    photoBeforeUrl,
    isLoading,
    errorMessage,
    successMessage,
    userTickets,
    setSelectedCategory,
    setDescription,
    setPhotoBeforeUrl,
    resetForm,
    loadStudentTickets,
    submitTicket,
    cancelTicket,
  } = useMaintenanceStore();

  const studentId = session?.user?.id || 'usr_student_demo';

  useEffect(() => {
    if (studentId) {
      loadStudentTickets(studentId);
    }
  }, [studentId]);

  const categoryKeys: MaintenanceCategory[] = [
    'PLUMBING',
    'ELECTRICAL',
    'CARPENTRY',
    'MASONRY',
    'APPLIANCE',
    'STRUCTURAL',
  ];

  const currentCategoryMeta = CATEGORY_METADATA[selectedCategory];

  const handleSubmit = async () => {
    await submitTicket({
      studentId,
      hostelId: 'hostel_jafojo',
      roomNumber: 'A-204',
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'bg-red-600 text-white font-bold';
      case 'HIGH':
        return 'bg-orange-500 text-white font-bold';
      case 'MEDIUM':
        return 'bg-amber-500 text-white font-semibold';
      case 'LOW':
        return 'bg-blue-500 text-white font-medium';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      {/* Header Banner */}
      <View className="bg-amber-900 p-5 rounded-2xl mb-5 shadow-sm">
        <Text className="text-white text-xl font-bold mb-1">
          🛠️ Facility Maintenance & Repair Request
        </Text>
        <Text className="text-amber-100 text-xs leading-5">
          Report hostel room defects directly to UNILAG Works Dept. Select a category, add a photo,
          and track response SLAs in real-time.
        </Text>
      </View>

      {/* Alert Banners */}
      {errorMessage && (
        <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
          <Text className="text-red-700 text-xs font-bold mb-1">⚠️ Error</Text>
          <Text className="text-red-600 text-xs">{errorMessage}</Text>
        </View>
      )}

      {successMessage && (
        <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
          <Text className="text-emerald-800 text-xs font-bold mb-1">✅ Success</Text>
          <Text className="text-emerald-700 text-xs">{successMessage}</Text>
        </View>
      )}

      {/* Defect Category Selection Grid */}
      <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-5">
        <Text className="text-slate-900 text-sm font-bold mb-3">
          1. Select Defect Category
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {categoryKeys.map((catKey) => {
            const isSelected = selectedCategory === catKey;
            const meta = CATEGORY_METADATA[catKey];

            return (
              <TouchableOpacity
                key={catKey}
                onPress={() => setSelectedCategory(catKey)}
                className={`w-[48%] mb-3 p-3 rounded-xl border ${
                  isSelected
                    ? 'bg-amber-50 border-amber-600 shadow-sm'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-slate-800">{meta.label}</Text>
                  {isSelected && <Text className="text-amber-600 text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-slate-500 text-[10px]" numberOfLines={2}>
                  {meta.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Category SLA & Priority Info Box */}
        <View className="mt-2 bg-amber-50 border border-amber-200 p-3 rounded-xl flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <Text className="text-amber-900 text-xs font-bold">
              Target SLA Response: {currentCategoryMeta.targetSla}
            </Text>
            <Text className="text-amber-800 text-[10px]">
              Default Priority: {currentCategoryMeta.defaultPriority}
            </Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${getPriorityStyle(currentCategoryMeta.defaultPriority)}`}>
            <Text className="text-white text-[10px] uppercase">{currentCategoryMeta.defaultPriority}</Text>
          </View>
        </View>
      </View>

      {/* Defect Description & Photo Proof Form */}
      <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-5">
        <Text className="text-slate-900 text-sm font-bold mb-3">
          2. Defect Description & Photo Attachment
        </Text>

        <Text className="text-slate-600 text-xs font-semibold mb-1">
          Describe the problem in detail *
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Ceiling fan in Room A-204 is sparking and regulator is completely stuck..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-xs mb-3 h-24"
          style={{ textAlignVertical: 'top' }}
        />

        <Text className="text-slate-600 text-xs font-semibold mb-1">
          Photo Proof Attachment URL *
        </Text>
        <TextInput
          value={photoBeforeUrl}
          onChangeText={setPhotoBeforeUrl}
          placeholder="https://unilagstay.edu.ng/uploads/defect.jpg"
          placeholderTextColor="#94A3B8"
          className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 text-xs mb-3"
        />

        {/* Photo Preview Card */}
        {photoBeforeUrl ? (
          <View className="bg-slate-100 p-2 rounded-xl mb-4 border border-slate-200 items-center">
            <Text className="text-slate-500 text-[10px] mb-1 font-semibold">
              Photo Attachment Attached:
            </Text>
            <View className="bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300">
              <Text className="text-amber-900 text-xs font-semibold" numberOfLines={1}>
                📷 {photoBeforeUrl}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Submit CTA */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`py-3.5 rounded-xl items-center shadow-sm ${
            isLoading ? 'bg-amber-400' : 'bg-amber-800 active:bg-amber-900'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-white text-xs font-bold uppercase tracking-wider">
              Submit Repair Request
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Logged Maintenance Ticket History */}
      <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-slate-900 text-sm font-bold">
            My Maintenance Tickets ({userTickets.length})
          </Text>
          <TouchableOpacity onPress={() => loadStudentTickets(studentId)}>
            <Text className="text-amber-800 text-xs font-semibold">🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {userTickets.length === 0 ? (
          <View className="p-6 bg-slate-50 rounded-xl items-center border border-dashed border-slate-300">
            <Text className="text-slate-500 text-xs font-medium">
              No maintenance requests logged yet.
            </Text>
          </View>
        ) : (
          userTickets.map((ticket: MaintenanceTicket) => (
            <View
              key={ticket.id}
              className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-3"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-slate-900 text-xs font-bold">
                  {ticket.id} • {ticket.category}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(
                    ticket.status
                  )}`}
                >
                  <Text className="text-[10px] font-bold uppercase">{ticket.status}</Text>
                </View>
              </View>

              <Text className="text-slate-700 text-xs mb-2">{ticket.description}</Text>

              <View className="flex-row items-center justify-between pt-2 border-t border-slate-200">
                <Text className="text-slate-500 text-[10px]">
                  SLA Target: <Text className="font-bold text-amber-900">{ticket.targetSla}</Text>
                </Text>

                {ticket.status === 'OPEN' && (
                  <TouchableOpacity
                    onPress={() => cancelTicket(ticket.id, studentId)}
                    className="bg-red-100 px-2.5 py-1 rounded-lg border border-red-300"
                  >
                    <Text className="text-red-700 text-[10px] font-bold">Cancel Ticket</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
