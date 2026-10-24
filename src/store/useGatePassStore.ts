import { create } from 'zustand';
import { GatePassService } from '../api/gatepassService';
import {
  GatePassRecord,
  GatePassTokenPayload,
  GatePassToken,
  GatePassStoreState
} from '../types/gatepass';

/**
 * Zustand Store managing student dynamic QR code gate pass state, 30-second countdown lifecycle,
 * and automatic token auto-refresh operations.
 *
 * Implements [GATEPASS-03] and [GATEPASS-04] adhering to PRD Sections 6 (Spec S-05) and 7.
 */
export const useGatePassStore = create<GatePassStoreState>((set, get) => ({
  currentPass: null,
  payload: null,
  secondsRemaining: 30,
  isLoading: false,
  errorMessage: null,
  activePass: null,
  countdownSeconds: 30,
  isOffline: false,

  loadGatePass: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const { record, payload } = await GatePassService.getOrRefreshGatePass(userId);
      const remaining = record.remainingSeconds || 30;
      set({
        currentPass: record,
        payload,
        secondsRemaining: remaining,
        countdownSeconds: remaining,
        activePass: {
          tokenString: record.tokenString,
          payload,
          expiresInSeconds: remaining
        },
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
        countdownSeconds: 30,
        activePass: {
          tokenString: record.tokenString,
          payload,
          expiresInSeconds: 30
        },
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
      const nextSeconds = secondsRemaining - 1;
      set({
        secondsRemaining: nextSeconds,
        countdownSeconds: nextSeconds
      });
    }
  },

  resetGatePassState: () => {
    set({
      currentPass: null,
      payload: null,
      secondsRemaining: 30,
      countdownSeconds: 30,
      isLoading: false,
      errorMessage: null,
      activePass: null,
      isOffline: false
    });
  },

  // Aliases for seamless backward-compatibility
  initializePass: async (userId: string) => {
    return get().loadGatePass(userId);
  },

  refreshPass: async (userId: string) => {
    return get().refreshGatePass(userId);
  },

  reset: () => {
    get().resetGatePassState();
  },

  generatePass: async (userId: string) => {
    return get().refreshGatePass(userId);
  },

  setOffline: (offline: boolean) => {
    set({ isOffline: offline });
  }
}));
