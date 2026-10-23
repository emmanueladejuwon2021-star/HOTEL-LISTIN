import { create } from 'zustand';
import { RoomDetails, LockBedspaceResult, Bedspace } from '../types/reservation';
import { ReservationService } from '../api/reservationService';

interface ReservationState {
  currentRoom: RoomDetails | null;
  selectedBedspace: Bedspace | null;
  activeReservation: LockBedspaceResult | null;
  isLoading: boolean;
  isLocking: boolean;
  error: string | null;
  fetchRoomDetails: (roomId: string) => Promise<RoomDetails | null>;
  selectBedspace: (bedspace: Bedspace) => void;
  lockSelectedBedspace: (userId: string) => Promise<LockBedspaceResult>;
  resetReservation: () => void;
}

export const useReservationStore = create<ReservationState>((set, get) => ({
  currentRoom: null,
  selectedBedspace: null,
  activeReservation: null,
  isLoading: false,
  isLocking: false,
  error: null,

  fetchRoomDetails: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      const room = await ReservationService.getRoomDetails(roomId);
      set({ currentRoom: room, isLoading: false });
      return room;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch room details.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  selectBedspace: (bedspace: Bedspace) => {
    set({ selectedBedspace: bedspace, error: null });
  },

  lockSelectedBedspace: async (userId: string) => {
    const { selectedBedspace } = get();
    if (!selectedBedspace) {
      throw new Error('Please select a bedspace before confirming lock.');
    }

    set({ isLocking: true, error: null });
    try {
      const result = await ReservationService.lockBedspaceAtomically(userId, selectedBedspace.id);
      set({ activeReservation: result, isLocking: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to lock selected bedspace.';
      set({ error: msg, isLocking: false });
      throw err;
    }
  },

  resetReservation: () => {
    set({
      currentRoom: null,
      selectedBedspace: null,
      activeReservation: null,
      isLoading: false,
      isLocking: false,
      error: null
    });
  }
}));
