import { create } from 'zustand';
import { ExeatService } from '../api/exeatService';
import {
  ExeatRequest,
  SubmitExeatPayload,
  ReviewExeatPayload,
  CancelExeatPayload,
  RequestExtensionPayload,
  ExeatApprovalStatus
} from '../types/exeat';

interface ExeatState {
  studentRequests: ExeatRequest[];
  activeApprovedExeat: ExeatRequest | null;
  pendingRequests: ExeatRequest[];
  filteredRequests: ExeatRequest[];
  selectedStatusFilter: ExeatApprovalStatus | 'ALL';
  searchKeyword: string;
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
  cancelExeat: (payload: CancelExeatPayload) => Promise<boolean>;
  requestExtension: (payload: RequestExtensionPayload) => Promise<boolean>;
  filterRequests: (filter: { status?: ExeatApprovalStatus | 'ALL'; studentId?: string; search?: string }) => Promise<void>;
  checkAndExpireOldRequests: () => Promise<void>;
  setStatusFilter: (status: ExeatApprovalStatus | 'ALL') => void;
  setSearchKeyword: (keyword: string) => void;
  clearMessages: () => void;
}

/**
 * Zustand Store managing state for the UNILAG Hostel Management Night Exeat & Overnight Pass module.
 * Provides actions for students to submit requests, cancel applications, request return extensions,
 * and Wardens to review and filter applications.
 */
export const useExeatStore = create<ExeatState>((set, get) => ({
  studentRequests: [],
  activeApprovedExeat: null,
  pendingRequests: [],
  filteredRequests: [],
  selectedStatusFilter: 'ALL',
  searchKeyword: '',
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,
  successMessage: null,

  fetchStudentRequests: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const requests = await ExeatService.getStudentExeatRequests(studentId);
      set({
        studentRequests: requests,
        filteredRequests: requests,
        isLoading: false
      });
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
      const updatedList = [newExeat, ...currentList];
      set({
        studentRequests: updatedList,
        filteredRequests: updatedList,
        isSubmitting: false,
        successMessage: 'Night Exeat application submitted successfully! Awaiting Warden approval.'
      });
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
      await ExeatService.reviewExeatRequest(payload);
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

  cancelExeat: async (payload: CancelExeatPayload) => {
    set({ isSubmitting: true, errorMessage: null, successMessage: null });
    try {
      const cancelled = await ExeatService.cancelExeatRequest(payload);
      const updatedStudentRequests = get().studentRequests.map(req =>
        req.id === payload.exeatId ? cancelled : req
      );
      set({
        studentRequests: updatedStudentRequests,
        filteredRequests: updatedStudentRequests,
        isSubmitting: false,
        successMessage: 'Your night exeat request has been cancelled successfully.'
      });
      get().fetchActiveExeat(payload.studentId);
      return true;
    } catch (err: any) {
      set({
        errorMessage: err?.message || 'Failed to cancel exeat request.',
        isSubmitting: false
      });
      return false;
    }
  },

  requestExtension: async (payload: RequestExtensionPayload) => {
    set({ isSubmitting: true, errorMessage: null, successMessage: null });
    try {
      const extended = await ExeatService.requestExeatExtension(payload);
      const updatedStudentRequests = get().studentRequests.map(req =>
        req.id === payload.exeatId ? extended : req
      );
      set({
        studentRequests: updatedStudentRequests,
        filteredRequests: updatedStudentRequests,
        isSubmitting: false,
        successMessage: 'Return date extension request submitted! Awaiting Warden re-approval.'
      });
      get().fetchActiveExeat(payload.studentId);
      return true;
    } catch (err: any) {
      set({
        errorMessage: err?.message || 'Failed to submit return date extension request.',
        isSubmitting: false
      });
      return false;
    }
  },

  filterRequests: async (filter: {
    status?: ExeatApprovalStatus | 'ALL';
    studentId?: string;
    search?: string;
  }) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const statusParam = filter.status === 'ALL' ? undefined : filter.status;
      const results = await ExeatService.getFilteredExeatRequests({
        status: statusParam,
        studentId: filter.studentId,
        search: filter.search
      });
      set({ filteredRequests: results, isLoading: false });
    } catch (err: any) {
      set({
        errorMessage: err?.message || 'Failed to filter exeat records.',
        isLoading: false
      });
    }
  },

  checkAndExpireOldRequests: async () => {
    try {
      await ExeatService.markExpiredExeatRequests();
    } catch (err: any) {
      // Non-critical background task
    }
  },

  setStatusFilter: (status: ExeatApprovalStatus | 'ALL') => {
    set({ selectedStatusFilter: status });
  },

  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword });
  },

  clearMessages: () => set({ errorMessage: null, successMessage: null })
}));
