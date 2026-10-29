import { AuthService } from './authService';
import { DisciplinaryStatus } from '../types/eligibility';

/**
 * Interface representing a student's complete disciplinary profile record
 * as viewed and managed by Hall Wardens and Student Affairs officials.
 */
export interface StudentDisciplinaryRecord {
  /** Unique ID of the student */
  userId: string;
  /** Student's full official name */
  fullName: string;
  /** Official UNILAG matriculation or UTME registration number */
  matricNo: string;
  /** University email address */
  email: string;
  /** Assigned academic faculty */
  faculty?: string;
  /** Assigned academic department */
  department?: string;
  /** Current study level (e.g. 100, 200, 300, 400, 500) */
  level?: number;
  /** Primary campus location (MAIN_CAMPUS or CMUL_IDI_ARABA) */
  campus?: string;
  /** Current disciplinary standing status */
  status: DisciplinaryStatus;
  /** Detailed official reason or violation description for the current status */
  reason: string;
  /** ISO timestamp when the disciplinary record was flagged or updated */
  flaggedAt: string;
  /** Optional ID of the Hall Warden or admin officer who issued the disciplinary action */
  flaggedByWardenId?: string;
}

/**
 * Service managing student disciplinary standings, violation flagging, hall suspensions,
 * rustication records, and disciplinary clearances for Hall Wardens and Student Affairs officials.
 *
 * Implements:
 * - [ADMIN-01] Student Disciplinary Flagging & Blacklists (Issue #81)
 *
 * Connects directly to the live Turso libSQL SQLite database without any mock data or fake stubs.
 */
export class DisciplinaryService {
  /**
   * Initializes the Turso libSQL database schema for student disciplinary records.
   * Ensures the disciplinary_records table and performance indexes exist before any read/write operations.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Create disciplinary_records table if it does not exist yet
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS disciplinary_records (
        user_id TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED')) DEFAULT 'CLEARED',
        reason TEXT,
        flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        flagged_by_warden_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Safely attempt migration for existing table created in other modules
    try {
      await client.execute({
        sql: `ALTER TABLE disciplinary_records ADD COLUMN flagged_by_warden_id TEXT`,
        args: []
      });
    } catch {}

    // Create index for fast status filtering
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_disciplinary_status ON disciplinary_records(status)`,
      args: []
    });
  }

  /**
   * Flags or updates a student's disciplinary standing status (e.g. FLAGGED, SUSPENDED, RUSTICATED).
   *
   * @param userId Unique ID of the student receiving the disciplinary sanction
   * @param status New disciplinary status ('FLAGGED', 'SUSPENDED', or 'RUSTICATED')
   * @param reason Detailed explanation of the hostel violation or disciplinary ground
   * @param wardenId ID of the Hall Warden or Student Affairs officer logging the sanction
   * @returns Updated StudentDisciplinaryRecord object
   */
  public static async flagStudent(
    userId: string,
    status: DisciplinaryStatus,
    reason: string,
    wardenId: string = 'sys_warden_admin'
  ): Promise<StudentDisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    // Validate that required inputs are provided
    if (!userId || !userId.trim()) {
      throw new Error('Student user ID is required to flag a disciplinary record.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('A detailed reason or violation description is required when flagging a student.');
    }

    // Verify student exists in the database
    const userCheck = await client.execute({
      sql: `SELECT u.id, u.full_name, u.matric_or_staff_no, u.email,
                   sp.faculty, sp.department, sp.level, sp.campus
            FROM users u
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            WHERE u.id = ?`,
      args: [userId]
    });

    if (userCheck.rows.length === 0) {
      throw new Error(`Student with ID '${userId}' was not found in the university user directory.`);
    }

    const userRow = userCheck.rows[0];
    const timestamp = new Date().toISOString();

    // Insert or replace the disciplinary record in Turso DB
    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (user_id, status, reason, flagged_at, flagged_by_warden_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [userId, status, reason.trim(), timestamp, wardenId]
    });

