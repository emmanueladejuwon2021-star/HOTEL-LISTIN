import { create } from 'zustand';
import { ExeatService } from '../api/exeatService';
import {
  ExeatRequest,
  ApplyExeatParams,
  ReviewExeatParams
} from '../types/exeat';

/**
 * State interface for the Night Exeat Application & Warden Approval Zustand store.
 */
export interface ExeatStoreState {
  // Array of exeat requests for the active student
  requests: ExeatRequest[];
  // Array of pending exeat requests awaiting Warden review
  pendingRequests: ExeatRequest[];
  // Active approved exeat request covering current date (if any)
  activeExeat: ExeatRequest | null;
  // Indicates if an asynchronous database operation is in progress
  isLoading: boolean;
  // Holds error message string if an operation fails
  errorMessage: string | null;
  // Holds success notification feedback string
  successMessage: string | null;

  // Actions
  fetchStudentRequests: (studentId: string) => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  applyForExeat: (params: ApplyExeatParams) => Promise<ExeatRequest>;
  reviewExeatRequest: (params: ReviewExeatParams) => Promise<ExeatRequest>;
  checkActiveExeat: (studentId: string, targetDate?: string) => Promise<ExeatRequest | null>;
  clearMessages: () => void;
  resetExeatState: () => void;
}

/**
 * Zustand Store managing student exeat applications, warden approval workflows,
 * active overnight leave verification, and error/success feedback states.
 */
export const useExeatStore = create<ExeatStoreState>((set, get) => ({
  requests: [],
  pendingRequests: [],
  activeExeat: null,
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  fetchStudentRequests: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const requests = await ExeatService.getExeatRequestsByStudent(studentId);
      set({ requests, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to fetch student exeat requests.'
      });
    }
  },

  fetchPendingRequests: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const pendingRequests = await ExeatService.getPendingExeatRequests();
      set({ pendingRequests, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to fetch pending exeat requests for warden review.'
      });
    }
  },

  applyForExeat: async (params: ApplyExeatParams): Promise<ExeatRequest> => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const newExeat = await ExeatService.applyForExeat(params);
      const existing = get().requests;
      set({
        requests: [newExeat, ...existing],
        isLoading: false,
        successMessage: 'Overnight exeat request submitted successfully! Awaiting Hall Warden approval.'
      });
      return newExeat;
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to submit exeat request.'
      });
      throw error;
    }
  },

  reviewExeatRequest: async (params: ReviewExeatParams): Promise<ExeatRequest> => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const updated = await ExeatService.reviewExeatRequest(params);
      const pending = get().pendingRequests.filter(r => r.id !== params.exeatId);
      const updatedRequests = get().requests.map(r => r.id === params.exeatId ? updated : r);
      set({
        pendingRequests: pending,
        requests: updatedRequests,
        isLoading: false,
        successMessage: `Exeat request ${params.status.toLowerCase()} successfully.`
      });
      return updated;
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to update exeat approval status.'
      });
      throw error;
    }
  },

  checkActiveExeat: async (studentId: string, targetDate?: string): Promise<ExeatRequest | null> => {
    try {
      const active = await ExeatService.getActiveApprovedExeat(studentId, targetDate);
      set({ activeExeat: active });
      return active;
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to verify active approved exeat.' });
      return null;
    }
  },

  clearMessages: () => {
    set({ errorMessage: null, successMessage: null });
  },

  resetExeatState: () => {
    set({
      requests: [],
      pendingRequests: [],
      activeExeat: null,
      isLoading: false,
      errorMessage: null,
      successMessage: null
    });
  }
}));
