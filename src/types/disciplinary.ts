/**
 * Disciplinary Management Types & Interfaces
 * Target Module: [ADMIN-03] Student Disciplinary Flagging & Blacklists
 *
 * Defines data structures for student search results, disciplinary sanction records,
 * warden action parameters, and Zustand store state for hall warden governance.
 */

import { DisciplinaryStatus } from './eligibility';

/**
 * Detailed disciplinary record item logged in Turso DB.
 */
export interface DisciplinaryRecordItem {
  id: string;
  userId: string;
  studentName?: string;
  matricNumber?: string;
  department?: string;
  level?: number;
  status: DisciplinaryStatus;
  reason: string;
  flaggedAt: string;
  flaggedBy: string;
  durationDays?: number | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
}

/**
 * Student search result returned for warden lookup.
 */
export interface StudentSearchResult {
  userId: string;
  fullName: string;
  email: string;
  matricNumber: string;
  faculty: string;
  department: string;
  level: number;
  campus: string;
  currentStatus: DisciplinaryStatus;
  latestReason?: string;
  latestFlaggedAt?: string;
}

/**
 * Parameters for issuing a new disciplinary sanction.
 */
export interface IssueSanctionParams {
  userId: string;
  status: 'FLAGGED' | 'SUSPENDED' | 'RUSTICATED';
  reason: string;
  durationDays?: number;
  wardenId: string;
}

/**
 * Parameters for revoking/clearing an active disciplinary sanction.
 */
export interface RevokeSanctionParams {
  userId: string;
  wardenId: string;
  reason: string;
}

/**
 * Overview metrics summary for warden dashboard.
 */
export interface DisciplinaryMetrics {
  totalFlagged: number;
  totalSuspended: number;
  totalRusticated: number;
  totalActiveSanctions: number;
}

/**
 * Disciplinary Zustand Store interface.
 */
export interface DisciplinaryState {
  searchQuery: string;
  searchResults: StudentSearchResult[];
  selectedStudent: StudentSearchResult | null;
  studentHistory: DisciplinaryRecordItem[];
  metrics: DisciplinaryMetrics;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  setSearchQuery: (query: string) => void;
  searchStudents: (query: string) => Promise<StudentSearchResult[]>;
  selectStudent: (student: StudentSearchResult | null) => Promise<void>;
  issueSanction: (params: IssueSanctionParams) => Promise<boolean>;
  revokeSanction: (params: RevokeSanctionParams) => Promise<boolean>;
  fetchMetrics: () => Promise<void>;
  clearError: () => void;
}
