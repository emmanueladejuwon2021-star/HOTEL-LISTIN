import { create } from 'zustand';
import { DisciplinaryService } from '../api/disciplinaryService';
import {
  StudentDisciplinarySearchResult,
  IssueDisciplinarySanctionParams,
  ClearDisciplinarySanctionParams,
  DisciplinaryLogEntry,
  DisciplinarySummaryMetrics
} from '../types/disciplinary';

interface DisciplinaryState {
  searchResults: StudentDisciplinarySearchResult[];
  activeBlacklist: StudentDisciplinarySearchResult[];
  selectedStudent: StudentDisciplinarySearchResult | null;
  auditLogs: DisciplinaryLogEntry[];
  summaryMetrics: DisciplinarySummaryMetrics;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  searchStudents: (query: string) => Promise<void>;
  selectStudent: (student: StudentDisciplinarySearchResult | null) => void;
  issueSanction: (params: IssueDisciplinarySanctionParams) => Promise<void>;
  clearSanction: (params: ClearDisciplinarySanctionParams) => Promise<void>;
  loadActiveBlacklist: () => Promise<void>;
  loadSummaryMetrics: () => Promise<void>;
  loadAuditLogs: (studentUserId?: string) => Promise<void>;
  clearMessages: () => void;
}

export const useDisciplinaryStore = create<DisciplinaryState>((set, get) => ({
  searchResults: [],
  activeBlacklist: [],
  selectedStudent: null,
  auditLogs: [],
  summaryMetrics: {
    totalActiveSanctions: 0,
    totalFlaggedCount: 0,
    totalSuspendedCount: 0,
    totalRusticatedCount: 0
  },
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  searchStudents: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ isLoading: true, errorMessage: null });
    try {
      const results = await DisciplinaryService.searchStudents(query);
      set({ searchResults: results, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to search students.', isLoading: false });
    }
  },

  selectStudent: (student) => {
    set({ selectedStudent: student, errorMessage: null, successMessage: null });
  },

  issueSanction: async (params) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const updatedStudent = await DisciplinaryService.issueSanction(params);
      set((state) => ({
        selectedStudent: updatedStudent,
        searchResults: state.searchResults.map((s) => (s.userId === updatedStudent.userId ? updatedStudent : s)),
        isLoading: false,
        successMessage: `Successfully issued ${params.status} sanction for ${updatedStudent.fullName}.`
      }));
      await get().loadActiveBlacklist();
      await get().loadSummaryMetrics();
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to issue disciplinary sanction.', isLoading: false });
    }
  },

  clearSanction: async (params) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const updatedStudent = await DisciplinaryService.clearSanction(params);
      set((state) => ({
        selectedStudent: updatedStudent,
        searchResults: state.searchResults.map((s) => (s.userId === updatedStudent.userId ? updatedStudent : s)),
        isLoading: false,
        successMessage: `Successfully cleared disciplinary sanction for ${updatedStudent.fullName}. Standing restored to CLEARED.`
      }));
      await get().loadActiveBlacklist();
      await get().loadSummaryMetrics();
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to clear disciplinary sanction.', isLoading: false });
    }
  },

  loadActiveBlacklist: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const blacklist = await DisciplinaryService.getActiveBlacklist();
      set({ activeBlacklist: blacklist, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to load active blacklist.', isLoading: false });
    }
  },

  loadSummaryMetrics: async () => {
    try {
      const metrics = await DisciplinaryService.getSummaryMetrics();
      set({ summaryMetrics: metrics });
    } catch {
      // Ignore background metric fetch errors
    }
  },

  loadAuditLogs: async (studentUserId) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const logs = await DisciplinaryService.getAuditLogs(studentUserId);
      set({ auditLogs: logs, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to load audit logs.', isLoading: false });
    }
  },

  clearMessages: () => {
    set({ errorMessage: null, successMessage: null });
  }
}));
