/**
 * Gate Pass Domain Types & Data Contracts for UNILAG Hostel Management App.
 *
 * Defines the structure for dynamic QR code gate passes, student access credentials,
 * encrypted token payloads, and verification results used at hostel gates.
 *
 * Implements [GATEPASS-01] (Issue #31), [GATEPASS-02] (Issue #32),
 * [GATEPASS-03] (Issue #33), and [GATEPASS-04] (Issue #34) according to PRD Sections 4.6, 6, and 7.
 * Documented in clear English for non-technical team members and hostel porters.
 */

export type GateType = 'ENTRY' | 'EXIT';

export type AccessStatus = 'GRANTED' | 'DENIED';

/**
 * Payload encoded inside the dynamic QR code token.
 * Includes student identity, room assignment, anti-replay salt/nonce, and timestamp expiry.
 */
export interface GatePassTokenPayload {
  /** Unique student user ID */
  userId: string;
  /** Full student name */
  fullName: string;
  /** UNILAG Matriculation Number */
  matricNo: string;
  /** Assigned hostel ID */
  hostelId?: string;
  /** Assigned hostel name (e.g. King Jaja Hall) */
  hostelName: string;
  /** Assigned room number (e.g. A-102) */
  roomNumber: string;
  /** Unique anti-replay random salt string */
  salt?: string;
  /** Nonce string for single-use token tracking */
  nonce?: string;
  /** Timestamp when token was issued */
  issuedAt?: number;
  /** Token generation Unix timestamp (in milliseconds) */
  generatedAt: number;
  /** Token expiry Unix timestamp (in milliseconds, 30-second TTL) */
  expiresAt: number;
  /** Cryptographic HMAC signature */
  signature?: string;
}

/**
 * Database record for stored student gate passes in Turso libSQL SQLite.
 */
export interface GatePassRecord {
  /** Unique ID of the gate pass entry */
  id: string;
  /** ID of the student user */
  userId: string;
  /** Encrypted or signed token string rendered inside the QR code */
  tokenString: string;
  /** Cryptographic hash signature verifying token authenticity */
  signatureHash: string;
  /** ISO date string when token was generated */
  generatedAt: string;
  /** ISO date string when token expires */
  expiresAt: string;
  /** Current status of gate pass ('ACTIVE', 'EXPIRED', 'USED', 'REVOKED') */
  status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'REVOKED';
  /** Remaining seconds until automatic refresh */
  remainingSeconds?: number;
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
 * Result returned when verifying a student's QR gate pass at the hostel gatehouse.
 */
export interface GatePassVerificationResult {
  /** True if QR pass is valid, active, and authentic */
  isValid: boolean;
  /** Verification message explaining status in plain English */
  message: string;
  /** Decoded student token payload if valid */
  payload?: GatePassTokenPayload;
  /** Gate pass record ID from database */
  passId?: string;
  /** Timestamp when pass was verified by porter */
  verifiedAt?: string;
  /** Access approval status */
  accessGranted?: boolean;
  /** Access status enum */
  accessStatus?: AccessStatus;
  /** Entry or Exit */
  gateType?: GateType;
  /** Reason for rejection if denied */
  reason?: string;
  /** Student profile details */
  student?: {
    userId: string;
    matricNo: string;
    fullName: string;
    hostelName: string;
    roomNumber: string;
  };
}

/**
 * Backward-compatible alias for verification result
 */
export type GateVerificationResult = GatePassVerificationResult;

/**
 * State parameters for gate pass countdown timer and auto-refresh manager in Zustand.
 */
export interface GatePassState {
  currentPass: GatePassRecord | null;
  payload: GatePassTokenPayload | null;
  secondsRemaining: number;
  isLoading: boolean;
  errorMessage: string | null;
  activePass?: GatePassToken | null;
  countdownSeconds?: number;
  isOffline?: boolean;
}

/**
 * Interface definition for Zustand Gate Pass Store State and Actions.
 */
export interface GatePassStoreState extends GatePassState {
  /** Fetches or initializes active gate pass for student user */
  loadGatePass: (userId: string) => Promise<void>;
  /** Forces instant generation of a fresh dynamic gate pass token */
  refreshGatePass: (userId: string) => Promise<void>;
  /** Decrements active countdown timer by 1 second and auto-refreshes when reaching 0 */
  tickTimer: (userId: string) => Promise<void> | void;
  /** Resets gate pass store state */
  resetGatePassState: () => void;
  /** Alias for loadGatePass */
  initializePass?: (userId: string) => Promise<void>;
  /** Alias for refreshGatePass */
  refreshPass?: (userId: string) => Promise<void>;
  /** Alias for resetGatePassState */
  reset?: () => void;
  /** Generate pass action */
  generatePass?: (userId: string) => Promise<void>;
  /** Toggle offline state */
  setOffline?: (offline: boolean) => void;
}
