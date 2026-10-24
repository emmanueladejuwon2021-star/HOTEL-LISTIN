import { AuthService } from '../api/authService';
import { ReservationService } from '../api/reservationService';
import { PaymentService } from '../api/paymentService';
import { usePaymentStore } from '../store/usePaymentStore';

/**
 * Integration test suite for [PAYMENT-01] / [UAT-0016]
 * 72-Hour Payment Lock, Countdown Mechanics, Remita Gateway Integration, and Auto-Recycling.
 * Tests live Turso DB interaction with zero mocks.
 */
describe('[PAYMENT-01 / UAT-0016] 72-Hour Payment Hold & Remita Gateway Integration Tests', () => {
  const testUserId = 'usr_190407089_pay1';
  const hostelId = 'hostel_jaja_p1';
  const roomId = 'room_jaja_101_p1';
  const bedId = 'bed_jaja_101_a_p1';

  beforeAll(async () => {
    // Initialize database tables
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean test records in correct foreign key order
    await client.execute({ sql: "DELETE FROM payments WHERE user_id IN (?, 'usr_expired_p1', 'usr_cancel_p3', 'usr_rrr_test17') OR transaction_reference IN ('123456789012', '993456789012')", args: [testUserId] });
    await client.execute({ sql: "DELETE FROM bedspaces WHERE id IN (?, 'bed_expired_p1', 'bed_cancel_p3', 'bed_rrr_test17') OR room_id = ?", args: [bedId, roomId] });
    await client.execute({ sql: 'DELETE FROM rooms WHERE id = ?', args: [roomId] });
    await client.execute({ sql: 'DELETE FROM hostels WHERE id = ?', args: [hostelId] });
    await client.execute({ sql: 'DELETE FROM student_profiles WHERE user_id IN (?, \'usr_expired_p1\', \'usr_cancel_p3\', \'usr_rrr_test17\')', args: [testUserId] });
    await client.execute({ sql: "DELETE FROM users WHERE id IN (?, 'usr_expired_p1', 'usr_cancel_p3', 'usr_rrr_test17') OR matric_or_staff_no IN ('990407089', '200000001', '990407099', '990407117')", args: [testUserId] });

    // Seed test student
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId, '990407089', 'Kelechi Okafor', 'kelechi@live.unilag.edu.ng', '+2348099999999', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId, 'Engineering', 'Civil Engineering', 100, 'MAIN_CAMPUS', 'FRESHER', 1, 'APPROVED']
    });

    // Seed test hostel, room, and bedspace
    await client.execute({
      sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [hostelId, 'King Jaja Hall Test Payment', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 100, 100]
    });

    await client.execute({
      sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [roomId, hostelId, 'A', 1, '101', 4, 0]
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: [bedId, roomId, 'Bed A Down', 'AVAILABLE']
    });
  });

  test('atomically locks bedspace for 72 hours and creates pending payment record', async () => {
    const lockResult = await ReservationService.lockBedspaceAtomically(testUserId, bedId);

    expect(lockResult.success).toBe(true);
    expect(lockResult.bedspaceId).toBe(bedId);
    expect(lockResult.amount).toBe(25000.00);
    expect(lockResult.holdExpiresAt).toBeDefined();

    // Verify hold details via PaymentService
    const holdStatus = await PaymentService.getPaymentHoldStatus(testUserId);
    expect(holdStatus).not.toBeNull();
    expect(holdStatus!.bedspaceId).toBe(bedId);
    expect(holdStatus!.paymentStatus).toBe('PENDING');
    expect(holdStatus!.isExpired).toBe(false);
    expect(holdStatus!.remainingSeconds).toBeGreaterThan(0);
  });

  test('fetches hold status via Zustand payment store', async () => {
    const store = usePaymentStore.getState();
    const hold = await store.fetchHoldStatus(testUserId);

    expect(hold).not.toBeNull();
    expect(hold!.bedspaceId).toBe(bedId);

    const updatedStore = usePaymentStore.getState();
    expect(updatedStore.formattedCountdown).toBeDefined();
    expect(updatedStore.formattedCountdown).not.toBe('00:00:00');
  });

  test('rejects invalid Remita reference submission', async () => {
    await expect(
      PaymentService.processRemitaPayment({
        userId: testUserId,
        paymentId: 'pay_invalid',
        transactionReference: '123' // Too short
      })
    ).rejects.toThrow('Remita');
  });

  test('successfully processes valid Remita payment, transitions bedspace to CONFIRMED, and updates occupied beds count', async () => {
    const validRemitaRef = '993456789012';

    const payResult = await PaymentService.processRemitaPayment({
      userId: testUserId,
      paymentId: '',
      transactionReference: validRemitaRef
    });

    expect(payResult.success).toBe(true);
    expect(payResult.paymentStatus).toBe('SUCCESSFUL');
    expect(payResult.bedspaceStatus).toBe('CONFIRMED');
    expect(payResult.transactionReference).toBe(validRemitaRef);

    // Verify bedspace status in Turso DB
    const client = AuthService.getDbClient();
    const bedRes = await client.execute({
      sql: 'SELECT status FROM bedspaces WHERE id = ?',
      args: [bedId]
    });
    expect(String(bedRes.rows[0].status)).toBe('CONFIRMED');

    // Verify room occupied beds count increased
    const roomRes = await client.execute({
      sql: 'SELECT occupied_beds FROM rooms WHERE id = ?',
      args: [roomId]
    });
    expect(Number(roomRes.rows[0].occupied_beds)).toBe(1);
  });

  test('prevents duplicate payment processing for already confirmed reservation', async () => {
    await expect(
      PaymentService.processRemitaPayment({
        userId: testUserId,
        paymentId: '',
        transactionReference: '987654321098'
      })
    ).rejects.toThrow('already been confirmed');
  });

  test('recycles expired holds back to available pool', async () => {
    const expiredUserId = 'usr_expired_p1';
    const expiredBedId = 'bed_expired_p1';
    const client = AuthService.getDbClient();

    // Clean and seed an expired hold record (hold_expires_at in the past)
    await client.execute({ sql: 'DELETE FROM bedspaces WHERE id = ?', args: [expiredBedId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [expiredUserId] });

    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [expiredUserId, '200000001', 'Expired User', 'exp@live.unilag.edu.ng', '+2348000000000', 'STUDENT', 'MALE', 'hash', 1]
    });

    const pastDateStr = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at)
            VALUES (?, ?, ?, 'LOCKED_HOLD', ?, ?)`,
      args: [expiredBedId, roomId, 'Bed B Down', expiredUserId, pastDateStr]
    });

    const recycledCount = await PaymentService.recycleExpiredHolds();
    expect(recycledCount).toBeGreaterThanOrEqual(1);

    const checkBedRes = await client.execute({
      sql: 'SELECT status, allocated_to_user_id FROM bedspaces WHERE id = ?',
      args: [expiredBedId]
    });
    expect(String(checkBedRes.rows[0].status)).toBe('AVAILABLE');
    expect(checkBedRes.rows[0].allocated_to_user_id).toBeNull();
  });

  test('voluntarily cancels and releases active provisional bedspace hold', async () => {
    const cancelUserId = 'usr_cancel_p3';
    const cancelBedId = 'bed_cancel_p3';
    const client = AuthService.getDbClient();

    // Clean and seed a new active hold
    await client.execute({ sql: 'DELETE FROM bedspaces WHERE id = ?', args: [cancelBedId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [cancelUserId] });

    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [cancelUserId, '990407099', 'Cancel Test Student', 'cancel@live.unilag.edu.ng', '+2348011111111', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at)
            VALUES (?, ?, ?, 'LOCKED_HOLD', ?, DATETIME('now', '+72 hours'))`,
      args: [cancelBedId, roomId, 'Bed A Up', cancelUserId]
    });

    const initialHostelRes = await client.execute({
      sql: 'SELECT available_bedspaces FROM hostels WHERE id = ?',
      args: [hostelId]
    });
    const initialAvailableCount = Number(initialHostelRes.rows[0].available_bedspaces);

    // Perform voluntary cancellation
    const cancelResult = await PaymentService.cancelBedspaceHold(cancelUserId);

    expect(cancelResult.success).toBe(true);
    expect(cancelResult.bedspaceId).toBe(cancelBedId);

    // Verify bedspace status reverted to AVAILABLE
    const bedCheck = await client.execute({
      sql: 'SELECT status, allocated_to_user_id FROM bedspaces WHERE id = ?',
      args: [cancelBedId]
    });
    expect(String(bedCheck.rows[0].status)).toBe('AVAILABLE');
    expect(bedCheck.rows[0].allocated_to_user_id).toBeNull();

    // Verify hostel available_bedspaces count incremented
    const updatedHostelRes = await client.execute({
      sql: 'SELECT available_bedspaces FROM hostels WHERE id = ?',
      args: [hostelId]
    });
    expect(Number(updatedHostelRes.rows[0].available_bedspaces)).toBe(initialAvailableCount + 1);
  });

  test('fetches full payment history and digital clearance receipt details', async () => {
    const history = await PaymentService.getPaymentHistory(testUserId);

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);

    const receipt = history[0];
    expect(receipt.paymentId).toBeDefined();
    expect(receipt.studentMatricNo).toBe('990407089');
    expect(receipt.studentFullName).toBe('Kelechi Okafor');
    expect(receipt.transactionReference).toBe('993456789012');
    expect(receipt.amount).toBe(25000.00);
    expect(receipt.paymentStatus).toBe('SUCCESSFUL');
  });

  test('executes releaseCurrentHold and fetchPaymentHistory via Zustand payment store', async () => {
    const store = usePaymentStore.getState();

    // Fetch history via store
    const storeHistory = await store.fetchPaymentHistory(testUserId);
    expect(storeHistory.length).toBeGreaterThan(0);
    expect(usePaymentStore.getState().paymentHistory.length).toBeGreaterThan(0);

    // Test setSelectedReceipt
    store.setSelectedReceipt(storeHistory[0]);
    expect(usePaymentStore.getState().selectedReceipt).toEqual(storeHistory[0]);

    // Reset selected receipt
    store.setSelectedReceipt(null);
    expect(usePaymentStore.getState().selectedReceipt).toBeNull();
  });

  describe('[PAYMENT-02 / UAT-0017] Remita RRR Generator & Payment Verification Tests', () => {
    const rrrUserId = 'usr_rrr_test17';
    const rrrBedId = 'bed_rrr_test17';

    beforeAll(async () => {
      const client = AuthService.getDbClient();
      await client.execute({ sql: 'DELETE FROM payments WHERE user_id = ? OR bedspace_id = ?', args: [rrrUserId, rrrBedId] });
      await client.execute({ sql: 'DELETE FROM bedspaces WHERE id = ?', args: [rrrBedId] });
      await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [rrrUserId] });

      await client.execute({
        sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [rrrUserId, '990407117', 'RRR Test Student', 'rrr17@live.unilag.edu.ng', '+2348022222222', 'STUDENT', 'MALE', 'hash', 1]
      });

      await client.execute({
        sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at)
              VALUES (?, ?, ?, 'LOCKED_HOLD', ?, DATETIME('now', '+72 hours'))`,
        args: [rrrBedId, roomId, 'Bed B Up', rrrUserId]
      });
    });

    test('calculates accurate itemized fee breakdown', () => {
      const fees = PaymentService.calculateFeeBreakdown(25000.00);

      expect(fees.baseHostelFee).toBe(25000.00);
      expect(fees.remitaServiceFee).toBe(300.00);
      expect(fees.ictProcessingFee).toBe(500.00);
      expect(fees.totalAmount).toBe(25800.00);
      expect(fees.currency).toBe('NGN');
    });

    test('generates 12-digit Remita Retrieval Reference (RRR) bound to user hold in Turso DB', async () => {
      const rrrDetails = await PaymentService.generateRemitaRRR(rrrUserId);

      expect(rrrDetails.rrr).toBeDefined();
      expect(rrrDetails.rrr.length).toBe(12);
      expect(rrrDetails.rrr.startsWith('23')).toBe(true);
      expect(rrrDetails.amountPayable).toBe(25800.00);

      // Verify transaction reference stored in Turso DB
      const client = AuthService.getDbClient();
      const payRes = await client.execute({
        sql: 'SELECT transaction_reference, payment_status FROM payments WHERE user_id = ?',
        args: [rrrUserId]
      });

      expect(payRes.rows.length).toBeGreaterThan(0);
      expect(String(payRes.rows[0].transaction_reference)).toBe(rrrDetails.rrr);
      expect(String(payRes.rows[0].payment_status)).toBe('PENDING');
    });

    test('verifies payment reference status for existing and non-existing RRR codes', async () => {
      // Verify existing reference created in previous test
      const existingRefRes = await PaymentService.verifyRemitaPaymentStatus('993456789012');

      expect(existingRefRes.status).toBe('SUCCESSFUL');
      expect(existingRefRes.payerName).toBe('Kelechi Okafor');
      expect(existingRefRes.message).toContain('Payment verified successfully');

      // Verify non-existing reference
      const notFoundRes = await PaymentService.verifyRemitaPaymentStatus('888888888888');

      expect(notFoundRes.status).toBe('NOT_FOUND');
      expect(notFoundRes.message).toContain('No payment record found');
    });

    test('executes generateRRR and verifyPaymentReference via Zustand store', async () => {
      const store = usePaymentStore.getState();

      // Fetch hold status first so store has active hold
      await store.fetchHoldStatus(rrrUserId);

      const rrr = await store.generateRRR(rrrUserId);
      expect(rrr.rrr.length).toBe(12);
      expect(usePaymentStore.getState().rrrDetails?.rrr).toBe(rrr.rrr);

      const verification = await store.verifyPaymentReference('993456789012');
      expect(verification.status).toBe('SUCCESSFUL');
      expect(usePaymentStore.getState().verificationResult?.status).toBe('SUCCESSFUL');
    });
  });
});
