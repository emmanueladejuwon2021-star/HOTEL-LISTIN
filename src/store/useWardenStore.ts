import { create } from 'zustand';
import { WardenService } from '../api/wardenService';
import {
  HostelOccupancyMetrics,
  WardenQueueSummary,
  PendingClearanceItem,
  PendingExeatItem
} from '../types/warden';

interface WardenState {
  // State variables
  occupancyMetrics: HostelOccupancyMetrics[];
  queueSummary: WardenQueueSummary;
  pendingClearances: PendingClearanceItem[];
  pendingExeats: PendingExeatItem[];
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  fetchDashboardData: (hostelId?: string) => Promise<void>;
  reviewClearance: (userId: string, wardenId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => Promise<boolean>;
  reviewExeat: (exeatId: string, wardenId: string, status: 'APPROVED' | 'DECLINED', notes?: string) => Promise<boolean>;
  clearMessages: () => void;
}

/**
 * Global Zustand Store managing state for Hall Warden operations.
 * Handles loading occupancy metrics, badge summary counts, pending clearance queues,
 * and single-tap exeat approvals with user-friendly error handling.
 */
export const useWardenStore = create<WardenState>((set, get) => ({
  occupancyMetrics: [],
  queueSummary: {
    pendingClearancesCount: 0,
    pendingExeatsCount: 0,
    openSosAlertsCount: 0,
    openRepairsCount: 0
  },
  pendingClearances: [],
  pendingExeats: [],
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  /**
   * Fetches all real-time dashboard data from WardenService.
   */
  fetchDashboardData: async (hostelId?: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const [metrics, summary, clearances, exeats] = await Promise.all([
        WardenService.getHostelOccupancyMetrics(hostelId),
        WardenService.getWardenQueueSummary(),
        WardenService.getPendingClearances(),
        WardenService.getPendingExeats()
      ]);

      set({
        occupancyMetrics: metrics,
        queueSummary: summary,
        pendingClearances: clearances,
        pendingExeats: exeats,
        isLoading: false
      });
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err.message || 'Unable to load warden dashboard data. Please try again.'
      });
    }
  },

  /**
   * Reviews and approves/rejects a student digital clearance document package.
   */
  reviewClearance: async (userId: string, wardenId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const result = await WardenService.reviewClearancePackage(userId, wardenId, status, reason);
      set({
        successMessage: result.message,
        isLoading: false
      });
      // Refresh state after review
      await get().fetchDashboardData();
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err.message || 'Failed to complete clearance review.'
      });
      return false;
    }
  },

  /**
   * Single-tap exeat permission approval or decline for student overnight departure.
   */
  reviewExeat: async (exeatId: string, wardenId: string, status: 'APPROVED' | 'DECLINED', notes?: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const result = await WardenService.reviewExeatRequest(exeatId, wardenId, status, notes);
      set({
        successMessage: result.message,
        isLoading: false
      });
      // Refresh state after exeat review
      await get().fetchDashboardData();
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err.message || 'Failed to process exeat request.'
      });
      return false;
    }
  },

  /**
   * Clears feedback messages from state.
   */
  clearMessages: () => {
    set({ errorMessage: null, successMessage: null });
  }
}));
