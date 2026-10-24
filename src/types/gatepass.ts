/**
 * Gate Pass Domain Types & Data Contracts for UNILAG Hostel Management App.
 *
 * Defines the structure for dynamic QR code gate passes, student access credentials,
 * encrypted token payloads, verification results, porter high-visibility scanner views,
 * sub-500ms offline verification, and 6-digit manual PIN visitor access codes.
 *
 * Implements:
 * - [GATEPASS-01] Dynamic QR Gate Pass Token Generation (Issue #31)
 * - [GATEPASS-02] Offline-first Gatekeeping & Curfew Verification (Issue #32)
 * - [GATEPASS-03] Dynamic QR Code Gate Pass Generation Component 3 (Issue #33)
 * - [GATEPASS-04] Dynamic 30-Second Refreshing QR Pass & Store Countdown (Issue #34)
 * - [GATEPASS-05] Dynamic QR Code Gate Pass Generation - Component 5 (Issue #35)
 * - [SCANNER-01] Porter High-Visibility Gate Scanner View - Component 1 (Issue #36)
 * - [SCANNER-02] Sub-500ms QR Verification Performance - Component 2 (Issue #37)
 * - [SCANNER-03] Manual 6-Digit PIN Lookup Backup for Gate Access - Component 3 (Issue #38)
 *
 * Adheres to PRD Sections 4.6, 6 (Specs S-05 & P-01), 7, and 9.
 * Documented in clear English for non-technical team members and hostel porters.
 */

export type GateType = 'ENTRY' | 'EXIT';

export type AccessStatus = 'GRANTED' | 'DENIED';

export type VisitorPassStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'EXPIRED';

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
  nonce?: string;
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
  /** Execution latency in milliseconds (Sub-500ms metric) */
  latencyMs?: number;
  /** Student profile details */
  student?: {
    userId: string;
    matricNo: string;
    fullName: string;
    hostelName: string;
    roomNumber: string;
    photoUrl?: string;
  };
}

/**
 * Backward-compatible alias for verification result
 */
export type GateVerificationResult = GatePassVerificationResult;

/**
 * Visitor pass data entity stored in Turso libSQL SQLite (PRD Section 9).
 */
export interface VisitorPass {
  id: string;
  studentId: string;
  studentName?: string;
  studentMatric?: string;
  hostelName?: string;
  roomNumber?: string;
  visitorName: string;
  visitorPhone: string;
  passCode: string; // 6-digit access PIN
  visitDate: string; // YYYY-MM-DD
  checkInTime?: string;
  checkOutTime?: string;
  status: VisitorPassStatus;
  createdAt: string;
}

/**
 * Outcome returned from 6-digit manual PIN lookup at gatehouse (PRD Section 6 Spec P-01).
 */
export interface ManualPinLookupResult {
  isValid: boolean;
  message: string;
  passType: 'VISITOR' | 'STUDENT_BACKUP';
  visitor?: VisitorPass;
  student?: {
    userId: string;
    matricNo: string;
    fullName: string;
    hostelName: string;
    roomNumber: string;
    photoUrl?: string;
  };
  actionAllowed: 'CHECK_IN' | 'CHECK_OUT' | 'NONE';
  latencyMs?: number;
}

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
  visitorPasses?: VisitorPass[];
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
  /** Generates a 6-digit visitor pass PIN for an expected guest */
  createVisitorPass?: (studentId: string, visitorName: string, visitorPhone: string, visitDate?: string) => Promise<VisitorPass>;
  /** Fetches visitor passes created by student */
  loadVisitorPasses?: (studentId: string) => Promise<void>;
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

/**
 * State parameters for Porter Gate Scanner Zustand Store (PRD Spec P-01).
 */
export interface ScannerStoreState {
  isScanning: boolean;
  isVerifying: boolean;
  lastScannedToken: string | null;
  verificationResult: GatePassVerificationResult | null;
  pinLookupResult: ManualPinLookupResult | null;
  scanLatencyMs: number | null;
  manualPinModalVisible: boolean;
  manualPinInput: string;
  gateMode: GateType;
  recentScans: GateAccessLog[];
  errorMessage: string | null;

  /** Scans and verifies a QR code token at the gatehouse (<500ms) */
  scanQrCode: (tokenString: string, porterId: string) => Promise<GatePassVerificationResult>;
  /** Verifies a 6-digit visitor PIN or emergency student matric number */
  lookupManualPin: (pinOrMatric: string, porterId: string) => Promise<ManualPinLookupResult>;
  /** Executes visitor check-in upon valid PIN presentation */
  executeVisitorCheckIn: (visitorPassId: string, porterId: string) => Promise<void>;
  /** Executes visitor check-out upon exit */
  executeVisitorCheckOut: (visitorPassId: string, porterId: string) => Promise<void>;
  /** Toggles between ENTRY and EXIT gate modes */
  setGateMode: (mode: GateType) => void;
  /** Toggles manual PIN entry dialog modal */
  setManualPinModalVisible: (visible: boolean) => void;
  /** Updates current manual PIN input buffer */
  setManualPinInput: (pin: string) => void;
  /** Clears current banner and result display */
  clearScanResult: () => void;
  /** Resets scanner state */
  resetScanner: () => void;
}
