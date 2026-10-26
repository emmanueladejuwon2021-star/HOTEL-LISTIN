import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Image
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { MaintenanceTicket, TicketStatus, DefectCategory } from '../types/maintenance';

/**
 * ArtisanQueueScreen Component.
 * Interactive work dispatch queue for university maintenance artisans (Plumbers, Electricians, Carpenters, Masons).
 * Displays open and assigned hostel defect tickets, allows starting jobs, uploading proof-of-fix completion photos,
 * and marking repair jobs as RESOLVED in Turso DB ([MAINTENANCE-03] / UAT-0058).
 */
export const ArtisanQueueScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();
  const {
    tickets,
    isLoading,
    errorMessage,
    successMessage,
    fetchTickets,
    assignJob,
    submitProofOfFix,
    clearMessages
  } = useMaintenanceStore();

  const artisanId = session?.user?.id || 'artisan_demo';

  // Local filter states
  const [selectedStatusTab, setSelectedStatusTab] = useState<TicketStatus | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<DefectCategory | 'ALL'>('ALL');

  // Proof-of-fix photo upload modal state
  const [activeModalTicket, setActiveModalTicket] = useState<MaintenanceTicket | null>(null);
  const [photoAfterInput, setPhotoAfterInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets(artisanId);
  }, [artisanId]);

  // Filtered ticket list
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = selectedStatusTab === 'ALL' || t.status === selectedStatusTab;
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesStatus && matchesCategory;
  });

  const handleStartJob = async (ticketId: string) => {
    clearMessages();
    await assignJob(ticketId, artisanId);
  };

  const handleOpenProofModal = (ticket: MaintenanceTicket) => {
    clearMessages();
    setModalError(null);
    setPhotoAfterInput('https://unilagstay.edu.ng/proofs/fixed_repair_sample.jpg');
    setNotesInput('Repair completed, tested, and verified operational.');
    setActiveModalTicket(ticket);
  };

  const handleConfirmProofOfFix = async () => {
    if (!activeModalTicket) return;
    if (!photoAfterInput || !photoAfterInput.trim()) {
      setModalError('Completion proof photo URL or image path is required.');
      return;
    }

    const success = await submitProofOfFix({
      ticketId: activeModalTicket.id,
      artisanId,
      photoAfterUrl: photoAfterInput.trim(),
      notes: notesInput.trim()
    });

    if (success) {
      setActiveModalTicket(null);
      setPhotoAfterInput('');
      setNotesInput('');
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusBadgeStyle = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-500 text-white';
      case 'IN_PROGRESS':
        return 'bg-blue-600 text-white';
      case 'RESOLVED':
        return 'bg-emerald-600 text-white';
      case 'REJECTED':
        return 'bg-rose-600 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4">
        {/* Header Title Card */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 pr-2">
              <Text className="text-2xl font-black text-amber-800">ARTISAN REPAIR QUEUE</Text>
              <Text className="text-slate-500 text-xs mt-1">
                Hostel Work Dispatch & Proof-of-Fix Upload System
              </Text>
              <Text className="text-slate-800 text-xs font-bold mt-2">
                Staff: {session?.user?.fullName || 'Artisan Specialist'} ({session?.user?.matricOrStaffNo || 'STAFF-MNT'})
              </Text>
            </View>
            <TouchableOpacity
              className="bg-amber-600 px-3 py-2 rounded-xl active:opacity-80"
              onPress={() => fetchTickets(artisanId)}
            >
              <Text className="text-white text-xs font-bold">Refresh Queue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Banner */}
        {successMessage ? (
          <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
            <Text className="text-emerald-800 text-xs font-bold">{successMessage}</Text>
          </View>
        ) : null}

        {/* Error Banner */}
        {errorMessage ? (
          <View className="bg-rose-50 border border-rose-200 p-4 rounded-xl mb-4">
            <Text className="text-rose-800 text-xs font-bold">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Status Filter Tab Pills */}
        <View className="flex-row space-x-2 mb-3">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              className={`px-3 py-2 rounded-xl border ${
                selectedStatusTab === tab
                  ? 'bg-amber-700 border-amber-800'
                  : 'bg-white border-slate-200'
              }`}
              onPress={() => setSelectedStatusTab(tab)}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedStatusTab === tab ? 'text-white' : 'text-slate-700'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-row">
          {(['ALL', 'PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL'] as const).map(
            cat => (
              <TouchableOpacity
                key={cat}
                className={`px-3 py-1.5 rounded-lg mr-2 border ${
                  selectedCategory === cat
                    ? 'bg-slate-800 border-slate-900'
                    : 'bg-slate-200 border-slate-300'
                }`}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    selectedCategory === cat ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* Ticket List Cards */}
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#D97706" />
            <Text className="text-slate-500 text-xs mt-3 font-semibold">
              Loading repair tickets from database...
            </Text>
          </View>
        ) : filteredTickets.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl items-center border border-slate-200 mb-4">
            <Text className="text-slate-700 font-bold text-sm">No Maintenance Tickets Found</Text>
            <Text className="text-slate-400 text-xs text-center mt-1">
              No defect reports matching the selected category or status filter.
            </Text>
          </View>
        ) : (
          filteredTickets.map(ticket => (
            <View
              key={ticket.id}
              className="bg-white p-4 rounded-2xl shadow-sm mb-4 border-l-4 border-amber-500 border border-slate-200"
            >
              {/* Header Info */}
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-base font-bold text-slate-900">
                    {ticket.hostelName || ticket.hostelId} — {ticket.roomNumber}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Category: <Text className="font-bold text-slate-700">{ticket.category}</Text>
                  </Text>
                </View>
                <View className="items-end">
                  <View className={`px-2.5 py-1 rounded-md mb-1 ${getStatusBadgeStyle(ticket.status)}`}>
                    <Text className="text-[10px] font-extrabold tracking-wider">{ticket.status}</Text>
                  </View>
                  <View className={`px-2 py-0.5 rounded border ${getPriorityBadgeStyle(ticket.priority)}`}>
                    <Text className="text-[9px] font-bold">{ticket.priority} SLA</Text>
                  </View>
                </View>
              </View>

              {/* Problem Description */}
              <Text className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100">
                {ticket.description}
              </Text>

              {/* Photo Proof Thumbnail Section */}
              <View className="flex-row space-x-3 mb-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-slate-500 mb-1">
                    BEFORE REPAIR (STUDENT PHOTO):
                  </Text>
                  <View className="bg-slate-200 h-24 rounded-xl overflow-hidden justify-center items-center">
                    {ticket.photoBeforeUrl ? (
                      <Image
                        source={{ uri: ticket.photoBeforeUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-[10px] text-slate-500">No Photo Attached</Text>
                    )}
                  </View>
                </View>

                {ticket.photoAfterUrl ? (
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-emerald-700 mb-1">
                      AFTER REPAIR (PROOF OF FIX):
                    </Text>
                    <View className="bg-emerald-100 h-24 rounded-xl overflow-hidden justify-center items-center border border-emerald-300">
                      <Image
                        source={{ uri: ticket.photoAfterUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Artisan Notes / Remarks */}
              {ticket.notes ? (
                <View className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 mb-3">
                  <Text className="text-[11px] font-bold text-amber-900">Artisan Remarks:</Text>
                  <Text className="text-[11px] text-amber-800 mt-0.5">{ticket.notes}</Text>
                </View>
              ) : null}

              {/* Action CTA Buttons */}
              {ticket.status === 'OPEN' ? (
                <TouchableOpacity
                  className="bg-amber-600 py-3 rounded-xl items-center shadow-sm active:opacity-90"
                  onPress={() => handleStartJob(ticket.id)}
                >
                  <Text className="text-white text-xs font-bold">
                    ACCEPT & START JOB (MARK IN PROGRESS)
                  </Text>
                </TouchableOpacity>
              ) : ticket.status === 'IN_PROGRESS' ? (
                <TouchableOpacity
                  className="bg-emerald-600 py-3 rounded-xl items-center shadow-sm active:opacity-90"
                  onPress={() => handleOpenProofModal(ticket)}
                >
                  <Text className="text-white text-xs font-bold">
                    UPLOAD PROOF-OF-FIX PHOTO & RESOLVE
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="bg-slate-100 py-2 rounded-xl items-center border border-slate-200">
                  <Text className="text-slate-500 text-xs font-semibold">
                    Job Resolved & Closed on {new Date(ticket.resolvedAt || ticket.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-slate-900 py-4 rounded-xl items-center shadow-md active:opacity-90 mt-2 mb-8"
          onPress={logoutUser}
        >
          <Text className="text-white text-sm font-bold">Sign Out (Maintenance Dispatch)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Proof-of-Fix Upload Modal */}
      <Modal visible={activeModalTicket !== null} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white w-full max-w-md rounded-2xl p-5 shadow-xl">
            <Text className="text-lg font-black text-slate-900 mb-1">
              UPLOAD PROOF-OF-FIX PHOTO
            </Text>
            <Text className="text-xs text-slate-500 mb-4">
              Room {activeModalTicket?.roomNumber} — {activeModalTicket?.category}
            </Text>

            {modalError ? (
              <View className="bg-rose-50 p-3 rounded-xl border border-rose-200 mb-3">
                <Text className="text-rose-800 text-xs font-bold">{modalError}</Text>
              </View>
            ) : null}

            <Text className="text-xs font-bold text-slate-700 mb-1">
              Proof Photo Image URL or Path:
            </Text>
            <TextInput
              className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 mb-3"
              placeholder="https://unilagstay.edu.ng/proofs/repair_after.jpg"
              value={photoAfterInput}
              onChangeText={setPhotoAfterInput}
              autoCapitalize="none"
            />

            <Text className="text-xs font-bold text-slate-700 mb-1">
              Work Completed Remarks / Notes:
            </Text>
            <TextInput
              className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 mb-4 h-20"
              placeholder="Describe repair procedure performed..."
              value={notesInput}
              onChangeText={setNotesInput}
              multiline
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
                onPress={() => setActiveModalTicket(null)}
              >
                <Text className="text-slate-700 text-xs font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-emerald-600 py-3 rounded-xl items-center"
                onPress={handleConfirmProofOfFix}
              >
                <Text className="text-white text-xs font-bold">Confirm & Mark Resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
