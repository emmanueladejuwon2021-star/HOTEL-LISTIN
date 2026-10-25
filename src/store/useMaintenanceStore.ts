import { create } from 'zustand';
import { MaintenanceTicket, CreateTicketParams, MaintenanceCategory } from '../types/maintenance';
import { MaintenanceService } from '../api/maintenanceService';

/**
 * Zustand state store interface for Maintenance Ticket Creation and Tracking.
 */
export interface MaintenanceState {
  tickets: MaintenanceTicket[];
  activeCategory: MaintenanceCategory;
  description: string;
  photoUrl: string;
  hostelId: string;
  roomNumber: string;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  setCategory: (category: MaintenanceCategory) => void;
  setDescription: (description: string) => void;
  setPhotoUrl: (photoUrl: string) => void;
  setHostelId: (hostelId: string) => void;
  setRoomNumber: (roomNumber: string) => void;
  submitTicket: (studentId: string) => Promise<MaintenanceTicket | null>;
  fetchStudentTickets: (studentId: string) => Promise<void>;
  cancelTicket: (ticketId: string, studentId: string) => Promise<boolean>;
  resetForm: () => void;
  clearMessages: () => void;
}

/**
 * Global Zustand store managing state for student maintenance ticket submission and status tracking.
 */
export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  tickets: [],
  activeCategory: 'PLUMBING',
  description: '',
  photoUrl: '',
  hostelId: 'JAJA_HALL',
  roomNumber: 'A204',
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  setCategory: (category: MaintenanceCategory) => set({ activeCategory: category }),
  setDescription: (description: string) => set({ description }),
  setPhotoUrl: (photoUrl: string) => set({ photoUrl }),
  setHostelId: (hostelId: string) => set({ hostelId }),
  setRoomNumber: (roomNumber: string) => set({ roomNumber }),

  submitTicket: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    const { activeCategory, description, photoUrl, hostelId, roomNumber } = get();

    try {
      const ticket = await MaintenanceService.createTicket({
        studentId,
        hostelId,
        roomNumber,
        category: activeCategory,
        description,
        photoBeforeUrl: photoUrl
      });

      set((state) => ({
        tickets: [ticket, ...state.tickets],
        isLoading: false,
        description: '',
        photoUrl: '',
        successMessage: `Repair request submitted successfully! Reference ID: ${ticket.id}`
      }));

      return ticket;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err.message || 'Failed to submit maintenance request. Please try again.'
      });
      return null;
    }
  },

  fetchStudentTickets: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const tickets = await MaintenanceService.getStudentTickets(studentId);
      set({ tickets, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err.message || 'Failed to load maintenance ticket history.'
      });
    }
  },

  cancelTicket: async (ticketId: string, studentId: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const success = await MaintenanceService.cancelTicket(ticketId, studentId);
      if (success) {
        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== ticketId),
          isLoading: false,
          successMessage: 'Maintenance ticket cancelled successfully.'
        }));
      }
      return success;
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err.message || 'Unable to cancel ticket.'
      });
      return false;
    }
  },

  resetForm: () => set({
    description: '',
    photoUrl: '',
    errorMessage: null,
    successMessage: null
  }),

  clearMessages: () => set({
    errorMessage: null,
    successMessage: null
  })
}));
