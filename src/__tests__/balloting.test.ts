import { AuthService } from '../api/authService';
import { BallotingService } from '../api/ballotingService';
import { useBallotingStore } from '../store/useBallotingStore';

describe('[BALLOTING-01 / UAT-0011] Real-Time Priority Quota Balloting Engine & Queue Token Tests', () => {
  const testUserId1 = 'usr_1001_queue_student1';
  const testUserId2 = 'usr_1002_queue_student2';

  beforeAll(async () => {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean test queue tokens and users
    await client.execute({ sql: 'DELETE FROM balloting_queue_tokens WHERE user_id IN (?, ?)', args: [testUserId1, testUserId2] });
    await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?)', args: [testUserId1, testUserId2] });

    // Seed test users
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId1, '190407111', 'Queue Student One', 'q1@live.unilag.edu.ng', '+2348011110000', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId2, '190407222', 'Queue Student Two', 'q2@live.unilag.edu.ng', '+2348022220000', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, course_registered, medical_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId2, 'Faculty of Engineering', 'Civil Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 1, 'CLEARED']
    });

    // 1. Seed Balloting Windows in Turso DB
    const now = new Date();
    const futureStart = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1 hour in future
    const futureEnd = new Date(now.getTime() + 7200 * 1000).toISOString();   // 2 hours in future

    await client.execute({
      sql: `INSERT OR REPLACE INTO balloting_windows (id, priority_category, title, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['win_fresher_01', 'FRESHER', '100L Undergraduate Balloting Window', futureStart, futureEnd, 'UPCOMING']
    });

    const activeStart = new Date(now.getTime() - 1800 * 1000).toISOString(); // Started 30 mins ago
    const activeEnd = new Date(now.getTime() + 1800 * 1000).toISOString();   // Ends in 30 mins

    await client.execute({
      sql: `INSERT OR REPLACE INTO balloting_windows (id, priority_category, title, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['win_finalist_01', 'FINALIST', 'Finalist Graduating Balloting Window', activeStart, activeEnd, 'ACTIVE']
    });

    // 2. Seed Hostel Quotas in Turso DB
    await client.execute({
      sql: `INSERT OR REPLACE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['h_jaja', 'King Jaja Hall', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 1200, 450]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['h_moremi', 'Moremi Hall', 'FEMALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 1400, 300]
    });

    // 3. Seed Rooms & Bedspaces in Turso DB for Balloting Component 2 Testing (UAT-0012)
    await client.execute({ sql: 'DELETE FROM bedspaces WHERE room_id = ?', args: ['room_jaja_balloting_201'] });
    await client.execute({ sql: 'DELETE FROM rooms WHERE id = ?', args: ['room_jaja_balloting_201'] });

    await client.execute({
      sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['room_jaja_balloting_201', 'h_jaja', 'A', 2, '201', 4, 1]
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: ['bed_jaja_201_a_down', 'room_jaja_balloting_201', 'Bed A Down', 'AVAILABLE']
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: ['bed_jaja_201_a_up', 'room_jaja_balloting_201', 'Bed A Up', 'CONFIRMED']
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: ['bed_jaja_201_b_down', 'room_jaja_balloting_201', 'Bed B Down', 'AVAILABLE']
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
            VALUES (?, ?, ?, ?)`,
      args: ['bed_jaja_201_b_up', 'room_jaja_balloting_201', 'Bed B Up', 'AVAILABLE']
    });
  });

  describe('Turso DB Balloting Window & Quota Execution', () => {
    test('fetches upcoming balloting window for FRESHER priority category', async () => {
      const window = await BallotingService.getBallotingWindowForCategory('FRESHER');

      expect(window).toBeDefined();
      expect(window?.id).toBe('win_fresher_01');
      expect(window?.category).toBe('FRESHER');
      expect(window?.title).toContain('100L Undergraduate');
    });

    test('fetches live hostel quota summaries directly from Turso DB', async () => {
      const quotas = await BallotingService.getHostelQuotas();

      expect(quotas.length).toBeGreaterThanOrEqual(2);
      const jaja = quotas.find((q) => q.hostelId === 'h_jaja');
      expect(jaja).toBeDefined();
      expect(jaja?.totalCapacity).toBe(1200);
      expect(jaja?.availableBedspaces).toBe(450);
      expect(jaja?.allocatedBedspaces).toBe(750);
    });

    test('issues real-time priority queue token and calculates sequential position (UAT-0011)', async () => {
      const token1 = await BallotingService.issueQueueToken(testUserId1, 'FRESHER');
      expect(token1).toBeDefined();
      expect(token1.positionInQueue).toBe(1);
      expect(token1.priorityCategory).toBe('FRESHER');

      const token2 = await BallotingService.issueQueueToken(testUserId2, 'FRESHER');
      expect(token2).toBeDefined();
      expect(token2.positionInQueue).toBe(2);

      // Re-issuing for same student returns existing token
      const token1Retry = await BallotingService.issueQueueToken(testUserId1, 'FRESHER');
      expect(token1Retry.tokenId).toBe(token1.tokenId);
      expect(token1Retry.positionInQueue).toBe(1);
    });

    test('attaches queue token to countdown state when userId is passed', async () => {
      const state = await BallotingService.getCountdownState('FRESHER', testUserId1);

      expect(state.queueToken).toBeDefined();
      expect(state.queueToken?.positionInQueue).toBe(1);
      expect(state.totalQueuedUsers).toBeGreaterThanOrEqual(2);
    });

    test('issues queue token via Zustand store action', async () => {
      const store = useBallotingStore.getState();
      const token = await store.issueQueueTicket(testUserId1, 'FRESHER');

      expect(token.positionInQueue).toBe(1);

      const updatedState = useBallotingStore.getState().countdownState;
      expect(updatedState?.queueToken).toBeDefined();
      expect(updatedState?.queueToken?.positionInQueue).toBe(1);
    });

    test('evaluates upcoming countdown state when window has not started yet', async () => {
      const state = await BallotingService.getCountdownState('FRESHER');

      expect(state.currentWindow).toBeDefined();
      expect(state.isWindowActive).toBe(false);
      expect(state.timeRemainingSeconds).toBeGreaterThan(0);
      expect(state.timeRemainingSeconds).toBeLessThanOrEqual(3600);
      expect(state.quotas.length).toBeGreaterThan(0);
    });

    test('evaluates active countdown state when window is currently active', async () => {
      const state = await BallotingService.getCountdownState('FINALIST');

      expect(state.currentWindow).toBeDefined();
      expect(state.isWindowActive).toBe(true);
      expect(state.timeRemainingSeconds).toBeGreaterThan(0);
      expect(state.timeRemainingSeconds).toBeLessThanOrEqual(1800);
    });

    test('handles priority category with no balloting window scheduled gracefully', async () => {
      const state = await BallotingService.getCountdownState('SCHOLAR');

      expect(state.currentWindow).toBeNull();
      expect(state.isWindowActive).toBe(false);
      expect(state.timeRemainingSeconds).toBe(0);
      expect(state.quotas.length).toBeGreaterThan(0);
    });
  });

  describe('[BALLOTING-02 / UAT-0012] Filtered Hostels, Room Layouts & Active Window Verification', () => {
    test('queries hostels filtered by MALE gender and MAIN_CAMPUS location', async () => {
      const hostels = await BallotingService.getFilteredHostels({
        gender: 'MALE',
        campus: 'MAIN_CAMPUS'
      });

      expect(hostels).toBeDefined();
      expect(hostels.length).toBeGreaterThanOrEqual(1);

      const jaja = hostels.find((h) => h.hostelId === 'h_jaja');
      expect(jaja).toBeDefined();
      expect(jaja?.gender).toBe('MALE');
      expect(jaja?.campus).toBe('MAIN_CAMPUS');

      const moremi = hostels.find((h) => h.hostelId === 'h_moremi');
      expect(moremi).toBeUndefined(); // Moremi is female
    });

    test('queries hostels filtered by FEMALE gender', async () => {
      const hostels = await BallotingService.getFilteredHostels({
        gender: 'FEMALE'
      });

      const moremi = hostels.find((h) => h.hostelId === 'h_moremi');
      expect(moremi).toBeDefined();
      expect(moremi?.gender).toBe('FEMALE');
    });

    test('retrieves rooms and interactive bedspace statuses for selected hostel (UAT-0012)', async () => {
      const rooms = await BallotingService.getRoomsForHostel('h_jaja', 'A', 2);

      expect(rooms).toBeDefined();
      expect(rooms.length).toBeGreaterThanOrEqual(1);

      const room201 = rooms.find((r) => r.id === 'room_jaja_balloting_201');
      expect(room201).toBeDefined();
      expect(room201?.blockName).toBe('A');
      expect(room201?.floorNumber).toBe(2);
      expect(room201?.roomNumber).toBe('201');
      expect(room201?.bedspaces.length).toBe(4);

      const bedADown = room201?.bedspaces.find((b) => b.bedLabel === 'Bed A Down');
      expect(bedADown?.status).toBe('AVAILABLE');

      const bedAUp = room201?.bedspaces.find((b) => b.bedLabel === 'Bed A Up');
      expect(bedAUp?.status).toBe('CONFIRMED');
    });

    test('verifies active balloting window state accurately', async () => {
      const isFinalistActive = await BallotingService.verifyBallotingWindowActive('FINALIST');
      expect(isFinalistActive).toBe(true);

      const isFresherActive = await BallotingService.verifyBallotingWindowActive('FRESHER');
      expect(isFresherActive).toBe(false);
    });

    test('executes Zustand store actions for filtering hostels and selecting rooms/beds', async () => {
      const store = useBallotingStore.getState();

      const hostels = await store.fetchFilteredHostels({ gender: 'MALE', campus: 'MAIN_CAMPUS' });
      expect(hostels.length).toBeGreaterThanOrEqual(1);
      expect(useBallotingStore.getState().filteredHostels.length).toBeGreaterThanOrEqual(1);

      const rooms = await store.fetchHostelRooms('h_jaja', 'A', 2);
      expect(rooms.length).toBeGreaterThanOrEqual(1);
      expect(useBallotingStore.getState().selectedHostelId).toBe('h_jaja');

      store.setSelectedRoomAndBed('room_jaja_balloting_201', 'bed_jaja_201_a_down');
      expect(useBallotingStore.getState().selectedRoomId).toBe('room_jaja_balloting_201');
      expect(useBallotingStore.getState().selectedBedId).toBe('bed_jaja_201_a_down');
    });
  });

  describe('[BALLOTING-04 / UAT-0014] Atomic Bedspace Balloting Reservation & Hold Recycling Tests', () => {
    const studentId1 = 'usr_ballot_04_eligible';
    const studentId2 = 'usr_ballot_04_ineligible';
    const expiredBedId = 'bed_jaja_201_expired_hold';

    beforeAll(async () => {
      const client = AuthService.getDbClient();

      // Clean up previous test entries
      await client.execute({ sql: 'DELETE FROM payments WHERE user_id IN (?, ?)', args: [studentId1, studentId2] });
      await client.execute({ sql: 'DELETE FROM balloting_queue_tokens WHERE user_id IN (?, ?)', args: [studentId1, studentId2] });
      await client.execute({ sql: 'DELETE FROM student_profiles WHERE user_id IN (?, ?)', args: [studentId1, studentId2] });
      await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?)', args: [studentId1, studentId2] });

      // Seed eligible student user & profile
      await client.execute({
        sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [studentId1, '190407333', 'Eligible Balloter', 'b1@live.unilag.edu.ng', '+2348033330000', 'STUDENT', 'MALE', 'hash', 1]
      });

      await client.execute({
        sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, course_registered, medical_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [studentId1, 'Faculty of Engineering', 'Electrical Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 1, 'CLEARED']
      });

      // Seed ineligible student user & profile (unpaid fees)
      await client.execute({
        sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [studentId2, '190407444', 'Ineligible Balloter', 'b2@live.unilag.edu.ng', '+2348044440000', 'STUDENT', 'MALE', 'hash', 1]
      });

      await client.execute({
        sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, course_registered, medical_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [studentId2, 'Faculty of Science', 'Computer Science', 400, 'MAIN_CAMPUS', 'FINALIST', 0, 'NOT_STARTED', 1, 'CLEARED']
      });

      // Seed expired bed hold for recycling test
      await client.execute({ sql: 'DELETE FROM bedspaces WHERE id = ?', args: [expiredBedId] });
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

      await client.execute({
        sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, hold_expires_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [expiredBedId, 'room_jaja_balloting_201', 'Bed B Up Expired', 'LOCKED_HOLD', twoHoursAgo]
      });
    });

    test('recycles expired 72-hour bedspace holds back to AVAILABLE status', async () => {
      const recycledCount = await BallotingService.recycleExpiredHolds();
      expect(recycledCount).toBeGreaterThanOrEqual(1);

      const client = AuthService.getDbClient();
      const res = await client.execute({ sql: 'SELECT status FROM bedspaces WHERE id = ?', args: [expiredBedId] });
      expect(res.rows[0].status).toBe('AVAILABLE');
    });

    test('rejects balloting reservation for student with unpaid school fees', async () => {
      await expect(
        BallotingService.lockBedspaceWithBallotingValidation(studentId2, 'bed_jaja_201_b_down', 'FINALIST')
      ).rejects.toThrow('Ineligible for balloting');
    });

    test('rejects balloting reservation if balloting window for category is inactive and no queue token', async () => {
      // FRESHER window is in future / inactive
      await expect(
        BallotingService.lockBedspaceWithBallotingValidation(studentId1, 'bed_jaja_201_b_down', 'FRESHER')
      ).rejects.toThrow('Balloting window for your priority group is currently closed');
    });

    test('executes atomic bedspace balloting lock for eligible student during active window (UAT-0014)', async () => {
      // FINALIST window is active
      const result = await BallotingService.lockBedspaceWithBallotingValidation(studentId1, 'bed_jaja_201_b_down', 'FINALIST');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.bedspaceId).toBe('bed_jaja_201_b_down');
      expect(result.hostelName).toBe('King Jaja Hall');
      expect(result.amount).toBe(25000);
      expect(result.holdExpiresAt).toBeDefined();
      expect(result.message).toContain('Bedspace locked successfully');

      // Verify DB record status in bedspaces table
      const client = AuthService.getDbClient();
      const bedRes = await client.execute({ sql: 'SELECT status, allocated_to_user_id FROM bedspaces WHERE id = ?', args: ['bed_jaja_201_b_down'] });
      expect(bedRes.rows[0].status).toBe('LOCKED_HOLD');
      expect(bedRes.rows[0].allocated_to_user_id).toBe(studentId1);

      // Verify payment audit record inserted
      const payRes = await client.execute({ sql: 'SELECT id, amount, payment_status FROM payments WHERE user_id = ? AND bedspace_id = ?', args: [studentId1, 'bed_jaja_201_b_down'] });
      expect(payRes.rows.length).toBe(1);
      expect(payRes.rows[0].payment_status).toBe('PENDING');
    });

    test('prevents double allocation when student already holds an active bedspace reservation', async () => {
      await expect(
        BallotingService.lockBedspaceWithBallotingValidation(studentId1, 'bed_jaja_201_b_up', 'FINALIST')
      ).rejects.toThrow('already have an active hostel bedspace hold');
    });

    test('rejects reservation attempt when target bedspace is already locked', async () => {
      // Issue a token for testUserId2 so window check passes
      await BallotingService.issueQueueToken(testUserId2, 'FINALIST');

      await expect(
        BallotingService.lockBedspaceWithBallotingValidation(testUserId2, 'bed_jaja_201_b_down', 'FINALIST')
      ).rejects.toThrow('already been locked or selected by another student');
    });

    test('executes balloting bedspace lock via Zustand store action', async () => {
      const client = AuthService.getDbClient();
      const storeStudentId = 'usr_ballot_04_store_student';

      // Clean up previous test entries
      await client.execute({ sql: 'DELETE FROM payments WHERE user_id = ?', args: [storeStudentId] });
      await client.execute({ sql: 'DELETE FROM student_profiles WHERE user_id = ?', args: [storeStudentId] });
      await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [storeStudentId] });

      // Seed store test student
      await client.execute({
        sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [storeStudentId, '190407555', 'Store Balloter', 'sb@live.unilag.edu.ng', '+2348055550000', 'STUDENT', 'MALE', 'hash', 1]
      });

      await client.execute({
        sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, course_registered, medical_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [storeStudentId, 'Faculty of Engineering', 'Mechanical Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 1, 'CLEARED']
      });

      const store = useBallotingStore.getState();
      const reservation = await store.ballotBedspace(storeStudentId, 'bed_jaja_201_b_up', 'FINALIST');

      expect(reservation).toBeDefined();
      expect(reservation.bedspaceId).toBe('bed_jaja_201_b_up');
      expect(useBallotingStore.getState().activeReservation?.bedspaceId).toBe('bed_jaja_201_b_up');
    });
  });
});
