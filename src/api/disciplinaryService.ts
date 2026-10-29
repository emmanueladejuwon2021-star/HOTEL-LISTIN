import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { EligibilityService } from './eligibilityService';
import {
  StudentDisciplinarySearchResult,
  IssueDisciplinarySanctionParams,
  ClearDisciplinarySanctionParams,
  DisciplinaryLogEntry,
  DisciplinarySummaryMetrics
} from '../types/disciplinary';
import { DisciplinaryStatus } from '../types/eligibility';

/**
 * Service handling student disciplinary flagging, suspensions, rustications,
 * sanction clearances, student profile search, and audit history logs for Hall Wardens.
 * Follows a strict zero-mock policy using real Turso libSQL SQLite queries.
 */
export class DisciplinaryService {
  /**
   * Initializes schema requirements for disciplinary tracking tables.
   */
  public static async initializeSchema(): Promise<void> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.batch([
      `CREATE TABLE IF NOT EXISTS disciplinary_records (
        user_id TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED')) DEFAULT 'CLEARED',
        reason TEXT,
        warden_id TEXT,
        flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        cleared_at DATETIME,
        clearance_note TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS disciplinary_audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED')) NOT NULL,
        reason TEXT NOT NULL,
        warden_id TEXT NOT NULL,
        flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        cleared_at DATETIME,
        clearance_note TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`
    ], 'write');

    // Safe schema migrations for disciplinary_records table
    const migrationColumns = [
      `ALTER TABLE disciplinary_records ADD COLUMN warden_id TEXT`,
      `ALTER TABLE disciplinary_records ADD COLUMN expires_at DATETIME`,
      `ALTER TABLE disciplinary_records ADD COLUMN cleared_at DATETIME`,
      `ALTER TABLE disciplinary_records ADD COLUMN clearance_note TEXT`
    ];

