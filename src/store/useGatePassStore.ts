import { create } from 'zustand';
import { GatePassService } from '../api/gatePassService';
import { GatePassRecord, GatePassTokenPayload } from '../types/gatepass';

/**
 * Interface definition for Zustand Gate Pass Store State and Actions.
 */
export interface GatePassStoreState {
  currentPass: GatePassRecord | null;
  payload: GatePassTokenPayload | null;
  secondsRemaining: number;
  isLoading: boolean;
  errorMessage: string | null;

  /** Fetches or initializes active gate pass for student user */
  loadGatePass: (userId: string) => Promise<void>;
  /** Forces instant generation of a fresh dynamic gate pass token */
  refreshGatePass: (userId: string) => Promise<void>;
  /** Decrements active countdown timer by 1 second and auto-refreshes when reaching 0 */
  tickTimer: (userId: string) => void;
  /** Resets gate pass store state */
  resetGatePassState: () => void;
}

/**
 * Zustand Store managing student dynamic QR code gate pass state, 30-second countdown lifecycle,
 * and automatic token auto-refresh operations.
 */
export const useGatePassStore = create<GatePassStoreState>((set, get) => ({
  currentPass: null,
  payload: null,
  secondsRemaining: 30,
  isLoading: false,
  errorMessage: null,

  loadGatePass: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const { record, payload } = await GatePassService.getOrRefreshGatePass(userId);
      set({
        currentPass: record,
        payload,
        secondsRemaining: record.remainingSeconds || 30,
        isLoading: false
      });
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to load dynamic gate pass.'
      });
    }
  },

  refreshGatePass: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const { record, payload } = await GatePassService.generateGatePass(userId);
      set({
        currentPass: record,
        payload,
        secondsRemaining: 30,
        isLoading: false
      });
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to refresh gate pass.'
      });
    }
  },

  tickTimer: (userId: string) => {
    const { secondsRemaining, isLoading } = get();
    if (isLoading) return;

    if (secondsRemaining <= 1) {
      // Timer expired, trigger automatic token refresh
      get().refreshGatePass(userId);
    } else {
      set({ secondsRemaining: secondsRemaining - 1 });
    }
  },

  resetGatePassState: () => {
    set({
      currentPass: null,
      payload: null,
      secondsRemaining: 30,
      isLoading: false,
      errorMessage: null
    });
  }
}));
