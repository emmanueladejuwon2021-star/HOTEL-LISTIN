import { AuthService } from '../api/authService';
import { BallotingService } from '../api/ballotingService';

describe('[BALLOTING-01 / UAT-0003] Real-Time Priority Quota Balloting Engine Countdown Tests', () => {
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
