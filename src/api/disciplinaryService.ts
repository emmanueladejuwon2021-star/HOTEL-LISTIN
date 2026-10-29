import { AuthService } from './authService';
import { DisciplinaryRecord, FlagStudentParams, DisciplinaryFilter } from '../types/disciplinary';

/**
 * DisciplinaryService class managing warden actions for student disciplinary flagging,
 * suspension, blacklisting, and status clearance against the Turso libSQL SQLite database.
 * Follows strict zero-mock policy and includes clear English comments.
 */
export class DisciplinaryService {
  /**
   * Initializes the disciplinary_records table in Turso libSQL SQLite database if it does not exist yet.
   */
  public static async initializeSchema(): Promise<void> {
    const client = AuthService.getDbClient();

    // Ensure users and student_profiles dependencies are created first
    await AuthService.initializeSchema();

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

    try {
      await client.execute({
        sql: `ALTER TABLE disciplinary_records ADD COLUMN flagged_by_warden_id TEXT`,
        args: []
      });
    } catch {
      // Column already exists in schema
    }
  }

  /**
   * Flags, suspends, rusticates, or clears a student's disciplinary standing by student matric/staff number.
   *
   * @param params Object containing student identifier, target status, reason, and warden staff ID.
   * @returns Updated DisciplinaryRecord object.
   */
  public static async flagStudent(params: FlagStudentParams): Promise<DisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.matricOrStaffNo || !params.reason.trim()) {
      throw new Error('Student identifier and disciplinary reason are required.');
    }

    // Step 1: Find student user record by matric_or_staff_no
    const userRes = await client.execute({
      sql: `SELECT u.id, u.matric_or_staff_no, u.full_name, sp.faculty, sp.department, sp.campus
            FROM users u
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            WHERE u.matric_or_staff_no = ? LIMIT 1`,
      args: [params.matricOrStaffNo.trim()]
    });

    if (userRes.rows.length === 0) {
      throw new Error(`No student found with matriculation number or staff ID '${params.matricOrStaffNo}'.`);
    }

    const userRow = userRes.rows[0];
    const userId = String(userRow.id);
    const nowIso = new Date().toISOString();

    // Step 2: Upsert into disciplinary_records table
    await client.execute({
      sql: `INSERT INTO disciplinary_records (user_id, status, reason, flagged_at, flagged_by_warden_id)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              status = excluded.status,
              reason = excluded.reason,
              flagged_at = excluded.flagged_at,
              flagged_by_warden_id = excluded.flagged_by_warden_id`,
      args: [userId, params.status, params.reason.trim(), nowIso, params.wardenId]
    });

    return {
      userId,
      matricOrStaffNo: String(userRow.matric_or_staff_no),
      fullName: String(userRow.full_name),
      faculty: userRow.faculty ? String(userRow.faculty) : undefined,
      department: userRow.department ? String(userRow.department) : undefined,
      campus: userRow.campus ? (String(userRow.campus) as 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA') : undefined,
      status: params.status,
      reason: params.reason.trim(),
      flaggedAt: nowIso,
      flaggedByWardenId: params.wardenId
    };
  }

  /**
   * Retrieves all disciplinary records from Turso database matching optional status and search filters.
   *
   * @param filter Filter criteria like specific status or matric/name search string.
   * @returns Array of DisciplinaryRecord objects.
   */
  public static async getDisciplinaryRecords(filter?: DisciplinaryFilter): Promise<DisciplinaryRecord[]> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT dr.user_id, dr.status, dr.reason, dr.flagged_at, dr.flagged_by_warden_id,
                      u.matric_or_staff_no, u.full_name, sp.faculty, sp.department, sp.campus
               FROM disciplinary_records dr
               JOIN users u ON dr.user_id = u.id
               LEFT JOIN student_profiles sp ON u.id = sp.user_id`;

    const clauses: string[] = [];
    const args: (string | number)[] = [];

    if (filter?.status) {
      clauses.push(`dr.status = ?`);
      args.push(filter.status);
    }

    if (filter?.searchQuery && filter.searchQuery.trim()) {
      const search = `%${filter.searchQuery.trim()}%`;
      clauses.push(`(u.matric_or_staff_no LIKE ? OR u.full_name LIKE ? OR dr.reason LIKE ?)`);
      args.push(search, search, search);
    }

    if (clauses.length > 0) {
      sql += ` WHERE ` + clauses.join(' AND ');
    }

    sql += ` ORDER BY dr.flagged_at DESC`;

    const res = await client.execute({ sql, args });

    return res.rows.map((row) => ({
      userId: String(row.user_id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      faculty: row.faculty ? String(row.faculty) : undefined,
      department: row.department ? String(row.department) : undefined,
      campus: row.campus ? (String(row.campus) as 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA') : undefined,
      status: String(row.status) as any,
      reason: String(row.reason || ''),
      flaggedAt: String(row.flagged_at),
      flaggedByWardenId: row.flagged_by_warden_id ? String(row.flagged_by_warden_id) : undefined
    }));
  }

  /**
   * Fetches the specific disciplinary record for a student by their user ID.
   *
   * @param userId Unique student user ID.
   * @returns DisciplinaryRecord or null if no record exists.
   */
  public static async getStudentDisciplinaryHistory(userId: string): Promise<DisciplinaryRecord | null> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT dr.user_id, dr.status, dr.reason, dr.flagged_at, dr.flagged_by_warden_id,
                    u.matric_or_staff_no, u.full_name, sp.faculty, sp.department, sp.campus
             FROM disciplinary_records dr
             JOIN users u ON dr.user_id = u.id
             LEFT JOIN student_profiles sp ON u.id = sp.user_id
             WHERE dr.user_id = ? LIMIT 1`,
      args: [userId]
    });

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      userId: String(row.user_id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      faculty: row.faculty ? String(row.faculty) : undefined,
      department: row.department ? String(row.department) : undefined,
      campus: row.campus ? (String(row.campus) as 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA') : undefined,
      status: String(row.status) as any,
      reason: String(row.reason || ''),
      flaggedAt: String(row.flagged_at),
      flaggedByWardenId: row.flagged_by_warden_id ? String(row.flagged_by_warden_id) : undefined
    };
  }

  /**
   * Lifts a disciplinary flag or sanction for a student, reverting their standing status to 'CLEARED'.
   *
   * @param userId Unique student user ID to clear.
   * @param wardenId ID of the Hall Warden clearing the flag.
   */
  public static async clearDisciplinaryFlag(userId: string, wardenId: string): Promise<DisciplinaryRecord> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const nowIso = new Date().toISOString();

    await client.execute({
      sql: `UPDATE disciplinary_records
            SET status = 'CLEARED',
                reason = 'Sanction lifted and cleared by Hall Warden',
                flagged_at = ?,
                flagged_by_warden_id = ?
            WHERE user_id = ?`,
      args: [nowIso, wardenId, userId]
    });

    const updatedRecord = await DisciplinaryService.getStudentDisciplinaryHistory(userId);
    if (!updatedRecord) {
      throw new Error(`Failed to retrieve record after clearing disciplinary flag for user '${userId}'.`);
    }

    return updatedRecord;
  }
}
