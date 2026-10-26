import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaintenanceStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { MaintenanceCategory, MaintenanceTicket } from '../types/maintenance';

type Props = NativeStackScreenProps<MaintenanceStackParamList, 'ArtisanQueue'>;

const CATEGORIES: MaintenanceCategory[] = [
  'PLUMBING',
  'ELECTRICAL',
  'CARPENTRY',
  'MASONRY',
  'JANITORIAL',
];

/**
 * ArtisanQueueScreen Component.
 * Display screen for university maintenance artisans (Plumbers, Electricians, Carpenters, Masons).
 * Renders open defect tickets, room locations, photo before repair, job status controls,
 * and direct navigation to proof-of-fix completion upload screen.
 */
export const ArtisanQueueScreen: React.FC<Props> = ({ navigation }) => {
  const { session, logoutUser } = useAuthStore();
  const {
    tickets,
    isLoading,
    error,
    successMessage,
    selectedCategory,
    fetchQueue,
    setCategoryFilter,
    updateStatus,
    selectTicket,
    clearMessages,
  } = useMaintenanceStore();

  const [activeTabCategory, setActiveTabCategory] = useState<MaintenanceCategory | null>(null);

  const artisanId = session?.user.id;

  useEffect(() => {
    fetchQueue(artisanId, activeTabCategory || undefined);
  }, [activeTabCategory]);

  const handleCategoryPress = (category: MaintenanceCategory | null) => {
    setActiveTabCategory(category);
    setCategoryFilter(category);
  };

  const handleStartJob = async (ticket: MaintenanceTicket) => {
    if (!artisanId) return;
    const success = await updateStatus({
      ticketId: ticket.id,
      status: 'IN_PROGRESS',
      artisanId,
    });
    if (success) {
      Alert.alert('Job Started', `Ticket #${ticket.id.slice(0, 8)} marked as IN_PROGRESS.`);
    }
  };

  const handleNavigateToProof = (ticket: MaintenanceTicket) => {
    selectTicket(ticket);
    navigation.navigate('ProofOfFixUpload', { ticketId: ticket.id });
  };

  const getCategoryColor = (cat: MaintenanceCategory) => {
    switch (cat) {
      case 'PLUMBING':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'ELECTRICAL':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CARPENTRY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'MASONRY':
        return 'bg-stone-100 text-stone-800 border-stone-300';
      case 'JANITORIAL':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { bg: 'bg-rose-100', text: 'text-rose-800', label: 'NEEDS FIX' };
      case 'IN_PROGRESS':
        return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'IN REPAIR' };
      case 'RESOLVED':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'FIXED' };
      case 'REJECTED':
        return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'REJECTED' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700', label: status };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="p-5">
        {/* Header Section */}
        <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-5">
          <Text className="text-2xl font-bold text-amber-800">ARTISAN WORK QUEUE</Text>
          <Text className="text-slate-500 text-xs mt-1">
            Hostel Facility Maintenance & Defect Resolution Dispatch
          </Text>
          <Text className="text-slate-700 text-xs mt-3 font-semibold">
            Artisan: {session?.user.fullName || 'Maintenance Staff'} ({session?.user.matricOrStaffNo || 'STAFF'})
          </Text>
        </View>

        {/* Category Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 flex-row space-x-2">
          <TouchableOpacity
            onPress={() => handleCategoryPress(null)}
            className={`px-4 py-2.5 rounded-xl border ${
              activeTabCategory === null
                ? 'bg-amber-600 border-amber-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTabCategory === null ? 'text-white' : 'text-slate-700'
              }`}
            >
              ALL DEFECTS
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => handleCategoryPress(cat)}
              className={`px-4 py-2.5 rounded-xl border mr-2 ${
                activeTabCategory === cat
                  ? 'bg-amber-600 border-amber-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTabCategory === cat ? 'text-white' : 'text-slate-700'
                }`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Messages Feedback */}
        {error && (
          <View className="bg-rose-50 p-4 rounded-xl border border-rose-200 mb-4">
            <Text className="text-rose-800 text-xs font-semibold">{error}</Text>
          </View>
        )}
        {successMessage && (
          <View className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 mb-4">
            <Text className="text-emerald-800 text-xs font-semibold">{successMessage}</Text>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && tickets.length === 0 ? (
          <View className="p-10 items-center justify-center">
            <ActivityIndicator size="large" color="#D97706" />
            <Text className="text-slate-500 text-xs mt-3 font-semibold">Loading defect queue...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center mb-6">
            <Text className="text-slate-700 font-bold text-base">No Defect Tickets Found</Text>
            <Text className="text-slate-500 text-xs text-center mt-2">
              There are currently no open or active repair jobs in this category queue.
            </Text>
          </View>
        ) : (
          <View className="space-y-4 mb-6">
            {tickets.map((item) => {
              const statusBadge = getStatusBadge(item.status);
              const isResolved = item.status === 'RESOLVED';
              const isInProgress = item.status === 'IN_PROGRESS';

              return (
                <View
                  key={item.id}
                  className={`bg-white p-5 rounded-2xl border-l-4 shadow-sm mb-4 ${
                    isResolved
                      ? 'border-emerald-500'
                      : isInProgress
                      ? 'border-amber-500'
                      : 'border-rose-500'
                  }`}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-bold text-slate-900">
                      {item.hostelName || 'Hostel'} — {item.roomNumber}
                    </Text>
                    <View className="flex-row space-x-1 items-center">
                      <View className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mr-1">
                        <Text className="text-amber-800 text-[10px] font-bold">
                          {item.category}
                        </Text>
                      </View>
                      <View className={`${statusBadge.bg} px-2.5 py-0.5 rounded-full`}>
                        <Text className={`${statusBadge.text} text-[10px] font-bold`}>
                          {statusBadge.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-600 mb-2">{item.description}</Text>

                  {/* Student & Ticket Meta */}
                  <Text className="text-[11px] text-slate-500 mb-3">
                    Reported by: {item.studentName || 'Resident Student'} • {new Date(item.createdAt).toLocaleDateString()}
                  </Text>

                  {/* Defect Photo Before */}
                  {item.photoBeforeUrl && (
                    <View className="mb-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <Text className="text-[10px] text-slate-500 font-semibold mb-1">
                        Defect Photo (Before Fix):
                      </Text>
                      <Image
                        source={{ uri: item.photoBeforeUrl }}
                        className="w-full h-32 rounded-lg bg-slate-200"
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Proof Photo After (If resolved) */}
                  {item.photoAfterUrl && (
                    <View className="mb-3 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                      <Text className="text-[10px] text-emerald-800 font-semibold mb-1">
                        Verified Proof of Fix (Completed):
                      </Text>
                      <Image
                        source={{ uri: item.photoAfterUrl }}
                        className="w-full h-32 rounded-lg bg-slate-200"
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Action Buttons */}
                  {!isResolved && (
                    <View className="mt-2">
                      {item.status === 'OPEN' ? (
                        <TouchableOpacity
                          onPress={() => handleStartJob(item)}
                          className="bg-amber-600 py-3 rounded-xl items-center active:opacity-90"
                        >
                          <Text className="text-white text-xs font-bold">
                            Claim & Start Repair Job
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleNavigateToProof(item)}
                          className="bg-emerald-600 py-3 rounded-xl items-center active:opacity-90"
                        >
                          <Text className="text-white text-xs font-bold">
                            Upload Proof-of-Fix & Complete Ticket
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          className="bg-slate-800 py-4 rounded-xl items-center shadow-md active:opacity-90 mb-8"
          onPress={logoutUser}
        >
          <Text className="text-white text-base font-bold">Sign Out (Maintenance Dispatch)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
