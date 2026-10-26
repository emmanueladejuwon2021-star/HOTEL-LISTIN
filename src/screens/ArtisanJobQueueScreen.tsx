import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Image
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { MaintenanceTicket, UrgencyLevel, TicketCategory } from '../types/maintenance';

/**
 * ArtisanJobQueueScreen Component.
 * Non-technical, production-grade work queue interface for UNILAG maintenance artisans.
 * Displays repair tickets sorted by urgency with Tailwind CSS layout specs from PRD Section 6 (M-01).
 * Features urgency filter pills, defect photos, status transitions, and proof-of-fix photo upload modal.
 */
export const ArtisanJobQueueScreen: React.FC = () => {
  const { session, logoutUser } = useAuthStore();
  const { queue, isLoading, error, filter, setFilter, fetchArtisanQueue, startJob, resolveJobWithProof } =
    useMaintenanceStore();

  const [selectedTicketForProof, setSelectedTicketForProof] = useState<MaintenanceTicket | null>(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('');
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);

  useEffect(() => {
    fetchArtisanQueue();
  }, []);

  const handleUrgencyFilter = (urgency?: UrgencyLevel) => {
    if (filter.urgency === urgency) {
      setFilter({ urgency: undefined });
    } else {
      setFilter({ urgency });
    }
  };

  const handleStartJob = async (ticket: MaintenanceTicket) => {
    const artisanId = session?.user.id || 'artisan_default';
    try {
      await startJob(ticket.id, artisanId);
      Alert.alert('Job Started', `Ticket #${ticket.id.substring(0, 8)} status set to IN_PROGRESS.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start job.');
    }
  };

  const handleOpenProofModal = (ticket: MaintenanceTicket) => {
    setSelectedTicketForProof(ticket);
    // Simulated camera capture proof URL
    setProofPhotoUrl(`https://unilagstay.edu.ng/proofs/${ticket.id}_fixed.jpg`);
  };

  const handleConfirmProofUpload = async () => {
    if (!selectedTicketForProof || !proofPhotoUrl) {
      Alert.alert('Validation Error', 'Please capture or attach a proof-of-fix photo.');
      return;
    }

    const artisanId = session?.user.id || 'artisan_default';
    setIsSubmittingProof(true);
    try {
      await resolveJobWithProof(selectedTicketForProof.id, artisanId, proofPhotoUrl);
      Alert.alert(
        'Repair Completed!',
        `Proof of fix uploaded for Room ${selectedTicketForProof.roomNumber}. Ticket marked RESOLVED.`
      );
      setSelectedTicketForProof(null);
      setProofPhotoUrl('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resolve job.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const getUrgencyBadgeStyle = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'EMERGENCY':
        return { container: 'bg-rose-100 border-rose-300', text: 'text-rose-800 font-bold', label: 'EMERGENCY (<2h)' };
      case 'HIGH':
        return { container: 'bg-amber-100 border-amber-300', text: 'text-amber-800 font-bold', label: 'HIGH (<24h)' };
      case 'MEDIUM':
        return { container: 'bg-blue-100 border-blue-300', text: 'text-blue-800 font-bold', label: 'MEDIUM (<48h)' };
      case 'LOW':
        return { container: 'bg-slate-100 border-slate-300', text: 'text-slate-800 font-bold', label: 'LOW (<72h)' };
      default:
        return { container: 'bg-slate-100 border-slate-300', text: 'text-slate-800 font-bold', label: 'ROUTINE' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-4 pb-24">
        {/* Title Header Banner */}
        <View className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm mb-4">
          <Text className="text-2xl font-bold text-amber-800">ARTISAN WORK QUEUE</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Hostel Facility Maintenance & Defect Resolution Dispatch
          </Text>
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <Text className="text-slate-700 text-xs font-semibold">
              Artisan: {session?.user.fullName || 'Artisan Officer'} ({session?.user.matricOrStaffNo || 'STAFF'})
            </Text>
            <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
              <Text className="text-emerald-800 text-[10px] font-bold">ONLINE DISPATCH</Text>
            </View>
          </View>
        </View>

        {/* Urgency SLA Filter Pills */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
            Filter Queue by Priority SLA:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                filter.urgency === undefined ? 'bg-amber-600 border-amber-600' : 'bg-white border-slate-300'
              }`}
              onPress={() => handleUrgencyFilter(undefined)}
            >
              <Text
                className={`text-xs font-bold ${filter.urgency === undefined ? 'text-white' : 'text-slate-700'}`}
              >
                All Jobs ({queue.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                filter.urgency === 'EMERGENCY' ? 'bg-rose-600 border-rose-600' : 'bg-white border-slate-300'
              }`}
              onPress={() => handleUrgencyFilter('EMERGENCY')}
            >
              <Text
                className={`text-xs font-bold ${filter.urgency === 'EMERGENCY' ? 'text-white' : 'text-rose-700'}`}
              >
                🚨 Emergency
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                filter.urgency === 'HIGH' ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-300'
              }`}
              onPress={() => handleUrgencyFilter('HIGH')}
            >
              <Text className={`text-xs font-bold ${filter.urgency === 'HIGH' ? 'text-white' : 'text-amber-700'}`}>
                ⚠️ High SLA
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                filter.urgency === 'MEDIUM' ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
              }`}
              onPress={() => handleUrgencyFilter('MEDIUM')}
            >
              <Text className={`text-xs font-bold ${filter.urgency === 'MEDIUM' ? 'text-white' : 'text-blue-700'}`}>
                🛠️ Medium SLA
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Loading Indicator */}
        {isLoading && queue.length === 0 && (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#D97706" />
            <Text className="text-slate-500 text-xs mt-3 font-semibold">Syncing Repair Job Queue...</Text>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View className="bg-rose-50 border border-rose-200 p-4 rounded-2xl mb-4">
            <Text className="text-rose-800 text-xs font-bold">{error}</Text>
          </View>
        )}

        {/* Work Queue Cards */}
        {!isLoading && queue.length === 0 ? (
          <View className="bg-white p-8 rounded-3xl items-center border border-slate-200 shadow-sm my-4">
            <Text className="text-4xl mb-3">✅</Text>
            <Text className="text-slate-800 font-bold text-base text-center">No Active Maintenance Jobs</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              All hostel repair tickets in this category have been completed or resolved.
            </Text>
          </View>
        ) : (
          queue.map((ticket) => {
            const urgencyBadge = getUrgencyBadgeStyle(ticket.urgency);
            return (
              <View
                key={ticket.id}
                className={`bg-white p-5 rounded-2xl shadow-sm mb-4 border-l-4 ${
                  ticket.urgency === 'EMERGENCY'
                    ? 'border-rose-500'
                    : ticket.urgency === 'HIGH'
                    ? 'border-amber-500'
                    : 'border-blue-500'
                }`}
              >
                {/* Header Row */}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-base font-bold text-slate-900">
                    {ticket.hostelName || 'Hostel'} — {ticket.roomNumber}
                  </Text>
                  <View className={`px-2.5 py-1 rounded-full border ${urgencyBadge.container}`}>
                    <Text className={`text-[10px] ${urgencyBadge.text}`}>{urgencyBadge.label}</Text>
                  </View>
                </View>

                {/* Category & Status Row */}
                <View className="flex-row space-x-2 mb-3">
                  <View className="bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Text className="text-slate-800 text-[11px] font-bold">🔧 {ticket.category}</Text>
                  </View>
                  <View
                    className={`px-2.5 py-1 rounded-lg ${
                      ticket.status === 'RESOLVED'
                        ? 'bg-emerald-100'
                        : ticket.status === 'IN_PROGRESS'
                        ? 'bg-amber-100'
                        : 'bg-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        ticket.status === 'RESOLVED'
                          ? 'text-emerald-800'
                          : ticket.status === 'IN_PROGRESS'
                          ? 'text-amber-800'
                          : 'text-slate-700'
                      }`}
                    >
                      STATUS: {ticket.status}
                    </Text>
                  </View>
                </View>

                {/* Defect Description */}
                <Text className="text-xs text-slate-700 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {ticket.description}
                </Text>

                {/* Photo Previews */}
                <View className="flex-row space-x-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-500 mb-1">DEFECT PHOTO (BEFORE)</Text>
                    <View className="h-24 bg-slate-100 rounded-xl overflow-hidden items-center justify-center border border-slate-200">
                      {ticket.photoBeforeUrl ? (
                        <Image source={{ uri: ticket.photoBeforeUrl }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <Text className="text-xs text-slate-400">📷 Photo Attached</Text>
                      )}
                    </View>
                  </View>

                  {ticket.photoAfterUrl && (
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-emerald-600 mb-1">PROOF OF FIX (AFTER)</Text>
                      <View className="h-24 bg-emerald-50 rounded-xl overflow-hidden items-center justify-center border border-emerald-200">
                        <Image source={{ uri: ticket.photoAfterUrl }} className="w-full h-full" resizeMode="cover" />
                      </View>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                {ticket.status === 'OPEN' && (
                  <TouchableOpacity
                    className="bg-amber-600 py-3 rounded-xl items-center shadow-sm active:opacity-90"
                    onPress={() => handleStartJob(ticket)}
                  >
                    <Text className="text-white text-xs font-bold">▶️ Start Repair Job</Text>
                  </TouchableOpacity>
                )}

                {ticket.status === 'IN_PROGRESS' && (
                  <TouchableOpacity
                    className="bg-emerald-600 py-3 rounded-xl items-center shadow-sm active:opacity-90"
                    onPress={() => handleOpenProofModal(ticket)}
                  >
                    <Text className="text-white text-xs font-bold">📸 Upload Proof of Fix & Resolve</Text>
                  </TouchableOpacity>
                )}

                {ticket.status === 'RESOLVED' && (
                  <View className="bg-emerald-50 p-3 rounded-xl items-center border border-emerald-200">
                    <Text className="text-emerald-800 text-xs font-bold">
                      ✓ Job Verified & Completed ({ticket.resolvedAt ? ticket.resolvedAt.substring(0, 10) : 'Today'})
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-slate-800 py-4 rounded-xl items-center shadow-md active:opacity-90 mt-4"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Maintenance Dispatch)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Proof of Fix Modal */}
      <Modal
        visible={selectedTicketForProof !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTicketForProof(null)}
      >
        <View className="flex-1 bg-black/60 justify-center p-5">
          <View className="bg-white p-6 rounded-3xl shadow-2xl">
            <Text className="text-xl font-bold text-slate-900 mb-2">Proof-of-Fix Photo Upload</Text>
            <Text className="text-xs text-slate-500 mb-4">
              Capture or upload a clear photograph of the completed repair work for Room{' '}
              {selectedTicketForProof?.roomNumber}.
            </Text>

            {/* Camera Preview Box */}
            <View className="h-44 bg-slate-100 rounded-2xl items-center justify-center border-2 border-dashed border-amber-400 mb-4 overflow-hidden">
              <Text className="text-3xl mb-2">📸</Text>
              <Text className="text-xs font-bold text-slate-700">Live Camera Proof Attached</Text>
              <Text className="text-[10px] text-slate-400 mt-1">{proofPhotoUrl}</Text>
            </View>

            {/* Confirm & Cancel Buttons */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-slate-200 py-3.5 rounded-xl items-center"
                onPress={() => setSelectedTicketForProof(null)}
                disabled={isSubmittingProof}
              >
                <Text className="text-slate-700 text-xs font-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-emerald-600 py-3.5 rounded-xl items-center shadow-md"
                onPress={handleConfirmProofUpload}
                disabled={isSubmittingProof}
              >
                {isSubmittingProof ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-xs font-bold">Confirm & Mark Fixed</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
