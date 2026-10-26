import { create } from 'zustand';
import {
  MaintenanceCategory,
  MaintenanceTicket,
  MaintenanceTicketStatus,
  UpdateTicketStatusParams,
  ProofOfFixParams,
} from '../types/maintenance';
import { maintenanceService } from '../api/maintenanceService';

/**
 * Zustand state store interface for Maintenance Artisan Dispatch and Proof-of-Fix Upload.
 */
interface MaintenanceState {
  // Array of active repair tickets in artisan queue
  tickets: MaintenanceTicket[];
  // Currently selected ticket for proof-of-fix or details view
  selectedTicket: MaintenanceTicket | null;
  // Selected category filter (or null for all categories)
  selectedCategory: MaintenanceCategory | null;
  // Loading state indicator
  isLoading: boolean;
  // Error message string or null
  error: string | null;
  // Success message feedback or null
  successMessage: string | null;

  // Actions
  fetchQueue: (artisanId?: string, category?: MaintenanceCategory) => Promise<void>;
  selectTicket: (ticket: MaintenanceTicket | null) => void;
  setCategoryFilter: (category: MaintenanceCategory | null) => void;
  updateStatus: (params: UpdateTicketStatusParams) => Promise<boolean>;
  uploadProofOfFix: (params: ProofOfFixParams) => Promise<boolean>;
  clearMessages: () => void;
}

/**
 * Zustand store implementation for maintenance artisan operations.
 */
export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  selectedCategory: null,
  isLoading: false,
  error: null,
  successMessage: null,

  /**
   * Fetches the maintenance repair ticket queue from Turso DB.
   */
  fetchQueue: async (artisanId?: string, category?: MaintenanceCategory) => {
    set({ isLoading: true, error: null });
    try {
      const cat = category !== undefined ? category : (get().selectedCategory || undefined);
      const tickets = await maintenanceService.getArtisanQueue(artisanId, cat);
      set({ tickets, isLoading: false });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch artisan maintenance queue.',
        isLoading: false,
      });
    }
  },

  /**
   * Sets the currently selected ticket for detailed action or proof upload.
   */
  selectTicket: (ticket: MaintenanceTicket | null) => {
    set({ selectedTicket: ticket });
  },

  /**
   * Filters queue by maintenance category (e.g. PLUMBING, ELECTRICAL).
   */
  setCategoryFilter: (category: MaintenanceCategory | null) => {
    set({ selectedCategory: category });
  },

  /**
   * Updates job status (e.g. OPEN -> IN_PROGRESS or RESOLVED).
   */
  updateStatus: async (params: UpdateTicketStatusParams) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const result = await maintenanceService.updateTicketStatus(params);
      set({
        successMessage: result.message,
        isLoading: false,
      });
      // Refresh ticket queue
      await get().fetchQueue(params.artisanId);
      return true;
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to update repair job status.',
        isLoading: false,
      });
      return false;
    }
  },

  /**
   * Uploads proof-of-fix photo and marks repair ticket RESOLVED.
   */
  uploadProofOfFix: async (params: ProofOfFixParams) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const result = await maintenanceService.uploadProofOfFix(params);
      set({
        successMessage: result.message,
        isLoading: false,
      });
      // Refresh ticket queue
      await get().fetchQueue(params.artisanId);
      return true;
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to upload proof-of-fix photo.',
        isLoading: false,
      });
      return false;
    }
  },

  /**
   * Clears error and success messages.
   */
  clearMessages: () => {
    set({ error: null, successMessage: null });
  },
}));
