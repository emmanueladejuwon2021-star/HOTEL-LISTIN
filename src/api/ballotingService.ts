import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { ReservationService } from './reservationService';
import {
  BallotingWindow,
  HostelQuotaSummary,
  BallotingCountdownState,
  QueueToken,
  HostelFilterParams,
  FilteredHostelSummary,
  BallotingRoomDetails,
  PriorityQuotaAnalytics
} from '../types/balloting';
import { PriorityCategory, Gender, Campus } from '../types/auth';

/**
 * Service class that manages real-time priority quota balloting windows,
 * fair queue token issuance, real-time hostel bedspace quota summaries,
 * and countdown timers following a strict zero-mock policy.
 */
export class BallotingService {
  /**
   * Initializes balloting engine schema, queue token table, and seed data in Turso DB if not existing.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await ReservationService.initializeSchema();
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

    const quotaAnalytics = await BallotingService.getQuotaAnalytics();

    if (!window) {
      return {
        currentWindow: null,
        timeRemainingSeconds: 0,
        isWindowActive: false,
        quotas,
        queueToken,
        totalQueuedUsers,
        quotaAnalytics
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
      totalQueuedUsers,
      quotaAnalytics
    };
  }

  /**
   * Queries hostels filtered by gender, campus, or category for student balloting selector.
   *
   * @param params - Filter options (gender, campus, category)
   * @returns Array of FilteredHostelSummary objects
   */
  public static async getFilteredHostels(params?: HostelFilterParams): Promise<FilteredHostelSummary[]> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT id, name, gender, campus, category, total_capacity, available_bedspaces FROM hostels WHERE 1=1`;
    const args: any[] = [];

    if (params?.gender) {
      sql += ` AND (gender = ? OR gender = 'MIXED')`;
      args.push(params.gender);
    }

    if (params?.campus) {
      sql += ` AND campus = ?`;
      args.push(params.campus);
    }

    if (params?.category) {
      sql += ` AND category = ?`;
      args.push(params.category);
    }

    sql += ` ORDER BY name ASC`;

    const result = await client.execute({ sql, args });

    return result.rows.map((row) => ({
      hostelId: String(row.id),
      hostelName: String(row.name),
      campus: String(row.campus) as Campus,
      gender: String(row.gender) as Gender,
      category: String(row.category) as 'UNDERGRADUATE' | 'POSTGRADUATE',
      totalCapacity: Number(row.total_capacity),
      availableBedspaces: Number(row.available_bedspaces),
      allocatedBedspaces: Number(row.total_capacity) - Number(row.available_bedspaces)
    }));
  }

  /**
   * Retrieves rooms and bedspace position statuses for a selected hostel during balloting.
   *
   * @param hostelId - ID of selected hostel
   * @param blockName - Optional block filter (e.g. 'Block A')
   * @param floorNumber - Optional floor filter (e.g. 1)
   * @returns Array of BallotingRoomDetails objects
   */
  public static async getRoomsForHostel(
    hostelId: string,
    blockName?: string,
    floorNumber?: number
  ): Promise<BallotingRoomDetails[]> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    let roomSql = `SELECT r.id, r.hostel_id, h.name as hostel_name, r.block_name, r.floor_number, r.room_number, r.total_beds, r.occupied_beds
                   FROM rooms r
                   JOIN hostels h ON r.hostel_id = h.id
                   WHERE r.hostel_id = ?`;
    const roomArgs: any[] = [hostelId];

    if (blockName) {
      roomSql += ` AND r.block_name = ?`;
      roomArgs.push(blockName);
    }

    if (floorNumber !== undefined) {
      roomSql += ` AND r.floor_number = ?`;
      roomArgs.push(floorNumber);
    }

    roomSql += ` ORDER BY r.block_name ASC, r.floor_number ASC, r.room_number ASC`;

    const roomRes = await client.execute({ sql: roomSql, args: roomArgs });

    const rooms: BallotingRoomDetails[] = [];

    for (const rRow of roomRes.rows) {
      const roomId = String(rRow.id);

      const bedsRes = await client.execute({
        sql: `SELECT id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at, updated_at
              FROM bedspaces WHERE room_id = ? ORDER BY bed_label ASC`,
        args: [roomId]
      });

      const bedspaces = bedsRes.rows.map((bRow) => ({
        id: String(bRow.id),
        roomId: String(bRow.room_id),
        bedLabel: String(bRow.bed_label),
        status: String(bRow.status) as 'AVAILABLE' | 'LOCKED_HOLD' | 'CONFIRMED' | 'MAINTENANCE_BLOCKED',
        allocatedToUserId: bRow.allocated_to_user_id ? String(bRow.allocated_to_user_id) : undefined,
        holdExpiresAt: bRow.hold_expires_at ? String(bRow.hold_expires_at) : undefined,
        updatedAt: String(bRow.updated_at)
      }));

      rooms.push({
        id: roomId,
        hostelId: String(rRow.hostel_id),
        hostelName: String(rRow.hostel_name),
        blockName: String(rRow.block_name),
        floorNumber: Number(rRow.floor_number),
        roomNumber: String(rRow.room_number),
        totalBeds: Number(rRow.total_beds),
        occupiedBeds: Number(rRow.occupied_beds),
        bedspaces
      });
    }

    return rooms;
  }

  /**
   * Verifies if a balloting window is active for student's priority category before allowing bed selection.
   *
   * @param category - Priority category tag
   * @returns Boolean indicating if window is currently active
   */
  public static async verifyBallotingWindowActive(category: PriorityCategory): Promise<boolean> {
    const window = await BallotingService.getBallotingWindowForCategory(category);
    if (!window) return false;

    const now = new Date().getTime();
    const start = new Date(window.startTime).getTime();
    const end = new Date(window.endTime).getTime();

    return now >= start && now <= end && window.status === 'ACTIVE';
  }

  /**
   * Validates that a student possesses an issued queue token and that the priority window for their category is active.
   * Ensures fair queue access control before bedspace selection or locking.
   *
   * @param userId - Unique student user ID
   * @param category - Priority category tag
   * @returns Object containing validity flag, descriptive status message, queue token, and window status
   */
  public static async validateQueueTokenAndWindow(
    userId: string,
    category: PriorityCategory
  ): Promise<{ isValid: boolean; message: string; token?: QueueToken; isWindowActive: boolean }> {
    await BallotingService.initializeSchema();

    const isWindowActive = await BallotingService.verifyBallotingWindowActive(category);
    if (!isWindowActive) {
      return {
        isValid: false,
        message: `Balloting window for ${category} is currently inactive or closed.`,
        isWindowActive: false
      };
    }

    const token = await BallotingService.getQueueToken(userId);
    if (!token) {
      return {
        isValid: false,
        message: 'No queue access ticket found for your account. Please request a queue token first.',
        isWindowActive: true
      };
    }

    return {
      isValid: true,
      message: `Queue token #${token.positionInQueue} validated successfully for active ${category} window.`,
      token,
      isWindowActive: true
    };
  }

  /**
   * Automatically scans for expired 72-hour bedspace holds and recycles them back into the AVAILABLE pool.
   * Restores available bedspace capacity counts in the hostels table (PRD Section 5.2).
   *
   * @returns Object containing number of released bedspace holds and status message
   */
  public static async releaseExpiredHolds(): Promise<{ releasedCount: number; message: string }> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query expired LOCKED_HOLD bedspaces
    const expiredRes = await client.execute({
      sql: `SELECT b.id, b.room_id, r.hostel_id
            FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.status = 'LOCKED_HOLD'
              AND b.hold_expires_at IS NOT NULL
              AND DATETIME(b.hold_expires_at) < DATETIME('now')`,
      args: []
    });

    if (expiredRes.rows.length === 0) {
      return {
        releasedCount: 0,
        message: 'No expired bedspace holds found to release.'
      };
    }

    let releasedCount = 0;

    for (const row of expiredRes.rows) {
      const bedId = String(row.id);
      const hostelId = String(row.hostel_id);

      await client.batch([
        {
          sql: `UPDATE bedspaces
                SET status = 'AVAILABLE',
                    allocated_to_user_id = NULL,
                    hold_expires_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [bedId]
        },
        {
          sql: `UPDATE hostels SET available_bedspaces = available_bedspaces + 1 WHERE id = ?`,
          args: [hostelId]
        }
      ], 'write');

      releasedCount++;
    }

    return {
      releasedCount,
      message: `Successfully released and recycled ${releasedCount} expired bedspace hold(s) back to AVAILABLE status.`
    };
  }

  /**
   * Cancels/removes an issued queue token for a student if requested.
   *
   * @param userId - Unique student user ID
   * @returns Boolean indicating whether token was found and deleted
   */
  public static async cancelQueueToken(userId: string): Promise<boolean> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `DELETE FROM balloting_queue_tokens WHERE user_id = ?`,
      args: [userId]
    });

    return (result.rowsAffected || 0) > 0;
  }

  /**
   * Calculates real-time priority quota analytics and bedspace allocation distribution across categories.
   * Based on PRD Section 5.1 Quota Allocation Matrix:
   * - FRESHER: 40%
   * - FINALIST: 30%
   * - SCHOLAR: 10%
   * - STALLITE: 20%
   *
   * @returns Array of PriorityQuotaAnalytics objects for each priority category
   */
  public static async getQuotaAnalytics(): Promise<PriorityQuotaAnalytics[]> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query total capacity across all hostels
    const capacityRes = await client.execute({
      sql: `SELECT SUM(total_capacity) as grand_total FROM hostels`,
      args: []
    });

    const grandTotal = Number(capacityRes.rows[0].grand_total || 0);

    const categories: Array<{
      category: PriorityCategory;
      title: string;
      percentage: number;
    }> = [
      { category: 'FRESHER', title: '100L Freshers & CMUL Direct Entry', percentage: 40 },
      { category: 'FINALIST', title: 'Finalists & Graduating Students', percentage: 30 },
      { category: 'SCHOLAR', title: 'Scholars, Athletes & Special Needs', percentage: 10 },
      { category: 'STALLITE', title: 'Returning 200L-400L Stallites', percentage: 20 }
    ];

    const analytics: PriorityQuotaAnalytics[] = [];

    for (const cat of categories) {
      const categoryCapacity = Math.floor((grandTotal * cat.percentage) / 100);

      // Query allocated bedspaces for this priority category
      const allocatedRes = await client.execute({
        sql: `SELECT COUNT(*) as count FROM bedspaces b
              JOIN student_profiles sp ON b.allocated_to_user_id = sp.user_id
              WHERE sp.priority_category = ? AND b.status IN ('LOCKED_HOLD', 'CONFIRMED')`,
        args: [cat.category]
      });

      const allocatedCount = Number(allocatedRes.rows[0].count || 0);
      const remainingCapacity = Math.max(0, categoryCapacity - allocatedCount);

      analytics.push({
        category: cat.category,
        categoryTitle: cat.title,
        quotaSharePercentage: cat.percentage,
        totalQuotaCapacity: categoryCapacity,
        allocatedCount,
        remainingCapacity
      });
    }

    return analytics;
  }

  /**
   * Enforces priority category quota limits for student balloting applications.
   * Checks if the student's category has exceeded its allowed quota allocation for the selected hostel/bedspace.
   *
   * @param category - Priority category of the student
   * @param hostelId - Selected hostel ID
   * @returns Object indicating whether quota is available and detailed message
   */
  public static async enforceCategoryQuotaLimit(
    category: PriorityCategory,
    hostelId: string
  ): Promise<{ isQuotaAvailable: boolean; message: string; remainingQuota: number }> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query hostel capacity
    const hostelRes = await client.execute({
      sql: `SELECT name, total_capacity FROM hostels WHERE id = ?`,
      args: [hostelId]
    });

    if (hostelRes.rows.length === 0) {
      return { isQuotaAvailable: false, message: 'Selected hostel not found.', remainingQuota: 0 };
    }

    const hostelName = String(hostelRes.rows[0].name);
    const totalCapacity = Number(hostelRes.rows[0].total_capacity);

    const shareMap: Record<PriorityCategory, number> = {
      FRESHER: 40,
      FINALIST: 30,
      SCHOLAR: 10,
      SPECIAL_NEEDS: 10,
      STALLITE: 20
    };

    const percentage = shareMap[category] || 20;
    const allowedCategoryQuota = Math.floor((totalCapacity * percentage) / 100);

    // Query current category allocations in this hostel
    const allocatedRes = await client.execute({
      sql: `SELECT COUNT(*) as count FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            JOIN student_profiles sp ON b.allocated_to_user_id = sp.user_id
            WHERE r.hostel_id = ? AND sp.priority_category = ? AND b.status IN ('LOCKED_HOLD', 'CONFIRMED')`,
      args: [hostelId, category]
    });

    const currentAllocated = Number(allocatedRes.rows[0].count || 0);
    const remainingQuota = allowedCategoryQuota - currentAllocated;

    if (remainingQuota <= 0) {
      return {
        isQuotaAvailable: false,
        message: `Quota limit reached for ${category} category in ${hostelName} (${allowedCategoryQuota} beds max).`,
        remainingQuota: 0
      };
    }

    return {
      isQuotaAvailable: true,
      message: `Category quota check passed for ${category} in ${hostelName}. ${remainingQuota} space(s) remaining.`,
      remainingQuota
    };
  }
}
