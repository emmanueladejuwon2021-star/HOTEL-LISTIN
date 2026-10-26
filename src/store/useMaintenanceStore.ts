import { create } from 'zustand';
import { MaintenanceService } from '../api/maintenanceService';
import {
  MaintenanceTicket,
  ArtisanJobQueueFilter,
  ProofOfFixPayload,
  TicketCategory,
  TicketUrgency
} from '../types/maintenance';

/**
 * Zustand state store interface managing artisan job queues, filters, and photo proof uploads.
 */
export interface MaintenanceState {
  /** Array of active maintenance tickets in the artisan work queue */
  tickets: MaintenanceTicket[];
  /** Current active filter criteria */
  filter: ArtisanJobQueueFilter;
  /** Async loading state flag for UI activity indicators */
  isLoading: boolean;
  /** Error message string if an operation fails */
  error: string | null;
  /** Success status or feedback notification message */
  successMessage: string | null;

  /** Fetches the job queue from Turso DB using current filters */
  fetchJobQueue: (filter?: ArtisanJobQueueFilter) => Promise<void>;
  /** Assigns artisan staff member and sets status to IN_PROGRESS */
  startJob: (ticketId: string, artisanId: string) => Promise<void>;
  /** Submits proof-of-fix photo and marks ticket RESOLVED */
  completeJob: (payload: ProofOfFixPayload) => Promise<void>;
  /** Updates active category or urgency filter criteria */
  setFilter: (filter: Partial<ArtisanJobQueueFilter>) => void;
  /** Clears error or success notification banners */
  clearNotifications: () => void;
}

/**
 * Custom Zustand hook managing maintenance artisan workflow state and actions.
 */
export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  tickets: [],
  filter: {
    category: 'ALL',
    status: 'ALL',
    urgency: 'ALL'
  },
  isLoading: false,
  error: null,
  successMessage: null,

  fetchJobQueue: async (customFilter?: ArtisanJobQueueFilter) => {
    const filterToUse = customFilter || get().filter;
    set({ isLoading: true, error: null });
    try {
      const tickets = await MaintenanceService.getArtisanJobQueue(filterToUse);
      set({ tickets, filter: filterToUse, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch artisan job queue.', isLoading: false });
    }
  },

  startJob: async (ticketId: string, artisanId: string) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const updatedTicket = await MaintenanceService.startRepairJob(ticketId, artisanId);
      const updatedList = get().tickets.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      );
      set({
        tickets: updatedList,
        isLoading: false,
        successMessage: `Job started successfully for Room ${updatedTicket.room_number}.`
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to start repair job.', isLoading: false });
      throw err;
    }
  },

  completeJob: async (payload: ProofOfFixPayload) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const resolvedTicket = await MaintenanceService.completeRepairJob(payload);
      const updatedList = get().tickets.map(ticket =>
        ticket.id === resolvedTicket.id ? resolvedTicket : ticket
      );
      set({
        tickets: updatedList,
        isLoading: false,
        successMessage: `Proof-of-fix uploaded! Ticket for Room ${resolvedTicket.room_number} resolved.`
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload proof-of-fix photo.', isLoading: false });
      throw err;
    }
  },

  setFilter: (newFilter: Partial<ArtisanJobQueueFilter>) => {
    const updatedFilter = { ...get().filter, ...newFilter };
    set({ filter: updatedFilter });
    get().fetchJobQueue(updatedFilter);
  },

  clearNotifications: () => {
    set({ error: null, successMessage: null });
  }
}));
