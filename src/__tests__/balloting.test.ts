import { AuthService } from '../api/authService';
import { BallotingService } from '../api/ballotingService';
import { useBallotingStore } from '../store/useBallotingStore';

describe('[BALLOTING-01 & BALLOTING-02 / UAT-0003 & UAT-0012] Real-Time Priority Quota Balloting Engine Tests', () => {
  const testStudentId = 'usr_balloting_02';

  beforeAll(async () => {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

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

    // 3. Seed test room and bedspaces for King Jaja Hall
    await client.execute({
      sql: `INSERT OR REPLACE INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['room_jaja_202', 'h_jaja', 'A', 2, 'A202', 4, 1]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at)
            VALUES (?, ?, ?, ?, ?, null)`,
      args: ['bed_jaja_202_a_down', 'room_jaja_202', 'Bed A Down', 'AVAILABLE', null]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at)
            VALUES (?, ?, ?, ?, ?, null)`,
      args: ['bed_jaja_202_a_up', 'room_jaja_202', 'Bed A Up', 'AVAILABLE', null]
    });

    // 4. Seed test student user
    const hashed = AuthService.hashPassword('password123');
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testStudentId, '200407088', 'Chidi Okafor', 'chidi@live.unilag.edu.ng', '+2348033333333', 'STUDENT', 'MALE', hashed, 1]
    });
  });

  describe('BALLOTING-01: Countdown Window & Quotas', () => {
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

  describe('BALLOTING-02 / UAT-0012: Filtered Hostel Lookup & Bedspace Selection', () => {
    test('filters hostels by student gender (MALE only receives male hostels)', async () => {
      const maleHostels = await BallotingService.getFilteredHostels('MALE', 'MAIN_CAMPUS');

      expect(maleHostels.length).toBeGreaterThan(0);
      const containsFemaleHostel = maleHostels.some((h) => h.gender === 'FEMALE');
      expect(containsFemaleHostel).toBe(false);
      const jaja = maleHostels.find((h) => h.hostelId === 'h_jaja');
      expect(jaja).toBeDefined();
    });

    test('filters hostels by female gender (FEMALE only receives female hostels)', async () => {
      const femaleHostels = await BallotingService.getFilteredHostels('FEMALE', 'MAIN_CAMPUS');

      expect(femaleHostels.length).toBeGreaterThan(0);
      const containsMaleHostel = femaleHostels.some((h) => h.gender === 'MALE');
      expect(containsMaleHostel).toBe(false);
      const moremi = femaleHostels.find((h) => h.hostelId === 'h_moremi');
      expect(moremi).toBeDefined();
    });

    test('fetches room summaries and bedspace statuses for selected hostel and block filter', async () => {
      const rooms = await BallotingService.getRoomsForHostel('h_jaja', 'A');

      expect(rooms.length).toBeGreaterThan(0);
      const room202 = rooms.find((r) => r.id === 'room_jaja_202');
      expect(room202).toBeDefined();
      expect(room202?.roomNumber).toBe('A202');
      expect(room202?.blockName).toBe('A');
      expect(room202?.bedspaces.length).toBeGreaterThan(0);
      expect(room202?.bedspaces[0].bedLabel).toBe('Bed A Down');
    });

    test('validates active window status before bedspace selection (succeeds during active window)', async () => {
      const lockRes = await BallotingService.validateWindowAndSelectBedspace(
        testStudentId,
        'FINALIST', // Category with ACTIVE window
        'bed_jaja_202_a_down'
      );

      expect(lockRes).toBeDefined();
      expect(lockRes.success).toBe(true);
      expect(lockRes.bedLabel).toBe('Bed A Down');
      expect(lockRes.amount).toBe(25000);
      expect(lockRes.holdExpiresAt).toBeDefined();
    });

    test('rejects bedspace selection when balloting window is not active', async () => {
      await expect(
        BallotingService.validateWindowAndSelectBedspace(
          testStudentId,
          'FRESHER', // Category with UPCOMING window (inactive)
          'bed_jaja_202_a_up'
        )
      ).rejects.toThrow('currently not active');
    });

    test('manages hostel and room selection state in Zustand store', async () => {
      const store = useBallotingStore.getState();

      const hostels = await store.fetchFilteredHostels('MALE', 'MAIN_CAMPUS');
      expect(hostels.length).toBeGreaterThan(0);
      expect(useBallotingStore.getState().selectedHostelId).toBe('h_jaja');

      const rooms = await store.fetchRoomsForHostel('h_jaja', 'A');
      expect(rooms.length).toBeGreaterThan(0);
      expect(useBallotingStore.getState().roomsList.length).toBeGreaterThan(0);

      store.setSelectedBedspace('bed_jaja_202_a_up');
      expect(useBallotingStore.getState().selectedBedspaceId).toBe('bed_jaja_202_a_up');

      store.clearSelection();
      expect(useBallotingStore.getState().selectedHostelId).toBeNull();
      expect(useBallotingStore.getState().selectedBedspaceId).toBeNull();
    });
  });
});
