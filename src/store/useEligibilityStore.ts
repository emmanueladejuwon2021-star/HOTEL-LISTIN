import { create } from 'zustand';
import { EligibilityVerificationResult } from '../types/eligibility';
import { ClearanceStatus } from '../types/auth';
import { EligibilityService } from '../api/eligibilityService';

/**
 * State definition for the student eligibility global store.
 * Manages checking fee payments, disciplinary standing, and syncing Remita payment receipts.
 */
interface EligibilityState {
  // Holds the latest eligibility check result (or null if not checked yet)
  eligibilityResult: EligibilityVerificationResult | null;
  // Boolean flag indicating if an eligibility query, fee sync, or clearance update is in progress
  isVerifying: boolean;
  // Error message string if an error occurs during checking, fee sync, or clearance submission
  error: string | null;
  // Action to check student eligibility against Turso DB
  checkEligibility: (userId: string) => Promise<EligibilityVerificationResult>;
  // Action to sync Remita tuition fee payment and update student eligibility
  syncFees: (userId: string, ref: string, amount: number) => Promise<EligibilityVerificationResult>;
  // Action to submit or update student digital clearance status
  updateClearance: (userId: string, status: ClearanceStatus) => Promise<EligibilityVerificationResult>;
  // Action to clear store state on user logout or session reset
  resetEligibility: () => void;
}

/**
 * Zustand state management store for student eligibility and school fee verification.
 * Contains jargon-free explanatory comments so any developer can understand how eligibility is checked and synced.
 */
export const useEligibilityStore = create<EligibilityState>((set) => ({
  eligibilityResult: null,
  isVerifying: false,
  error: null,

  /**
   * Queries the database to check if a student has paid their fees and is cleared for balloting.
   *
   * @param userId - Unique ID of the student
   * @returns Detailed EligibilityVerificationResult object
   */
  checkEligibility: async (userId: string) => {
    set({ isVerifying: true, error: null });
    try {
      // Execute live database check via EligibilityService
      const result = await EligibilityService.verifyEligibility(userId);
      set({ eligibilityResult: result, isVerifying: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to verify eligibility status.';
      set({ error: msg, isVerifying: false });
      throw err;
    }
  },

  /**
   * Syncs a student's tuition fee payment with the database when they enter their Remita receipt code.
   *
   * @param userId - Unique ID of the student
   * @param transactionReference - Remita RRR or payment reference code
   * @param amount - Payment amount
   * @returns Updated EligibilityVerificationResult after fee sync
   */
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

  /**
   * Updates student digital clearance status in Turso DB (e.g. submitting clearance or approving/rejecting).
   *
   * @param userId - Unique student user ID
   * @param clearanceStatus - Target clearance status
   * @returns Updated EligibilityVerificationResult after clearance update
   */
  updateClearance: async (userId: string, clearanceStatus: ClearanceStatus) => {
    set({ isVerifying: true, error: null });
    try {
      const result = await EligibilityService.updateClearanceStatus(userId, clearanceStatus);
      set({ eligibilityResult: result, isVerifying: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to update clearance status.';
      set({ error: msg, isVerifying: false });
      throw err;
    }
  },

  /**
   * Resets the eligibility store state back to initial values.
   */
  resetEligibility: () => {
    set({ eligibilityResult: null, isVerifying: false, error: null });
  }
}));
