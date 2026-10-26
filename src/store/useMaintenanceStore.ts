import { create } from 'zustand';
import { MaintenanceService } from '../api/maintenanceService';
import {
  MaintenanceTicket,
  CreateTicketParams,
  UpdateTicketStatusParams,
  ArtisanQueueFilter,
  TicketCategory,
  UrgencyLevel,
  TicketStatus
} from '../types/maintenance';

interface MaintenanceStoreState {
  queue: MaintenanceTicket[];
  selectedTicket: MaintenanceTicket | null;
  isLoading: boolean;
  error: string | null;
  filter: ArtisanQueueFilter;

  // Actions
  setFilter: (filter: Partial<ArtisanQueueFilter>) => void;
  clearFilter: () => void;
  fetchArtisanQueue: () => Promise<void>;
  createTicket: (params: CreateTicketParams) => Promise<MaintenanceTicket>;
  startJob: (ticketId: string, artisanId: string) => Promise<MaintenanceTicket>;
  resolveJobWithProof: (ticketId: string, artisanId: string, photoAfterUrl: string) => Promise<MaintenanceTicket>;
  setSelectedTicket: (ticket: MaintenanceTicket | null) => void;
}

/**
 * Zustand store for managing Maintenance Artisan Job Queue state, filters, ticket status updates, and proof-of-fix uploads.
 */
export const useMaintenanceStore = create<MaintenanceStoreState>((set, get) => ({
  queue: [],
  selectedTicket: null,
  isLoading: false,
  error: null,
  filter: {},

  setFilter: (newFilter) => {
    set((state) => ({ filter: { ...state.filter, ...newFilter } }));
    get().fetchArtisanQueue();
  },

  clearFilter: () => {
    set({ filter: {} });
    get().fetchArtisanQueue();
  },

  fetchArtisanQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const tickets = await MaintenanceService.getArtisanQueue(get().filter);
      set({ queue: tickets, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch artisan work queue.', isLoading: false });
    }
  },

  createTicket: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const ticket = await MaintenanceService.createTicket(params);
      await get().fetchArtisanQueue();
      set({ isLoading: false });
      return ticket;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create maintenance ticket.', isLoading: false });
      throw err;
    }
  },

  startJob: async (ticketId, artisanId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await MaintenanceService.updateTicketStatus({
        ticketId,
        artisanId,
        status: 'IN_PROGRESS'
      });
      await get().fetchArtisanQueue();
      set({ isLoading: false });
      return updated;
    } catch (err: any) {
      set({ error: err.message || 'Failed to mark job in progress.', isLoading: false });
      throw err;
    }
  },

  resolveJobWithProof: async (ticketId, artisanId, photoAfterUrl) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await MaintenanceService.updateTicketStatus({
        ticketId,
        artisanId,
        status: 'RESOLVED',
        photoAfterUrl
      });
      await get().fetchArtisanQueue();
      set({ isLoading: false });
      return updated;
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload proof of fix and resolve job.', isLoading: false });
      throw err;
    }
  },

  setSelectedTicket: (ticket) => set({ selectedTicket: ticket })
}));
