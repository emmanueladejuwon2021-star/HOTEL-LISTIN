import { create } from 'zustand';
import {
  GatePassToken,
  GateAccessLog,
  GateVerificationResult,
  GateType
} from '../types/gatepass';
import { GatePassService } from '../api/gatepassService';

export interface GatePassState {
  currentPass: GatePassToken | null;
  countdownSeconds: number;
  accessLogs: GateAccessLog[];
  verificationResult: GateVerificationResult | null;
  isLoading: boolean;
  errorMessage: string | null;

  // Actions
  generatePass: (userId: string) => Promise<GatePassToken | null>;
  refreshPass: (userId: string) => Promise<GatePassToken | null>;
  verifyPass: (tokenString: string, porterId: string, gateType?: GateType) => Promise<GateVerificationResult | null>;
  fetchStudentLogs: (userId: string) => Promise<void>;
  tickCountdown: () => void;
  clearMessages: () => void;
}

export const useGatePassStore = create<GatePassState>((set, get) => ({
  currentPass: null,
  countdownSeconds: 60,
  accessLogs: [],
  verificationResult: null,
  isLoading: false,
  errorMessage: null,

  generatePass: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const pass = await GatePassService.generateDynamicGatePass(userId);
      set({
        currentPass: pass,
        countdownSeconds: pass.expiresInSeconds,
        isLoading: false
      });
      return pass;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to generate dynamic gate pass.',
        isLoading: false
      });
      return null;
    }
  },

  refreshPass: async (userId: string) => {
    return get().generatePass(userId);
  },

  verifyPass: async (tokenString: string, porterId: string, gateType: GateType = 'ENTRY') => {
    set({ isLoading: true, errorMessage: null });
    try {
      const result = await GatePassService.verifyGatePass(tokenString, porterId, gateType);
      set({
        verificationResult: result,
        isLoading: false
      });
      return result;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to verify gate pass.',
        isLoading: false
      });
      return null;
    }
  },

  fetchStudentLogs: async (userId: string) => {
    try {
      const logs = await GatePassService.getLogsByStudent(userId);
      set({ accessLogs: logs });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to load access logs.' });
    }
  },

  tickCountdown: () => {
    const { countdownSeconds } = get();
    if (countdownSeconds > 0) {
      set({ countdownSeconds: countdownSeconds - 1 });
    }
  },

  clearMessages: () => set({ errorMessage: null, verificationResult: null })
}));
