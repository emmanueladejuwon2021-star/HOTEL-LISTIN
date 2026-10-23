import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useBallotingStore } from '../store/useBallotingStore';
import { useReservationStore } from '../store/useReservationStore';
import { Bedspace } from '../types/reservation';

/**
 * Screen component representing the S-03 Real-Time Balloting Selector.
 * Allows students to filter available hostels by gender and campus, select blocks and rooms,
 * view interactive bed position grids (color-coded green for available, gold for selected, gray for taken),
 * and execute atomic bedspace locks during active balloting windows.
 */
export const BallotingSelectorScreen: React.FC = () => {
  const { session } = useAuthStore();
  const {
    countdownState,
    filteredHostels,
    selectedHostelId,
    selectedBlock,
    roomsList,
    selectedRoomId,
    selectedBedspaceId,
    isLoading,
    isLocking,
    error,
    fetchCountdown,
    tickTimer,
    fetchFilteredHostels,
    setSelectedHostel,
    setSelectedBlock,
    fetchRoomsForHostel,
    setSelectedRoom,
    setSelectedBedspace
  } = useBallotingStore();

  const { lockSelectedBedspace, activeReservation } = useReservationStore();

  const userCategory = session?.studentProfile?.priorityCategory || 'FRESHER';
  const userGender = session?.user.gender || 'MALE';
  const userCampus = session?.studentProfile?.campus || 'MAIN_CAMPUS';
  const userId = session?.user.id;

  // Initialize countdown state and filtered hostels list on mount
  useEffect(() => {
    fetchCountdown(userCategory).catch(() => {});
    fetchFilteredHostels(userGender, userCampus).catch(() => {});
  }, [userCategory, userGender, userCampus]);

  // Tick countdown timer every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch rooms whenever selected hostel changes
  useEffect(() => {
    if (selectedHostelId) {
      fetchRoomsForHostel(selectedHostelId, selectedBlock || undefined).catch(() => {});
    }
  }, [selectedHostelId, selectedBlock]);

  // Helper method to format seconds into HH:MM:SS format
  const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const selectedRoom = roomsList.find((r) => r.id === selectedRoomId) || roomsList[0];

  const handleConfirmLock = async () => {
    if (!userId || !selectedBedspaceId) return;
    try {
      // Find selected bedspace object and set in reservation store before locking
      const targetBed = selectedRoom?.bedspaces.find((b) => b.id === selectedBedspaceId);
      if (targetBed) {
        useReservationStore.getState().selectBedspace(targetBed);
        await lockSelectedBedspace(userId);
        if (selectedHostelId) {
          await fetchRoomsForHostel(selectedHostelId, selectedBlock || undefined);
        }
      }
    } catch (e) {
      // error message stored in store state
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Screen Header */}
        <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">Room & Bedspace Selector</Text>
          <Text className="text-sm text-slate-500 mt-1">
            S-03 Real-Time Balloting & Interactive Bed Matrix
          </Text>
        </View>

        {/* Live Countdown Header (PRD S-03 Spec: bg-[#D4AF37] p-3 rounded-xl items-center mb-4) */}
        {countdownState && (
          <View className="bg-[#D4AF37] p-4 rounded-xl items-center mb-4 shadow-md">
            <Text className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-0.5">
              {countdownState.isWindowActive ? 'ACTIVE BALLOTING WINDOW' : 'WINDOW COUNTDOWN'}
            </Text>
            <Text className="text-slate-900 text-3xl font-extrabold tracking-tight my-1">
              {formatCountdown(countdownState.timeRemainingSeconds)}
            </Text>
            <Text className="text-slate-900 text-xs font-semibold">
              Quota Window: {userCategory}
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View className="p-6 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-2">Loading hostel rooms from Turso DB...</Text>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <Text className="text-red-800 font-semibold text-base mb-1">Notice</Text>
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Active Bedspace Reservation Success Banner */}
        {activeReservation && (
          <View className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl mb-4 shadow-sm">
            <Text className="text-emerald-900 text-lg font-bold mb-1">BEDSPACE LOCKED & RESERVED</Text>
            <Text className="text-emerald-800 text-sm mb-3">{activeReservation.message}</Text>
            <View className="bg-white p-4 rounded-xl border border-emerald-200">
              <Text className="text-slate-900 font-bold text-base mb-1">
                {activeReservation.hostelName} — {activeReservation.roomNumber} ({activeReservation.bedLabel})
              </Text>
              <Text className="text-emerald-700 font-extrabold text-lg">
                ₦{activeReservation.amount.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Hostel Filter Picker (PRD S-03 Spec: flex-row space-x-2 py-2 mb-4) */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Select Hostel ({userGender} / {userCampus})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row space-x-2 py-2 mb-4">
            {filteredHostels.map((hostel) => {
              const isSelected = selectedHostelId === hostel.hostelId;
              return (
                <TouchableOpacity
                  key={hostel.hostelId}
                  className={`px-4 py-2.5 rounded-full border ${
                    isSelected ? 'bg-[#7A0000] border-[#7A0000]' : 'bg-white border-slate-300'
                  }`}
                  onPress={() => setSelectedHostel(hostel.hostelId)}
                >
                  <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                    {hostel.hostelName} ({hostel.availableBedspaces} left)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Block Filter Selector */}
        <View className="mb-4 flex-row space-x-2">
          {['A', 'B', 'C', 'D'].map((block) => {
            const isSelected = selectedBlock === block;
            return (
              <TouchableOpacity
                key={block}
                className={`px-4 py-2 rounded-xl border ${
                  isSelected ? 'bg-amber-500 border-amber-600' : 'bg-white border-slate-200'
                }`}
                onPress={() => setSelectedBlock(isSelected ? null : block)}
              >
                <Text className={`font-bold text-xs ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                  Block {block}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Room List Selector */}
        {roomsList.length > 0 && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Room
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
              {roomsList.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                return (
                  <TouchableOpacity
                    key={room.id}
                    className={`px-4 py-3 rounded-xl border mr-2 ${
                      isSelected ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'
                    }`}
                    onPress={() => setSelectedRoom(room.id)}
                  >
                    <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      Room {room.roomNumber}
                    </Text>
                    <Text className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      Block {room.blockName} — Floor {room.floorNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Interactive Bed Grid (PRD S-03 Spec: grid grid-cols-2 gap-3 mb-6) */}
        {selectedRoom && (
          <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {selectedRoom.hostelName} — Room {selectedRoom.roomNumber} Bed Layout
            </Text>
            <Text className="text-xs text-slate-500 mb-4">
              Tap an available green bed position to select for 72-hour atomic lock
            </Text>

            <View className="grid grid-cols-2 gap-3 mb-6">
              {selectedRoom.bedspaces.map((bed: Bedspace) => {
                const isAvailable = bed.status === 'AVAILABLE';
                const isSelected = selectedBedspaceId === bed.id;

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
                    className={`p-4 rounded-xl border-2 items-center justify-center ${bgColor}`}
                    disabled={!isAvailable || isLocking}
                    onPress={() => setSelectedBedspace(bed.id)}
                  >
                    <Text className={`font-bold text-base ${textColor}`}>{bed.bedLabel}</Text>
                    <Text className={`text-xs font-semibold mt-1 uppercase ${textColor}`}>{statusLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Interactive Grid Status Legend */}
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

        {/* Confirm Lock Button (PRD S-03 Spec: bg-[#7A0000] py-4 rounded-xl items-center shadow-md) */}
        <TouchableOpacity
          className={`bg-[#7A0000] py-4 rounded-xl items-center shadow-md active:opacity-90 ${
            selectedBedspaceId && countdownState?.isWindowActive && !activeReservation ? 'opacity-100' : 'opacity-50'
          }`}
          disabled={!selectedBedspaceId || !countdownState?.isWindowActive || isLocking || !!activeReservation}
          onPress={handleConfirmLock}
        >
          {isLocking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-base font-bold">
              {selectedBedspaceId
                ? 'Confirm Atomic Bedspace Lock (72-Hr Hold)'
                : countdownState?.isWindowActive
                ? 'Select a Bedspace to Lock'
                : 'Balloting Window Inactive'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
