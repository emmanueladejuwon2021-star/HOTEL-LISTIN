import { create } from 'zustand';
import { DisciplinaryService } from '../api/disciplinaryService';
import {
  DisciplinaryRecord,
  DisciplinaryStatus,
  FlagStudentParams,
  LiftFlagParams
} from '../types/disciplinary';

/**
 * State shape for the Disciplinary Management Zustand store.
 */
interface DisciplinaryState {
  records: DisciplinaryRecord[];
  selectedStanding?: DisciplinaryRecord;
  isLoading: boolean;
  errorMessage?: string;
  activeFilter: DisciplinaryStatus | 'ALL';
  searchQuery: string;

  // Actions
  fetchRecords: (statusFilter?: DisciplinaryStatus | 'ALL', searchQuery?: string) => Promise<void>;
  flagStudent: (params: FlagStudentParams) => Promise<DisciplinaryRecord>;
  liftFlag: (params: LiftFlagParams) => Promise<DisciplinaryRecord>;
  fetchStudentStanding: (userId: string) => Promise<DisciplinaryRecord>;
  setFilter: (status: DisciplinaryStatus | 'ALL') => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

/**
 * Zustand store for Hall Wardens managing student disciplinary flagging, blacklists, and sanctions.
 * Interacts directly with `DisciplinaryService` backed by Turso libSQL database.
 */
export const useDisciplinaryStore = create<DisciplinaryState>((set, get) => ({
  records: [],
  selectedStanding: undefined,
  isLoading: false,
  errorMessage: undefined,
  activeFilter: 'ALL',
  searchQuery: '',

  /**
   * Fetches all disciplinary records matching current filters.
   */
  fetchRecords: async (statusFilter, searchQuery) => {
    const filter = statusFilter !== undefined ? statusFilter : get().activeFilter;
    const query = searchQuery !== undefined ? searchQuery : get().searchQuery;

    set({ isLoading: true, errorMessage: undefined });
    try {
      const records = await DisciplinaryService.getDisciplinaryRecords(filter, query);
      set({ records, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, errorMessage: err?.message || 'Failed to fetch disciplinary records.' });
    }
  },

  /**
   * Issues a disciplinary flag or sanction for a student.
   */
  flagStudent: async (params) => {
    set({ isLoading: true, errorMessage: undefined });
    try {
      const record = await DisciplinaryService.flagStudent(params);
      await get().fetchRecords();
      set({ isLoading: false, selectedStanding: record });
      return record;
    } catch (err: any) {
      set({ isLoading: false, errorMessage: err?.message || 'Failed to flag student.' });
      throw err;
    }
  },

  /**
   * Lifts an active disciplinary sanction from a student.
   */
  liftFlag: async (params) => {
    set({ isLoading: true, errorMessage: undefined });
    try {
      const record = await DisciplinaryService.liftDisciplinaryFlag(params);
      await get().fetchRecords();
      set({ isLoading: false, selectedStanding: record });
      return record;
    } catch (err: any) {
      set({ isLoading: false, errorMessage: err?.message || 'Failed to lift disciplinary flag.' });
      throw err;
    }
  },

  /**
   * Retrieves specific student standing.
   */
  fetchStudentStanding: async (userId) => {
    set({ isLoading: true, errorMessage: undefined });
    try {
      const record = await DisciplinaryService.getStudentStanding(userId);
      set({ selectedStanding: record, isLoading: false });
      return record;
    } catch (err: any) {
      set({ isLoading: false, errorMessage: err?.message || 'Failed to fetch student standing.' });
      throw err;
    }
  },

  setFilter: (status) => {
    set({ activeFilter: status });
    get().fetchRecords(status, get().searchQuery);
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchRecords(get().activeFilter, query);
  },

  clearError: () => set({ errorMessage: undefined })
}));
