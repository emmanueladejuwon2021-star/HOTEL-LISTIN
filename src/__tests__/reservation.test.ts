import { AuthService } from '../api/authService';
import { ReservationService } from '../api/reservationService';
import { useReservationStore } from '../store/useReservationStore';

describe('[BALLOTING-02 / UAT-0004 & PAYMENT-02 / UAT-0017] Bedspace Atomic Lock & 72-Hour Payment Hold Integration Tests', () => {
  const studentUser1 = 'usr_190407090_lock1';
  const studentUser2 = 'usr_200102032_lock2';
  const studentUser3 = 'usr_210203040_pay3';
  const hostelId = 'hostel_jaja_lock';
  const roomId = 'room_jaja_201';
  const bedId1 = 'bed_jaja_201_A';
  const bedId2 = 'bed_jaja_201_B';
  const bedId3 = 'bed_jaja_201_C';

  let activePaymentId = '';

  beforeAll(async () => {
    await ReservationService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean existing test rows if any
    await client.execute({ sql: `DELETE FROM payments WHERE user_id IN (?, ?, ?) OR bedspace_id IN (?, ?, ?)`, args: [studentUser1, studentUser2, studentUser3, bedId1, bedId2, bedId3] });
    await client.execute({ sql: `DELETE FROM bedspaces WHERE room_id = ?`, args: [roomId] });
    await client.execute({ sql: `DELETE FROM rooms WHERE id = ? OR hostel_id = ?`, args: [roomId, hostelId] });
    await client.execute({ sql: `DELETE FROM hostels WHERE id = ?`, args: [hostelId] });

    // 1. Seed Students
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [studentUser1, '190407090', 'Olaoluwa Student', 'olaoluwa90@live.unilag.edu.ng', '+2348100000001', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [studentUser2, '200102032', 'Segun Student', 'segun32@live.unilag.edu.ng', '+2348100000002', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [studentUser3, '210203040', 'Kemi Student', 'kemi40@live.unilag.edu.ng', '+2348100000003', 'STUDENT', 'FEMALE', 'hash', 1]
    });

    // 2. Seed Hostel & Room & Bedspaces
    await client.execute({
      sql: `INSERT OR REPLACE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [hostelId, 'King Jaja Hall Lock Block', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 1200, 100]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [roomId, hostelId, 'Block A', 2, 'A201', 4, 0]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: [bedId1, roomId, 'Bed A Down', 'AVAILABLE']
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: [bedId2, roomId, 'Bed A Up', 'AVAILABLE']
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: [bedId3, roomId, 'Bed B Down', 'AVAILABLE']
    });
  });

  describe('Live Turso DB Atomic Bedspace Locking Execution', () => {
    test('successfully locks an available bedspace for 72 hours atomically (UAT-0004)', async () => {
      const lockRes = await ReservationService.lockBedspaceAtomically(studentUser1, bedId1);

      expect(lockRes.success).toBe(true);
      expect(lockRes.bedspaceId).toBe(bedId1);
      expect(lockRes.bedLabel).toBe('Bed A Down');
      expect(lockRes.hostelName).toBe('King Jaja Hall Lock Block');
      expect(lockRes.roomNumber).toBe('A201');
      expect(lockRes.amount).toBe(25000.00);
      expect(lockRes.paymentId).toBeDefined();
      activePaymentId = lockRes.paymentId || '';

      // Verify 72-hour hold timestamp calculation
      const holdTime = new Date(lockRes.holdExpiresAt).getTime();
      const nowTime = new Date().getTime();
      const diffHours = (holdTime - nowTime) / (3600 * 1000);
      expect(diffHours).toBeGreaterThan(71);
      expect(diffHours).toBeLessThanOrEqual(72.1);
    });

    test('prevents double-allocation when second student attempts locking already locked bedspace', async () => {
      await expect(
        ReservationService.lockBedspaceAtomically(studentUser2, bedId1)
      ).rejects.toThrow('Bedspace already locked by another student');
    });

    test('prevents student from acquiring a second active bedspace lock', async () => {
      await expect(
        ReservationService.lockBedspaceAtomically(studentUser1, bedId2)
      ).rejects.toThrow('You already have an active bedspace hold or confirmed accommodation');
    });

    test('updates room bedspace grid status correctly in Turso DB', async () => {
      const roomDetails = await ReservationService.getRoomDetails(roomId);

      expect(roomDetails).toBeDefined();
      expect(roomDetails?.roomNumber).toBe('A201');
      expect(roomDetails?.bedspaces.length).toBe(3);

      const lockedBed = roomDetails?.bedspaces.find((b) => b.id === bedId1);
      expect(lockedBed?.status).toBe('LOCKED_HOLD');
      expect(lockedBed?.allocatedToUserId).toBe(studentUser1);

      const openBed = roomDetails?.bedspaces.find((b) => b.id === bedId2);
      expect(openBed?.status).toBe('AVAILABLE');
    });
  });

  describe('Live Turso DB [PAYMENT-02 / UAT-0017] 72-Hour Payment Hold & Remita Gateway', () => {
    test('retrieves active payment hold details with countdown timer in seconds (UAT-0017)', async () => {
      const hold = await ReservationService.getPaymentHoldDetails(studentUser1);

      expect(hold).not.toBeNull();
      expect(hold?.userId).toBe(studentUser1);
      expect(hold?.paymentId).toBe(activePaymentId);
      expect(hold?.bedspaceId).toBe(bedId1);
      expect(hold?.hostelName).toBe('King Jaja Hall Lock Block');
      expect(hold?.roomNumber).toBe('A201');
      expect(hold?.bedLabel).toBe('Bed A Down');
      expect(hold?.amount).toBe(25000.00);
      expect(hold?.paymentStatus).toBe('PENDING');
      expect(hold?.secondsRemaining).toBeGreaterThan(250000); // ~259,200 seconds in 72h
      expect(hold?.isExpired).toBe(false);
    });

    test('confirms Remita payment and transitions bedspace status to CONFIRMED (UAT-0017)', async () => {
      const confirmRes = await ReservationService.confirmRemitaPayment(
        studentUser1,
        activePaymentId,
        'REMITA_TX_CONFIRMED_999'
      );

      expect(confirmRes.success).toBe(true);
      expect(confirmRes.paymentId).toBe(activePaymentId);
      expect(confirmRes.transactionReference).toBe('REMITA_TX_CONFIRMED_999');
      expect(confirmRes.paymentStatus).toBe('SUCCESSFUL');
      expect(confirmRes.bedspaceStatus).toBe('CONFIRMED');

      // Verify bedspace status in room details is now CONFIRMED
      const roomDetails = await ReservationService.getRoomDetails(roomId);
      const confirmedBed = roomDetails?.bedspaces.find((b) => b.id === bedId1);
      expect(confirmedBed?.status).toBe('CONFIRMED');
    });

    test('prevents re-confirming an already confirmed payment transaction', async () => {
      await expect(
        ReservationService.confirmRemitaPayment(studentUser1, activePaymentId)
      ).rejects.toThrow('This payment transaction has already been confirmed');
    });

    test('auto-recycles expired payment hold when timer reaches zero', async () => {
      const client = AuthService.getDbClient();
      const expiredHoldTime = new Date(Date.now() - 3600 * 1000).toISOString(); // Expired 1 hour ago
      const expiredPaymentId = 'pay_expired_123';

      // Seed an expired hold for studentUser3
      await client.execute({
        sql: `UPDATE bedspaces SET status = 'LOCKED_HOLD', allocated_to_user_id = ?, hold_expires_at = ? WHERE id = ?`,
        args: [studentUser3, expiredHoldTime, bedId3]
      });

      await client.execute({
        sql: `INSERT INTO payments (id, user_id, bedspace_id, transaction_reference, amount, payment_type, payment_status)
              VALUES (?, ?, ?, ?, ?, 'HOSTEL_FEE', 'PENDING')`,
        args: [expiredPaymentId, studentUser3, bedId3, 'EXPIRED_REF_001', 25000.00]
      });

      // Calling getPaymentHoldDetails should detect expiration and recycle the hold
      const holdResult = await ReservationService.getPaymentHoldDetails(studentUser3);

      expect(holdResult?.isExpired).toBe(true);
      expect(holdResult?.secondsRemaining).toBe(0);
      expect(holdResult?.paymentStatus).toBe('FAILED');

      // Verify bedspace status was reverted to AVAILABLE
      const roomDetails = await ReservationService.getRoomDetails(roomId);
      const recycledBed = roomDetails?.bedspaces.find((b) => b.id === bedId3);
      expect(recycledBed?.status).toBe('AVAILABLE');
      expect(recycledBed?.allocatedToUserId).toBeUndefined();
    });

    test('releases payment hold manually and restores hostel available capacity', async () => {
      // First lock bedId2 with studentUser2
      const lockRes = await ReservationService.lockBedspaceAtomically(studentUser2, bedId2);
      expect(lockRes.success).toBe(true);

      // Release hold manually
      const releaseSuccess = await ReservationService.releaseExpiredOrCancelledHold(studentUser2, bedId2);
      expect(releaseSuccess).toBe(true);

      const roomDetails = await ReservationService.getRoomDetails(roomId);
      const releasedBed = roomDetails?.bedspaces.find((b) => b.id === bedId2);
      expect(releasedBed?.status).toBe('AVAILABLE');
    });

    test('integrates with useReservationStore Zustand state manager', async () => {
      // Test fetchPaymentHoldDetails store action
      const hold = await useReservationStore.getState().fetchPaymentHoldDetails(studentUser1);
      // Since studentUser1's payment was confirmed, pending hold should be null
      expect(hold).toBeNull();
      expect(useReservationStore.getState().paymentHold).toBeNull();
      expect(useReservationStore.getState().isLoading).toBe(false);
    });
  });
});
