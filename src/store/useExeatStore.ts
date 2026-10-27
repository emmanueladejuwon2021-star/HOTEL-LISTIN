import { create } from 'zustand';
import { ExeatRequest, CreateExeatParams } from '../types/exeat';
import { ExeatService } from '../api/exeatService';

export interface ExeatState {
  requests: ExeatRequest[];
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;

  // Actions
  fetchRequests: (studentId: string) => Promise<void>;
  submitExeat: (params: CreateExeatParams) => Promise<ExeatRequest>;
  cancelExeat: (exeatId: string, studentId: string) => Promise<boolean>;
  clearMessages: () => void;
}

export const useExeatStore = create<ExeatState>((set, get) => ({
  requests: [],
  isLoading: false,
  error: null,
  successMessage: null,

  fetchRequests: async (studentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const requests = await ExeatService.getExeatsByStudent(studentId);
      set({ requests, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to fetch exeat applications',
        isLoading: false
      });
    }
  },

  submitExeat: async (params: CreateExeatParams) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const newRequest = await ExeatService.applyForExeat(params);
      set((state) => ({
        requests: [newRequest, ...state.requests],
        isLoading: false,
        successMessage: 'Night exeat application submitted successfully for Warden review!'
      }));
      return newRequest;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to submit exeat application',
        isLoading: false
      });
      throw err;
    }
  },

  cancelExeat: async (exeatId: string, studentId: string) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const success = await ExeatService.cancelExeat(exeatId, studentId);
      if (success) {
        set((state) => ({
          requests: state.requests.map((req) =>
            req.id === exeatId ? { ...req, wardenApprovalStatus: 'CANCELLED' } : req
          ),
          isLoading: false,
          successMessage: 'Exeat application cancelled successfully.'
        }));
      }
      return success;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to cancel exeat application',
        isLoading: false
      });
      throw err;
    }
  },

  clearMessages: () => {
    set({ error: null, successMessage: null });
  }
}));
