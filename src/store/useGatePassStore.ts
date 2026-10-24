import { create } from 'zustand';
import { GatePassService } from '../api/gatepassService';
import {
  GatePassRecord,
  GatePassTokenPayload,
  GatePassToken,
  GatePassStoreState,
  VisitorPass
} from '../types/gatepass';

/**
 * Zustand Store managing student dynamic QR code gate pass state, 30-second countdown lifecycle,
 * automatic token auto-refresh operations, and 6-digit visitor pass generation.
 *
 * Implements [GATEPASS-03], [GATEPASS-04], and [GATEPASS-05] adhering to PRD Sections 6 (Spec S-05), 7, and 9.
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
  visitorPasses: [],

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

  createVisitorPass: async (studentId: string, visitorName: string, visitorPhone: string, visitDate?: string): Promise<VisitorPass> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const pass = await GatePassService.createVisitorPass(studentId, visitorName, visitorPhone, visitDate);
      const existing = get().visitorPasses || [];
      set({
        visitorPasses: [pass, ...existing],
        isLoading: false
      });
      return pass;
    } catch (error: any) {
      set({ isLoading: false, errorMessage: error.message || 'Failed to create visitor pass.' });
      throw error;
    }
  },

  loadVisitorPasses: async (studentId: string) => {
    try {
      const passes = await GatePassService.getVisitorPassesByStudent(studentId);
      set({ visitorPasses: passes });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to load visitor passes.' });
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
      isOffline: false,
      visitorPasses: []
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
