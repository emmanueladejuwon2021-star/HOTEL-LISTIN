import { DisciplinaryStatus } from './eligibility';

/**
 * Interface representing a student's profile for Warden disciplinary management lookup.
 */
export interface StudentDisciplinarySearchResult {
  userId: string;
  matricOrStaffNo: string;
  fullName: string;
  faculty: string;
  department: string;
  level: number;
  campus: string;
  currentDisciplinaryStatus: DisciplinaryStatus;
  currentReason?: string;
  flaggedAt?: string;
  expiresAt?: string;
}

/**
 * Request payload when a Warden issues or modifies a student's disciplinary sanction.
 */
export interface IssueDisciplinarySanctionParams {
  wardenId: string;
  studentUserId: string;
  status: 'FLAGGED' | 'SUSPENDED' | 'RUSTICATED';
  reason: string;
  durationDays?: number; // Optional duration in days for suspension
}

/**
 * Request payload when a Warden clears a student's disciplinary sanction.
 */
export interface ClearDisciplinarySanctionParams {
  wardenId: string;
  studentUserId: string;
  clearanceNote: string;
}

/**
 * Audit record entry for disciplinary action logs.
 */
export interface DisciplinaryLogEntry {
  id: string;
  userId: string;
  studentName?: string;
  matricNo?: string;
  status: DisciplinaryStatus;
  reason: string;
  wardenId: string;
  flaggedAt: string;
  expiresAt?: string;
  clearedAt?: string;
  clearanceNote?: string;
}

/**
 * Summary metrics counter for Warden Disciplinary Dashboard view.
 */
export interface DisciplinarySummaryMetrics {
  totalActiveSanctions: number;
  totalFlaggedCount: number;
  totalSuspendedCount: number;
  totalRusticatedCount: number;
}
