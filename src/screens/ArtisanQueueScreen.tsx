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
 * and marking repair jobs as RESOLVED in Turso DB ([MAINTENANCE-02] / UAT-0057).
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

  const getCategoryBadgeStyle = (category: DefectCategory) => {
    switch (category) {
      case 'PLUMBING':
        return { bg: 'bg-amber-100', text: 'text-amber-800' };
      case 'ELECTRICAL':
        return { bg: 'bg-rose-100', text: 'text-rose-800' };
      case 'CARPENTRY':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'MASONRY':
        return { bg: 'bg-slate-200', text: 'text-slate-800' };
      case 'JANITORIAL':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const getStatusBadgeStyle = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return { bg: 'bg-amber-500', text: 'text-white' };
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-600', text: 'text-white' };
      case 'RESOLVED':
        return { bg: 'bg-emerald-600', text: 'text-white' };
      case 'REJECTED':
        return { bg: 'bg-red-600', text: 'text-white' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Title Header Banner */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-amber-800">ARTISAN WORK QUEUE</Text>
              <Text className="text-slate-500 text-xs mt-1">
                Hostel Facility Maintenance & Defect Resolution Dispatch
              </Text>
            </View>
            <View className="bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              <Text className="text-amber-800 text-[11px] font-bold">ONLINE DISPATCH</Text>
            </View>
          </View>

          <View className="mt-4 pt-3 border-t border-slate-100 flex-row justify-between items-center">
            <Text className="text-slate-700 text-xs font-semibold">
              Artisan: {session?.user?.fullName || 'Campus Maintenance Staff'}
            </Text>
            <Text className="text-slate-500 text-[11px]">
              ID: {session?.user?.matricOrStaffNo || 'STAFF-MNT-01'}
            </Text>
          </View>
        </View>

        {/* Global Notification Banners */}
        {errorMessage && (
          <View className="bg-red-100 border border-red-300 p-4 rounded-xl mb-4">
            <Text className="text-red-800 text-xs font-semibold">{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl mb-4">
            <Text className="text-emerald-800 text-xs font-semibold">{successMessage}</Text>
          </View>
        )}

        {/* Status Filter Tabs */}
        <View className="flex-row bg-slate-200 p-1 rounded-xl mb-4">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2 rounded-lg items-center ${
                selectedStatusTab === tab ? 'bg-amber-600' : 'bg-transparent'
              }`}
              onPress={() => setSelectedStatusTab(tab)}
            >
              <Text
                className={`text-[11px] font-bold ${
                  selectedStatusTab === tab ? 'text-white' : 'text-slate-700'
                }`}
              >
                {tab.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading Spinner */}
        {isLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#D97706" />
            <Text className="text-slate-500 text-xs mt-2 font-medium">
              Updating Maintenance Queue from Database...
            </Text>
          </View>
        )}

        {/* Ticket Cards List */}
        {!isLoading && filteredTickets.length === 0 && (
          <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center my-4">
            <Text className="text-slate-700 font-bold text-base">No Maintenance Jobs Found</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              There are no defect tickets matching your active filter criteria.
            </Text>
          </View>
        )}

        <View className="space-y-4 mb-6">
          {filteredTickets.map(ticket => {
            const catBadge = getCategoryBadgeStyle(ticket.category);
            const statusBadge = getStatusBadgeStyle(ticket.status);

            return (
              <View
                key={ticket.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
              >
                {/* Card Header: Location & Category */}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-bold text-slate-900">
                    {ticket.hostelName || 'Main Campus Hostel'} — {ticket.roomNumber}
                  </Text>
                  <View className={`${catBadge.bg} px-2.5 py-0.5 rounded-full`}>
                    <Text className={`${catBadge.text} text-[10px] font-bold`}>
                      {ticket.category}
                    </Text>
                  </View>
                </View>

                {/* Issue Description */}
                <Text className="text-xs text-slate-700 mb-3">{ticket.description}</Text>

                {/* Priority & Status Badges */}
                <View className="flex-row justify-between items-center mb-4 pt-2 border-t border-slate-100">
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-[11px] text-slate-500">Priority:</Text>
                    <View className="bg-amber-100 px-2 py-0.5 rounded">
                      <Text className="text-amber-800 text-[10px] font-bold">
                        {ticket.priority} SLA
                      </Text>
                    </View>
                  </View>

                  <View className={`${statusBadge.bg} px-2.5 py-0.5 rounded-full`}>
                    <Text className={`${statusBadge.text} text-[10px] font-bold`}>
                      {ticket.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons based on Status */}
                {ticket.status === 'OPEN' && (
                  <TouchableOpacity
                    className="bg-amber-600 py-3 rounded-xl items-center active:opacity-90"
                    onPress={() => handleStartJob(ticket.id)}
                  >
                    <Text className="text-white text-xs font-bold">Start Job & Accept Ticket</Text>
                  </TouchableOpacity>
                )}

                {ticket.status === 'IN_PROGRESS' && (
                  <TouchableOpacity
                    className="bg-emerald-600 py-3 rounded-xl items-center active:opacity-90"
                    onPress={() => handleOpenProofModal(ticket)}
                  >
                    <Text className="text-white text-xs font-bold">
                      Upload Proof-of-Fix Photo & Complete Job
                    </Text>
                  </TouchableOpacity>
                )}

                {ticket.status === 'RESOLVED' && (
                  <View className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <Text className="text-emerald-800 text-xs font-bold mb-1">
                      ✓ Job Verified & Completed
                    </Text>
                    {ticket.resolvedAt && (
                      <Text className="text-emerald-600 text-[10px]">
                        Resolved at: {new Date(ticket.resolvedAt).toLocaleString()}
                      </Text>
                    )}
                    {ticket.photoAfterUrl && (
                      <Text className="text-slate-500 text-[10px] mt-1 italic">
                        Proof photo attached: {ticket.photoAfterUrl}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-slate-800 py-4 rounded-xl items-center shadow-md active:opacity-90 mb-6"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Maintenance Dispatch)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Proof-of-Fix Photo Upload Modal */}
      {activeModalTicket && (
        <Modal transparent animationType="fade" visible={Boolean(activeModalTicket)}>
          <View className="flex-1 bg-black/60 justify-center p-5">
            <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
              <Text className="text-lg font-bold text-slate-900 mb-1">
                Upload Proof-of-Fix Photo
              </Text>
              <Text className="text-xs text-slate-500 mb-4">
                Location: {activeModalTicket.hostelName} — {activeModalTicket.roomNumber} (
                {activeModalTicket.category})
              </Text>

              {modalError && (
                <View className="bg-red-100 border border-red-300 p-3 rounded-xl mb-3">
                  <Text className="text-red-800 text-xs font-semibold">{modalError}</Text>
                </View>
              )}

              <Text className="text-xs font-bold text-slate-700 mb-1">
                Completion Photo URL / Image Path *
              </Text>
              <TextInput
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 mb-3"
                value={photoAfterInput}
                onChangeText={setPhotoAfterInput}
                placeholder="https://unilagstay.edu.ng/proofs/fixed_photo.jpg"
              />

              <Text className="text-xs font-bold text-slate-700 mb-1">Artisan Resolution Remarks</Text>
              <TextInput
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 mb-4"
                value={notesInput}
                onChangeText={setNotesInput}
                placeholder="Describe parts replaced or repairs completed..."
                multiline
                numberOfLines={3}
              />

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
                  onPress={() => setActiveModalTicket(null)}
                >
                  <Text className="text-slate-800 text-xs font-bold">Cancel</Text>
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
      )}
    </SafeAreaView>
  );
};
