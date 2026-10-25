import { OfflineSyncService } from '../api/offlineSyncService';
import { GatePassService } from '../api/gatepassService';
import { AuthService } from '../api/authService';

/**
 * Automated Test Suite for Offline Gate Signature Verification & Local SQLite Queue.
 * Implements [OFFLINE-01 / UAT-0041] adhering to PRD Section 7.
 *
 * Verifies local public signing key caching, offline HMAC-SHA256 signature evaluation,
 * local SQLite scan queueing, and background synchronization to Turso central database.
 */
describe('Offline JWT Verification & Local SQLite Queue [OFFLINE-01 / UAT-0041]', () => {
  const studentId = `usr_offline_stud_${Date.now()}`;
  const porterId = `usr_offline_port_${Date.now()}`;
  const testSecret = 'UNILAGSTAY_GATEPASS_HMAC_SECRET_2026_KEY';

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await GatePassService.initializeSchema();
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean up & Seed test student
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Offline Test Student', ?, '08011112222', 'STUDENT', 'MALE', 'hash', 1)`,
      args: [studentId, `MAT_OFF_${Date.now()}`, `offline_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Science', 'Physics', 200, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [studentId]
    });
  });

  test('initializes offline tables: offline_security_keys and offline_scan_queue', async () => {
    await OfflineSyncService.initializeSchema();
    const isValid = await OfflineSyncService.isKeyCacheValid();
    expect(isValid).toBe(true);
  });

  test('caches cryptographic signing key locally with custom TTL and retrieves it', async () => {
    const cached = await OfflineSyncService.cacheSigningKey(
      'CUSTOM_KEY_TEST',
      testSecret,
      'HMAC-SHA256',
      60
    );

    expect(cached.keyId).toBe('CUSTOM_KEY_TEST');
    expect(cached.publicKeyOrSecret).toBe(testSecret);

    const retrieved = await OfflineSyncService.getCachedSigningKey('CUSTOM_KEY_TEST');
    expect(retrieved).toBe(testSecret);
  });

  test('verifies valid dynamic QR token offline using local cached key (PRD 7.3)', async () => {
    const { record, payload } = await GatePassService.generateGatePass(studentId);

    // Verify offline
    const offlineResult = await OfflineSyncService.verifyOfflineToken(
      record.tokenString,
      porterId,
      'ENTRY'
    );

    expect(offlineResult.isValid).toBe(true);
    expect(offlineResult.accessGranted).toBe(true);
    expect(offlineResult.isOffline).toBe(true);
    expect(offlineResult.message).toContain('ACCESS GRANTED (OFFLINE)');
    expect(offlineResult.student?.fullName).toBe('Offline Test Student');
    expect(offlineResult.latencyMs).toBeLessThan(500); // Sub-500ms SLA
  });

  test('rejects tampered dynamic QR token offline and queues denial locally', async () => {
    const offlineResult = await OfflineSyncService.verifyOfflineToken(
      'TAMPERED_OFFLINE_FORGED_TOKEN',
      porterId,
      'ENTRY'
    );

    expect(offlineResult.isValid).toBe(false);
    expect(offlineResult.accessGranted).toBe(false);
    expect(offlineResult.isOffline).toBe(true);
    expect(offlineResult.message).toContain('Access Denied');
  });

  test('tracks pending offline scans count in local SQLite queue (PRD 7.4)', async () => {
    const pendingCount = await OfflineSyncService.getPendingScansCount();
    expect(pendingCount).toBeGreaterThan(0);

    const pendingList = await OfflineSyncService.getPendingScans();
    expect(pendingList.length).toBe(pendingCount);
    expect(pendingList[0].syncStatus).toBe('PENDING_SYNC');
  });

  test('synchronizes pending offline scan queue to central Turso database when connectivity resumes', async () => {
    const { syncedCount, failedCount } = await OfflineSyncService.syncOfflineQueue(porterId);

    expect(syncedCount).toBeGreaterThan(0);
    expect(failedCount).toBe(0);

    // After sync, pending count decreases to 0
    const remainingPending = await OfflineSyncService.getPendingScansCount();
    expect(remainingPending).toBe(0);

    // Clean up synced items
    await OfflineSyncService.purgeSyncedQueue();
  });
});
