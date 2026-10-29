import { create } from 'zustand';
import {
  HostelOccupancyMetrics,
  ActionQueueSummary,
  PendingClearanceItem,
  PendingExeatItem,
  ActivityLogItem,
  ReviewClearanceParams,
  ReviewExeatParams,
} from '../types/warden';
import { wardenService } from '../api/wardenService';

/**
 * Interface defining state and actions for the Warden Executive Dashboard Zustand store.
 */
interface WardenState {
  /** Occupancy metrics data for active hostel view */
  occupancyMetrics: HostelOccupancyMetrics | null;
  /** Action queue summary badge counts */
  actionQueueSummary: ActionQueueSummary | null;
  /** List of student clearance packages awaiting Warden review */
  pendingClearances: PendingClearanceItem[];
  /** List of student overnight exeat requests awaiting Warden review */
  pendingExeats: PendingExeatItem[];
  /** List of recent Warden activity log items */
  activityLogs: ActivityLogItem[];
  /** Indicator whether dashboard data is currently loading */
  isLoading: boolean;
  /** Error message if an operation fails */
  error: string | null;
  /** Success status message following an action */
  successMessage: string | null;

  /** Fetches all dashboard data (metrics, badge counts, pending queues, and activity logs) */
  fetchDashboardData: (hostelId?: string) => Promise<void>;
  /** Submits Warden clearance review decision ('APPROVED' or 'REJECTED') */
  reviewClearance: (params: ReviewClearanceParams) => Promise<boolean>;
  /** Submits Warden exeat permission decision ('APPROVED' or 'DECLINED') */
  reviewExeat: (params: ReviewExeatParams) => Promise<boolean>;
  /** Clears error or success notification banner messages */
  clearStatusMessages: () => void;
}

/**
 * Zustand store hook managing Hall Warden Executive Dashboard state and real Turso database sync.
 */
export const useWardenStore = create<WardenState>((set, get) => ({
  occupancyMetrics: null,
  actionQueueSummary: null,
  pendingClearances: [],
  pendingExeats: [],
  activityLogs: [],
  isLoading: false,
  error: null,
  successMessage: null,

  fetchDashboardData: async (hostelId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const [occupancyMetrics, actionQueueSummary, pendingClearances, pendingExeats, activityLogs] =
        await Promise.all([
          wardenService.getOccupancyMetrics(hostelId),
          wardenService.getActionQueueSummary(),
          wardenService.getPendingClearances(),
          wardenService.getPendingExeatRequests(),
          wardenService.getRecentActivityLogs(),
        ]);

      set({
        occupancyMetrics,
        actionQueueSummary,
        pendingClearances,
        pendingExeats,
        activityLogs,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch Warden dashboard metrics.',
        isLoading: false,
      });
    }
  },

  reviewClearance: async (params: ReviewClearanceParams) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const success = await wardenService.reviewClearancePackage(params);
      if (success) {
        set({
          successMessage: `Student clearance package marked as ${params.status.toLowerCase()} successfully!`,
        });
        // Refresh dashboard data
        await get().fetchDashboardData();
        return true;
      }
      return false;
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to complete clearance package review.',
        isLoading: false,
      });
      return false;
    }
  },

  reviewExeat: async (params: ReviewExeatParams) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const success = await wardenService.reviewExeatRequest(params);
      if (success) {
        set({
          successMessage: `Overnight exeat request marked as ${params.status.toLowerCase()} successfully!`,
        });
        // Refresh dashboard data
        await get().fetchDashboardData();
        return true;
      }
      return false;
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to update overnight exeat request.',
        isLoading: false,
      });
      return false;
    }
  },

  clearStatusMessages: () => set({ error: null, successMessage: null }),
}));
