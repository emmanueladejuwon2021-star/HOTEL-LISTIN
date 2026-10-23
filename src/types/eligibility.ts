import { Campus, PriorityCategory, ClearanceStatus } from './auth';

/**
 * Disciplinary standing statuses for UNILAG students.
 */
export type DisciplinaryStatus = 'CLEARED' | 'FLAGGED' | 'SUSPENDED' | 'RUSTICATED';

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
  disciplinaryStatus: DisciplinaryStatus;
  priorityCategory: PriorityCategory;
  campus: Campus;
  level: number;
  faculty: string;
  department: string;
  clearanceStatus: ClearanceStatus;
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
