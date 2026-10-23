import { Campus, PriorityCategory, ClearanceStatus } from './auth';

/**
 * Disciplinary standing statuses for UNILAG students.
 */
export type DisciplinaryStatus = 'CLEARED' | 'FLAGGED' | 'SUSPENDED' | 'RUSTICATED';

/**
 * Medical clearance status from UNILAG Medical Center (Jaja Clinic).
 */
export type MedicalStatus = 'CLEARED' | 'PENDING' | 'FAILED' | 'NOT_STARTED';

/**
 * Disciplinary record history entry logging infractions or disciplinary actions.
 */
export interface DisciplinaryStandingHistory {
  userId: string;
  status: DisciplinaryStatus;
  reason: string;
  flaggedAt: string;
}

/**
 * Payment record interface for tracking verified school tuition fee payments in Turso DB.
 */
export interface FeePaymentRecord {
  id: string;
  userId: string;
  transactionReference: string;
  amount: number;
  paymentType: string;
  paymentStatus: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  paidAt: string;
}

/**
 * Summary object containing a student's full eligibility standing for hostel allocation.
 */
export interface EligibilityVerificationResult {
  userId: string;
  matricOrStaffNo: string;
  fullName: string;
  isEligible: boolean;
  feesPaid: boolean;
  courseRegistered: boolean;
  medicalStatus: MedicalStatus;
  specialNeedsRegistered: boolean;
  specialNeedsDetails?: string;
  disciplinaryStatus: DisciplinaryStatus;
  disciplinaryHistory?: DisciplinaryStandingHistory[];
  priorityCategory: PriorityCategory;
  campus: Campus;
  level: number;
  faculty: string;
  department: string;
  clearanceStatus: ClearanceStatus;
  clearanceRejectionReason?: string;
  clearanceCertificateHash?: string;
  statusMessage: string;
  verifiedAt: string;
  paymentHistory?: FeePaymentRecord[];
}

/**
 * Parameters submitted when syncing tuition fee payment via Remita RRR reference.
 */
export interface FeeSyncParams {
  userId: string;
  transactionReference: string;
  amount: number;
  paymentStatus: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  paymentType?: string;
}

/**
 * Parameters submitted when updating student medical screening status from UNILAG Medical Center.
 */
export interface MedicalStatusUpdateParams {
  userId: string;
  medicalStatus: MedicalStatus;
  notes?: string;
}

/**
 * Parameters submitted when registering special accommodation needs (e.g. physical disability, chronic condition).
 */
export interface SpecialNeedsParams {
  userId: string;
  specialNeedsDetails: string;
}

/**
 * Parameters submitted when a warden reviews student clearance documents.
 */
export interface ClearanceReviewParams {
  userId: string;
  clearanceStatus: ClearanceStatus;
  rejectionReason?: string;
}
