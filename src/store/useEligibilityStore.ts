import { create } from 'zustand';
import { EligibilityVerificationResult, MedicalStatus } from '../types/eligibility';
import { ClearanceStatus } from '../types/auth';
import { EligibilityService } from '../api/eligibilityService';

/**
 * State definition for the student eligibility global store.
 * Manages checking fee payments, disciplinary standing, course registration, Jaja Clinic medical screening, special needs quota, and digital clearance certificates.
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
  syncFees: (userId: string, ref: string, amount: number, paymentType?: string) => Promise<EligibilityVerificationResult>;
  // Action to update student medical screening status (Jaja Health Center)
  updateMedicalStatus: (userId: string, status: MedicalStatus) => Promise<EligibilityVerificationResult>;
  // Action to register special needs accommodation request
  registerSpecialNeeds: (userId: string, details: string) => Promise<EligibilityVerificationResult>;
  // Action to update student course registration status
  updateCourseRegistration: (userId: string, registered: boolean) => Promise<EligibilityVerificationResult>;
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
   * @param paymentType - Optional fee description (e.g., TUITION_FEE)
   * @returns Updated EligibilityVerificationResult after fee sync
   */
  syncFees: async (userId: string, transactionReference: string, amount: number, paymentType?: string) => {
    set({ isVerifying: true, error: null });
    try {
      const result = await EligibilityService.syncFeePayment({
        userId,
        transactionReference,
        amount,
        paymentStatus: 'SUCCESSFUL',
        paymentType
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
   * Updates student medical screening standing (Jaja Health Center) in Turso DB.
   *
   * @param userId - Unique student user ID
   * @param status - Target medical status
   * @returns Updated EligibilityVerificationResult
   */
  updateMedicalStatus: async (userId: string, status: MedicalStatus) => {
    set({ isVerifying: true, error: null });
    try {
      const result = await EligibilityService.updateMedicalStatus(userId, status);
      set({ eligibilityResult: result, isVerifying: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to update medical screening status.';
      set({ error: msg, isVerifying: false });
      throw err;
    }
  },

  /**
   * Registers special accommodation needs for a student and updates priority category to SPECIAL_NEEDS.
   *
   * @param userId - Unique student user ID
   * @param details - Description of special accommodation requirement
   * @returns Updated EligibilityVerificationResult
   */
  registerSpecialNeeds: async (userId: string, details: string) => {
    set({ isVerifying: true, error: null });
    try {
      const result = await EligibilityService.registerSpecialNeeds({ userId, specialNeedsDetails: details });
      set({ eligibilityResult: result, isVerifying: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to register special accommodation needs.';
      set({ error: msg, isVerifying: false });
      throw err;
    }
  },

  /**
   * Updates student course registration status in Turso DB.
   *
   * @param userId - Unique student user ID
   * @param registered - Boolean indicating course registration standing
   * @returns Updated EligibilityVerificationResult
   */
  updateCourseRegistration: async (userId: string, registered: boolean) => {
    set({ isVerifying: true, error: null });
    try {
      const result = await EligibilityService.updateCourseRegistrationStatus(userId, registered);
      set({ eligibilityResult: result, isVerifying: false });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to update course registration status.';
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