    for (const stmt of migrationColumns) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, ignore error
      }
    }
  }

  /**
   * Searches students by name, matriculation number, or user ID for Warden review.
   *
   * @param query Search query string (matric number, student name, or user ID)
   * @returns List of matching student profiles with their active disciplinary status
   */
  public static async searchStudents(query: string): Promise<StudentDisciplinarySearchResult[]> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const trimmed = query.trim();
    const searchTerm = `%${trimmed}%`;
    const result = await client.execute({
      sql: `SELECT u.id, u.matric_or_staff_no, u.full_name,
                   sp.faculty, sp.department, sp.level, sp.campus,
                   dr.status as current_status, dr.reason as current_reason,
                   dr.flagged_at, dr.expires_at
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN disciplinary_records dr ON u.id = dr.user_id
            WHERE u.role = 'STUDENT' AND u.is_active = 1
              AND (u.matric_or_staff_no LIKE ? OR u.full_name LIKE ? OR u.id = ?)
            ORDER BY u.full_name ASC
            LIMIT 25`,
      args: [searchTerm, searchTerm, trimmed]
    });

    return result.rows.map((row) => ({
      userId: String(row.id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      faculty: String(row.faculty),
      department: String(row.department),
      level: Number(row.level),
      campus: String(row.campus),
      currentDisciplinaryStatus: row.current_status ? (String(row.current_status) as DisciplinaryStatus) : 'CLEARED',
      currentReason: row.current_reason ? String(row.current_reason) : undefined,
      flaggedAt: row.flagged_at ? String(row.flagged_at) : undefined,
      expiresAt: row.expires_at ? String(row.expires_at) : undefined
    }));
  }

  /**
   * Issues or updates a student's disciplinary sanction (FLAGGED, SUSPENDED, or RUSTICATED).
   *
   * @param params IssueDisciplinarySanctionParams payload
   * @returns Updated StudentDisciplinarySearchResult
   */
  public static async issueSanction(params: IssueDisciplinarySanctionParams): Promise<StudentDisciplinarySearchResult> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.reason.trim()) {
      throw new Error('Please specify a detailed reason for issuing this disciplinary sanction.');
    }

    const flaggedAt = new Date().toISOString();
    let expiresAt: string | null = null;

    if (params.durationDays && params.durationDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + params.durationDays);
      expiresAt = expDate.toISOString();
    }

    // Upsert into disciplinary_records
    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (user_id, status, reason, warden_id, flagged_at, expires_at, cleared_at, clearance_note)
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
      args: [params.studentUserId, params.status, params.reason.trim(), params.wardenId, flaggedAt, expiresAt]
    });

    // Record audit log
    const auditId = `disc_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await client.execute({
      sql: `INSERT INTO disciplinary_audit_logs (id, user_id, status, reason, warden_id, flagged_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [auditId, params.studentUserId, params.status, params.reason.trim(), params.wardenId, flaggedAt, expiresAt]
    });

    const searchResults = await DisciplinaryService.searchStudents(params.studentUserId);
    if (searchResults.length === 0) {
      throw new Error('Failed to update student disciplinary record.');
    }
    return searchResults[0];
  }

  /**
   * Clears a student's active disciplinary sanction and restores their CLEARED standing.
   *
   * @param params ClearDisciplinarySanctionParams payload
   * @returns Updated StudentDisciplinarySearchResult
   */
  public static async clearSanction(params: ClearDisciplinarySanctionParams): Promise<StudentDisciplinarySearchResult> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const clearedAt = new Date().toISOString();
    const note = params.clearanceNote.trim() || 'Sanction cleared by Hall Warden.';

    await client.execute({
      sql: `UPDATE disciplinary_records
            SET status = 'CLEARED',
                clearance_note = ?,
                cleared_at = ?
            WHERE user_id = ?`,
      args: [note, clearedAt, params.studentUserId]
    });

    // Record audit log entry for clearance action
    const auditId = `disc_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await client.execute({
      sql: `INSERT INTO disciplinary_audit_logs (id, user_id, status, reason, warden_id, flagged_at, cleared_at, clearance_note)
            VALUES (?, ?, 'CLEARED', ?, ?, ?, ?, ?)`,
      args: [auditId, params.studentUserId, 'Sanction Cleared', params.wardenId, clearedAt, clearedAt, note]
    });

    const searchResults = await DisciplinaryService.searchStudents(params.studentUserId);
    if (searchResults.length === 0) {
      throw new Error('Failed to update student disciplinary status.');
    }
    return searchResults[0];
  }

  /**
   * Retrieves active blacklisted or flagged students for Hall Wardens.
   *
   * @returns Array of active blacklisted student records
   */
  public static async getActiveBlacklist(): Promise<StudentDisciplinarySearchResult[]> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT u.id, u.matric_or_staff_no, u.full_name,
                   sp.faculty, sp.department, sp.level, sp.campus,
                   dr.status as current_status, dr.reason as current_reason,
                   dr.flagged_at, dr.expires_at
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            JOIN disciplinary_records dr ON u.id = dr.user_id
            WHERE dr.status IN ('FLAGGED', 'SUSPENDED', 'RUSTICATED')
            ORDER BY dr.flagged_at DESC`,
      args: []
    });

    return result.rows.map((row) => ({
      userId: String(row.id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      faculty: String(row.faculty),
      department: String(row.department),
      level: Number(row.level),
      campus: String(row.campus),
      currentDisciplinaryStatus: String(row.current_status) as DisciplinaryStatus,
      currentReason: row.current_reason ? String(row.current_reason) : undefined,
      flaggedAt: row.flagged_at ? String(row.flagged_at) : undefined,
      expiresAt: row.expires_at ? String(row.expires_at) : undefined
    }));
  }

  /**
   * Fetches summary disciplinary metrics for Hall Warden dashboard.
   */
  public static async getSummaryMetrics(): Promise<DisciplinarySummaryMetrics> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT status, COUNT(*) as cnt
            FROM disciplinary_records
            WHERE status IN ('FLAGGED', 'SUSPENDED', 'RUSTICATED')
            GROUP BY status`,
      args: []
    });

    let totalFlaggedCount = 0;
    let totalSuspendedCount = 0;
    let totalRusticatedCount = 0;

    result.rows.forEach((row) => {
      const status = String(row.status);
      const cnt = Number(row.cnt);
      if (status === 'FLAGGED') totalFlaggedCount = cnt;
      if (status === 'SUSPENDED') totalSuspendedCount = cnt;
      if (status === 'RUSTICATED') totalRusticatedCount = cnt;
    });

    return {
      totalActiveSanctions: totalFlaggedCount + totalSuspendedCount + totalRusticatedCount,
      totalFlaggedCount,
      totalSuspendedCount,
      totalRusticatedCount
    };
  }

  /**
   * Retrieves full disciplinary audit log history for a given student or overall system.
   */
  public static async getAuditLogs(studentUserId?: string): Promise<DisciplinaryLogEntry[]> {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT dal.id, dal.user_id, dal.status, dal.reason, dal.warden_id, dal.flagged_at, dal.expires_at, dal.cleared_at, dal.clearance_note,
                      u.full_name, u.matric_or_staff_no
               FROM disciplinary_audit_logs dal
               JOIN users u ON dal.user_id = u.id`;
    const args: (string | number)[] = [];

    if (studentUserId) {
      sql += ` WHERE dal.user_id = ?`;
      args.push(studentUserId);
    }

    sql += ` ORDER BY dal.flagged_at DESC LIMIT 50`;

    const result = await client.execute({ sql, args });

    return result.rows.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      studentName: row.full_name ? String(row.full_name) : undefined,
      matricNo: row.matric_or_staff_no ? String(row.matric_or_staff_no) : undefined,
      status: String(row.status) as DisciplinaryStatus,
      reason: String(row.reason),
      wardenId: String(row.warden_id),
      flaggedAt: String(row.flagged_at),
      expiresAt: row.expires_at ? String(row.expires_at) : undefined,
      clearedAt: row.cleared_at ? String(row.cleared_at) : undefined,
      clearanceNote: row.clearance_note ? String(row.clearance_note) : undefined
    }));
  }
}
