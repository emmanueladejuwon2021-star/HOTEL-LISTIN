/**
 * Represents the status of a student's hostel gate pass.
 * ACTIVE: Gate pass is currently valid for entry and exit.
 * EXPIRED: Gate pass token timeframe has elapsed.
 * REVOKED: Gate pass was revoked by hall warden or security.
 */
export type GatePassStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

/**
 * Interface representing the detailed information encoded in a dynamic QR gate pass.
 */
export interface GatePassDetails {
  /** Unique identifier for the gate pass record */
  passId: string;
  /** Student's unique user ID */
  userId: string;
  /** Student's full name */
  studentName: string;
  /** Student's matriculation or UTME registration number */
  studentMatricNo: string;
  /** Allocated hostel name (e.g. King Jaja Hall) */
  hostelName: string;
  /** Allocated block designation */
  blockName: string;
  /** Allocated room number */
  roomNumber: string;
  /** Allocated bed label (e.g. Bed A Down) */
  bedLabel: string;
  /** Cryptographic QR payload token string containing payload data and signature */
  qrToken: string;
  /** Timestamp when the pass token was generated or refreshed */
  generatedAt: string;
  /** Timestamp when the 30-second token auto-refresh period expires */
  tokenExpiresAt: string;
  /** Timestamp when the full residency pass expires */
  passExpiresAt: string;
  /** Current status of the gate pass */
  status: GatePassStatus;
  /** Number of seconds remaining before the dynamic QR token refreshes (0 to 30) */
  refreshCountdownSeconds: number;
}

/**
 * Result returned when validating or verifying a dynamic QR gate pass token.
 */
export interface GatePassVerificationResult {
  /** Indicates whether the gate pass token signature and residency status are valid */
  isValid: boolean;
  /** Decoded student name if token is valid */
  studentName?: string;
  /** Decoded matriculation number if token is valid */
  studentMatricNo?: string;
  /** Decoded hostel name if token is valid */
  hostelName?: string;
  /** Formatted room and bed assignment details */
  roomDetails?: string;
  /** Time when pass token was issued */
  issuedAt?: string;
  /** Human-readable verification outcome message for gate porters and students */
  message: string;
}
