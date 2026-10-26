/**
 * Maintenance Zustand Store for UnilagStay Hostel Management App
 * Manages maintenance ticket submission state, category selection, photo attachments, and ticket history.
 */

import { create } from 'zustand';
import {
  CreateTicketParams,
  MaintenanceCategory,
  MaintenanceTicket,
  CATEGORY_METADATA,
} from '../types/maintenance';
import { MaintenanceService } from '../api/maintenanceService';

export interface MaintenanceStoreState {
  selectedCategory: MaintenanceCategory;
  description: string;
  photoBeforeUrl: string;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  userTickets: MaintenanceTicket[];

  setSelectedCategory: (category: MaintenanceCategory) => void;
  setDescription: (description: string) => void;
  setPhotoBeforeUrl: (url: string) => void;
  clearMessages: () => void;
  resetForm: () => void;

  loadStudentTickets: (studentId: string) => Promise<void>;
  submitTicket: (params: Omit<CreateTicketParams, 'category' | 'description' | 'photoBeforeUrl'>) => Promise<boolean>;
  cancelTicket: (ticketId: string, studentId: string) => Promise<boolean>;
}

export const useMaintenanceStore = create<MaintenanceStoreState>((set, get) => ({
  selectedCategory: 'PLUMBING',
  description: '',
  photoBeforeUrl: 'https://unilagstay.edu.ng/uploads/maintenance_sample_before.jpg',
  isLoading: false,
  errorMessage: null,
  successMessage: null,
  userTickets: [],

  setSelectedCategory: (category: MaintenanceCategory) => {
    set({ selectedCategory: category, errorMessage: null });
  },

  setDescription: (description: string) => {
    set({ description, errorMessage: null });
  },

  setPhotoBeforeUrl: (url: string) => {
    set({ photoBeforeUrl: url, errorMessage: null });
  },

  clearMessages: () => {
    set({ errorMessage: null, successMessage: null });
  },

  resetForm: () => {
    set({
      selectedCategory: 'PLUMBING',
      description: '',
      photoBeforeUrl: 'https://unilagstay.edu.ng/uploads/maintenance_sample_before.jpg',
      errorMessage: null,
      successMessage: null,
    });
  },

  loadStudentTickets: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const tickets = await MaintenanceService.getStudentTickets(studentId);
      set({ userTickets: tickets, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to fetch maintenance ticket history.',
      });
    }
  },

  submitTicket: async (params) => {
    const { selectedCategory, description, photoBeforeUrl } = get();

    if (!selectedCategory) {
      set({ errorMessage: 'Please select a defect category.' });
      return false;
    }

    if (!description || description.trim().length < 5) {
      set({ errorMessage: 'Please enter a description of the defect (at least 5 characters).' });
      return false;
    }

    if (!photoBeforeUrl || photoBeforeUrl.trim() === '') {
      set({ errorMessage: 'Please capture or attach a photo proof of the defect.' });
      return false;
    }

    set({ isLoading: true, errorMessage: null, successMessage: null });

    try {
      const newTicket = await MaintenanceService.createTicket({
        ...params,
        category: selectedCategory,
        description,
        photoBeforeUrl,
      });

      const updatedTickets = [newTicket, ...get().userTickets];
      const categoryMeta = CATEGORY_METADATA[selectedCategory];

      set({
        userTickets: updatedTickets,
        isLoading: false,
        description: '',
        successMessage: `Repair ticket ${newTicket.id} logged! Target SLA: ${categoryMeta.targetSla}.`,
      });

      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to log maintenance ticket.',
      });
      return false;
    }
  },

  cancelTicket: async (ticketId: string, studentId: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const success = await MaintenanceService.cancelTicket(ticketId, studentId);
      if (success) {
        const updatedTickets = get().userTickets.map((t) =>
          t.id === ticketId ? { ...t, status: 'CANCELLED' as const } : t
        );
        set({
          userTickets: updatedTickets,
          isLoading: false,
          successMessage: `Ticket ${ticketId} has been cancelled.`,
        });
        return true;
      } else {
        set({
          isLoading: false,
          errorMessage: 'Ticket could not be cancelled. It may already be assigned or resolved.',
        });
        return false;
      }
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to cancel maintenance ticket.',
      });
      return false;
    }
  },
}));
