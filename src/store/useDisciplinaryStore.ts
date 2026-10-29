import { create } from 'zustand';
import { DisciplinaryRecord, DisciplinaryStatus } from '../types/disciplinary';
import { DisciplinaryService } from '../api/disciplinaryService';

interface DisciplinaryState {
  records: DisciplinaryRecord[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedStatusFilter: DisciplinaryStatus | 'ALL';

  setSearchQuery: (query: string) => void;
  setSelectedStatusFilter: (filter: DisciplinaryStatus | 'ALL') => void;
  fetchDisciplinaryRecords: () => Promise<void>;
  flagStudent: (matricNo: string, status: DisciplinaryStatus, reason: string, wardenId: string) => Promise<boolean>;
  clearFlag: (userId: string, wardenId: string) => Promise<boolean>;
}

/**
 * Zustand state store for managing Warden disciplinary flags, blacklists, search, and clearance operations.
 * Detailed comments explain state mechanics and asynchronous flow.
 */
export const useDisciplinaryStore = create<DisciplinaryState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedStatusFilter: 'ALL',

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedStatusFilter: (filter: DisciplinaryStatus | 'ALL') => {
    set({ selectedStatusFilter: filter });
  },

  fetchDisciplinaryRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const { searchQuery, selectedStatusFilter } = get();
      const statusFilter = selectedStatusFilter === 'ALL' ? undefined : selectedStatusFilter;
      const data = await DisciplinaryService.getDisciplinaryRecords({
        status: statusFilter,
        searchQuery: searchQuery.trim() || undefined
      });
      set({ records: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch disciplinary records.', isLoading: false });
    }
  },

  flagStudent: async (matricNo: string, status: DisciplinaryStatus, reason: string, wardenId: string) => {
    set({ isLoading: true, error: null });
    try {
      await DisciplinaryService.flagStudent({
        matricOrStaffNo: matricNo,
        status,
        reason,
        wardenId
      });
      await get().fetchDisciplinaryRecords();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to flag student.', isLoading: false });
      return false;
    }
  },

  clearFlag: async (userId: string, wardenId: string) => {
    set({ isLoading: true, error: null });
    try {
      await DisciplinaryService.clearDisciplinaryFlag(userId, wardenId);
      await get().fetchDisciplinaryRecords();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to clear disciplinary flag.', isLoading: false });
      return false;
    }
  }
}));
