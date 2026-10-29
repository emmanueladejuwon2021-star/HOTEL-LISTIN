/**
 * Disciplinary Service
 * Target Module: [ADMIN-03] Student Disciplinary Flagging & Blacklists
 *
 * Provides database operations for searching student profiles, issuing disciplinary sanctions,
 * revoking/clearing flags, retrieving historical infraction logs, and calculating warden metrics.
 */

import { AuthService } from './authService';
import { DisciplinaryStatus } from '../types/eligibility';
import {
  DisciplinaryRecordItem,
  StudentSearchResult,
  IssueSanctionParams,
  RevokeSanctionParams,
  DisciplinaryMetrics,
} from '../types/disciplinary';

export class DisciplinaryService {
  /**
   * Initializes table schema and indexes for disciplinary management.
   */
  public static async initializeTables(): Promise<void> {
    const client = AuthService.getDbClient();

    // 1. Create disciplinary_records table if not exists with all required columns
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS disciplinary_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED')),
        reason TEXT NOT NULL,
        flagged_at TEXT NOT NULL,
        flagged_by TEXT NOT NULL,
        duration_days INTEGER,
        resolved_at TEXT,
        resolved_by TEXT,
        resolution_note TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: [],
    });

    // Migrations for disciplinary_records if table was created with older minimal schema (user_id as primary key)
    const migrations = [
      `ALTER TABLE disciplinary_records ADD COLUMN id TEXT`,
      `ALTER TABLE disciplinary_records ADD COLUMN flagged_by TEXT DEFAULT 'WARDEN-ADMIN'`,
      `ALTER TABLE disciplinary_records ADD COLUMN duration_days INTEGER`,
      `ALTER TABLE disciplinary_records ADD COLUMN resolved_at TEXT`,
      `ALTER TABLE disciplinary_records ADD COLUMN resolved_by TEXT`,
      `ALTER TABLE disciplinary_records ADD COLUMN resolution_note TEXT`,
    ];

    for (const stmt of migrations) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, ignore
      }
    }

    // 2. Create index on user_id for fast student history queries
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_disciplinary_user ON disciplinary_records(user_id)`,
      args: [],
    });

    // 3. Create index on status for quick metrics aggregation
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_disciplinary_status ON disciplinary_records(status)`,
      args: [],
    });
  }

  /**
   * Searches students by full name, email, or matriculation/staff number.
   *
   * @param query Search string (matric number or name)
   */
  public static async searchStudents(query: string): Promise<StudentSearchResult[]> {
    await this.initializeTables();
    const client = AuthService.getDbClient();
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return [];
    }

    const searchTerm = `%${cleanQuery}%`;

    const sql = `
      SELECT
        u.id as user_id,
        u.full_name,
        u.email,
        u.matric_or_staff_no,
        sp.faculty,
        sp.department,
        sp.level,
        sp.campus,
        dr.status as latest_status,
        dr.reason as latest_reason,
        dr.flagged_at as latest_flagged_at
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN (
        SELECT user_id, status, reason, flagged_at,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY flagged_at DESC) as rn
        FROM disciplinary_records
      ) dr ON u.id = dr.user_id AND dr.rn = 1
      WHERE u.role = 'STUDENT'
        AND (
          LOWER(u.full_name) LIKE ? OR
          LOWER(u.email) LIKE ? OR
          LOWER(COALESCE(u.matric_or_staff_no, '')) LIKE ?
        )
      ORDER BY u.full_name ASC
      LIMIT 25
    `;

    const res = await client.execute({
      sql,
      args: [searchTerm, searchTerm, searchTerm],
    });

    return res.rows.map((row) => ({
      userId: String(row.user_id),
      fullName: String(row.full_name || 'Unknown Student'),
      email: String(row.email || ''),
      matricNumber: String(row.matric_or_staff_no || 'N/A'),
      faculty: String(row.faculty || 'Unassigned'),
      department: String(row.department || 'Unassigned'),
      level: Number(row.level || 100),
      campus: String(row.campus || 'MAIN_CAMPUS'),
      currentStatus: (row.latest_status ? String(row.latest_status) : 'CLEARED') as DisciplinaryStatus,
      latestReason: row.latest_reason ? String(row.latest_reason) : undefined,
      latestFlaggedAt: row.latest_flagged_at ? String(row.latest_flagged_at) : undefined,
    }));
  }

  /**
   * Retrieves full disciplinary history log for a student.
   *
   * @param userId Student user ID
   */
  public static async getStudentDisciplinaryHistory(userId: string): Promise<DisciplinaryRecordItem[]> {
    await this.initializeTables();
    const client = AuthService.getDbClient();

    const sql = `
      SELECT
        COALESCE(dr.id, dr.user_id) as id,
        dr.user_id,
        u.full_name as student_name,
        u.matric_or_staff_no as matric_number,
        sp.department,
        sp.level,
        dr.status,
        dr.reason,
        dr.flagged_at,
        COALESCE(dr.flagged_by, 'WARDEN-ADMIN') as flagged_by,
        dr.duration_days,
        dr.resolved_at,
        dr.resolved_by,
        dr.resolution_note
      FROM disciplinary_records dr
      JOIN users u ON dr.user_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE dr.user_id = ?
      ORDER BY dr.flagged_at DESC
    `;

    const res = await client.execute({
      sql,
      args: [userId],
    });

    return res.rows.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      matricNumber: row.matric_number ? String(row.matric_number) : undefined,
      department: row.department ? String(row.department) : undefined,
      level: row.level ? Number(row.level) : undefined,
      status: String(row.status) as DisciplinaryStatus,
      reason: String(row.reason),
      flaggedAt: String(row.flagged_at),
      flaggedBy: String(row.flagged_by),
      durationDays: row.duration_days != null ? Number(row.duration_days) : null,
      resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
      resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
      resolutionNote: row.resolution_note ? String(row.resolution_note) : null,
    }));
  }

  /**
   * Issues a new disciplinary sanction against a student.
   *
   * @param params IssueSanctionParams
   */
  public static async issueDisciplinarySanction(params: IssueSanctionParams): Promise<boolean> {
    await this.initializeTables();
    const client = AuthService.getDbClient();

    const recordId = `DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Insert new disciplinary log using INSERT OR REPLACE to support legacy schema compatibility
    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (
        id, user_id, status, reason, flagged_at, flagged_by, duration_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordId,
        params.userId,
        params.status,
        params.reason,
        nowIso,
        params.wardenId,
        params.durationDays || null,
      ],
    });

    return true;
  }

  /**
   * Revokes or clears active disciplinary sanctions for a student.
   *
   * @param params RevokeSanctionParams
   */
  public static async revokeDisciplinarySanction(params: RevokeSanctionParams): Promise<boolean> {
    await this.initializeTables();
    const client = AuthService.getDbClient();

    const recordId = `DISC-CLR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Log resolution entry using INSERT OR REPLACE to support legacy schema compatibility
    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (
        id, user_id, status, reason, flagged_at, flagged_by, resolved_at, resolved_by, resolution_note
      ) VALUES (?, ?, 'CLEARED', ?, ?, ?, ?, ?, ?)`,
      args: [
        recordId,
        params.userId,
        `Sanction Cleared: ${params.reason}`,
        nowIso,
        params.wardenId,
        nowIso,
        params.wardenId,
        params.reason,
      ],
    });

    return true;
  }

  /**
   * Calculates overview statistics for the Warden Dashboard.
   */
  public static async getDisciplinaryMetrics(): Promise<DisciplinaryMetrics> {
    await this.initializeTables();
    const client = AuthService.getDbClient();

    const sql = `
      SELECT status, COUNT(*) as cnt
      FROM (
        SELECT user_id, status,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY flagged_at DESC) as rn
        FROM disciplinary_records
      )
      WHERE rn = 1 AND status != 'CLEARED'
      GROUP BY status
    `;

    const res = await client.execute({ sql, args: [] });

    let totalFlagged = 0;
    let totalSuspended = 0;
    let totalRusticated = 0;

    for (const row of res.rows) {
      const st = String(row.status);
      const cnt = Number(row.cnt);
      if (st === 'FLAGGED') totalFlagged += cnt;
      if (st === 'SUSPENDED') totalSuspended += cnt;
      if (st === 'RUSTICATED') totalRusticated += cnt;
    }

    return {
      totalFlagged,
      totalSuspended,
      totalRusticated,
      totalActiveSanctions: totalFlagged + totalSuspended + totalRusticated,
    };
  }
}
