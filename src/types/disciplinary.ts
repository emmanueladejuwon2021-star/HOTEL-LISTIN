import { DisciplinaryStatus } from './eligibility';

export { DisciplinaryStatus };

/**
 * Disciplinary record interface for student disciplinary flagging and blacklisting.
 * Detailed, jargon-free English comments explain the functionality clearly for developers.
 */
export interface DisciplinaryRecord {
  /**
   * Unique identifier of the student user associated with this record.
   */
  userId: string;

  /**
   * Student matriculation number or staff ID.
   */
  matricOrStaffNo: string;

  /**
   * Full legal name of the student.
   */
  fullName: string;

  /**
   * Student faculty assignment.
   */
  faculty?: string;

  /**
   * Student academic department.
   */
  department?: string;

  /**
   * Campus location (MAIN_CAMPUS or CMUL_IDI_ARABA).
   */
  campus?: 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA';

  /**
   * Current disciplinary standing status (CLEARED, FLAGGED, SUSPENDED, RUSTICATED).
   */
  status: DisciplinaryStatus;

  /**
   * Official reason or description of the infraction/sanction provided by the warden.
   */
  reason: string;

  /**
   * ISO string date timestamp when the flag or sanction was applied.
   */
  flaggedAt: string;

  /**
   * Optional staff ID or user ID of the Hall Warden who issued or updated the sanction.
   */
  flaggedByWardenId?: string;
}

/**
 * Parameter object required to apply or update a student's disciplinary status.
 */
export interface FlagStudentParams {
  /**
   * Matriculation number or staff ID of the student to be flagged or updated.
   */
  matricOrStaffNo: string;

  /**
   * New disciplinary standing status to enforce.
   */
  status: DisciplinaryStatus;

  /**
   * Official justification or reason for applying this status.
   */
  reason: string;

  /**
   * ID of the warden performing this action.
   */
  wardenId: string;
}

/**
 * Filter options when retrieving student disciplinary records.
 */
export interface DisciplinaryFilter {
  /**
   * Optional status filter to retrieve only specific statuses (e.g. FLAGGED, SUSPENDED, RUSTICATED).
   */
  status?: DisciplinaryStatus;

  /**
   * Optional search keyword to match student name or matric number.
   */
  searchQuery?: string;
}
