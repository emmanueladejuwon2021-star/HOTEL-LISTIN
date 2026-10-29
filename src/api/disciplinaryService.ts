import { Client } from '@libsql/client';
import { AuthService } from './authService';
import {
  DisciplinaryRecord,
  DisciplinaryStatus,
  FlagStudentParams,
  LiftFlagParams
} from '../types/disciplinary';

/**
 * Service class that manages student disciplinary flagging, blacklists, and sanction history.
 * Connects directly to the Turso libSQL edge database following strict zero-mock principles.
 *
 * Provides features for Hall Wardens to:
 * - Search and list disciplinary flags and blacklisted students
 * - Issue new disciplinary flags or suspension sanctions against students
 * - Lift active sanctions with formal resolution explanations
 * - Query individual student disciplinary standing
 *
 * All functions are heavily commented in simple English for clarity.
 */
export class DisciplinaryService {
  /**
   * Initializes the database schema for disciplinary management.
   * Ensures the `disciplinary_records` table and supporting columns exist.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Table storing history and active state of student disciplinary flags and blacklists
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS disciplinary_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED', 'BLACK_LISTED')) NOT NULL,
        reason TEXT NOT NULL,
        warden_id TEXT,
        resolution_notes TEXT,
        flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Migration for pre-existing table schema created by other services
    const migrationColumns = [
      `ALTER TABLE disciplinary_records ADD COLUMN id TEXT`,
      `ALTER TABLE disciplinary_records ADD COLUMN warden_id TEXT`,
      `ALTER TABLE disciplinary_records ADD COLUMN resolution_notes TEXT`,
      `ALTER TABLE disciplinary_records ADD COLUMN resolved_at DATETIME`
    ];

    for (const stmt of migrationColumns) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, safe to ignore
      }
    }

    // Indexes for fast lookup by student ID and status
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_disciplinary_user ON disciplinary_records(user_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_disciplinary_status ON disciplinary_records(status)`,
      args: []
    });
  }

  /**
   * Helper method to convert a database row into a structured DisciplinaryRecord object.
   */
  private static mapRowToRecord(row: any): DisciplinaryRecord {
    return {
      id: String(row.id || row.user_id),
      userId: String(row.user_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      matricOrStaffNo: row.matric_or_staff_no ? String(row.matric_or_staff_no) : undefined,
      department: row.department ? String(row.department) : undefined,
      level: row.level ? Number(row.level) : undefined,
      status: String(row.status) as DisciplinaryStatus,
      reason: String(row.reason),
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenName: row.warden_name ? String(row.warden_name) : undefined,
      resolutionNotes: row.resolution_notes ? String(row.resolution_notes) : undefined,
      flaggedAt: String(row.flagged_at || new Date().toISOString()),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined
    };
  }

  /**
   * Flags a student for a disciplinary infraction or adds them to the blacklist.
   * Updates or creates a record in `disciplinary_records` in Turso DB.
   *
   * @param params Details of student, status, reason, and warden taking action
   * @returns Newly created or updated DisciplinaryRecord
   */
  public static async flagStudent(params: FlagStudentParams): Promise<DisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.userId || !params.userId.trim()) {
      throw new Error('Student user ID is required to apply a disciplinary flag.');
    }
    if (!params.reason || !params.reason.trim()) {
      throw new Error('A valid reason for the disciplinary flag must be provided.');
    }

    const cleanUserId = params.userId.trim();
    const cleanReason = params.reason.trim();
    const recordId = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Verify student exists in system
    const userCheck = await client.execute({
      sql: `SELECT id, full_name, matric_or_staff_no FROM users WHERE id = ? AND role = 'STUDENT'`,
      args: [cleanUserId]
    });

    if (userCheck.rows.length === 0) {
      throw new Error(`Student with ID ${cleanUserId} was not found in the database.`);
    }

