import { create } from 'zustand';
import { WardenService } from '../api/wardenService';
import {
  WardenOccupancyMetrics,
  WardenQueueItem,
  WardenActionParams
} from '../types/warden';

/**
 * Interface defining state and actions for the Warden Executive Dashboard store.
 */
export interface WardenState {
  metrics: WardenOccupancyMetrics | null;
  queue: WardenQueueItem[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  successMessage: string | null;

  // Actions
  fetchOccupancyMetrics: (hostelId?: string) => Promise<void>;
  fetchPendingQueue: () => Promise<void>;
  processAction: (params: WardenActionParams) => Promise<boolean>;
  clearStatusMessages: () => void;
}

/**
 * Zustand store managing state for Hall Warden operations, metrics, and approval queues.
 */
export const useWardenStore = create<WardenState>((set, get) => ({
  metrics: null,
  queue: [],
  isLoading: false,
  isProcessing: false,
  error: null,
  successMessage: null,

  fetchOccupancyMetrics: async (hostelId = 'hostel_jaja') => {
    set({ isLoading: true, error: null });
    try {
      const metrics = await WardenService.getOccupancyMetrics(hostelId);
      set({ metrics, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to calculate occupancy metrics.', isLoading: false });
    }
  },

  fetchPendingQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const queue = await WardenService.getPendingApprovalQueue();
      set({ queue, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch pending approval queue.', isLoading: false });
    }
  },

  processAction: async (params: WardenActionParams) => {
    set({ isProcessing: true, error: null, successMessage: null });
    try {
      const result = await WardenService.processApprovalAction(params);
      if (result.success) {
        // Refresh queue and metrics after decision
        await get().fetchPendingQueue();
        await get().fetchOccupancyMetrics();
        set({
          isProcessing: false,
          successMessage: result.message
        });
        return true;
      }
      set({ isProcessing: false, error: 'Failed to complete warden approval action.' });
      return false;
    } catch (err: any) {
      set({
        isProcessing: false,
        error: err.message || 'Error executing warden approval action.'
      });
      return false;
    }
  },

  clearStatusMessages: () => {
    set({ error: null, successMessage: null });
  }
}));
