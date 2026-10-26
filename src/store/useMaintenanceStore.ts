import { create } from 'zustand';
import { MaintenanceCategory, MaintenanceTicket } from '../types/maintenance';

/**
 * State interface for the Maintenance Store.
 * Manages form state, ticket lists, active filters, and async operation messages.
 */
interface MaintenanceState {
  tickets: MaintenanceTicket[];
  activeCategory: MaintenanceCategory;
  description: string;
  photoUrl: string;
  hostelId: string;
  roomNumber: string;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  setCategory: (category: MaintenanceCategory) => void;
  setDescription: (description: string) => void;
  setPhotoUrl: (url: string) => void;
  setHostelId: (hostelId: string) => void;
  setRoomNumber: (roomNumber: string) => void;
  setTickets: (tickets: MaintenanceTicket[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
  resetForm: () => void;
}

/**
 * Zustand store hook for managing hostel repair request state.
 */
export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  tickets: [],
  activeCategory: 'PLUMBING',
  description: '',
  photoUrl: '',
  hostelId: 'Jaja Hall',
  roomNumber: 'A-204',
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  setCategory: (category: MaintenanceCategory) => set({ activeCategory: category }),
  setDescription: (description: string) => set({ description }),
  setPhotoUrl: (url: string) => set({ photoUrl: url }),
  setHostelId: (hostelId: string) => set({ hostelId }),
  setRoomNumber: (roomNumber: string) => set({ roomNumber }),
  setTickets: (tickets: MaintenanceTicket[]) => set({ tickets }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setErrorMessage: (msg: string | null) => set({ errorMessage: msg }),
  setSuccessMessage: (msg: string | null) => set({ successMessage: msg }),
  resetForm: () =>
    set({
      description: '',
      photoUrl: '',
      errorMessage: null,
      successMessage: null,
    }),
}));
