import { Campus, PriorityCategory, ClearanceStatus } from './auth';

export type DisciplinaryStatus = 'CLEARED' | 'FLAGGED' | 'SUSPENDED' | 'RUSTICATED';

export interface EligibilityVerificationResult {
  userId: string;
  matricOrStaffNo: string;
  fullName: string;
  isEligible: boolean;
  feesPaid: boolean;
  disciplinaryStatus: DisciplinaryStatus;
  priorityCategory: PriorityCategory;
  campus: Campus;
  level: number;
  faculty: string;
  department: string;
  clearanceStatus: ClearanceStatus;
  statusMessage: string;
  verifiedAt: string;
}

export interface FeeSyncParams {
  userId: string;
  transactionReference: string;
  amount: number;
  paymentStatus: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
}
