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
});
