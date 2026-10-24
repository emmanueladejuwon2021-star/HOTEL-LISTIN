/**
 * Type definitions and interfaces for the 72-Hour Payment Hold & Remita Gateway module.
 * Represents provisional bedspace reservations, payment countdown timers, Remita transactions,
 * and bedspace status confirmation in the UNILAG Hostel Management App.
 */

/**
 * Represents details of a student's active 72-hour provisional bedspace payment hold.
 */
export interface PaymentHoldDetails {
  paymentId: string;
  userId: string;
  bedspaceId: string;
  bedLabel: string;
  roomNumber: string;
  blockName: string;
  hostelName: string;
  amount: number;
  transactionReference: string;
  paymentStatus: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  holdExpiresAt: string;
  isExpired: boolean;
  remainingSeconds: number;
}

/**
 * Parameters submitted when a student completes payment using a Remita RRR or payment reference.
 */
export interface RemitaPaymentParams {
  userId: string;
  paymentId: string;
  transactionReference: string;
}

/**
 * Result returned after processing a Remita payment transaction.
 */
export interface PaymentProcessResult {
  success: boolean;
  paymentId: string;
  bedspaceId: string;
  transactionReference: string;
  amount: number;
  paymentStatus: 'SUCCESSFUL' | 'FAILED';
  bedspaceStatus: 'CONFIRMED' | 'LOCKED_HOLD';
  paidAt: string;
  message: string;
}

/**
 * Details of an official digital payment receipt for a confirmed accommodation transaction.
 * Used for displaying receipt summaries and payment history to students.
 */
export interface PaymentReceipt {
  paymentId: string;
  transactionReference: string;
  amount: number;
  paymentType: string;
  paymentStatus: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  paidAt: string;
  bedspaceId: string;
  bedLabel: string;
  roomNumber: string;
  blockName: string;
  hostelName: string;
  campus: string;
  studentMatricNo: string;
  studentFullName: string;
}

/**
 * Result returned when a student voluntarily cancels or releases their provisional bedspace hold.
 */
export interface HoldReleaseResult {
  success: boolean;
  bedspaceId: string;
  message: string;
  recycledAt: string;
}

/**
 * Details of a generated Remita Retrieval Reference (RRR) for hostel fee payment.
 * Contains the unique 12-digit RRR code, creation timestamp, expiration, and total fee amount.
 */
export interface RemitaRRRDetails {
  rrr: string;
  paymentId: string;
  userId: string;
  bedspaceId: string;
  generatedAt: string;
  expiresAt: string;
  amountPayable: number;
}

/**
 * Itemized breakdown of hostel accommodation fees and processing charges.
 * Provides full financial transparency for students before payment.
 */
export interface RemitaFeeBreakdown {
  baseHostelFee: number;
  remitaServiceFee: number;
  ictProcessingFee: number;
  totalAmount: number;
  currency: string;
}

/**
 * Detailed outcome of verifying a Remita payment reference status.
 * Returns confirmation details, payment timestamps, and room allocation summary.
 */
export interface PaymentVerificationResult {
  transactionReference: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'NOT_FOUND';
  amount: number;
  paidAt?: string;
  payerName?: string;
  hostelName?: string;
  roomDetails?: string;
  message: string;
}

/**
 * Result returned when marking a payment attempt as failed or retrying payment.
 */
export interface PaymentRetryResult {
  success: boolean;
  paymentId: string;
  message: string;
  canRetry: boolean;
}

/**
 * Summary outcome of syncing pending Remita payments across the database.
 */
export interface PendingPaymentSyncSummary {
  totalPending: number;
  confirmedCount: number;
  failedCount: number;
  recycledHoldCount: number;
  syncedAt: string;
}
