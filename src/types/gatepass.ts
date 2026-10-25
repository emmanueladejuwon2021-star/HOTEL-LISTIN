/**
 * Gate Pass Domain Types & Data Contracts for UNILAG Hostel Management App.
 *
 * Defines the structure for dynamic QR code gate passes, student access credentials,
 * encrypted token payloads, verification results, porter high-visibility scanner views,
 * sub-500ms offline verification, 6-digit manual PIN visitor access codes,
 * offline public key caching, local SQLite queueing, shift statistics, and emergency lockdown controls.
 *
 * Implements:
 * - [GATEPASS-01] Dynamic QR Gate Pass Token Generation (Issue #31)
 * - [GATEPASS-02] Offline-first Gatekeeping & Curfew Verification (Issue #32)
 * - [GATEPASS-03] Dynamic QR Code Gate Pass Generation Component 3 (Issue #33)
 * - [GATEPASS-04] Dynamic 30-Second Refreshing QR Pass & Store Countdown (Issue #34)
 * - [GATEPASS-05] Dynamic QR Code Gate Pass Generation Component 5 (Issue #35)
 * - [SCANNER-01] Porter High-Visibility Gate Scanner View Component 1 (Issue #36)
 * - [SCANNER-02] Sub-500ms QR Verification Performance Component 2 (Issue #37)
 * - [SCANNER-03] Manual 6-Digit PIN Lookup Backup for Gate Access Component 3 (Issue #38)
 * - [SCANNER-04] Scanner Auto-Reset, Audio Feedback & Disciplinary Security Flags Component 4 (Issue #39)
 * - [SCANNER-05] Porter Shift Statistics, Occupancy Counters & Emergency Lockdown Component 5 (Issue #40)
 * - [OFFLINE-01] Offline Local Public Key Caching & Local SQLite Queue Component 1 (Issue #41)
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
  id: string;
  userId: string;
  tokenString: string;
  signatureHash: string;
  generatedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'REVOKED';
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
  isValid: boolean;
  message: string;
  payload?: GatePassTokenPayload;
  passId?: string;
  verifiedAt?: string;
  accessGranted?: boolean;
  accessStatus?: AccessStatus;
  gateType?: GateType;
  reason?: string;
  latencyMs?: number;
  isOffline?: boolean;
  disciplinaryFlag?: {
    status: 'SUSPENDED' | 'FLAGGED' | 'RUSTICATED';
    reason: string;
    flaggedAt?: string;
  };
  student?: {
    userId: string;
    matricNo: string;
    fullName: string;
    hostelName: string;
    roomNumber: string;
    photoUrl?: string;
  };
}

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
 * Cached cryptographic public signing key stored locally on Porter devices for offline verification (PRD Section 7).
 */
export interface OfflineSecurityKey {
  keyId: string;
  keyAlgorithm: string; // e.g. 'HMAC-SHA256'
  publicKeyOrSecret: string;
  keyVersion: number;
  isActive?: boolean;
  cachedAt: string;
  expiresAt?: string;
}

export interface QueueIntegrityReport {
  isHealthy: boolean;
  totalItems: number;
  corruptedCount: number;
  repairedCount: number;
  details: string[];
}

/**
 * Local SQLite queue record for gate scans performed while disconnected from internet (PRD Section 7).
 */
export interface OfflineScanQueueItem {
  id: string;
  tokenString: string;
  userId: string;
  studentMatric?: string;
  studentName?: string;
  hostelId: string;
  gateType: GateType;
  accessStatus: AccessStatus;
  denialReason?: string;
  scannedByPorterId: string;
  scannedAt: string;
  syncStatus: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  errorMessage?: string;
}

export interface QueueSummary {
  total: number;
  pending: number;
  synced: number;
  failed: number;
}

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  totalProcessed: number;
  durationMs: number;
  timestamp: string;
}

/**
 * Porter Shift Statistics & Occupancy Counter ([SCANNER-05]).
 */
export interface ShiftStatistics {
  totalEntries: number;
  totalExits: number;
  activeVisitors: number;
  pendingOfflineSyncs: number;
  lastUpdated: string;
}

/**
 * Audio-Visual Feedback Indicator state ([SCANNER-04]).
 */
export interface AudioVisualFeedback {
  type: 'SUCCESS_CHIME' | 'REJECTION_BUZZ' | null;
  timestamp: number;
  message?: string;
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
  loadGatePass: (userId: string) => Promise<void>;
  refreshGatePass: (userId: string) => Promise<void>;
  tickTimer: (userId: string) => Promise<void> | void;
  resetGatePassState: () => void;
  createVisitorPass?: (studentId: string, visitorName: string, visitorPhone: string, visitDate?: string) => Promise<VisitorPass>;
  loadVisitorPasses?: (studentId: string) => Promise<void>;
  initializePass?: (userId: string) => Promise<void>;
  refreshPass?: (userId: string) => Promise<void>;
  reset?: () => void;
  generatePass?: (userId: string) => Promise<void>;
  setOffline?: (offline: boolean) => void;
}

/**
 * State parameters for Porter Gate Scanner Zustand Store (PRD Spec P-01).
 * Extended for Components 1, 2, 3, 4, 5 and Offline Sync.
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

  // Components 4, 5 & Offline features:
  isLockdownActive: boolean;
  offlineMode: boolean;
  shiftStats: ShiftStatistics;
  audioFeedback: AudioVisualFeedback;
  pendingSyncCount: number;
  autoResetSeconds: number; // 3-second countdown after scan

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
  /** Toggles Emergency Gate Lockdown Mode */
  toggleLockdown: () => boolean;
  /** Sets offline simulation / mode */
  setOfflineMode: (offline: boolean) => void;
  /** Synchronizes pending offline scan queue to Turso DB */
  syncOfflineQueue: (porterId: string) => Promise<{ syncedCount: number; failedCount: number }>;
  /** Loads current shift statistics counters */
  loadShiftStats: () => Promise<void>;
  /** Reports disciplinary incident to warden */
  reportDisciplinaryIncident: (studentId: string, porterId: string, reason: string) => Promise<void>;
  // Offline Queue & Background Sync features ([OFFLINE-02], [OFFLINE-03]):
  queueItems: OfflineScanQueueItem[];
  queueSummary: QueueSummary;
  isQueueModalVisible: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  activeKeyId: string;
  queueIntegrityReport: QueueIntegrityReport | null;
  loadQueueItems: () => Promise<void>;
  setQueueModalVisible: (visible: boolean) => void;
  retryQueueItem: (id: string) => Promise<void>;
  deleteQueueItem: (id: string) => Promise<void>;
  rotateKey: (newKeyId: string, secret: string) => Promise<void>;
  verifyQueueIntegrity: () => Promise<QueueIntegrityReport>;
  triggerAutoSync: (porterId: string) => Promise<SyncResult>;
  simulateNetworkChange: (online: boolean, porterId?: string) => Promise<void>;
  /** Resets scanner state */
  resetScanner: () => void;
}
