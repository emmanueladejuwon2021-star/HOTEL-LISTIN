import { create } from 'zustand';
import { DisciplinaryService, StudentDisciplinaryRecord } from '../api/disciplinaryService';
import { DisciplinaryStatus } from '../types/eligibility';

/**
 * State interface for Disciplinary Management Store.
 */
export interface DisciplinaryState {
  /** Array of student disciplinary records */
  records: StudentDisciplinaryRecord[];
  /** Currently selected student for flagging or detail review */
  selectedStudent: StudentDisciplinaryRecord | null;
  /** Active status filter category */
  filterStatus: string;
  /** Search filter term for student name/matric */
  searchQuery: string;
  /** Loading indicator state */
  isLoading: boolean;
  /** Error message string if an operation fails */
  error: string | null;
  /** Success notification string upon completing an action */
  successMessage: string | null;

  /** Fetches list of disciplinary records with current filters */
  fetchDisciplinaryList: (statusFilter?: string, query?: string) => Promise<void>;
  /** Selects a specific student record for detail or modal action */
  selectStudent: (record: StudentDisciplinaryRecord | null) => void;
  /** Updates status filter and re-fetches record list */
  setFilterStatus: (filter: string) => Promise<void>;
  /** Updates search query and re-fetches record list */
  setSearchQuery: (query: string) => Promise<void>;
  /** Flags or updates student disciplinary standing status */
  flagStudentRecord: (
    userId: string,
    status: DisciplinaryStatus,
    reason: string,
    wardenId?: string
  ) => Promise<void>;
  /** Clears or lifts disciplinary sanctions for a student */
  clearDisciplinaryRecord: (
    userId: string,
    wardenId?: string,
    remark?: string
  ) => Promise<void>;
  /** Resets notification messages */
  resetMessages: () => void;
}

/**
 * Zustand store managing student disciplinary records, Warden sanction actions,
 * status filtering, and search state.
 *
 * Implements:
 * - [ADMIN-01] Student Disciplinary Flagging & Blacklists (Issue #81)
 */
export const useDisciplinaryStore = create<DisciplinaryState>((set, get) => ({
  records: [],
  selectedStudent: null,
  filterStatus: 'ALL',
  searchQuery: '',
  isLoading: false,
  error: null,
  successMessage: null,

  fetchDisciplinaryList: async (statusFilter, query) => {
    const filter = statusFilter !== undefined ? statusFilter : get().filterStatus;
    const search = query !== undefined ? query : get().searchQuery;

    set({ isLoading: true, error: null });
    try {
      const records = await DisciplinaryService.getDisciplinaryList(filter, search);
      set({ records, isLoading: false });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch student disciplinary records list.',
        isLoading: false
      });
    }
  },

  selectStudent: (record) => {
    set({ selectedStudent: record, error: null, successMessage: null });
  },

  setFilterStatus: async (filter) => {
    set({ filterStatus: filter });
    await get().fetchDisciplinaryList(filter, get().searchQuery);
  },

  setSearchQuery: async (query) => {
    set({ searchQuery: query });
    await get().fetchDisciplinaryList(get().filterStatus, query);
  },

  flagStudentRecord: async (userId, status, reason, wardenId = 'sys_warden_admin') => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const updatedRecord = await DisciplinaryService.flagStudent(userId, status, reason, wardenId);

      set((state) => ({
        records: state.records.map((r) => (r.userId === userId ? updatedRecord : r)),
        selectedStudent: state.selectedStudent?.userId === userId ? updatedRecord : state.selectedStudent,
        isLoading: false,
        successMessage: `Successfully updated disciplinary status for ${updatedRecord.fullName} to '${status}'.`
      }));

      // Refresh full list to respect active filters
      await get().fetchDisciplinaryList();
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to update student disciplinary status.',
        isLoading: false
      });
    }
  },

  clearDisciplinaryRecord: async (userId, wardenId = 'sys_warden_admin', remark) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const clearedRecord = await DisciplinaryService.clearDisciplinaryStatus(userId, wardenId, remark);

      set((state) => ({
        records: state.records.map((r) => (r.userId === userId ? clearedRecord : r)),
        selectedStudent: state.selectedStudent?.userId === userId ? clearedRecord : state.selectedStudent,
        isLoading: false,
        successMessage: `Successfully cleared disciplinary standing for ${clearedRecord.fullName}.`
      }));

      // Refresh full list to respect active filters
      await get().fetchDisciplinaryList();
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to clear student disciplinary standing.',
        isLoading: false
      });
    }
  },

  resetMessages: () => {
    set({ error: null, successMessage: null });
  }
}));
