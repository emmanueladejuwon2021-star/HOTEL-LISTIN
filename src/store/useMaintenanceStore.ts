/**
 * Maintenance Store State Management using Zustand.
 * Manages photo-backed repair request form inputs, category selection, attached photo URLs,
 * ticket creation actions, historical tickets listing, loading indicators, and validation error messages.
 *
 * Designed with simple, clear English comments for student users and software developers.
 */

import { create } from 'zustand';
import { MaintenanceService } from '../api/maintenanceService';
import { MaintenanceTicket, TicketCategory } from '../types/maintenance';

interface MaintenanceState {
  /** List of maintenance tickets submitted by the active student */
  tickets: MaintenanceTicket[];
  /** Currently selected repair category */
  selectedCategory: TicketCategory;
  /** Written description of the defect */
  description: string;
  /** Attached photo URL or base64 image string */
  photoUrl: string;
  /** Indicates if a request creation or ticket fetching operation is in progress */
  isLoading: boolean;
  /** Error message string displayed in UI validation error banners */
  errorMessage: string | null;
  /** Success message banner string */
  successMessage: string | null;

  /** Action to update chosen repair category */
  setSelectedCategory: (category: TicketCategory) => void;
  /** Action to update defect description text */
  setDescription: (description: string) => void;
  /** Action to attach or remove defect photo */
  setPhotoUrl: (photoUrl: string) => void;
  /** Action to clear error and success messages */
  clearMessages: () => void;
  /** Action to load student's submitted repair tickets from database */
  loadStudentTickets: (studentId: string) => Promise<void>;
  /** Action to submit a new photo-backed repair request ticket */
  submitTicket: (
    studentId: string,
    hostelId: string,
    roomNumber: string
  ) => Promise<MaintenanceTicket | null>;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  tickets: [],
  selectedCategory: 'PLUMBING',
  description: '',
  photoUrl: '',
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  setSelectedCategory: (category) =>
    set({ selectedCategory: category, errorMessage: null }),

  setDescription: (description) =>
    set({ description, errorMessage: null }),

  setPhotoUrl: (photoUrl) =>
    set({ photoUrl, errorMessage: null }),

  clearMessages: () => set({ errorMessage: null, successMessage: null }),

  loadStudentTickets: async (studentId: string) => {
    if (!studentId) return;
    set({ isLoading: true, errorMessage: null });
    try {
      const tickets = await MaintenanceService.getStudentTickets(studentId);
      set({ tickets, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to load maintenance tickets.'
      });
    }
  },

  submitTicket: async (studentId: string, hostelId: string, roomNumber: string) => {
    const { selectedCategory, description, photoUrl } = get();

    // Client-side validation per PRD TC-005
    if (!description.trim()) {
      set({ errorMessage: 'Please enter a description of the problem.' });
      return null;
    }
    if (!photoUrl.trim()) {
      set({
        errorMessage:
          'A photo of the defect is required before submitting a repair ticket. Please attach a photo.'
      });
      return null;
    }

    set({ isLoading: true, errorMessage: null, successMessage: null });

    try {
      const newTicket = await MaintenanceService.createTicket({
        studentId,
        hostelId,
        roomNumber,
        category: selectedCategory,
        description: description.trim(),
        photoBeforeUrl: photoUrl.trim()
      });

      // Update state upon successful ticket creation
      set((state) => ({
        tickets: [newTicket, ...state.tickets],
        description: '',
        photoUrl: '',
        isLoading: false,
        successMessage: `Repair request ${newTicket.id} submitted successfully! Maintenance team notified.`
      }));

      return newTicket;
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to submit repair request. Please try again.'
      });
      return null;
    }
  }
}));