    return {
      userId,
      fullName: String(userRow.full_name),
      matricNo: String(userRow.matric_or_staff_no),
      email: String(userRow.email),
      faculty: userRow.faculty ? String(userRow.faculty) : undefined,
      department: userRow.department ? String(userRow.department) : undefined,
      level: userRow.level ? Number(userRow.level) : undefined,
      campus: userRow.campus ? String(userRow.campus) : undefined,
      status,
      reason: reason.trim(),
      flaggedAt: timestamp,
      flaggedByWardenId: wardenId
    };
  }

  /**
   * Retrieves the current disciplinary record for a specific student.
   *
   * @param userId Unique ID of the student
   * @returns StudentDisciplinaryRecord or default CLEARED record if no sanctions exist
   */
  public static async getDisciplinaryRecord(userId: string): Promise<StudentDisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT u.id as user_id, u.full_name, u.matric_or_staff_no, u.email,
                   sp.faculty, sp.department, sp.level, sp.campus,
                   dr.status, dr.reason, dr.flagged_at, dr.flagged_by_warden_id
            FROM users u
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN disciplinary_records dr ON u.id = dr.user_id
            WHERE u.id = ?`,
      args: [userId]
    });

    if (result.rows.length === 0) {
      throw new Error(`Student with ID '${userId}' not found.`);
    }

    const row = result.rows[0];
    const status = row.status ? (String(row.status) as DisciplinaryStatus) : 'CLEARED';
    const reason = row.reason ? String(row.reason) : 'No active disciplinary sanctions or hostel violations recorded.';
    const flaggedAt = row.flagged_at ? String(row.flagged_at) : new Date().toISOString();

    return {
      userId: String(row.user_id),
      fullName: String(row.full_name),
      matricNo: String(row.matric_or_staff_no),
      email: String(row.email),
      faculty: row.faculty ? String(row.faculty) : undefined,
      department: row.department ? String(row.department) : undefined,
      level: row.level ? Number(row.level) : undefined,
      campus: row.campus ? String(row.campus) : undefined,
      status,
      reason,
      flaggedAt,
      flaggedByWardenId: row.flagged_by_warden_id ? String(row.flagged_by_warden_id) : undefined
    };
  }

  /**
   * Retrieves a list of student disciplinary records, with optional filtering by status and search query.
   *
   * @param statusFilter Optional filter ('ALL', 'FLAGGED', 'SUSPENDED', 'RUSTICATED', or 'CLEARED')
   * @param searchQuery Optional search string to match student name or matric number
   * @returns Array of StudentDisciplinaryRecord objects
   */
  public static async getDisciplinaryList(
    statusFilter?: string,
    searchQuery?: string
  ): Promise<StudentDisciplinaryRecord[]> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT u.id as user_id, u.full_name, u.matric_or_staff_no, u.email,
                      sp.faculty, sp.department, sp.level, sp.campus,
                      dr.status, dr.reason, dr.flagged_at, dr.flagged_by_warden_id
               FROM users u
               LEFT JOIN student_profiles sp ON u.id = sp.user_id
               LEFT JOIN disciplinary_records dr ON u.id = dr.user_id
               WHERE u.role = 'STUDENT'`;

    const args: any[] = [];

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'CLEARED') {
        sql += ` AND (dr.status IS NULL OR dr.status = 'CLEARED')`;
      } else {
        sql += ` AND dr.status = ?`;
        args.push(statusFilter);
      }
    }

    if (searchQuery && searchQuery.trim()) {
      const term = `%${searchQuery.trim()}%`;
      sql += ` AND (u.full_name LIKE ? OR u.matric_or_staff_no LIKE ? OR u.email LIKE ?)`;
      args.push(term, term, term);
    }

    sql += ` ORDER BY CASE WHEN dr.status IN ('SUSPENDED', 'RUSTICATED', 'FLAGGED') THEN 1 ELSE 2 END, dr.flagged_at DESC`;

    const result = await client.execute({ sql, args });

    return result.rows.map(row => {
      const status = row.status ? (String(row.status) as DisciplinaryStatus) : 'CLEARED';
      const reason = row.reason ? String(row.reason) : 'Good standing. No active disciplinary violations.';
      const flaggedAt = row.flagged_at ? String(row.flagged_at) : new Date().toISOString();

      return {
        userId: String(row.user_id),
        fullName: String(row.full_name),
        matricNo: String(row.matric_or_staff_no),
        email: String(row.email),
        faculty: row.faculty ? String(row.faculty) : undefined,
        department: row.department ? String(row.department) : undefined,
        level: row.level ? Number(row.level) : undefined,
        campus: row.campus ? String(row.campus) : undefined,
        status,
        reason,
        flaggedAt,
        flaggedByWardenId: row.flagged_by_warden_id ? String(row.flagged_by_warden_id) : undefined
      };
    });
  }

  /**
   * Resets or clears a student's disciplinary status back to 'CLEARED' (lfting sanctions).
   *
   * @param userId Unique ID of the student
   * @param wardenId ID of the Hall Warden or admin officer lifting the sanction
   * @param remark Optional administrative clearance note
   * @returns Updated StudentDisciplinaryRecord object with CLEARED status
   */
  public static async clearDisciplinaryStatus(
    userId: string,
    wardenId: string = 'sys_warden_admin',
    remark: string = 'Disciplinary sanction cleared by Hall Warden'
  ): Promise<StudentDisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!userId || !userId.trim()) {
      throw new Error('Student user ID is required to clear disciplinary standing.');
    }

    const timestamp = new Date().toISOString();

    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (user_id, status, reason, flagged_at, flagged_by_warden_id)
            VALUES (?, 'CLEARED', ?, ?, ?)`,
      args: [userId, remark.trim(), timestamp, wardenId]
    });

    return await DisciplinaryService.getDisciplinaryRecord(userId);
  }
}
