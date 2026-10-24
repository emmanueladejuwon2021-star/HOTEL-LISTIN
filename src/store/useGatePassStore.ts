import { create } from 'zustand';
import { GatePassService } from '../api/gatepassService';
import { GatePassDetails, GatePassVerificationResult } from '../types/gatepass';

/**
 * State interface for Gate Pass management.
 */
export interface GatePassState {
  /** Currently active gate pass details for the student */
  activePass: GatePassDetails | null;
  /** Loading state for pass operations */
  isLoading: boolean;
  /** Error message if pass generation or verification fails */
  errorMessage: string | null;
  /** Result of last verified gate pass token */
  verificationResult: GatePassVerificationResult | null;

  /**
   * Action to fetch or generate dynamic QR gate pass for a verified resident student.
   *
   * @param userId - Student's user ID
   */
  fetchOrGenerateGatePass: (userId: string) => Promise<void>;

  /**
   * Action to manually or automatically refresh the dynamic QR pass token (e.g. every 30 seconds).
   *
   * @param userId - Student's user ID
   */
  refreshPassToken: (userId: string) => Promise<void>;

  /**
   * Action to verify a scanned QR token string.
   *
   * @param token - Full QR token string to verify
   */
  verifyPassToken: (token: string) => Promise<GatePassVerificationResult>;

  /**
   * Clears error messages.
   */
  clearError: () => void;
}

/**
 * Zustand store for Managing Student Dynamic Gate Passes.
 */
export const useGatePassStore = create<GatePassState>((set, get) => ({
  activePass: null,
  isLoading: false,
  errorMessage: null,
  verificationResult: null,

  fetchOrGenerateGatePass: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const pass = await GatePassService.generateGatePass(userId);
      set({ activePass: pass, isLoading: false, errorMessage: null });
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err.message || 'Failed to generate dynamic QR gate pass.'
      });
    }
  },

  refreshPassToken: async (userId: string) => {
    try {
      const pass = await GatePassService.generateGatePass(userId);
      set({ activePass: pass, errorMessage: null });
    } catch (err: any) {
      set({
        errorMessage: err.message || 'Failed to refresh dynamic QR pass token.'
      });
    }
  },

  verifyPassToken: async (token: string) => {
    set({ isLoading: true });
    try {
      const result = await GatePassService.verifyGatePassToken(token);
      set({ verificationResult: result, isLoading: false });
      return result;
    } catch (err: any) {
      const failResult: GatePassVerificationResult = {
        isValid: false,
        message: err.message || 'Error occurred during pass verification.'
      };
      set({ verificationResult: failResult, isLoading: false });
      return failResult;
    }
  },

  clearError: () => set({ errorMessage: null })
}));
