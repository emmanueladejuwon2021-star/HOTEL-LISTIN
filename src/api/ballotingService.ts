import { Client } from '@libsql/client';
import { AuthService } from './authService';
import {
  BallotingWindow,
  HostelQuotaSummary,
  BallotingCountdownState,
  QueueToken,
  CategoryQuotaDetails,
  BallotingEligibilityStatus
} from '../types/balloting';
import { PriorityCategory } from '../types/auth';

/**
 * Service class that manages real-time priority quota balloting windows,
 * fair queue token issuance, real-time hostel bedspace quota summaries,
 * priority category allocation enforcement, and countdown timers following a strict zero-mock policy.
 */
export class BallotingService {
  /**
   * Initializes balloting engine schema, queue token table, and seed data in Turso DB if not existing.
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
      `CREATE TABLE IF NOT EXISTS balloting_queue_tokens (
        token_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        priority_category TEXT NOT NULL,
        position_in_queue INTEGER NOT NULL,
        estimated_wait_time_seconds INTEGER NOT NULL,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
   * Issues a fair queue token for a student attempting to ballot.
   * Computes position in queue based on existing issued queue tokens for the student's priority category.
   *
   * @param userId - Unique student user ID
   * @param category - Priority category tag (FRESHER, FINALIST, SCHOLAR, SPECIAL_NEEDS, STALLITE)
   * @returns QueueToken object containing queue position and estimated wait time
   */
  public static async issueQueueToken(userId: string, category: PriorityCategory): Promise<QueueToken> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    // Check if user already has an active queue token
    const existingResult = await client.execute({
      sql: `SELECT token_id, user_id, priority_category, position_in_queue, estimated_wait_time_seconds, issued_at
            FROM balloting_queue_tokens WHERE user_id = ?`,
      args: [userId]
    });

    if (existingResult.rows.length > 0) {
      const row = existingResult.rows[0];
      return {
        tokenId: String(row.token_id),
        userId: String(row.user_id),
        priorityCategory: String(row.priority_category) as PriorityCategory,
        positionInQueue: Number(row.position_in_queue),
        estimatedWaitTimeSeconds: Number(row.estimated_wait_time_seconds),
        issuedAt: String(row.issued_at)
      };
    }

    // Calculate queue position based on count of queued users in category
    const countResult = await client.execute({
      sql: `SELECT COUNT(*) as queue_count FROM balloting_queue_tokens WHERE priority_category = ?`,
      args: [category]
    });

