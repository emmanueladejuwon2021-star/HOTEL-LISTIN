import { create } from 'zustand';
import { AdminService } from '../api/adminService';
import {
  WardenOccupancyMetrics,
  ClearanceApprovalItem,
  ExeatApprovalItem,
  ActionQueueSummary,
  WardenActivityLog
} from '../types/admin';

/**
 * State interface for Hall Warden Executive Dashboard and Approval Queue.
 */
interface WardenState {
  metrics: WardenOccupancyMetrics | null;
  summary: ActionQueueSummary | null;
  pendingClearances: ClearanceApprovalItem[];
  pendingExeats: ExeatApprovalItem[];
  activityLogs: WardenActivityLog[];
  isLoading: boolean;
  actionInProgress: boolean;
  error: string | null;
  successMessage: string | null;

  // Actions
  fetchDashboardData: (hostelId?: string) => Promise<void>;
  approveClearance: (clearanceId: string, wardenId: string, comments?: string) => Promise<boolean>;
  rejectClearance: (clearanceId: string, wardenId: string, reason: string) => Promise<boolean>;
  approveExeat: (exeatId: string, wardenId: string, comments?: string) => Promise<boolean>;
  rejectExeat: (exeatId: string, wardenId: string, reason: string) => Promise<boolean>;
  clearFeedback: () => void;
}

/**
 * Zustand store managing Hall Warden executive state and approval queue workflows.
 */
export const useWardenStore = create<WardenState>((set, get) => ({
  metrics: null,
  summary: null,
  pendingClearances: [],
  pendingExeats: [],
  activityLogs: [],
  isLoading: false,
  actionInProgress: false,
  error: null,
  successMessage: null,

  /**
   * Fetches real-time occupancy metrics, action badge counts, pending clearances, pending exeat requests,
   * and administrative activity logs from Turso database.
   */
  fetchDashboardData: async (hostelId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const [metrics, summary, pendingClearances, pendingExeats, activityLogs] = await Promise.all([
        AdminService.getOccupancyMetrics(hostelId),
        AdminService.getActionQueueSummary(hostelId),
        AdminService.getPendingClearances(),
        AdminService.getPendingExeats(),
        AdminService.getRecentActivityLogs()
      ]);

      set({
        metrics,
        summary,
        pendingClearances,
        pendingExeats,
        activityLogs,
        isLoading: false
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message || 'Failed to fetch Warden dashboard data from database.'
      });
    }
  },

  /**
   * Approves a student clearance submission package and updates local store state.
   */
  approveClearance: async (clearanceId: string, wardenId: string, comments?: string) => {
    set({ actionInProgress: true, error: null, successMessage: null });
    try {
      const res = await AdminService.approveClearancePackage(clearanceId, wardenId, comments);
      set({ successMessage: res.message, actionInProgress: false });
      await get().fetchDashboardData();
      return true;
    } catch (err: any) {
      set({
        actionInProgress: false,
        error: err?.message || 'Failed to approve clearance package.'
      });
      return false;
    }
  },

  /**
   * Rejects a student clearance submission package with mandatory feedback reason.
   */
  rejectClearance: async (clearanceId: string, wardenId: string, reason: string) => {
    set({ actionInProgress: true, error: null, successMessage: null });
    try {
      const res = await AdminService.rejectClearancePackage(clearanceId, wardenId, reason);
      set({ successMessage: res.message, actionInProgress: false });
      await get().fetchDashboardData();
      return true;
    } catch (err: any) {
      set({
        actionInProgress: false,
        error: err?.message || 'Failed to reject clearance package.'
      });
      return false;
    }
  },

  /**
   * Approves a student night exeat permission request.
   */
  approveExeat: async (exeatId: string, wardenId: string, comments?: string) => {
    set({ actionInProgress: true, error: null, successMessage: null });
    try {
      const res = await AdminService.approveExeatRequest(exeatId, wardenId, comments);
      set({ successMessage: res.message, actionInProgress: false });
      await get().fetchDashboardData();
      return true;
    } catch (err: any) {
      set({
        actionInProgress: false,
        error: err?.message || 'Failed to approve night exeat request.'
      });
      return false;
    }
  },

  /**
   * Rejects a student night exeat permission request with feedback notes.
   */
  rejectExeat: async (exeatId: string, wardenId: string, reason: string) => {
    set({ actionInProgress: true, error: null, successMessage: null });
    try {
      const res = await AdminService.rejectExeatRequest(exeatId, wardenId, reason);
      set({ successMessage: res.message, actionInProgress: false });
      await get().fetchDashboardData();
      return true;
    } catch (err: any) {
      set({
        actionInProgress: false,
        error: err?.message || 'Failed to reject night exeat request.'
      });
      return false;
    }
  },

  /**
   * Clears feedback error and success messages.
   */
  clearFeedback: () => {
    set({ error: null, successMessage: null });
  }
}));
