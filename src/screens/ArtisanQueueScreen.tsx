import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { MaintenanceTicket, TicketCategory, TicketUrgency } from '../types/maintenance';

/**
 * ArtisanQueueScreen Component.
 * Work queue interface for university maintenance artisans (Plumbers, Electricians, Carpenters, Masons).
 * Displays open defect tickets, room numbers, student issue photos, urgency SLA pills, and proof-of-completion upload modal.
 * Built according to PRD.md Section 6 (M-01) with NativeWind v4 (Tailwind CSS) styling.
 */
export const ArtisanQueueScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();
  const {
    tickets,
    filter,
    isLoading,
    error,
    successMessage,
    fetchJobQueue,
    startJob,
    completeJob,
    setFilter,
    clearNotifications
  } = useMaintenanceStore();

  // State for proof-of-fix upload modal
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [photoAfterUrlInput, setPhotoAfterUrlInput] = useState<string>('');
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchJobQueue();
  }, []);

  const handleStartJob = async (ticket: MaintenanceTicket) => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'Artisan authentication session invalid.');
      return;
    }
    try {
      await startJob(ticket.id, session.user.id);
    } catch (err: any) {
      Alert.alert('Job Action Error', err.message || 'Could not start repair job.');
    }
  };

  const handleOpenCompleteModal = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    // Pre-fill sample photo URL for easy testing/demo
    setPhotoAfterUrlInput('https://unilagstay.edu.ng/proof/repaired_tap_fixed.jpg');
    setCompletionNotes('Repaired leaking valve washer and tested water flow. Issue resolved.');
    setModalVisible(true);
  };

  const handleConfirmCompleteJob = async () => {
    if (!selectedTicket || !session?.user?.id) return;

    if (!photoAfterUrlInput.trim()) {
      Alert.alert('Photo Required', 'Proof-of-fix photograph URL is strictly required before marking job resolved.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeJob({
        ticketId: selectedTicket.id,
        artisanId: session.user.id,
        photoAfterUrl: photoAfterUrlInput.trim(),
        completionNotes: completionNotes.trim()
      });
      setModalVisible(false);
      setSelectedTicket(null);
      setPhotoAfterUrlInput('');
      setCompletionNotes('');
    } catch (err: any) {
      Alert.alert('Completion Error', err.message || 'Could not submit proof-of-fix photograph.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUrgencyBadge = (urgency: TicketUrgency) => {
    switch (urgency) {
      case 'EMERGENCY':
        return (
          <View className="bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300">
            <Text className="text-red-800 text-[10px] font-black">EMERGENCY (&lt; 2h SLA)</Text>
          </View>
        );
      case 'HIGH':
        return (
          <View className="bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
            <Text className="text-amber-800 text-[10px] font-bold">HIGH (&lt; 24h SLA)</Text>
          </View>
        );
      case 'MEDIUM':
        return (
          <View className="bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
            <Text className="text-sky-800 text-[10px] font-bold">MEDIUM (&lt; 48h SLA)</Text>
          </View>
        );
      default:
        return (
          <View className="bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
            <Text className="text-slate-700 text-[10px] font-bold">LOW (&lt; 72h SLA)</Text>
          </View>
        );
    }
  };

  const renderCategoryBadge = (category: TicketCategory) => {
    return (
      <View className="bg-amber-500 px-2 py-0.5 rounded">
        <Text className="text-white text-[10px] font-black tracking-wide">{category}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5 pb-16">
        {/* Title Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xl font-bold text-amber-800">ARTISAN WORK QUEUE</Text>
            <TouchableOpacity
              onPress={() => fetchJobQueue()}
              className="bg-amber-100 px-3 py-1 rounded-lg border border-amber-300"
            >
              <Text className="text-amber-900 text-xs font-bold">Refresh Queue</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-500 text-xs">
            Hostel Facility Maintenance & Defect Resolution Dispatch
          </Text>
          <Text className="text-slate-700 text-xs mt-2 font-semibold">
            Artisan Staff: {session?.user?.fullName || 'Artisan User'} ({session?.user?.matricOrStaffNo || 'STAFF-MNT'})
          </Text>
        </View>

        {/* Notifications Banners */}
        {error && (
          <View className="bg-rose-100 border border-rose-300 p-4 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-rose-800 text-xs font-bold flex-1 mr-2">{error}</Text>
            <TouchableOpacity onPress={clearNotifications}>
              <Text className="text-rose-900 font-bold text-xs">Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {successMessage && (
          <View className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-emerald-800 text-xs font-bold flex-1 mr-2">{successMessage}</Text>
            <TouchableOpacity onPress={clearNotifications}>
              <Text className="text-emerald-900 font-bold text-xs">Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Urgency SLA Filter Pills */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-700 mb-2">FILTER BY RESPONSE SLA / URGENCY:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 py-1">
            {(['ALL', 'EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'] as const).map(urg => {
              const active = filter.urgency === urg;
              return (
                <TouchableOpacity
                  key={urg}
                  onPress={() => setFilter({ urgency: urg })}
                  className={`px-3 py-2 rounded-xl border mr-2 ${
                    active ? 'bg-amber-600 border-amber-700' : 'bg-white border-slate-300'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-700'}`}>
                    {urg === 'ALL' ? 'All Urgencies' : urg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Category Filter Pills */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-slate-700 mb-2">FILTER BY DEFECT CATEGORY:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 py-1">
            {(['ALL', 'PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL'] as const).map(cat => {
              const active = filter.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFilter({ category: cat })}
                  className={`px-3 py-2 rounded-xl border mr-2 ${
                    active ? 'bg-slate-800 border-slate-900' : 'bg-white border-slate-300'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-700'}`}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Assigned Ticket Queue Cards */}
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#D97706" />
            <Text className="text-slate-500 text-xs mt-3 font-semibold">Syncing Artisan Job Queue...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center mb-6">
            <Text className="text-slate-700 font-bold text-base mb-1">No Active Repair Tickets</Text>
            <Text className="text-slate-500 text-xs text-center">
              All hostel repair jobs matching the current filter criteria have been resolved or non-existent.
            </Text>
          </View>
        ) : (
          <View className="space-y-4 mb-6">
            {tickets.map(ticket => (
              <View
                key={ticket.id}
                className={`bg-white p-5 rounded-2xl border-l-4 shadow-sm mb-4 ${
                  ticket.urgency === 'EMERGENCY'
                    ? 'border-red-600'
                    : ticket.urgency === 'HIGH'
                    ? 'border-amber-500'
                    : 'border-slate-400'
                }`}
              >
                {/* Header Row */}
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-slate-900">
                      {ticket.hostel_name || 'UNILAG Hostel'} — {ticket.room_number}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      Logged by Student: {ticket.student_name || ticket.student_id} • {new Date(ticket.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="items-end space-y-1">
                    {renderCategoryBadge(ticket.category)}
                    <View className="mt-1">{renderUrgencyBadge(ticket.urgency)}</View>
                  </View>
                </View>

                {/* Description */}
                <Text className="text-xs text-slate-700 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {ticket.description}
                </Text>

                {/* Defect Photo Before Preview */}
                <View className="mb-3 flex-row items-center space-x-3">
                  <View className="bg-slate-200 w-16 h-16 rounded-xl overflow-hidden items-center justify-center border border-slate-300">
                    {ticket.photo_before_url ? (
                      <Image source={{ uri: ticket.photo_before_url }} className="w-16 h-16" />
                    ) : (
                      <Text className="text-[10px] text-slate-500 text-center">No Photo</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-bold text-slate-800">Student Issue Capture</Text>
                    <Text className="text-[10px] text-slate-500">
                      Status: <Text className="font-bold text-amber-700">{ticket.status}</Text>
                    </Text>
                    {ticket.assigned_artisan_name && (
                      <Text className="text-[10px] text-slate-500">
                        Assigned: {ticket.assigned_artisan_name}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Action Buttons based on Status */}
                {ticket.status === 'OPEN' && (
                  <TouchableOpacity
                    onPress={() => handleStartJob(ticket)}
                    className="bg-amber-600 py-3 rounded-xl items-center active:opacity-90 shadow-sm"
                  >
                    <Text className="text-white text-xs font-bold">Start Repair Job (& mark IN_PROGRESS)</Text>
                  </TouchableOpacity>
                )}

                {ticket.status === 'IN_PROGRESS' && (
                  <TouchableOpacity
                    onPress={() => handleOpenCompleteModal(ticket)}
                    className="bg-emerald-600 py-3 rounded-xl items-center active:opacity-90 shadow-sm"
                  >
                    <Text className="text-white text-xs font-bold">Upload Proof-of-Fix & Resolve Ticket</Text>
                  </TouchableOpacity>
                )}

                {ticket.status === 'RESOLVED' && (
                  <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-emerald-800 text-xs font-bold">RESOLVED ✓</Text>
                      <Text className="text-emerald-700 text-[10px]">
                        Resolved on {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : 'Date N/A'}
                      </Text>
                    </View>
                    {ticket.photo_after_url && (
                      <View className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-300">
                        <Image source={{ uri: ticket.photo_after_url }} className="w-12 h-12" />
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-slate-800 py-4 rounded-xl items-center shadow-md active:opacity-90 mt-4"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Maintenance Dispatch)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Proof-of-Fix Upload Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-center p-5">
          <View className="bg-white rounded-3xl p-6 shadow-2xl">
            <Text className="text-lg font-bold text-slate-900 mb-1">Upload Proof-of-Fix Photograph</Text>
            <Text className="text-xs text-slate-500 mb-4">
              Room {selectedTicket?.room_number} ({selectedTicket?.category})
            </Text>

            <Text className="text-xs font-bold text-slate-700 mb-1">"After" Photograph URL:</Text>
            <TextInput
              value={photoAfterUrlInput}
              onChangeText={setPhotoAfterUrlInput}
              placeholder="https://unilagstay.edu.ng/proof/fixed.jpg"
              className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-xs mb-4"
            />

            <Text className="text-xs font-bold text-slate-700 mb-1">Completion Notes / Remarks:</Text>
            <TextInput
              value={completionNotes}
              onChangeText={setCompletionNotes}
              placeholder="Explain repair action taken..."
              multiline
              numberOfLines={3}
              className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-xs mb-6 text-top"
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center mr-2"
              >
                <Text className="text-slate-800 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmCompleteJob}
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 py-3 rounded-xl items-center shadow-sm"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-bold text-xs">Submit & Resolve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
