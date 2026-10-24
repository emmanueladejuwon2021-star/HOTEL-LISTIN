/**
 * Types and interface definitions for Dynamic QR Code Gate Pass & Gatekeeping Engine.
 * Handles dynamic rolling QR tokens, offline HMAC-SHA256 signature validation,
 * curfew enforcement, anti-replay protection, and entry/exit audit logs.
 *
 * Implements [GATEPASS-01] (Issue #31) and [GATEPASS-02] (Issue #32) according to PRD Sections 4.6 and Section 6.
 * Documented in clear English for non-technical team members and hostel porters.
 */

export type GateType = 'ENTRY' | 'EXIT';

export type AccessStatus = 'GRANTED' | 'DENIED';

/**
 * Payload encoded inside the dynamic QR pass token.
 */
export interface GatePassTokenPayload {
  userId: string;
  matricNo: string;
  fullName: string;
  hostelId: string;
  hostelName: string;
  roomNumber: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

/**
 * Encapsulated dynamic gate pass token object.
 */
export interface GatePassToken {
  tokenString: string;
  payload: GatePassTokenPayload;
  expiresInSeconds: number;
}

/**
 * Audit log entry recorded in Turso DB upon each gate scan attempt.
 */
export interface GateAccessLog {
  id: string;
  userId: string;
  studentName?: string;
  studentMatric?: string;
  hostelId: string;
  gateType: GateType;
  accessStatus: AccessStatus;
  denialReason?: string;
  scannedByPorterId: string;
  timestamp: string;
}

/**
 * Verification outcome returned to the hostel porter's scanner screen.
 */
export interface GateVerificationResult {
  accessGranted: boolean;
  accessStatus: AccessStatus;
  gateType: GateType;
  reason?: string;
  student?: {
    userId: string;
    matricNo: string;
    fullName: string;
    hostelName: string;
    roomNumber: string;
  };
  verifiedAt: string;
}
