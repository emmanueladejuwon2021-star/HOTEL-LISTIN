import { create } from 'zustand';
import { EligibilityVerificationResult } from '../types/eligibility';
import { EligibilityService } from '../api/eligibilityService';

interface EligibilityState {
  eligibilityResult: EligibilityVerificationResult | null;
  isVerifying: boolean;
  error: string | null;
  checkEligibility: (userId: string) => Promise<EligibilityVerificationResult>;
  syncFees: (userId: string, ref: string, amount: number) => Promise<EligibilityVerificationResult>;
  resetEligibility: () => void;
}

export const useEligibilityStore = create<EligibilityState>((set) => ({
  eligibilityResult: null,
  isVerifying: false,
  error: null,

  checkEligibility: async (userId: string) => {
    set({ isVerifying: true, error: null });
    try {
      const result = await EligibilityService.verifyEligibility(userId);
      set({ eligibilityResult: result, isVerifying: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to verify eligibility status.';
      set({ error: msg, isVerifying: false });
      throw err;
    }
  },

  syncFees: async (userId: string, transactionReference: string, amount: number) => {
    set({ isVerifying: true, error: null });
    try {
      const result = await EligibilityService.syncFeePayment({
        userId,
        transactionReference,
        amount,
        paymentStatus: 'SUCCESSFUL'
      });
      set({ eligibilityResult: result, isVerifying: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to sync school fee payment.';
      set({ error: msg, isVerifying: false });
      throw err;
    }
  },

  resetEligibility: () => {
    set({ eligibilityResult: null, isVerifying: false, error: null });
  }
}));
