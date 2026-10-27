import { create } from 'zustand';
import { ExeatService } from '../api/exeatService';
import {
  ExeatRequest,
  SubmitExeatPayload,
  ReviewExeatPayload
} from '../types/exeat';

interface ExeatState {
  studentRequests: ExeatRequest[];
  activeApprovedExeat: ExeatRequest | null;
  pendingRequests: ExeatRequest[];
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  fetchStudentRequests: (studentId: string) => Promise<void>;
  fetchActiveExeat: (studentId: string) => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  submitExeat: (payload: SubmitExeatPayload) => Promise<boolean>;
  reviewExeat: (payload: ReviewExeatPayload) => Promise<boolean>;
  clearMessages: () => void;
}

/**
 * Zustand Store managing state for the UNILAG Hostel Management Night Exeat & Overnight Pass module.
 * Provides actions for students to submit requests and Wardens to review applications.
 */
export const useExeatStore = create<ExeatState>((set, get) => ({
  studentRequests: [],
  activeApprovedExeat: null,
  pendingRequests: [],
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,
  successMessage: null,

  fetchStudentRequests: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const requests = await ExeatService.getStudentExeatRequests(studentId);
      set({ studentRequests: requests, isLoading: false });
    } catch (err: any) {
      set({
        errorMessage: err?.message || 'Failed to retrieve exeat requests.',
        isLoading: false
      });
    }
  },

  fetchActiveExeat: async (studentId: string) => {
    try {
      const active = await ExeatService.getActiveApprovedExeat(studentId);
      set({ activeApprovedExeat: active });
    } catch (err: any) {
      // Non-critical background fetch failure
    }
  },

  fetchPendingRequests: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const pending = await ExeatService.getPendingExeatRequests();
      set({ pendingRequests: pending, isLoading: false });
    } catch (err: any) {
      set({
        errorMessage: err?.message || 'Failed to load pending exeat requests.',
        isLoading: false
      });
    }
  },

  submitExeat: async (payload: SubmitExeatPayload) => {
    set({ isSubmitting: true, errorMessage: null, successMessage: null });
    try {
      const newExeat = await ExeatService.submitExeatRequest(payload);
      const currentList = get().studentRequests;
      set({
        studentRequests: [newExeat, ...currentList],
        isSubmitting: false,
        successMessage: 'Night Exeat application submitted successfully! Awaiting Warden approval.'
      });
      // Refresh active permit state
      get().fetchActiveExeat(payload.studentId);
      return true;
    } catch (err: any) {
      set({
        errorMessage: err?.message || 'Failed to submit night exeat request.',
        isSubmitting: false
      });
      return false;
    }
  },

  reviewExeat: async (payload: ReviewExeatPayload) => {
    set({ isSubmitting: true, errorMessage: null, successMessage: null });
    try {
      const updated = await ExeatService.reviewExeatRequest(payload);
      const updatedPending = get().pendingRequests.filter(req => req.id !== payload.exeatId);
      set({
        pendingRequests: updatedPending,
        isSubmitting: false,
        successMessage: `Exeat request #${payload.exeatId} marked as ${payload.approvalStatus}.`
      });
      return true;
    } catch (err: any) {
      set({
        errorMessage: err?.message || 'Failed to review exeat request.',
        isSubmitting: false
      });
      return false;
    }
  },

  clearMessages: () => set({ errorMessage: null, successMessage: null })
}));
