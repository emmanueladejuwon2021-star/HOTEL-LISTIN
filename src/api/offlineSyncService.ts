import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import {
  OfflineSecurityKey,
  OfflineScanQueueItem,
  GatePassVerificationResult,
  GatePassTokenPayload,
  GateType,
  AccessStatus
} from '../types/gatepass';

const DEFAULT_KEY_ID = 'UNILAG_GATE_OFFLINE_KEY_V1';
const DEFAULT_FALLBACK_SECRET = 'UNILAGSTAY_GATEPASS_HMAC_SECRET_2026_KEY';

/**
 * Service managing Offline JWT / HMAC verification and local SQLite sync queueing.
 * Implements PRD Section 7: OFFLINE-FIRST GATEKEEPER & QR SCANNER ARCHITECTURE.
 *
 * Implements:
 * - [OFFLINE-01] Offline local public key caching for JWT gate pass verification (Issue #41)
 *
 * All operations run on local SQLite edge database ensuring zero downtime during campus network outages.
 * Documented in clear English for non-technical administrators and porters.
 */
export class OfflineSyncService {
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
        hostel_id TEXT NOT NULL,
        gate_type TEXT NOT NULL,
        access_status TEXT NOT NULL,
        denial_reason TEXT,
        scanned_by_porter_id TEXT NOT NULL,
        scanned_at DATETIME NOT NULL,
        sync_status TEXT CHECK(sync_status IN ('PENDING_SYNC', 'SYNCED', 'FAILED')) DEFAULT 'PENDING_SYNC',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      )`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_scan_queue(sync_status)`,
      args: []
    });

    // Seed default offline key if table is empty
    const keyCheck = await client.execute({
      sql: `SELECT key_id FROM offline_security_keys WHERE key_id = ? LIMIT 1`,
      args: [DEFAULT_KEY_ID]
    });

    if (keyCheck.rows.length === 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 90); // 90 days key cache validity

      await client.execute({
        sql: `INSERT INTO offline_security_keys (key_id, key_algorithm, public_key_or_secret, key_version, expires_at)
              VALUES (?, 'HMAC-SHA256', ?, 1, ?)`,
        args: [DEFAULT_KEY_ID, DEFAULT_FALLBACK_SECRET, expDate.toISOString()]
      });
    }
  }

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
      sql: `INSERT OR REPLACE INTO offline_security_keys (key_id, key_algorithm, public_key_or_secret, key_version, cached_at, expires_at)
            VALUES (?, ?, ?, 1, ?, ?)`,
      args: [keyId, algorithm, secretOrKey, cachedAt, expiresAt]
    });

    return {
      keyId,
      keyAlgorithm: algorithm,
      publicKeyOrSecret: secretOrKey,
      keyVersion: 1,
      cachedAt,
      expiresAt
    };
  }

  /**
   * Retrieves the locally cached signing key for offline gate pass validation.
   */
  public static async getCachedSigningKey(keyId: string = DEFAULT_KEY_ID): Promise<string> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT public_key_or_secret, expires_at FROM offline_security_keys WHERE key_id = ? LIMIT 1`,
      args: [keyId]
    });

    if (res.rows.length > 0) {
      return String(res.rows[0].public_key_or_secret);
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
   * Queues an offline gate scan event in the local SQLite database.
   */
  public static async queueOfflineScan(
    scan: Omit<OfflineScanQueueItem, 'syncStatus' | 'retryCount'>
  ): Promise<OfflineScanQueueItem> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `INSERT INTO offline_scan_queue (id, token_string, user_id, hostel_id, gate_type, access_status, denial_reason, scanned_by_porter_id, scanned_at, sync_status, retry_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SYNC', 0)`,
      args: [
        scan.id,
        scan.tokenString,
        scan.userId,
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
   * Retrieves all offline scans pending synchronization.
   */
  public static async getPendingScans(): Promise<OfflineScanQueueItem[]> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT * FROM offline_scan_queue WHERE sync_status = 'PENDING_SYNC' ORDER BY scanned_at ASC`,
      args: []
    });

    return res.rows.map(row => ({
      id: String(row.id),
      tokenString: String(row.token_string),
      userId: String(row.user_id),
      hostelId: String(row.hostel_id),
      gateType: String(row.gate_type) as GateType,
      accessStatus: String(row.access_status) as AccessStatus,
      denialReason: row.denial_reason ? String(row.denial_reason) : undefined,
      scannedByPorterId: String(row.scanned_by_porter_id),
      scannedAt: String(row.scanned_at),
      syncStatus: String(row.sync_status) as any,
      retryCount: Number(row.retry_count || 0)
    }));
  }

  /**
   * Validates a dynamic QR token completely OFFLINE using the local cached cryptographic key.
   * Implements PRD Section 7.3: Offline Signature Verification.
   *
   * @param tokenString The scanned dynamic QR token string
   * @param porterId ID of the verifying porter
   * @param gateType 'ENTRY' or 'EXIT'
   * @returns GatePassVerificationResult containing offline verification details and sub-500ms latency
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

  /**
   * Synchronizes queued offline gate scans into the central Turso `gate_access_logs` table (PRD Section 7.4).
   *
   * @param porterId ID of the syncing porter
   * @returns Object with counts of synced and failed items
   */
  public static async syncOfflineQueue(
    porterId: string
  ): Promise<{ syncedCount: number; failedCount: number }> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    const pending = await OfflineSyncService.getPendingScans();
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pending) {
      try {
        const logId = `synced_${item.id}`;
        await client.execute({
          sql: `INSERT INTO gate_access_logs (id, user_id, hostel_id, gate_type, access_status, denial_reason, nonce, scanned_by_porter_id, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          args: [
            logId,
            item.userId,
            item.hostelId,
            item.gateType,
            item.accessStatus,
            item.denialReason ? `[Offline Sync] ${item.denialReason}` : '[Offline Sync Granted]',
            item.scannedByPorterId || porterId,
            item.scannedAt
          ]
        });

        // Mark synced in local queue
        await client.execute({
          sql: `UPDATE offline_scan_queue SET sync_status = 'SYNCED' WHERE id = ?`,
          args: [item.id]
        });

        syncedCount++;
      } catch (err: any) {
        await client.execute({
          sql: `UPDATE offline_scan_queue SET retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
          args: [err.message || 'Sync error', item.id]
        });
        failedCount++;
      }
    }

    return { syncedCount, failedCount };
  }

  /**
   * Cleans up successfully synced offline items to prevent SQLite database bloat.
   */
  public static async purgeSyncedQueue(): Promise<void> {
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `DELETE FROM offline_scan_queue WHERE sync_status = 'SYNCED'`,
      args: []
    });
  }
}
