import { create } from 'zustand';
import { RoomDetails, LockBedspaceResult, Bedspace, PaymentHoldDetails, PaymentConfirmationResult } from '../types/reservation';
import { ReservationService } from '../api/reservationService';

interface ReservationState {
  currentRoom: RoomDetails | null;
  selectedBedspace: Bedspace | null;
  activeReservation: LockBedspaceResult | null;
  paymentHold: PaymentHoldDetails | null;
  isLoading: boolean;
  isLocking: boolean;
  isConfirmingPayment: boolean;
  error: string | null;
  fetchRoomDetails: (roomId: string) => Promise<RoomDetails | null>;
  selectBedspace: (bedspace: Bedspace) => void;
  lockSelectedBedspace: (userId: string) => Promise<LockBedspaceResult>;
  fetchPaymentHoldDetails: (userId: string) => Promise<PaymentHoldDetails | null>;
  confirmPayment: (userId: string, paymentId: string, customRef?: string) => Promise<PaymentConfirmationResult>;
  releaseHold: (userId: string, bedspaceId: string) => Promise<boolean>;
  resetReservation: () => void;
}

export const useReservationStore = create<ReservationState>((set, get) => ({
  currentRoom: null,
  selectedBedspace: null,
  activeReservation: null,
  paymentHold: null,
  isLoading: false,
  isLocking: false,
  isConfirmingPayment: false,
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

  fetchPaymentHoldDetails: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const hold = await ReservationService.getPaymentHoldDetails(userId);
      set({ paymentHold: hold, isLoading: false });
      return hold;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch payment hold details.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  confirmPayment: async (userId: string, paymentId: string, customRef?: string) => {
    set({ isConfirmingPayment: true, error: null });
    try {
      const result = await ReservationService.confirmRemitaPayment(userId, paymentId, customRef);
      // Refresh hold state after payment confirmation
      await ReservationService.getPaymentHoldDetails(userId).then((hold) => set({ paymentHold: hold }));
      set({ isConfirmingPayment: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to confirm Remita payment.';
      set({ error: msg, isConfirmingPayment: false });
      throw err;
    }
  },

  releaseHold: async (userId: string, bedspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const released = await ReservationService.releaseExpiredOrCancelledHold(userId, bedspaceId);
      set({ paymentHold: null, activeReservation: null, selectedBedspace: null, isLoading: false });
      return released;
    } catch (err: any) {
      const msg = err.message || 'Failed to release bedspace hold.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  resetReservation: () => {
    set({
      currentRoom: null,
      selectedBedspace: null,
      activeReservation: null,
      paymentHold: null,
      isLoading: false,
      isLocking: false,
      isConfirmingPayment: false,
      error: null
    });
  }
}));
