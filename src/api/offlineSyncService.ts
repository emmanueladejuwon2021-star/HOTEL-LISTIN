import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import {
  OfflineSecurityKey,
  OfflineScanQueueItem,
  GatePassVerificationResult,
  GatePassTokenPayload,
  GateType,
  AccessStatus,
  QueueSummary,
  SyncResult,
  QueueIntegrityReport
} from '../types/gatepass';

const DEFAULT_KEY_ID = 'UNILAG_GATE_OFFLINE_KEY_V1';
const DEFAULT_FALLBACK_SECRET = 'UNILAGSTAY_GATEPASS_HMAC_SECRET_2026_KEY';

/**
 * Service managing Offline JWT / HMAC verification and local SQLite sync queueing.
 * Implements PRD Section 7: OFFLINE-FIRST GATEKEEPER & QR SCANNER ARCHITECTURE.
 *
 * Implements:
 * - [OFFLINE-01] Offline local public key caching for JWT gate pass verification (Issue #41)
 * - [OFFLINE-02] Local SQLite queueing for offline gate entry logs (Issue #42)
 * - [OFFLINE-03] Automatic background sync when internet connection resumes (Issue #43)
 *
 * All operations run on local SQLite edge database ensuring zero downtime during campus network outages.
 * Documented in clear English for non-technical administrators and porters.
 */
export class OfflineSyncService {
  private static _isNetworkOnline: boolean = true;
  private static _networkListeners: Array<(online: boolean) => Promise<void> | void> = [];