    const currentQueueCount = Number(countResult.rows[0].queue_count || 0);
    const positionInQueue = currentQueueCount + 1;
    // Estimated wait time: ~5 seconds per user in queue ahead
    const estimatedWaitTimeSeconds = positionInQueue * 5;
    const tokenId = `tok_${category.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await client.execute({
      sql: `INSERT INTO balloting_queue_tokens (token_id, user_id, priority_category, position_in_queue, estimated_wait_time_seconds, issued_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [tokenId, userId, category, positionInQueue, estimatedWaitTimeSeconds]
    });

    return {
      tokenId,
      userId,
      priorityCategory: category,
      positionInQueue,
      estimatedWaitTimeSeconds,
      issuedAt: new Date().toISOString()
    };
  }

  /**
   * Fetches an active queue token for a student if issued previously.
   *
   * @param userId - Unique student user ID
   * @returns QueueToken or null if not queued
   */
  public static async getQueueToken(userId: string): Promise<QueueToken | null> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT token_id, user_id, priority_category, position_in_queue, estimated_wait_time_seconds, issued_at
            FROM balloting_queue_tokens WHERE user_id = ?`,
      args: [userId]
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      tokenId: String(row.token_id),
      userId: String(row.user_id),
      priorityCategory: String(row.priority_category) as PriorityCategory,
      positionInQueue: Number(row.position_in_queue),
      estimatedWaitTimeSeconds: Number(row.estimated_wait_time_seconds),
      issuedAt: String(row.issued_at)
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
   * Computes priority quota limits and current usage for a specific hostel and priority category.
   * Priority Category Quotas (PRD Section 5.1):
   * - FRESHER: 40%
   * - FINALIST: 30%
   * - SCHOLAR / SPECIAL_NEEDS: 10%
   * - STALLITE: 20%
   *
   * @param hostelId - Target hostel unique ID
   * @param category - Priority category tag
   * @returns CategoryQuotaDetails containing share %, max quota limit, allocated count, and remaining quota
   */
  public static async getCategoryQuotaForHostel(hostelId: string, category: PriorityCategory): Promise<CategoryQuotaDetails> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    // Fetch target hostel details
    const hostelRes = await client.execute({
      sql: `SELECT id, name, total_capacity FROM hostels WHERE id = ?`,
      args: [hostelId]
    });

    if (hostelRes.rows.length === 0) {
      throw new Error(`Hostel with ID ${hostelId} not found.`);
    }

    const hostelRow = hostelRes.rows[0];
    const totalCapacity = Number(hostelRow.total_capacity);
    const hostelName = String(hostelRow.name);

    // Map priority category to percentage share according to PRD 5.1
    let percentageShare = 20; // Default Stallite 20%
    if (category === 'FRESHER') percentageShare = 40;
    else if (category === 'FINALIST') percentageShare = 30;
    else if (category === 'SCHOLAR' || category === 'SPECIAL_NEEDS') percentageShare = 10;

    const quotaLimit = Math.floor(totalCapacity * (percentageShare / 100));

    // Calculate count of currently locked or confirmed bedspaces for students in this priority category in this hostel
    const countRes = await client.execute({
      sql: `SELECT COUNT(b.id) as allocated_count
            FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            JOIN student_profiles sp ON b.allocated_to_user_id = sp.user_id
            WHERE r.hostel_id = ? AND sp.priority_category = ? AND b.status IN ('LOCKED_HOLD', 'CONFIRMED')`,
      args: [hostelId, category]
    });

    const allocatedCount = Number(countRes.rows[0].allocated_count || 0);
    const remainingQuota = Math.max(0, quotaLimit - allocatedCount);

    return {
      hostelId,
      hostelName,
      category,
      percentageShare,
      quotaLimit,
      allocatedCount,
      remainingQuota
    };
  }

  /**
   * Validates if a student is eligible to ballot in a target hostel during the current window,
   * checking both active balloting window status and category quota remaining availability.
   *
   * @param userId - Unique student user ID
   * @param category - Priority category tag
   * @param hostelId - Target hostel ID
   * @returns BallotingEligibilityStatus detailing whether balloting is permitted and reason message
   */
  public static async validateBallotingEligibilityAndWindow(
    userId: string,
    category: PriorityCategory,
    hostelId: string
  ): Promise<BallotingEligibilityStatus> {
    const countdownState = await BallotingService.getCountdownState(category, userId);
    const categoryQuota = await BallotingService.getCategoryQuotaForHostel(hostelId, category);

    if (!countdownState.isWindowActive) {
      return {
        canBallot: false,
        reason: `Balloting window for ${category} category is currently inactive or closed.`,
        isWindowActive: false,
        categoryQuota
      };
    }

    if (categoryQuota.remainingQuota <= 0) {
      return {
        canBallot: false,
        reason: `Category quota (${categoryQuota.percentageShare}%) for ${category} category is fully exhausted in ${categoryQuota.hostelName}.`,
        isWindowActive: true,
        categoryQuota
      };
    }

    return {
      canBallot: true,
      reason: `Balloting window active and ${categoryQuota.remainingQuota} beds available in ${category} quota.`,
      isWindowActive: true,
      categoryQuota
    };
  }

  /**
   * Evaluates active countdown state and queue tokens for student's priority category.
   *
   * @param category - Priority category tag
   * @param userId - Optional student user ID to attach queue token details
   */
  public static async getCountdownState(category: PriorityCategory, userId?: string): Promise<BallotingCountdownState> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    const window = await BallotingService.getBallotingWindowForCategory(category);
    const quotas = await BallotingService.getHostelQuotas();

    const totalQueuedRes = await client.execute({
      sql: `SELECT COUNT(*) as total FROM balloting_queue_tokens WHERE priority_category = ?`,
      args: [category]
    });
    const totalQueuedUsers = Number(totalQueuedRes.rows[0].total || 0);

    let queueToken: QueueToken | undefined = undefined;
    if (userId) {
      const tok = await BallotingService.getQueueToken(userId);
      if (tok) queueToken = tok;
    }

    if (!window) {
      return {
        currentWindow: null,
        timeRemainingSeconds: 0,
        isWindowActive: false,
        quotas,
        queueToken,
        totalQueuedUsers
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
      quotas,
      queueToken,
      totalQueuedUsers
    };
  }
}
