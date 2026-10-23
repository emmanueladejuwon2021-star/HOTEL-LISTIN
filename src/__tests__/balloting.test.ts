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

  describe('[BALLOTING-03 / UAT-0013] Queue Token & Active Window Validation, Expired Hold Auto-Recycling & Cancellation', () => {
    test('validates queue token and window state for student during active window', async () => {
      // Ensure student has a queue token for FINALIST (active window)
      await BallotingService.issueQueueToken(testUserId1, 'FINALIST');

      const validation = await BallotingService.validateQueueTokenAndWindow(testUserId1, 'FINALIST');
      expect(validation.isValid).toBe(true);
      expect(validation.isWindowActive).toBe(true);
      expect(validation.token).toBeDefined();
      expect(validation.message).toContain('validated successfully');
    });

    test('rejects queue validation when student has no queue token', async () => {
      const unqueuedUserId = 'usr_9999_unqueued';
      const validation = await BallotingService.validateQueueTokenAndWindow(unqueuedUserId, 'FINALIST');

      expect(validation.isValid).toBe(false);
      expect(validation.isWindowActive).toBe(true);
      expect(validation.message).toContain('No queue access ticket found');
    });

    test('rejects queue validation when balloting window is inactive', async () => {
      const validation = await BallotingService.validateQueueTokenAndWindow(testUserId1, 'FRESHER');

      expect(validation.isValid).toBe(false);
      expect(validation.isWindowActive).toBe(false);
      expect(validation.message).toContain('currently inactive or closed');
    });

    test('scans and releases expired 72-hour bedspace holds, restoring available bedspace capacity', async () => {
      const client = AuthService.getDbClient();

      // Seed an expired LOCKED_HOLD bedspace
      const expiredBedId = 'bed_jaja_expired_test';
      await client.execute({ sql: 'DELETE FROM bedspaces WHERE id = ?', args: [expiredBedId] });

      const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString(); // Expired 1 hour ago
      await client.execute({
        sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [expiredBedId, 'room_jaja_balloting_201', 'Bed C Expired', 'LOCKED_HOLD', testUserId1, pastExpiry]
      });

      const releaseResult = await BallotingService.releaseExpiredHolds();

      expect(releaseResult.releasedCount).toBeGreaterThanOrEqual(1);
      expect(releaseResult.message).toContain('Successfully released');

      // Verify bedspace status is reset to AVAILABLE in DB
      const checkRes = await client.execute({
        sql: `SELECT status, allocated_to_user_id, hold_expires_at FROM bedspaces WHERE id = ?`,
        args: [expiredBedId]
      });

      expect(checkRes.rows.length).toBe(1);
      expect(checkRes.rows[0].status).toBe('AVAILABLE');
      expect(checkRes.rows[0].allocated_to_user_id).toBeNull();

      // Clean up test bedspace
      await client.execute({ sql: 'DELETE FROM bedspaces WHERE id = ?', args: [expiredBedId] });
    });

    test('cancels issued queue token successfully', async () => {
      const token = await BallotingService.issueQueueToken(testUserId2, 'FINALIST');
      expect(token).toBeDefined();

      const cancelled = await BallotingService.cancelQueueToken(testUserId2);
      expect(cancelled).toBe(true);

      const checkToken = await BallotingService.getQueueToken(testUserId2);
      expect(checkToken).toBeNull();
    });

    test('executes Zustand store actions for queue validation, expired hold release, and queue cancellation', async () => {
      const store = useBallotingStore.getState();

      // Issue token for test user 1 for FINALIST
      await store.issueQueueTicket(testUserId1, 'FINALIST');

      const val = await store.validateQueueAndWindow(testUserId1, 'FINALIST');
      expect(val.isValid).toBe(true);

      const releaseRes = await store.releaseExpiredHolds();
      expect(releaseRes).toBeDefined();
      expect(releaseRes.releasedCount).toBeGreaterThanOrEqual(0);

      const cancelled = await store.cancelQueueToken(testUserId1);
      expect(cancelled).toBe(true);
    });
  });

  describe('[BALLOTING-04 / UAT-0014] Priority Quota Allocation Breakdown & Category Quota Enforcement', () => {
    test('fetches priority quota analytics summary across all hostels in Turso DB (UAT-0014)', async () => {
      const analytics = await BallotingService.getQuotaAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalCapacity).toBeGreaterThan(0);
      expect(analytics.categoryBreakdown.length).toBe(4);

      // Verify category quota percentages match PRD Section 5.1
      const fresherQuota = analytics.categoryBreakdown.find((c) => c.category === 'FRESHER');
      expect(fresherQuota).toBeDefined();
      expect(fresherQuota?.sharePercentage).toBe(40);

      const finalistQuota = analytics.categoryBreakdown.find((c) => c.category === 'FINALIST');
      expect(finalistQuota).toBeDefined();
      expect(finalistQuota?.sharePercentage).toBe(30);

      const scholarQuota = analytics.categoryBreakdown.find((c) => c.category === 'SCHOLAR');
      expect(scholarQuota).toBeDefined();
      expect(scholarQuota?.sharePercentage).toBe(10);

      const stalliteQuota = analytics.categoryBreakdown.find((c) => c.category === 'STALLITE');
      expect(stalliteQuota).toBeDefined();
      expect(stalliteQuota?.sharePercentage).toBe(20);
    });

    test('fetches quota analytics for a specific hostel and validates remaining beds', async () => {
      const analytics = await BallotingService.getQuotaAnalytics('h_jaja');

      expect(analytics).toBeDefined();
      expect(analytics.hostelId).toBe('h_jaja');
      expect(analytics.hostelName).toBe('King Jaja Hall');
      expect(analytics.totalCapacity).toBe(1200);

      const fresherItem = analytics.categoryBreakdown.find((c) => c.category === 'FRESHER');
      expect(fresherItem?.totalQuotaBeds).toBe(480); // 40% of 1200 = 480
    });

    test('validates category quota availability for student attempting to reserve space', async () => {
      const validation = await BallotingService.validateCategoryQuota('h_jaja', 'FRESHER');

      expect(validation).toBeDefined();
      expect(validation.isQuotaAvailable).toBe(true);
      expect(validation.categoryQuotaBeds).toBe(480);
      expect(validation.remainingBeds).toBeGreaterThan(0);
    });

    test('executes Zustand store action to fetch priority quota analytics', async () => {
      const store = useBallotingStore.getState();

      const analytics = await store.fetchQuotaAnalytics('h_jaja');

      expect(analytics).toBeDefined();
      expect(useBallotingStore.getState().quotaAnalytics).toBeDefined();
      expect(useBallotingStore.getState().quotaAnalytics?.hostelId).toBe('h_jaja');
    });
  });
});
