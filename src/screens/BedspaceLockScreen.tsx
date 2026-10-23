import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useReservationStore } from '../store/useReservationStore';
import { Bedspace } from '../types/reservation';

interface Props {
  roomId?: string;
}

export const BedspaceLockScreen: React.FC<Props> = ({ roomId = 'room_jaja_101' }) => {
  const { session } = useAuthStore();
  const {
    currentRoom,
    selectedBedspace,
    activeReservation,
    isLoading,
    isLocking,
    error,
    fetchRoomDetails,
    selectBedspace,
    lockSelectedBedspace
  } = useReservationStore();

  const userId = session?.user.id;

  useEffect(() => {
    fetchRoomDetails(roomId).catch(() => {});
  }, [roomId]);

  const handleConfirmLock = async () => {
    if (!userId || !selectedBedspace) return;
    try {
      await lockSelectedBedspace(userId);
      await fetchRoomDetails(roomId); // Refresh room grid state
    } catch (e) {
      // error state set in store
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 pb-12">
        {/* Top Header */}
        <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">Bedspace Reservation</Text>
          <Text className="text-sm text-slate-500 mt-1">
            Real-Time Interactive Room Selector & Atomic Lock
          </Text>
        </View>

        {isLoading && !currentRoom && (
          <View className="p-8 items-center justify-center">
            <ActivityIndicator size="large" color="#7A0000" />
            <Text className="text-slate-600 font-medium mt-3">Loading bedspaces from Turso DB...</Text>
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <Text className="text-red-800 font-semibold text-base mb-1">Reservation Notice</Text>
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Successful Hold Banner */}
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
              <Text className="text-xs text-slate-500">Hostel & Room</Text>
              <Text className="text-slate-900 font-bold text-base mb-2">
                {activeReservation.hostelName} — {activeReservation.roomNumber} ({activeReservation.bedLabel})
              </Text>
              <Text className="text-xs text-slate-500">Fee Amount</Text>
              <Text className="text-emerald-700 font-extrabold text-lg mb-2">
                ₦{activeReservation.amount.toLocaleString()}
              </Text>
              <Text className="text-xs text-slate-500">Hold Expires At</Text>
              <Text className="text-slate-800 font-semibold text-xs">
                {new Date(activeReservation.holdExpiresAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {currentRoom && (
          <>
            {/* Room Summary Header */}
            <View className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-slate-200">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-bold text-slate-900">{currentRoom.hostelName}</Text>
                <Text className="text-xs font-semibold text-slate-500">
                  Block {currentRoom.blockName} — Floor {currentRoom.floorNumber}
                </Text>
              </View>
              <Text className="text-sm text-slate-700">Room Number: <Text className="font-bold text-slate-900">{currentRoom.roomNumber}</Text></Text>
            </View>

            {/* Interactive Bed Grid (S-03 Specs) */}
            <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Select Bedspace Position
              </Text>

              <View className="grid grid-cols-2 gap-3 mb-4">
                {currentRoom.bedspaces.map((bed: Bedspace) => {
                  const isAvailable = bed.status === 'AVAILABLE';
                  const isSelected = selectedBedspace?.id === bed.id;

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
                      onPress={() => selectBedspace(bed)}
                    >
                      <Text className={`font-bold text-base ${textColor}`}>{bed.bedLabel}</Text>
                      <Text className={`text-xs font-semibold mt-1 uppercase ${textColor}`}>{statusLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
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

            {/* Confirm Lock Button */}
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
