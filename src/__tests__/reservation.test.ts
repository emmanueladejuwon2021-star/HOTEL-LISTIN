import { AuthService } from '../api/authService';
import { ReservationService } from '../api/reservationService';

describe('[BALLOTING-02 / UAT-0004] Bedspace Atomic Lock Integration Tests', () => {
  const studentUser1 = 'usr_190407090_lock1';
  const studentUser2 = 'usr_200102032_lock2';
  const hostelId = 'hostel_jaja_lock';
  const roomId = 'room_jaja_201';
  const bedId1 = 'bed_jaja_201_A';
  const bedId2 = 'bed_jaja_201_B';

  beforeAll(async () => {
    await ReservationService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean existing test rows if any
    await client.execute({ sql: `DELETE FROM payments WHERE bedspace_id IN (?, ?)`, args: [bedId1, bedId2] });
    await client.execute({ sql: `DELETE FROM bedspaces WHERE room_id = ?`, args: [roomId] });
    await client.execute({ sql: `DELETE FROM rooms WHERE hostel_id = ?`, args: [hostelId] });
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

    // 2. Seed Hostel & Room & Bedspaces
    await client.execute({
      sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [hostelId, 'King Jaja Hall Lock Block', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 1200, 100]
    });

    await client.execute({
      sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [roomId, hostelId, 'Block A', 2, 'A201', 4, 0]
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: [bedId1, roomId, 'Bed A Down', 'AVAILABLE']
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: [bedId2, roomId, 'Bed A Up', 'AVAILABLE']
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
      expect(roomDetails?.bedspaces.length).toBe(2);

      const lockedBed = roomDetails?.bedspaces.find((b) => b.id === bedId1);
      expect(lockedBed?.status).toBe('LOCKED_HOLD');
      expect(lockedBed?.allocatedToUserId).toBe(studentUser1);

      const openBed = roomDetails?.bedspaces.find((b) => b.id === bedId2);
      expect(openBed?.status).toBe('AVAILABLE');
    });
  });
});
