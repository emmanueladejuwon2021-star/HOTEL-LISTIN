/**
 * Data structures and status types for Student Disciplinary Flagging & Blacklist Controls.
 */

export type DisciplinaryStatus = 'CLEARED' | 'FLAGGED' | 'SUSPENDED' | 'RUSTICATED' | 'BLACK_LISTED';

export interface DisciplinaryRecord {
  id: string;
  userId: string;
  studentName?: string;
  matricOrStaffNo?: string;
  department?: string;
  level?: number;
  status: DisciplinaryStatus;
  reason: string;
  wardenId?: string;
  wardenName?: string;
  resolutionNotes?: string;
  flaggedAt: string;
  resolvedAt?: string;
}

export interface FlagStudentParams {
  userId: string;
  status: DisciplinaryStatus;
  reason: string;
  wardenId: string;
}

export interface LiftFlagParams {
  userId: string;
  wardenId: string;
  resolutionNotes: string;
}
