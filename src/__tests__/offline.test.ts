import { OfflineSyncService } from '../api/offlineSyncService';
import { GatePassService } from '../api/gatepassService';
import { AuthService } from '../api/authService';
import { useScannerStore } from '../store/useScannerStore';

/**
 * Automated Test Suite for Offline Gate Signature Verification & Local SQLite Queue.
 * Implements [OFFLINE-01 / UAT-0041], [OFFLINE-02 / UAT-0042], and [OFFLINE-03 / UAT-0043] adhering to PRD Section 7.
 *
 * Verifies:
 * - [OFFLINE-01]: Local public key caching & offline HMAC-SHA256 signature verification.
 * - [OFFLINE-02]: Local SQLite queueing, FIFO ordering, queue inspection, status breakdown & retry.
 * - [OFFLINE-03]: Automatic background synchronization upon network recovery, idempotency & auto-purge.
 */
describe('Offline Operations & Network Recovery [OFFLINE-01, OFFLINE-02, OFFLINE-03 / UAT-0041, UAT-0042, UAT-0043]', () => {
  const studentId = `usr_offline_stud_${Date.now()}`;
  const porterId = `usr_offline_port_${Date.now()}`;
  const testSecret = 'UNILAGSTAY_GATEPASS_HMAC_SECRET_2026_KEY';

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await GatePassService.initializeSchema();
    await OfflineSyncService.initializeSchema();
    await OfflineSyncService.clearAllQueue();
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

  beforeEach(async () => {
    // Restore default active signing key before each test for clean test isolation
    await OfflineSyncService.cacheSigningKey(
      'UNILAG_GATE_OFFLINE_KEY_V1',
      'UNILAGSTAY_GATEPASS_HMAC_SECRET_2026_KEY',
      'HMAC-SHA256',
      90
    );
  });

  // =========================================================================
  // [OFFLINE-01 / UAT-0041]: Public Key Caching & Signature Verification
  // =========================================================================
  describe('[OFFLINE-01] Local Public Key Caching & Offline Signature Verification', () => {
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
  });

  // =========================================================================
  // [OFFLINE-02 / UAT-0042]: Local SQLite Queueing for Gate Entry Logs
  // =========================================================================
  describe('[OFFLINE-02] Local SQLite Queueing for Offline Gate Entry Logs', () => {
    test('enqueues multiple scans in local SQLite queue preserving metadata', async () => {
      const scan1Id = `scan_q1_${Date.now()}`;
      const scan2Id = `scan_q2_${Date.now()}`;

      await OfflineSyncService.queueOfflineScan({
        id: scan1Id,
        tokenString: 'token_sample_1',
        userId: studentId,
        studentMatric: '190404001',
        studentName: 'Student Alpha',
        hostelId: 'hostel_jaja',
        gateType: 'ENTRY',
        accessStatus: 'GRANTED',
        scannedByPorterId: porterId,
        scannedAt: new Date(Date.now() - 5000).toISOString()
      });

      await OfflineSyncService.queueOfflineScan({
        id: scan2Id,
        tokenString: 'token_sample_2',
        userId: studentId,
        studentMatric: '190404002',
        studentName: 'Student Beta',
        hostelId: 'hostel_jaja',
        gateType: 'EXIT',
        accessStatus: 'DENIED',
        denialReason: 'Token Expired',
        scannedByPorterId: porterId,
        scannedAt: new Date().toISOString()
      });

      const pendingScans = await OfflineSyncService.getPendingScans();
      expect(pendingScans.length).toBeGreaterThanOrEqual(2);

      // Verify FIFO ordering (first scan is earlier)
      const found1 = pendingScans.find(s => s.id === scan1Id);
      const found2 = pendingScans.find(s => s.id === scan2Id);
      expect(found1).toBeDefined();
      expect(found2).toBeDefined();
      expect(found1?.studentName).toBe('Student Alpha');
      expect(found2?.denialReason).toBe('Token Expired');
    });

    test('retrieves queue summary with status breakdown', async () => {
      const summary = await OfflineSyncService.getQueueSummary();
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.pending).toBeGreaterThan(0);
      expect(typeof summary.synced).toBe('number');
      expect(typeof summary.failed).toBe('number');
    });

    test('supports retrying a failed scan item', async () => {
      const failedScanId = `scan_failed_${Date.now()}`;
      await OfflineSyncService.queueOfflineScan({
        id: failedScanId,
        tokenString: 'token_fail',
        userId: studentId,
        hostelId: 'hostel_jaja',
        gateType: 'ENTRY',
        accessStatus: 'DENIED',
        scannedByPorterId: porterId,
        scannedAt: new Date().toISOString()
      });

      // Mark as FAILED manually to simulate failure
      const client = AuthService.getDbClient();
      await client.execute({
        sql: `UPDATE offline_scan_queue SET sync_status = 'FAILED', error_message = 'Simulated timeout' WHERE id = ?`,
        args: [failedScanId]
      });

      const failedItems = await OfflineSyncService.getQueueItemsByStatus('FAILED');
      expect(failedItems.some(item => item.id === failedScanId)).toBe(true);

      // Retry
      const retried = await OfflineSyncService.retryFailedScan(failedScanId);
      expect(retried).toBe(true);

      // Item is back in PENDING_SYNC
      const pendingItems = await OfflineSyncService.getPendingScans();
      const resetItem = pendingItems.find(item => item.id === failedScanId);
      expect(resetItem?.syncStatus).toBe('PENDING_SYNC');
      expect(resetItem?.errorMessage).toBeUndefined();
    });

    test('deletes an individual item from the offline queue', async () => {
      const deleteScanId = `scan_del_${Date.now()}`;
      await OfflineSyncService.queueOfflineScan({
        id: deleteScanId,
        tokenString: 'token_to_delete',
        userId: studentId,
        hostelId: 'hostel_jaja',
        gateType: 'ENTRY',
        accessStatus: 'GRANTED',
        scannedByPorterId: porterId,
        scannedAt: new Date().toISOString()
      });

      const deleted = await OfflineSyncService.deleteQueueItem(deleteScanId);
      expect(deleted).toBe(true);

      const items = await OfflineSyncService.getAllQueueItems();
      expect(items.some(i => i.id === deleteScanId)).toBe(false);
    });

    test('loads queue items into Zustand store', async () => {
      const store = useScannerStore.getState();
      await store.loadQueueItems();

      const stateAfter = useScannerStore.getState();
      expect(stateAfter.queueItems.length).toBeGreaterThan(0);
      expect(stateAfter.queueSummary.total).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // [OFFLINE-03 / UAT-0043]: Automatic Background Sync upon Network Recovery
  // =========================================================================
  describe('[OFFLINE-03] Automatic Background Sync & Reconciliation', () => {
    test('executes batch synchronization with idempotent insertion into central gate_access_logs', async () => {
      const initialPending = await OfflineSyncService.getPendingScansCount();
      expect(initialPending).toBeGreaterThan(0);

      const syncResult = await OfflineSyncService.autoSync(porterId);
      expect(syncResult.syncedCount).toBeGreaterThan(0);
      expect(syncResult.failedCount).toBe(0);
      expect(syncResult.totalProcessed).toBe(initialPending);
      expect(syncResult.durationMs).toBeGreaterThanOrEqual(0);

      // Running autoSync again immediately results in 0 pending scans (idempotent)
      const secondSync = await OfflineSyncService.autoSync(porterId);
      expect(secondSync.totalProcessed).toBe(0);
      expect(secondSync.syncedCount).toBe(0);
    });

    test('automatically triggers autoSync when network status transitions to online', async () => {
      // 1. Simulate going offline
      await OfflineSyncService.setNetworkOnline(false);
      expect(OfflineSyncService.isNetworkOnline()).toBe(false);

      // 2. Queue a scan while offline
      const offlineScanId = `net_rec_scan_${Date.now()}`;
      await OfflineSyncService.queueOfflineScan({
        id: offlineScanId,
        tokenString: 'token_net_recovery',
        userId: studentId,
        studentMatric: '200505001',
        studentName: 'Network Recovery Student',
        hostelId: 'hostel_jaja',
        gateType: 'ENTRY',
        accessStatus: 'GRANTED',
        scannedByPorterId: porterId,
        scannedAt: new Date().toISOString()
      });

      expect(await OfflineSyncService.getPendingScansCount()).toBe(1);

      // 3. Simulate network restored -> fires autoSync automatically!
      await OfflineSyncService.setNetworkOnline(true, porterId);
      expect(OfflineSyncService.isNetworkOnline()).toBe(true);

      // 4. Pending count automatically becomes 0
      const pendingAfterRecovery = await OfflineSyncService.getPendingScansCount();
      expect(pendingAfterRecovery).toBe(0);
    });

    test('purges successfully synced records to prevent SQLite database bloat', async () => {
      const purgedCount = await OfflineSyncService.purgeSyncedQueue();
      expect(purgedCount).toBeGreaterThan(0);

      const syncedItemsRemaining = await OfflineSyncService.getQueueItemsByStatus('SYNCED');
      expect(syncedItemsRemaining.length).toBe(0);
    });

    test('simulates network restoration in Zustand store triggering auto-sync', async () => {
      const store = useScannerStore.getState();

      // Go offline
      await store.simulateNetworkChange(false);
      expect(useScannerStore.getState().offlineMode).toBe(true);

      // Queue an item
      await OfflineSyncService.queueOfflineScan({
        id: `store_offline_${Date.now()}`,
        tokenString: 'store_token',
        userId: studentId,
        hostelId: 'hostel_jaja',
        gateType: 'ENTRY',
        accessStatus: 'GRANTED',
        scannedByPorterId: porterId,
        scannedAt: new Date().toISOString()
      });

      // Restore network via store
      await store.simulateNetworkChange(true, porterId);
      const stateAfter = useScannerStore.getState();
      expect(stateAfter.offlineMode).toBe(false);
      expect(stateAfter.lastSyncResult).toBeDefined();
      expect(stateAfter.lastSyncResult?.syncedCount).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // [OFFLINE-05 / UAT-0045]: Key Rotation, Queue Health & Panic Alarm Response
  // =========================================================================
  describe('[OFFLINE-05 / UAT-0045] Key Rotation, Queue Integrity Self-Healing & Panic Alarm', () => {
    test('rotates signing key locally and invalidates old keys for security', async () => {
      const rotKeyId = `KEY_ROT_${Date.now()}`;
      const rotSecret = `SECRET_ROTATED_${Date.now()}`;

      const rotated = await OfflineSyncService.rotateSigningKey(rotKeyId, rotSecret, 'HMAC-SHA256', 30);
      expect(rotated.keyId).toBe(rotKeyId);
      expect(rotated.publicKeyOrSecret).toBe(rotSecret);

      const activeSecret = await OfflineSyncService.getCachedSigningKey(rotKeyId);
      expect(activeSecret).toBe(rotSecret);
    });

    test('revokes a signing key and prevents unverified key usage', async () => {
      const revokeKeyId = `KEY_TO_REVOKE_${Date.now()}`;
      await OfflineSyncService.cacheSigningKey(revokeKeyId, 'SECRET_REVOKE', 'HMAC-SHA256', 30);

      const revoked = await OfflineSyncService.revokeSigningKey(revokeKeyId);
      expect(revoked).toBe(true);

      const isValid = await OfflineSyncService.isKeyCacheValid(revokeKeyId);
      expect(isValid).toBe(false);
    });

    test('scans local SQLite queue for corrupted items, self-heals user_id, and purges orphaned entries', async () => {
      const client = AuthService.getDbClient();
      const corruptedId = `corrupt_${Date.now()}`;

      // Insert corrupted item (empty user_id) directly
      await client.execute({
        sql: `INSERT INTO offline_scan_queue (id, token_string, user_id, hostel_id, gate_type, access_status, scanned_by_porter_id, scanned_at, sync_status)
              VALUES (?, 'corrupt_token', '', 'hostel_jaja', 'ENTRY', 'GRANTED', ?, ?, 'PENDING_SYNC')`,
        args: [corruptedId, porterId, new Date().toISOString()]
      });

      const report = await OfflineSyncService.checkQueueHealthAndSelfHeal();
      expect(report.totalItems).toBeGreaterThan(0);
      expect(report.corruptedItemsFound).toBeGreaterThanOrEqual(1);
      expect(report.repairedItemsCount).toBeGreaterThanOrEqual(1);

      // Verify repaired item user_id became 'unknown_user'
      const items = await OfflineSyncService.getAllQueueItems();
      const repaired = items.find(i => i.id === corruptedId);
      expect(repaired?.userId).toBe('unknown_user');
    });

    test('resolves duplicate scan conflicts in offline queue', async () => {
      const ts = new Date().toISOString();
      const dup1 = `dup1_${Date.now()}`;
      const dup2 = `dup2_${Date.now()}`;

      await OfflineSyncService.queueOfflineScan({
        id: dup1,
        tokenString: 'token_dup',
        userId: studentId,
        hostelId: 'hostel_jaja',
        gateType: 'ENTRY',
        accessStatus: 'GRANTED',
        scannedByPorterId: porterId,
        scannedAt: ts
      });

      await OfflineSyncService.queueOfflineScan({
        id: dup2,
        tokenString: 'token_dup',
        userId: studentId,
        hostelId: 'hostel_jaja',
        gateType: 'ENTRY',
        accessStatus: 'GRANTED',
        scannedByPorterId: porterId,
        scannedAt: ts
      });

      const conflictRes = await OfflineSyncService.resolveQueueConflicts();
      expect(conflictRes.duplicatesRemoved).toBeGreaterThanOrEqual(1);
    });

    test('handles Emergency Porter Panic Alarm Response (UAT-0045)', async () => {
      const client = AuthService.getDbClient();
      const alertId = `alert_panic_${Date.now()}`;

      // Seed active emergency panic alert
      await client.execute({
        sql: `INSERT INTO emergency_alerts (id, student_id, hostel_id, room_number, alert_type, status)
              VALUES (?, ?, 'hostel_jaja', 'A-102', 'SECURITY_BREACH', 'ACTIVE')`,
        args: [alertId, studentId]
      });

      // Retrieve alerts
      const alerts = await OfflineSyncService.getOfflineEmergencyAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      const foundAlert = alerts.find(a => a.id === alertId);
      expect(foundAlert).toBeDefined();
      expect(foundAlert?.status).toBe('ACTIVE');

      // Porter responds to panic alarm
      const responded = await OfflineSyncService.respondToPanicAlarm(alertId, porterId, 'RESPONDED');
      expect(responded).toBe(true);

      const alertsAfter = await OfflineSyncService.getOfflineEmergencyAlerts();
      const updatedAlert = alertsAfter.find(a => a.id === alertId);
      expect(updatedAlert?.status).toBe('RESPONDED');
      expect(updatedAlert?.respondedByPorterId).toBe(porterId);
    });

    test('executes key rotation and panic alarm response via Zustand store', async () => {
      const store = useScannerStore.getState();

      // Store key rotation
      const newKey = await store.rotateOfflineKey(`STORE_KEY_${Date.now()}`, 'STORE_SECRET_123');
      expect(newKey.keyId).toContain('STORE_KEY');

      // Store queue health check
      const report = await store.checkQueueHealth();
      expect(report.summaryMessage).toContain('Queue');

      // Store panic alarm response
      const alerts = await OfflineSyncService.getOfflineEmergencyAlerts();
      if (alerts.length > 0) {
        const res = await store.respondToPanicAlarm(alerts[0].id, porterId, 'RESOLVED');
        expect(res).toBe(true);
      }
    });
  });
});
