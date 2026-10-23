import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useBallotingStore } from '../store/useBallotingStore';
import { useReservationStore } from '../store/useReservationStore';
import { Gender, Campus } from '../types/auth';
import { FilteredHostelSummary, BallotingRoomDetails } from '../types/balloting';

/**
 * BallotingSelectorScreen Component (S-03 Spec in PRD Section 6).
 * Interactive hostel, block, room, and bedspace selection screen for students during active balloting windows.
 * Connects directly to live Turso libSQL database with atomic bedspace lock enforcement.
 */
export const BallotingSelectorScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    countdownState,
    filteredHostels,
    selectedHostelId,
    hostelRooms,
    selectedRoomId,
    selectedBedId,
    isLoading: isBallotingLoading,
    error: ballotingError,
    fetchCountdown,
    fetchFilteredHostels,
    fetchHostelRooms,
    setSelectedHostel,
    setSelectedRoomAndBed,
    validateQueueAndWindow,
    tickTimer
  } = useBallotingStore();

  const {
    selectedBedspace,
    activeReservation,
    isLocking,
    error: reservationError,
    selectBedspace,
    lockSelectedBedspace
  } = useReservationStore();

  const userId = session?.user?.id;
  const userGender = session?.user?.gender || 'MALE';
  const userCampus = session?.studentProfile?.campus || 'MAIN_CAMPUS';
  const userCategory = session?.studentProfile?.priorityCategory || 'FRESHER';

  // Filter state for campus and gender selector pills
  const [activeCampus, setActiveCampus] = useState<Campus>(userCampus);
  const [activeGender, setActiveGender] = useState<Gender>(userGender);

  // Initialize countdown and filtered hostels on mount
  useEffect(() => {
    fetchCountdown(userCategory, userId).catch(() => {});
    fetchFilteredHostels({ gender: activeGender, campus: activeCampus }).catch(() => {});
  }, [userCategory, userId, activeGender, activeCampus]);

  // Tick active timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // When selected hostel changes, fetch rooms for that hostel
  useEffect(() => {
    if (selectedHostelId) {
      fetchHostelRooms(selectedHostelId).catch(() => {});
    }
  }, [selectedHostelId]);

  // Handler for changing campus filter pill
  const handleCampusChange = (campus: Campus) => {
    setActiveCampus(campus);
    setSelectedHostel(null);
    fetchFilteredHostels({ gender: activeGender, campus }).catch(() => {});
  };

  // Handler for changing gender filter pill
  const handleGenderChange = (gender: Gender) => {
    setActiveGender(gender);
    setSelectedHostel(null);
    fetchFilteredHostels({ gender, campus: activeCampus }).catch(() => {});
  };

  // Handler for selecting a hostel
  const handleSelectHostel = (hostelId: string) => {
    setSelectedHostel(hostelId);
    setSelectedRoomAndBed(null, null);
  };

  // Handler for selecting a bed in the grid
  const handleSelectBed = (room: BallotingRoomDetails, bed: any) => {
    if (bed.status !== 'AVAILABLE') return;
    setSelectedRoomAndBed(room.id, bed.id);
    selectBedspace(bed);
  };

  // Handler for confirming atomic lock
  const handleConfirmLock = async () => {
    if (!userId || !selectedBedspace) return;
    try {
      const validation = await validateQueueAndWindow(userId, userCategory);
      if (!validation.isValid) {
        return;
      }
      await lockSelectedBedspace(userId);
      if (selectedHostelId) {
        await fetchHostelRooms(selectedHostelId); // Refresh room grid
      }
    } catch {
      // Error handled in store
    }
  };

  // Helper to format remaining seconds into HH:MM:SS format
  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Top Header */}
        <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">Balloting Room Selector</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Real-Time Interactive Hostel, Room & Bedspace Selector
          </Text>
        </View>

        {/* Live Countdown Banner (PRD S-03 Specification: bg-[#D4AF37] p-3 rounded-xl items-center mb-4) */}
        {countdownState && (
          <View className="bg-[#D4AF37] p-4 rounded-xl items-center mb-4 shadow-md">
            <Text className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-1">
              {countdownState.isWindowActive ? 'ACTIVE BALLOTING WINDOW' : 'WINDOW NOT ACTIVE'}
            </Text>
            <Text className="text-slate-900 text-3xl font-extrabold tracking-tight my-1">
              {formatCountdown(countdownState.timeRemainingSeconds)}
            </Text>
            <Text className="text-slate-900 text-xs font-semibold">
              Category: {userCategory} | Queue Ticket #{countdownState.queueToken?.positionInQueue || 'None'}
            </Text>
          </View>
        )}

        {/* Error Messages */}
        {(ballotingError || reservationError) && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <Text className="text-red-800 font-semibold text-base mb-1">Notice</Text>
            <Text className="text-red-700 text-sm">{ballotingError || reservationError}</Text>
          </View>
        )}

        {/* Successful Hold Summary Banner */}
        {activeReservation && (
          <View className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl mb-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-emerald-900 text-lg font-bold">BEDSPACE LOCKED (72-HR HOLD)</Text>
              <View className="bg-emerald-600 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold uppercase">Reserved</Text>
              </View>
            </View>
            <Text className="text-emerald-800 text-sm mb-3">{activeReservation.message}</Text>
            <View className="bg-white p-4 rounded-xl border border-emerald-200">
              <Text className="text-xs text-slate-500">Allocated Space</Text>
              <Text className="text-slate-900 font-bold text-base mb-1">
                {activeReservation.hostelName} — {activeReservation.roomNumber} ({activeReservation.bedLabel})
              </Text>
              <Text className="text-xs text-slate-500">Hold Expires At</Text>
              <Text className="text-slate-800 font-semibold text-xs">
                {new Date(activeReservation.holdExpiresAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Hostel Filter Picker (PRD S-03 Specification: flex-row space-x-2 py-2 mb-4) */}
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Hostel Location & Category Filter
          </Text>

          {/* Campus Filter Pills */}
          <View className="flex-row space-x-2 py-2 mb-2">
            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                activeCampus === 'MAIN_CAMPUS' ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-100 border-slate-200'
              }`}
              onPress={() => handleCampusChange('MAIN_CAMPUS')}
            >
              <Text
                className={`text-xs font-bold ${
                  activeCampus === 'MAIN_CAMPUS' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Akoka Main Campus
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                activeCampus === 'CMUL_IDI_ARABA' ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-slate-100 border-slate-200'
              }`}
              onPress={() => handleCampusChange('CMUL_IDI_ARABA')}
            >
              <Text
                className={`text-xs font-bold ${
                  activeCampus === 'CMUL_IDI_ARABA' ? 'text-white' : 'text-slate-700'
                }`}
              >
                CMUL Idi-Araba
              </Text>
            </TouchableOpacity>
          </View>

          {/* Gender Filter Pills */}
          <View className="flex-row space-x-2 py-1">
            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                activeGender === 'MALE' ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200'
              }`}
              onPress={() => handleGenderChange('MALE')}
            >
              <Text className={`text-xs font-bold ${activeGender === 'MALE' ? 'text-white' : 'text-slate-700'}`}>
                Male Hostels
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-4 py-2 rounded-xl border ${
                activeGender === 'FEMALE' ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200'
              }`}
              onPress={() => handleGenderChange('FEMALE')}
            >
              <Text className={`text-xs font-bold ${activeGender === 'FEMALE' ? 'text-white' : 'text-slate-700'}`}>
                Female Hostels
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtered Hostel Selection List */}
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Available Hostels ({filteredHostels.length})
          </Text>

          {isBallotingLoading && filteredHostels.length === 0 ? (
            <ActivityIndicator size="small" color="#7A0000" className="my-4" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-3 py-1">
              {filteredHostels.map((hostel: FilteredHostelSummary) => {
                const isSelected = selectedHostelId === hostel.hostelId;
                return (
                  <TouchableOpacity
                    key={hostel.hostelId}
                    className={`p-4 rounded-2xl border-2 min-w-[180px] ${
                      isSelected ? 'bg-amber-50 border-[#D4AF37]' : 'bg-slate-50 border-slate-200'
                    }`}
                    onPress={() => handleSelectHostel(hostel.hostelId)}
                  >
                    <Text className="font-bold text-slate-900 text-sm mb-1">{hostel.hostelName}</Text>
                    <Text className="text-xs text-slate-500 mb-2">
                      {hostel.campus === 'MAIN_CAMPUS' ? 'Main Campus' : 'CMUL'} ({hostel.gender})
                    </Text>
                    <View className="bg-emerald-100 px-2.5 py-1 rounded-full align-self-start">
                      <Text className="text-emerald-800 text-[11px] font-bold">
                        {hostel.availableBedspaces} Beds Free
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Interactive Room & Bed Grid (PRD S-03 Specification: grid grid-cols-2 gap-3 mb-6) */}
        {selectedHostelId && (
          <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Select Room & Bedspace Position
            </Text>

            {isBallotingLoading && hostelRooms.length === 0 ? (
              <ActivityIndicator size="medium" color="#7A0000" className="my-6" />
            ) : hostelRooms.length === 0 ? (
              <Text className="text-slate-500 text-sm py-4 text-center">
                No rooms initialized or available in this hostel yet.
              </Text>
            ) : (
              hostelRooms.map((room) => (
                <View key={room.id} className="mb-5 pb-4 border-b border-slate-100">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-base font-bold text-slate-900">
                      Block {room.blockName} — Room {room.roomNumber} (Floor {room.floorNumber})
                    </Text>
                    <Text className="text-xs font-medium text-slate-500">
                      {room.totalBeds - room.occupiedBeds} of {room.totalBeds} Available
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap justify-between gap-3 mb-2">
                    {room.bedspaces.map((bed) => {
                      const isAvailable = bed.status === 'AVAILABLE';
                      const isSelected = selectedBedId === bed.id;

                      let bgColor = 'bg-slate-100 border-slate-300';
                      let textColor = 'text-slate-500';
                      let statusLabel = 'Taken';

                      if (isAvailable) {
                        bgColor = isSelected ? 'bg-[#D4AF37] border-amber-600' : 'bg-emerald-50 border-emerald-300';
                        textColor = isSelected ? 'text-slate-900' : 'text-emerald-900';
                        statusLabel = isSelected ? 'Selected' : 'Available';
                      }

                      return (
                        <TouchableOpacity
                          key={bed.id}
                          className={`w-[48%] p-3.5 rounded-xl border-2 items-center justify-center ${bgColor}`}
                          disabled={!isAvailable || isLocking}
                          onPress={() => handleSelectBed(room, bed)}
                        >
                          <Text className={`font-bold text-sm ${textColor}`}>{bed.bedLabel}</Text>
                          <Text className={`text-[10px] font-semibold mt-0.5 uppercase ${textColor}`}>
                            {statusLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}

            {/* Grid Status Legend */}
            <View className="flex-row justify-around pt-3 border-t border-slate-100">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-xs text-slate-600 font-medium">Available</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-[#D4AF37] mr-2" />
                <Text className="text-xs text-slate-600 font-medium">Selected</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-slate-400 mr-2" />
                <Text className="text-xs text-slate-600 font-medium">Taken</Text>
              </View>
            </View>
          </View>
        )}

        {/* Confirm Lock Button (PRD S-03 Specification: bg-[#7A0000] py-4 rounded-xl items-center shadow-md) */}
        <TouchableOpacity
          className={`h-14 rounded-xl justify-center items-center shadow-md active:opacity-90 ${
            selectedBedspace && !activeReservation ? 'bg-[#7A0000]' : 'bg-slate-400'
          }`}
          disabled={!selectedBedspace || isLocking || !!activeReservation}
          onPress={handleConfirmLock}
        >
          {isLocking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-lg font-bold">
              {selectedBedspace ? `Confirm Atomic Lock (${selectedBedspace.bedLabel})` : 'Select a Bedspace'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