    // Upsert or insert new record
    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (id, user_id, status, reason, warden_id, flagged_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [recordId, cleanUserId, params.status, cleanReason, params.wardenId]
    });

    return await DisciplinaryService.getStudentStanding(cleanUserId);
  }

  /**
   * Lifts an active disciplinary flag or blacklist sanction from a student.
   * Sets status to 'CLEARED' and adds resolution notes.
   *
   * @param params Details including userId, wardenId, and resolutionNotes
   * @returns Updated DisciplinaryRecord
   */
  public static async liftDisciplinaryFlag(params: LiftFlagParams): Promise<DisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.userId || !params.userId.trim()) {
      throw new Error('Student user ID is required to lift a disciplinary flag.');
    }
    if (!params.resolutionNotes || !params.resolutionNotes.trim()) {
      throw new Error('Official resolution notes are required when lifting a disciplinary sanction.');
    }

    const cleanUserId = params.userId.trim();
    const cleanNotes = params.resolutionNotes.trim();
    const recordId = `disc_lift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Record resolution entry using upsert
    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (id, user_id, status, reason, warden_id, resolution_notes, flagged_at, resolved_at)
            VALUES (?, ?, 'CLEARED', 'Sanction lifted / Disciplinary cleared', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [recordId, cleanUserId, params.wardenId, cleanNotes]
    });

    return await DisciplinaryService.getStudentStanding(cleanUserId);
  }

  /**
   * Retrieves all disciplinary records or filters them by status / search term.
   * Joining user details to show student names and matriculation numbers.
   *
   * @param statusFilter Optional filter by DisciplinaryStatus
   * @param searchQuery Optional search term (name or matric number)
   * @returns Array of DisciplinaryRecord objects
   */
  public static async getDisciplinaryRecords(
    statusFilter?: DisciplinaryStatus | 'ALL',
    searchQuery?: string
  ): Promise<DisciplinaryRecord[]> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `
      SELECT COALESCE(dr.id, dr.user_id) as id, dr.user_id, dr.status, dr.reason, dr.warden_id, dr.resolution_notes, dr.flagged_at, dr.resolved_at,
             u_stu.full_name as student_name, u_stu.matric_or_staff_no,
             sp.department, sp.level,
             u_war.full_name as warden_name
      FROM disciplinary_records dr
      JOIN users u_stu ON dr.user_id = u_stu.id
      LEFT JOIN student_profiles sp ON dr.user_id = sp.user_id
      LEFT JOIN users u_war ON dr.warden_id = u_war.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (statusFilter && statusFilter !== 'ALL') {
      sql += ` AND dr.status = ?`;
      args.push(statusFilter);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      sql += ` AND (u_stu.full_name LIKE ? OR u_stu.matric_or_staff_no LIKE ?)`;
      args.push(q, q);
    }

    sql += ` ORDER BY dr.flagged_at DESC`;

    const result = await client.execute({ sql, args });
    return result.rows.map(row => DisciplinaryService.mapRowToRecord(row));
  }

  /**
   * Retrieves the current active standing or latest disciplinary record for a specific student.
   *
   * @param userId Unique student ID
   * @returns Latest DisciplinaryRecord for the student
   */
  public static async getStudentStanding(userId: string): Promise<DisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `
        SELECT COALESCE(dr.id, dr.user_id) as id, dr.user_id, dr.status, dr.reason, dr.warden_id, dr.resolution_notes, dr.flagged_at, dr.resolved_at,
               u_stu.full_name as student_name, u_stu.matric_or_staff_no,
               sp.department, sp.level,
               u_war.full_name as warden_name
        FROM disciplinary_records dr
        JOIN users u_stu ON dr.user_id = u_stu.id
        LEFT JOIN student_profiles sp ON dr.user_id = sp.user_id
        LEFT JOIN users u_war ON dr.warden_id = u_war.id
        WHERE dr.user_id = ?
        ORDER BY dr.flagged_at DESC
        LIMIT 1
      `,
      args: [userId.trim()]
    });

    if (result.rows.length === 0) {
      // If no explicit record exists, return default CLEARED record
      const userRes = await client.execute({
        sql: `SELECT full_name, matric_or_staff_no FROM users WHERE id = ?`,
        args: [userId.trim()]
      });
      const name = userRes.rows.length > 0 ? String(userRes.rows[0].full_name) : 'Student';
      const matric = userRes.rows.length > 0 ? String(userRes.rows[0].matric_or_staff_no) : '';

      return {
        id: `default_${userId}`,
        userId: userId.trim(),
        studentName: name,
        matricOrStaffNo: matric,
        status: 'CLEARED',
        reason: 'No disciplinary infractions recorded. Good standing.',
        flaggedAt: new Date().toISOString()
      };
    }

    return DisciplinaryService.mapRowToRecord(result.rows[0]);
  }
}
