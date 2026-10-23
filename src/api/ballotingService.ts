import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { BallotingWindow, HostelQuotaSummary, BallotingCountdownState } from '../types/balloting';
import { PriorityCategory } from '../types/auth';

export class BallotingService {
  /**
   * Initializes balloting engine schema and seed data in Turso DB if not existing.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.batch([
      `CREATE TABLE IF NOT EXISTS balloting_windows (
        id TEXT PRIMARY KEY,
        priority_category TEXT NOT NULL,
        title TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT CHECK(status IN ('UPCOMING', 'ACTIVE', 'CLOSED', 'PAUSED')) DEFAULT 'UPCOMING'
      );`,
      `CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      );`
    ], 'write');
  }

  /**
   * Fetches the current or upcoming balloting window for student's priority category.
   */
  public static async getBallotingWindowForCategory(category: PriorityCategory): Promise<BallotingWindow | null> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT id, priority_category, title, start_time, end_time, status
            FROM balloting_windows
            WHERE priority_category = ?
            ORDER BY start_time ASC LIMIT 1`,
      args: [category]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: String(row.id),
      category: String(row.priority_category) as PriorityCategory,
      title: String(row.title),
      startTime: String(row.start_time),
      endTime: String(row.end_time),
      status: String(row.status) as BallotingWindow['status']
    };
  }

  /**
   * Fetches real-time hostel quota availability summaries directly from Turso DB.
   */
  public static async getHostelQuotas(): Promise<HostelQuotaSummary[]> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT id, name, campus, gender, total_capacity, available_bedspaces FROM hostels ORDER BY name ASC`,
      args: []
    });

    return result.rows.map((row) => ({
      hostelId: String(row.id),
      hostelName: String(row.name),
      campus: String(row.campus) as HostelQuotaSummary['campus'],
      gender: String(row.gender) as HostelQuotaSummary['gender'],
      totalCapacity: Number(row.total_capacity),
      availableBedspaces: Number(row.available_bedspaces),
      allocatedBedspaces: Number(row.total_capacity) - Number(row.available_bedspaces)
    }));
  }

  /**
   * Evaluates active countdown state for student's priority category.
   */
  public static async getCountdownState(category: PriorityCategory): Promise<BallotingCountdownState> {
    const window = await BallotingService.getBallotingWindowForCategory(category);
    const quotas = await BallotingService.getHostelQuotas();

    if (!window) {
      return {
        currentWindow: null,
        timeRemainingSeconds: 0,
        isWindowActive: false,
        quotas
      };
    }

    const now = new Date().getTime();
    const start = new Date(window.startTime).getTime();
    const end = new Date(window.endTime).getTime();

    let timeRemainingSeconds = 0;
    let isWindowActive = false;

    if (now < start) {
      // Countdown to start
      timeRemainingSeconds = Math.max(0, Math.floor((start - now) / 1000));
      isWindowActive = false;
    } else if (now >= start && now <= end && window.status !== 'PAUSED' && window.status !== 'CLOSED') {
      // Active window - countdown to end
      timeRemainingSeconds = Math.max(0, Math.floor((end - now) / 1000));
      isWindowActive = true;
    } else {
      timeRemainingSeconds = 0;
      isWindowActive = false;
    }

    return {
      currentWindow: window,
      timeRemainingSeconds,
      isWindowActive,
      quotas
    };
  }
}
