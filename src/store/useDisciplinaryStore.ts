/**
 * Disciplinary Zustand Store
 * Target Module: [ADMIN-03] Student Disciplinary Flagging & Blacklists
 *
 * State management for Warden disciplinary controls, student search results,
 * sanction issue/clear actions, and dashboard metric counters.
 */

import { create } from 'zustand';
import { DisciplinaryState, StudentSearchResult, IssueSanctionParams, RevokeSanctionParams } from '../types/disciplinary';
import { DisciplinaryService } from '../api/disciplinaryService';

export const useDisciplinaryStore = create<DisciplinaryState>((set, get) => ({
  searchQuery: '',
  searchResults: [],
  selectedStudent: null,
  studentHistory: [],
  metrics: {
    totalFlagged: 0,
    totalSuspended: 0,
    totalRusticated: 0,
    totalActiveSanctions: 0,
  },
  isLoading: false,
  isSubmitting: false,
  error: null,

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  searchStudents: async (query: string) => {
    set({ isLoading: true, error: null, searchQuery: query });
    try {
      const results = await DisciplinaryService.searchStudents(query);
      set({ searchResults: results, isLoading: false });
      return results;
    } catch (err: any) {
      set({ error: err.message || 'Failed to search students.', isLoading: false });
      return [];
    }
  },

  selectStudent: async (student: StudentSearchResult | null) => {
    if (!student) {
      set({ selectedStudent: null, studentHistory: [] });
      return;
    }

    set({ selectedStudent: student, isLoading: true, error: null });
    try {
      const history = await DisciplinaryService.getStudentDisciplinaryHistory(student.userId);
      set({ studentHistory: history, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load student disciplinary history.', isLoading: false });
    }
  },

  issueSanction: async (params: IssueSanctionParams) => {
    set({ isSubmitting: true, error: null });
    try {
      await DisciplinaryService.issueDisciplinarySanction(params);

      // Refresh current student history and metrics
      const { selectedStudent, searchQuery } = get();
      if (selectedStudent && selectedStudent.userId === params.userId) {
        const history = await DisciplinaryService.getStudentDisciplinaryHistory(params.userId);
        const updatedStudent: StudentSearchResult = {
          ...selectedStudent,
          currentStatus: params.status,
          latestReason: params.reason,
          latestFlaggedAt: new Date().toISOString(),
        };
        set({ selectedStudent: updatedStudent, studentHistory: history });
      }

      // Refresh search list if query active
      if (searchQuery) {
        await get().searchStudents(searchQuery);
      }

      await get().fetchMetrics();
      set({ isSubmitting: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to issue disciplinary sanction.', isSubmitting: false });
      return false;
    }
  },

  revokeSanction: async (params: RevokeSanctionParams) => {
    set({ isSubmitting: true, error: null });
    try {
      await DisciplinaryService.revokeDisciplinarySanction(params);

      // Refresh current student history and metrics
      const { selectedStudent, searchQuery } = get();
      if (selectedStudent && selectedStudent.userId === params.userId) {
        const history = await DisciplinaryService.getStudentDisciplinaryHistory(params.userId);
        const updatedStudent: StudentSearchResult = {
          ...selectedStudent,
          currentStatus: 'CLEARED',
          latestReason: `Sanction Cleared: ${params.reason}`,
          latestFlaggedAt: new Date().toISOString(),
        };
        set({ selectedStudent: updatedStudent, studentHistory: history });
      }

      // Refresh search list if query active
      if (searchQuery) {
        await get().searchStudents(searchQuery);
      }

      await get().fetchMetrics();
      set({ isSubmitting: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to clear disciplinary sanction.', isSubmitting: false });
      return false;
    }
  },

  fetchMetrics: async () => {
    try {
      const metrics = await DisciplinaryService.getDisciplinaryMetrics();
      set({ metrics });
    } catch (err: any) {
      // Non-critical background metric fetch error
      console.warn('Failed to fetch disciplinary metrics:', err);
    }
  },

  clearError: () => set({ error: null }),
}));