  /**
   * Initializes local SQLite database tables for offline key caching and scan queueing.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Table caching cryptographic signing keys locally on the device (PRD Section 7.2)
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS offline_security_keys (
        key_id TEXT PRIMARY KEY,
        key_algorithm TEXT NOT NULL DEFAULT 'HMAC-SHA256',
        public_key_or_secret TEXT NOT NULL,
        key_version INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )`,
      args: []
    });

    // 2. Table queueing offline gate scan events for background synchronization (PRD Section 7.4)
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS offline_scan_queue (
        id TEXT PRIMARY KEY,
        token_string TEXT NOT NULL,
        user_id TEXT NOT NULL,
        student_matric TEXT,
        student_name TEXT,
        hostel_id TEXT NOT NULL,
        gate_type TEXT NOT NULL,
        access_status TEXT NOT NULL,
        denial_reason TEXT,
        scanned_by_porter_id TEXT NOT NULL,
        scanned_at DATETIME NOT NULL,
        sync_status TEXT CHECK(sync_status IN ('PENDING_SYNC', 'SYNCING', 'SYNCED', 'FAILED')) DEFAULT 'PENDING_SYNC',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      )`,
      args: []
    });

    // Ensure existing table has student_matric and student_name columns
    try {
      await client.execute({
        sql: `ALTER TABLE offline_scan_queue ADD COLUMN student_matric TEXT`,
        args: []
      });
    } catch {}

    try {
      await client.execute({
        sql: `ALTER TABLE offline_scan_queue ADD COLUMN student_name TEXT`,
        args: []
      });
    } catch {}

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_scan_queue(sync_status)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_offline_queue_scanned_at ON offline_scan_queue(scanned_at)`,
      args: []
    });

    // Seed default offline key if table is empty
    const keyCheck = await client.execute({
      sql: `SELECT key_id FROM offline_security_keys WHERE key_id = ? LIMIT 1`,
      args: [DEFAULT_KEY_ID]
    });

    try {
      await client.execute({
        sql: `ALTER TABLE offline_security_keys ADD COLUMN is_active INTEGER DEFAULT 1`,
        args: []
      });
    } catch {}

    if (keyCheck.rows.length === 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 90); // 90 days key cache validity

      await client.execute({
        sql: `INSERT INTO offline_security_keys (key_id, key_algorithm, public_key_or_secret, key_version, is_active, expires_at)
              VALUES (?, 'HMAC-SHA256', ?, 1, 1, ?)`,
        args: [DEFAULT_KEY_ID, DEFAULT_FALLBACK_SECRET, expDate.toISOString()]
      });
    }

    // Ensure system fallback user exists to satisfy foreign key constraints during offline sync
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, is_active)
            VALUES ('unknown_user', 'UNREGISTERED_SYS', 'Unregistered / Unknown User', 'unknown@unilag.edu.ng', '08000000000', 'STUDENT', 'MALE', 0)`,
      args: []
    });
  }

  // =========================================================================
  // [OFFLINE-01]: Local Public Key Caching & Offline JWT Verification
  // =========================================================================

  /**
   * Stores or updates a cryptographic public key / secret in the local offline cache.
   *
   * @param keyId Unique key identifier
   * @param secretOrKey Secret key or public key string
   * @param algorithm Algorithm ('HMAC-SHA256' or 'RSA-256')
   * @param expiresInDays Cache retention duration in days
   */
  public static async cacheSigningKey(
    keyId: string = DEFAULT_KEY_ID,
    secretOrKey: string = DEFAULT_FALLBACK_SECRET,
    algorithm: string = 'HMAC-SHA256',
    expiresInDays: number = 90
  ): Promise<OfflineSecurityKey> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const cachedAt = new Date().toISOString();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiresInDays);
    const expiresAt = expDate.toISOString();

    await client.execute({
      sql: `INSERT OR REPLACE INTO offline_security_keys (key_id, key_algorithm, public_key_or_secret, key_version, is_active, cached_at, expires_at)
            VALUES (?, ?, ?, 1, 1, ?, ?)`,
      args: [keyId, algorithm, secretOrKey, cachedAt, expiresAt]
    });

    return {
      keyId,
      keyAlgorithm: algorithm,
      publicKeyOrSecret: secretOrKey,
      keyVersion: 1,
      isActive: true,
      cachedAt,
      expiresAt
    };
  }

  /**
   * Rotates cryptographic signing key, incrementing key version and setting previous keys as inactive.
   * Implements [OFFLINE-04] Cryptographic Key Rotation & Expiration Protocol.
   */
  public static async rotateSigningKey(
    newKeyId: string,
    newSecretOrKey: string,
    algorithm: string = 'HMAC-SHA256',
    expiresInDays: number = 90
  ): Promise<OfflineSecurityKey> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    // Deactivate previous active keys
    await client.execute({
      sql: `UPDATE offline_security_keys SET is_active = 0 WHERE is_active = 1`,
      args: []
    });

    // Get max key version
    const maxVerRes = await client.execute({
      sql: `SELECT MAX(key_version) as max_v FROM offline_security_keys`,
      args: []
    });
    const nextVer = Number(maxVerRes.rows[0]?.max_v || 0) + 1;

    const cachedAt = new Date().toISOString();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiresInDays);
    const expiresAt = expDate.toISOString();

    await client.execute({
      sql: `INSERT INTO offline_security_keys (key_id, key_algorithm, public_key_or_secret, key_version, is_active, cached_at, expires_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: [newKeyId, algorithm, newSecretOrKey, nextVer, cachedAt, expiresAt]
    });

    return {
      keyId: newKeyId,
      keyAlgorithm: algorithm,
      publicKeyOrSecret: newSecretOrKey,
      keyVersion: nextVer,
      isActive: true,
      cachedAt,
      expiresAt
    };
  }

  /**
   * Revokes a specific signing key (e.g. if compromised).
   */
  public static async revokeSigningKey(keyId: string): Promise<boolean> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `UPDATE offline_security_keys SET is_active = 0 WHERE key_id = ?`,
      args: [keyId]
    });

    return res.rowsAffected > 0;
  }

  /**
   * Retrieves the current active, unexpired locally cached signing key for offline gate pass validation.
   */
  public static async getCachedSigningKey(keyId?: string): Promise<string> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    if (keyId) {
      const res = await client.execute({
        sql: `SELECT public_key_or_secret, expires_at, is_active FROM offline_security_keys WHERE key_id = ? LIMIT 1`,
        args: [keyId]
      });

      if (res.rows.length > 0 && Boolean(res.rows[0].is_active ?? 1)) {
        const exp = res.rows[0].expires_at;
        if (!exp || new Date(String(exp)).getTime() > Date.now()) {
          return String(res.rows[0].public_key_or_secret);
        }
      }
    }

    // Fallback to latest active key
    const activeRes = await client.execute({
      sql: `SELECT public_key_or_secret, expires_at FROM offline_security_keys WHERE is_active = 1 ORDER BY key_version DESC LIMIT 1`,
      args: []
    });

    if (activeRes.rows.length > 0) {
      const exp = activeRes.rows[0].expires_at;
      if (!exp || new Date(String(exp)).getTime() > Date.now()) {
        return String(activeRes.rows[0].public_key_or_secret);
      }
    }

    return DEFAULT_FALLBACK_SECRET;
  }

  /**
   * Checks whether the local key cache exists and is unexpired.
   */
  public static async isKeyCacheValid(keyId: string = DEFAULT_KEY_ID): Promise<boolean> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT expires_at FROM offline_security_keys WHERE key_id = ? LIMIT 1`,
      args: [keyId]
    });

    if (res.rows.length === 0) return false;
    const expStr = res.rows[0].expires_at;
    if (!expStr) return true;

    return new Date(String(expStr)).getTime() > Date.now();
  }

  /**
   * Validates a dynamic QR token completely OFFLINE using the local cached cryptographic key.
   * Implements PRD Section 7.3: Offline Signature Verification.
   */
  public static async verifyOfflineToken(
    tokenString: string,
    porterId: string,
    gateType: GateType = 'ENTRY'
  ): Promise<GatePassVerificationResult> {
    const startTime = Date.now();
    await OfflineSyncService.initializeSchema();

    if (!tokenString || !tokenString.trim()) {
      return {
        isValid: false,
        accessGranted: false,
        accessStatus: 'DENIED',
        message: 'Invalid Gate Pass: QR code data is empty.',
        isOffline: true,
        latencyMs: Date.now() - startTime
      };
    }

    try {
      const rawUtf8 = CryptoJS.enc.Base64.parse(tokenString.trim()).toString(CryptoJS.enc.Utf8);
      const parsed = JSON.parse(rawUtf8);

      let payload: GatePassTokenPayload;
      let signature: string;

      if (parsed.p && parsed.sig) {
        payload = parsed.p;
        signature = parsed.sig;
      } else if (parsed.userId && parsed.signature) {
        payload = parsed;
        signature = parsed.signature;
      } else {
        return {
          isValid: false,
          accessGranted: false,
          accessStatus: 'DENIED',
          message: 'Access Denied: Malformed offline token format.',
          isOffline: true,
          latencyMs: Date.now() - startTime
        };
      }

      // Retrieve cached signing key from local SQLite
      const cachedKey = await OfflineSyncService.getCachedSigningKey();

      // Compute expected HMAC signature offline
      const payloadForSig = { ...payload };
      delete payloadForSig.signature;
      const expectedSig1 = CryptoJS.HmacSHA256(JSON.stringify(payloadForSig), cachedKey).toString(CryptoJS.enc.Hex);

      const rawLegacy = `${payload.userId}:${payload.matricNo}:${payload.fullName}:${payload.hostelId || 'hostel_jaja'}:${payload.issuedAt || payload.generatedAt}:${payload.expiresAt}:${payload.nonce}`;
      const expectedSig2 = CryptoJS.HmacSHA256(rawLegacy, cachedKey).toString();

      const signatureValid = signature === expectedSig1 || signature === expectedSig2;

      if (!signatureValid) {
        // Queue failed attempt offline
        const scanId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await OfflineSyncService.queueOfflineScan({
          id: scanId,
          tokenString,
          userId: payload.userId || 'unknown_user',
          studentMatric: payload.matricNo,
          studentName: payload.fullName,
          hostelId: payload.hostelId || 'hostel_main',
          gateType,
          accessStatus: 'DENIED',
          denialReason: 'Invalid cryptographic signature (Offline Check)',
          scannedByPorterId: porterId,
          scannedAt: new Date().toISOString()
        });

        return {
          isValid: false,
          accessGranted: false,
          accessStatus: 'DENIED',
          message: 'Access Denied: Invalid security signature (Verified Offline).',
          isOffline: true,
          latencyMs: Date.now() - startTime
        };
      }

      // Check token expiration
      const now = Date.now();
      if (now > payload.expiresAt) {
        const scanId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await OfflineSyncService.queueOfflineScan({
          id: scanId,
          tokenString,
          userId: payload.userId,
          studentMatric: payload.matricNo,
          studentName: payload.fullName,
          hostelId: payload.hostelId || 'hostel_main',
          gateType,
          accessStatus: 'DENIED',
          denialReason: 'Dynamic QR token expired (Offline Check)',
          scannedByPorterId: porterId,
          scannedAt: new Date().toISOString()
        });

        return {
          isValid: false,
          accessGranted: false,
          accessStatus: 'DENIED',
          message: 'Access Denied: Dynamic QR gate pass has expired (Verified Offline).',
          isOffline: true,
          latencyMs: Date.now() - startTime
        };
      }

      // Queue successful access in local SQLite queue for background sync
      const scanId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await OfflineSyncService.queueOfflineScan({
        id: scanId,
        tokenString,
        userId: payload.userId,
        studentMatric: payload.matricNo,
        studentName: payload.fullName,
        hostelId: payload.hostelId || 'hostel_main',
        gateType,
        accessStatus: 'GRANTED',
        scannedByPorterId: porterId,
        scannedAt: new Date().toISOString()
      });

      return {
        isValid: true,
        accessGranted: true,
        accessStatus: 'GRANTED',
        gateType,
        message: `ACCESS GRANTED (OFFLINE): ${payload.fullName} (${payload.matricNo}) - ${payload.hostelName}, ${payload.roomNumber}`,
        payload,
        isOffline: true,
        student: {
          userId: payload.userId,
          matricNo: payload.matricNo,
          fullName: payload.fullName,
          hostelName: payload.hostelName,
          roomNumber: payload.roomNumber
        },
        verifiedAt: new Date().toISOString(),
        latencyMs: Date.now() - startTime
      };
    } catch {
      return {
        isValid: false,
        accessGranted: false,
        accessStatus: 'DENIED',
        message: 'Access Denied: Failed to process offline QR code.',
        isOffline: true,
        latencyMs: Date.now() - startTime
      };
    }
  }

  // =========================================================================
  // [OFFLINE-02]: Local SQLite Queueing for Offline Gate Entry Logs
  // =========================================================================

  /**
   * Queues an offline gate scan event in the local SQLite database.
   */
  public static async queueOfflineScan(
    scan: Omit<OfflineScanQueueItem, 'syncStatus' | 'retryCount'>
  ): Promise<OfflineScanQueueItem> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `INSERT INTO offline_scan_queue (
        id, token_string, user_id, student_matric, student_name, hostel_id,
        gate_type, access_status, denial_reason, scanned_by_porter_id, scanned_at,
        sync_status, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SYNC', 0)`,
      args: [
        scan.id,
        scan.tokenString,
        scan.userId,
        scan.studentMatric || null,
        scan.studentName || null,
        scan.hostelId,
        scan.gateType,
        scan.accessStatus,
        scan.denialReason || null,
        scan.scannedByPorterId,
        scan.scannedAt
      ]
    });

    return {
      ...scan,
      syncStatus: 'PENDING_SYNC',
      retryCount: 0
    };
  }

  /**
   * Returns count of offline scans awaiting synchronization.
   */
  public static async getPendingScansCount(): Promise<number> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT COUNT(*) as count FROM offline_scan_queue WHERE sync_status = 'PENDING_SYNC'`,
      args: []
    });

    return Number(res.rows[0]?.count || 0);
  }

  /**
   * Retrieves all offline scans pending synchronization in FIFO order.
   */
  public static async getPendingScans(): Promise<OfflineScanQueueItem[]> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT * FROM offline_scan_queue WHERE sync_status = 'PENDING_SYNC' ORDER BY scanned_at ASC`,
      args: []
    });

    return res.rows.map(row => OfflineSyncService.mapRowToQueueItem(row));
  }

  /**
   * Retrieves all queue items with optional pagination, ordered in reverse chronological sequence.
   */
  public static async getAllQueueItems(limit: number = 50, offset: number = 0): Promise<OfflineScanQueueItem[]> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT * FROM offline_scan_queue ORDER BY scanned_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset]
    });

    return res.rows.map(row => OfflineSyncService.mapRowToQueueItem(row));
  }

  /**
   * Retrieves queue items filtered by their sync status.
   */
  public static async getQueueItemsByStatus(
    status: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED'
  ): Promise<OfflineScanQueueItem[]> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT * FROM offline_scan_queue WHERE sync_status = ? ORDER BY scanned_at DESC`,
      args: [status]
    });

    return res.rows.map(row => OfflineSyncService.mapRowToQueueItem(row));
  }

  /**
   * Returns a breakdown summary of queue statuses.
   */
  public static async getQueueSummary(): Promise<QueueSummary> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT
              COUNT(*) as total,
              SUM(CASE WHEN sync_status = 'PENDING_SYNC' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) as synced,
              SUM(CASE WHEN sync_status = 'FAILED' THEN 1 ELSE 0 END) as failed
            FROM offline_scan_queue`,
      args: []
    });

    const row = res.rows[0];
    return {
      total: Number(row?.total || 0),
      pending: Number(row?.pending || 0),
      synced: Number(row?.synced || 0),
      failed: Number(row?.failed || 0)
    };
  }

  /**
   * Resets a failed queue item back to PENDING_SYNC for retry.
   */
  public static async retryFailedScan(queueId: string): Promise<boolean> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `UPDATE offline_scan_queue
            SET sync_status = 'PENDING_SYNC', error_message = NULL
            WHERE id = ?`,
      args: [queueId]
    });

    return res.rowsAffected > 0;
  }

  /**
   * Removes a specific item from the local offline queue.
   */
  public static async deleteQueueItem(queueId: string): Promise<boolean> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `DELETE FROM offline_scan_queue WHERE id = ?`,
      args: [queueId]
    });

    return res.rowsAffected > 0;
  }

  /**
   * Performs self-healing queue integrity check to detect and repair corrupted queue items.
   * Implements [OFFLINE-04] Queue Integrity & Self-Healing Protocol.
   */
  public static async verifyQueueIntegrity(): Promise<QueueIntegrityReport> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT * FROM offline_scan_queue`,
      args: []
    });

    const totalItems = res.rows.length;
    let corruptedCount = 0;
    let repairedCount = 0;
    const details: string[] = [];

    for (const row of res.rows) {
      const id = String(row.id);
      const token = String(row.token_string || '');
      const userId = String(row.user_id || '');

      // Check for corrupted or missing mandatory fields
      if (!token || !userId || token === 'undefined' || userId === 'undefined') {
        corruptedCount++;
        // Delete invalid/corrupted queue record to self-heal queue
        await client.execute({
          sql: `DELETE FROM offline_scan_queue WHERE id = ?`,
          args: [id]
        });
        repairedCount++;
        details.push(`Repaired corrupted queue entry ${id}: removed invalid scan data`);
      }
    }

    const isHealthy = corruptedCount === 0;
    if (isHealthy) {
      details.push(`Offline SQLite queue integrity check passed (${totalItems} items verified)`);
    }

    return {
      isHealthy,
      totalItems,
      corruptedCount,
      repairedCount,
      details
    };
  }

  /**
   * Clears all records from the offline queue.
   */
  public static async clearAllQueue(): Promise<void> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `DELETE FROM offline_scan_queue`,
      args: []
    });
  }

  // =========================================================================
  // [OFFLINE-03]: Automatic Background Sync & Reconciliation
  // =========================================================================

  /**
   * Sets the simulated or detected network status and triggers auto-sync if restored.
   */
  public static async setNetworkOnline(online: boolean, porterId: string = 'porter_gate_default'): Promise<SyncResult | null> {
    const wasOffline = !OfflineSyncService._isNetworkOnline;
    OfflineSyncService._isNetworkOnline = online;

    if (online && wasOffline) {
      // Network restored: trigger background sync automatically!
      for (const listener of OfflineSyncService._networkListeners) {
        try {
          await listener(online);
        } catch (e) {
          console.error('[OfflineSyncService] Listener error:', e);
        }
      }
      return await OfflineSyncService.autoSync(porterId);
    }
    return null;
  }

  public static isNetworkOnline(): boolean {
    return OfflineSyncService._isNetworkOnline;
  }

  public static addNetworkListener(listener: (online: boolean) => Promise<void> | void): void {
    OfflineSyncService._networkListeners.push(listener);
  }

  public static removeNetworkListener(listener: (online: boolean) => Promise<void> | void): void {
    OfflineSyncService._networkListeners = OfflineSyncService._networkListeners.filter(l => l !== listener);
  }

  /**
   * Performs automated batch synchronization with idempotent deduplication.
   * Reconciles offline entries into the central `gate_access_logs` table (PRD Section 7.4).
   *
   * @param porterId ID of the syncing porter
   * @param maxBatchSize Maximum number of items to sync per batch (default: 100)
   */
  public static async autoSync(
    porterId: string,
    maxBatchSize: number = 100
  ): Promise<SyncResult> {
    const startTime = Date.now();
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query pending items up to batch limit
    const res = await client.execute({
      sql: `SELECT * FROM offline_scan_queue
            WHERE sync_status = 'PENDING_SYNC'
            ORDER BY scanned_at ASC
            LIMIT ?`,
      args: [maxBatchSize]
    });

    const pending = res.rows.map(row => OfflineSyncService.mapRowToQueueItem(row));
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pending) {
      try {
        const logId = `synced_${item.id}`;

        let targetUserId = item.userId;
        const uRes = await client.execute({
          sql: `SELECT id FROM users WHERE id = ? LIMIT 1`,
          args: [targetUserId]
        });
        if (uRes.rows.length === 0) {
          targetUserId = 'unknown_user';
          await client.execute({
            sql: `INSERT OR IGNORE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, is_active)
                  VALUES ('unknown_user', 'UNREGISTERED_SYS', 'Unregistered / Unknown User', 'unknown@unilag.edu.ng', '08000000000', 'STUDENT', 'MALE', 0)`,
            args: []
          });
        }

        // Idempotent insertion into gate_access_logs
        await client.execute({
          sql: `INSERT OR IGNORE INTO gate_access_logs (
            id, user_id, hostel_id, gate_type, access_status,
            denial_reason, nonce, scanned_by_porter_id, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          args: [
            logId,
            targetUserId,
            item.hostelId,
            item.gateType,
            item.accessStatus,
            item.denialReason ? `[Offline Sync] ${item.denialReason}` : '[Offline Sync Granted]',
            item.scannedByPorterId || porterId,
            item.scannedAt
          ]
        });

        // Mark as SYNCED
        await client.execute({
          sql: `UPDATE offline_scan_queue SET sync_status = 'SYNCED' WHERE id = ?`,
          args: [item.id]
        });

        syncedCount++;
      } catch (err: any) {
        await client.execute({
          sql: `UPDATE offline_scan_queue
                SET sync_status = 'FAILED', retry_count = retry_count + 1, error_message = ?
                WHERE id = ?`,
          args: [err.message || 'Auto-sync failed', item.id]
        });
        failedCount++;
      }
    }

    return {
      syncedCount,
      failedCount,
      totalProcessed: pending.length,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Alias for autoSync maintaining backward compatibility.
   */
  public static async syncOfflineQueue(
    porterId: string
  ): Promise<{ syncedCount: number; failedCount: number }> {
    const result = await OfflineSyncService.autoSync(porterId);
    return {
      syncedCount: result.syncedCount,
      failedCount: result.failedCount
    };
  }

  /**
   * Cleans up successfully synced offline items to prevent SQLite database bloat.
   */
  public static async purgeSyncedQueue(): Promise<number> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `DELETE FROM offline_scan_queue WHERE sync_status = 'SYNCED'`,
      args: []
    });

    return res.rowsAffected;
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private static mapRowToQueueItem(row: any): OfflineScanQueueItem {
    return {
      id: String(row.id),
      tokenString: String(row.token_string),
      userId: String(row.user_id),
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      studentName: row.student_name ? String(row.student_name) : undefined,
      hostelId: String(row.hostel_id),
      gateType: String(row.gate_type) as GateType,
      accessStatus: String(row.access_status) as AccessStatus,
      denialReason: row.denial_reason ? String(row.denial_reason) : undefined,
      scannedByPorterId: String(row.scanned_by_porter_id),
      scannedAt: String(row.scanned_at),
      syncStatus: String(row.sync_status) as any,
      retryCount: Number(row.retry_count || 0),
      errorMessage: row.error_message ? String(row.error_message) : undefined
    };
  }
}
