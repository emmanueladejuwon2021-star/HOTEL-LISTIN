/**
 * Gate Pass Domain Types & Data Contracts for UNILAG Hostel Management App.
 *
 * Defines the structure for dynamic QR code gate passes, student access credentials,
 * encrypted token payloads, and verification results used at hostel gates.
 */

/**
 * Payload encoded inside the dynamic QR code JSON Web Token.
 * Includes student identity, room assignment, anti-replay salt, and timestamp expiry.
 */
export interface GatePassTokenPayload {
  /** Unique student user ID */
  userId: string;
  /** Full student name */
  fullName: string;
  /** UNILAG Matriculation Number */
  matricNo: string;
  /** Assigned hostel name (e.g. King Jaja Hall) */
  hostelName: string;
  /** Assigned room number (e.g. A-102) */
  roomNumber: string;
  /** Unique anti-replay random salt string */
  salt: string;
  /** Token generation Unix timestamp (in milliseconds) */
  generatedAt: number;
  /** Token expiry Unix timestamp (in milliseconds, 30-second TTL) */
  expiresAt: number;
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
}

/**
 * State parameters for gate pass countdown timer and auto-refresh manager.
 */
export interface GatePassState {
  /** Current active gate pass record or null */
  currentPass: GatePassRecord | null;
  /** Raw decoded payload of the current active pass */
  payload: GatePassTokenPayload | null;
  /** Remaining validity duration in seconds (0 to 30) */
  secondsRemaining: number;
  /** True while generating or refreshing token */
  isLoading: boolean;
  /** Error message string if pass generation fails */
  errorMessage: string | null;
}
