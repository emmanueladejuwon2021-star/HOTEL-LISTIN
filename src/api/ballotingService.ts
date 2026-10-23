import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { ReservationService } from './reservationService';
import { BallotingWindow, HostelQuotaSummary, BallotingCountdownState, BallotingRoomSummary } from '../types/balloting';
import { PriorityCategory, Gender, Campus } from '../types/auth';
import { LockBedspaceResult } from '../types/reservation';

/**
 * Service class that handles real-time priority quota balloting windows, hostel quota calculations,
 * gender/campus hostel filtering, room and bedspace layout queries, and balloting window validation
 * before bedspace reservations.
 */
export class BallotingService {
  /**
   * Initializes balloting engine schema and seed data in Turso DB if not existing.
   * Ensures all hostels, rooms, and bedspaces tables are created and accessible.
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
   *
   * @param category - Student's assigned priority category (e.g. FRESHER, FINALIST)
   * @returns Active or upcoming BallotingWindow record or null if none scheduled
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
   *
   * @returns Array of HostelQuotaSummary objects with live capacity metrics
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
   * Fetches hostels filtered by student gender (MALE or FEMALE) and campus location.
   * Ensures male students only see male hostels and female students see female hostels.
   *
   * @param gender - Student gender ('MALE' or 'FEMALE')
   * @param campus - Optional campus location ('MAIN_CAMPUS' or 'CMUL_IDI_ARABA')
   * @returns Array of filtered HostelQuotaSummary objects
   */
  public static async getFilteredHostels(gender?: Gender, campus?: Campus): Promise<HostelQuotaSummary[]> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    let query = `SELECT id, name, campus, gender, total_capacity, available_bedspaces FROM hostels WHERE 1=1`;
    const args: (string | number)[] = [];

    if (gender) {
      query += ` AND (gender = ? OR gender = 'MIXED')`;
      args.push(gender);
    }

    if (campus) {
      query += ` AND campus = ?`;
      args.push(campus);
    }

    query += ` ORDER BY name ASC`;

    const result = await client.execute({ sql: query, args });

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
   * Fetches all rooms and their respective bedspaces for a selected hostel and optional block name.
   * Used by students during interactive room and bed selection in S-03 Real-Time Balloting Selector.
   *
   * @param hostelId - Target hostel ID
   * @param blockName - Optional block filter (e.g. 'A', 'B', 'C')
   * @returns Array of BallotingRoomSummary objects with room details and live bedspace states
   */
  public static async getRoomsForHostel(hostelId: string, blockName?: string): Promise<BallotingRoomSummary[]> {
    await BallotingService.initializeSchema();
    const client = AuthService.getDbClient();

    let query = `SELECT r.id, r.hostel_id, h.name as hostel_name, r.block_name, r.floor_number, r.room_number, r.total_beds, r.occupied_beds
                 FROM rooms r
                 JOIN hostels h ON r.hostel_id = h.id
                 WHERE r.hostel_id = ?`;
    const args: string[] = [hostelId];

    if (blockName) {
      query += ` AND r.block_name = ?`;
      args.push(blockName);
    }

    query += ` ORDER BY r.block_name ASC, r.floor_number ASC, r.room_number ASC`;

    const roomsResult = await client.execute({ sql: query, args });

    const roomSummaries: BallotingRoomSummary[] = [];

    for (const rRow of roomsResult.rows) {
      const roomId = String(rRow.id);

      const bedsResult = await client.execute({
        sql: `SELECT id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at, updated_at
              FROM bedspaces WHERE room_id = ? ORDER BY bed_label ASC`,
        args: [roomId]
      });

      const bedspaces = bedsResult.rows.map((bRow) => ({
        id: String(bRow.id),
        roomId: String(bRow.room_id),
        bedLabel: String(bRow.bed_label),
        status: String(bRow.status) as any,
        allocatedToUserId: bRow.allocated_to_user_id ? String(bRow.allocated_to_user_id) : undefined,
        holdExpiresAt: bRow.hold_expires_at ? String(bRow.hold_expires_at) : undefined,
        updatedAt: String(bRow.updated_at)
      }));

      roomSummaries.push({
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

    return roomSummaries;
  }

  /**
   * Evaluates active countdown state for student's priority category.
   *
   * @param category - Priority category of student
   * @returns BallotingCountdownState containing timer countdown and hostel quotas
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
      // Countdown to start of balloting window
      timeRemainingSeconds = Math.max(0, Math.floor((start - now) / 1000));
      isWindowActive = false;
    } else if (now >= start && now <= end && window.status !== 'PAUSED' && window.status !== 'CLOSED') {
      // Active window - countdown to end of window
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

  /**
   * Validates that student's priority category balloting window is active before locking a bedspace.
   * Prevents students from reserving beds outside their designated balloting window.
   *
   * @param userId - Unique student user ID
   * @param category - Priority category of student
   * @param bedspaceId - Selected bedspace ID
   * @returns LockBedspaceResult detailing successful 72-hour hold reservation
   */
  public static async validateWindowAndSelectBedspace(
    userId: string,
    category: PriorityCategory,
    bedspaceId: string
  ): Promise<LockBedspaceResult> {
    const countdownState = await BallotingService.getCountdownState(category);

    if (!countdownState.isWindowActive) {
      throw new Error(
        `Balloting window for category '${category}' is currently not active. Please wait until your balloting window opens.`
      );
    }

    // Execute atomic reservation via ReservationService
    return await ReservationService.lockBedspaceAtomically(userId, bedspaceId);
  }
}
