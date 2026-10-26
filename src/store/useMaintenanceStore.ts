import { create } from 'zustand';
import { MaintenanceService } from '../api/maintenanceService';
import {
  MaintenanceTicket,
  TicketStatus,
  DefectCategory,
  CreateTicketParams,
  ProofOfFixParams
} from '../types/maintenance';

/**
 * Zustand store interface for managing maintenance tickets and artisan job queue.
 */
export interface MaintenanceState {
  // Array of active maintenance tickets
  tickets: MaintenanceTicket[];
  // Currently selected ticket for detailed view or proof upload
  selectedTicket: MaintenanceTicket | null;
  // Active status filter ('ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED')
  filterStatus: TicketStatus | 'ALL';
  // Active defect category filter ('ALL' or specific DefectCategory)
  filterCategory: DefectCategory | 'ALL';
  // Loading indicator for async operations
  isLoading: boolean;
  // User-facing error message
  errorMessage: string | null;
  // User-facing success notification message
  successMessage: string | null;

  // Actions
  fetchTickets: (artisanId?: string) => Promise<void>;
  selectTicket: (ticket: MaintenanceTicket | null) => void;
  setFilterStatus: (status: TicketStatus | 'ALL') => void;
  setFilterCategory: (category: DefectCategory | 'ALL') => void;
  createTicket: (params: CreateTicketParams) => Promise<MaintenanceTicket | null>;
  assignJob: (ticketId: string, artisanId: string) => Promise<boolean>;
  submitProofOfFix: (params: ProofOfFixParams) => Promise<boolean>;
  rejectTicket: (ticketId: string, reason: string) => Promise<boolean>;
  clearMessages: () => void;
}

/**
 * Zustand global state store for facility maintenance and artisan work queue.
 */
export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  filterStatus: 'ALL',
  filterCategory: 'ALL',
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  /**
   * Fetches maintenance tickets from Turso DB for artisan or general queue.
   */
  fetchTickets: async (artisanId?: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      let ticketsList: MaintenanceTicket[] = [];
      if (artisanId) {
        ticketsList = await MaintenanceService.getTicketsForArtisan(artisanId, true);
      } else {
        const { filterStatus, filterCategory } = get();
        const filterObj: any = {};
        if (filterStatus !== 'ALL') filterObj.status = filterStatus;
        if (filterCategory !== 'ALL') filterObj.category = filterCategory;
        ticketsList = await MaintenanceService.getTickets(filterObj);
      }
      set({ tickets: ticketsList, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to fetch maintenance tickets from database.'
      });
    }
  },

  /**
   * Sets the currently selected ticket for inspection or job resolution.
   */
  selectTicket: (ticket: MaintenanceTicket | null) => {
    set({ selectedTicket: ticket });
  },

  /**
   * Sets the status filter tab ('ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED').
   */
  setFilterStatus: (status: TicketStatus | 'ALL') => {
    set({ filterStatus: status });
  },

  /**
   * Sets the category filter ('ALL', 'PLUMBING', 'ELECTRICAL', etc.).
   */
  setFilterCategory: (category: DefectCategory | 'ALL') => {
    set({ filterCategory: category });
  },

  /**
   * Submits a new defect ticket request.
   */
  createTicket: async (params: CreateTicketParams) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const newTicket = await MaintenanceService.createTicket(params);
      set(state => ({
        tickets: [newTicket, ...state.tickets],
        isLoading: false,
        successMessage: `Maintenance request submitted successfully for Room ${newTicket.roomNumber}.`
      }));
      return newTicket;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to submit maintenance ticket.'
      });
      return null;
    }
  },

  /**
   * Assigns job to artisan and sets status to IN_PROGRESS.
   */
  assignJob: async (ticketId: string, artisanId: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const updated = await MaintenanceService.assignArtisan({ ticketId, artisanId });
      set(state => ({
        tickets: state.tickets.map(t => (t.id === ticketId ? updated : t)),
        selectedTicket: state.selectedTicket?.id === ticketId ? updated : state.selectedTicket,
        isLoading: false,
        successMessage: `Job assigned and marked IN_PROGRESS for Room ${updated.roomNumber}.`
      }));
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to assign job to artisan.'
      });
      return false;
    }
  },

  /**
   * Submits proof-of-fix completion photo and transitions status to RESOLVED.
   */
  submitProofOfFix: async (params: ProofOfFixParams) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const resolved = await MaintenanceService.submitProofOfFix(params);
      set(state => ({
        tickets: state.tickets.map(t => (t.id === params.ticketId ? resolved : t)),
        selectedTicket: state.selectedTicket?.id === params.ticketId ? resolved : state.selectedTicket,
        isLoading: false,
        successMessage: `Repair verified and marked RESOLVED with proof photo for Room ${resolved.roomNumber}!`
      }));
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to upload proof-of-fix photo.'
      });
      return false;
    }
  },

  /**
   * Rejects an invalid or duplicate ticket with reason.
   */
  rejectTicket: async (ticketId: string, reason: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const rejected = await MaintenanceService.rejectTicket(ticketId, reason);
      set(state => ({
        tickets: state.tickets.map(t => (t.id === ticketId ? rejected : t)),
        selectedTicket: state.selectedTicket?.id === ticketId ? rejected : state.selectedTicket,
        isLoading: false,
        successMessage: `Maintenance ticket rejected: ${reason}`
      }));
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to reject ticket.'
      });
      return false;
    }
  },

  /**
   * Clears notification banners.
   */
  clearMessages: () => {
    set({ errorMessage: null, successMessage: null });
  }
}));
