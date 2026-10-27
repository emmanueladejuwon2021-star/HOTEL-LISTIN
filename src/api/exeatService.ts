import { AuthService } from './authService';
import { GatePassService } from './gatepassService';
import {
  ExeatRequest,
  SubmitExeatPayload,
  ReviewExeatPayload,
  ExeatApprovalStatus
} from '../types/exeat';

/**
 * Service managing student overnight hostel leave (Night Exeat) applications,
 * warden approvals, curfew gate verification checks, and history logs.
 *
 * Implements:
 * - [EXEAT-01] Student Night Exeat Application Form & Validation (Issue #61)
 * - [EXEAT-02] Active Approved Exeat Status Banner & Gate Curfew Override (Issue #62)
 * - [EXEAT-03] Implement Night Exeat Application & Warden Approval - Feature Component 3 (Issue #63)
 */
export class ExeatService {
  /**
   * Initializes the Turso libSQL SQLite database schema for exeat requests and column extensions.
   * Ensures foreign key integrity and table structure.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // Ensure exeat_requests table exists with warden_comment column
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS exeat_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        reason TEXT NOT NULL,
        departure_date DATE NOT NULL,
        return_date DATE NOT NULL,
        warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED')) DEFAULT 'PENDING',
        warden_id TEXT,
        warden_comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Check if warden_comment column exists, add if missing for schema migration
    try {
      await client.execute({
        sql: `ALTER TABLE exeat_requests ADD COLUMN warden_comment TEXT`,
        args: []
      });
    } catch {
      // Column already exists, ignore error
    }

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_exeat_student ON exeat_requests(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_exeat_status ON exeat_requests(warden_approval_status)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_exeat_dates ON exeat_requests(departure_date, return_date)`,
      args: []
    });
  }

  /**
   * Submits a new overnight exeat request for a student.
   * Validates required inputs and ensures departure date is on or before return date.
   */
  public static async submitExeatRequest(payload: SubmitExeatPayload): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { studentId, destinationAddress, reason, departureDate, returnDate } = payload;

    // Validate required fields
    if (!studentId || !studentId.trim()) {
      throw new Error('Student ID is required to submit an exeat request.');
    }
    if (!destinationAddress || !destinationAddress.trim()) {
      throw new Error('Destination address is required.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Reason for overnight exeat is required.');
    }
    if (!departureDate || !departureDate.trim()) {
      throw new Error('Departure date is required.');
    }
    if (!returnDate || !returnDate.trim()) {
      throw new Error('Return date is required.');
    }

    // Verify departure date is not after return date
    if (new Date(departureDate) > new Date(returnDate)) {
      throw new Error('Departure date cannot be later than the return date.');
    }

    // Check if student exists in users table
    const studentRes = await client.execute({
      sql: `SELECT id, full_name, matric_or_staff_no FROM users WHERE id = ?`,
      args: [studentId]
    });

    if (studentRes.rows.length === 0) {
      throw new Error(`Student account with ID '${studentId}' was not found.`);
    }

    const studentRow = studentRes.rows[0];

    const exeatId = `exeat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO exeat_requests (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      args: [
        exeatId,
        studentId,
        destinationAddress.trim(),
        reason.trim(),
        departureDate.trim(),
        returnDate.trim(),
        createdAt
      ]
    });

    return {
      id: exeatId,
      studentId,
      studentName: String(studentRow.full_name),
      studentMatric: String(studentRow.matric_or_staff_no),
      destinationAddress: destinationAddress.trim(),
      reason: reason.trim(),
      departureDate: departureDate.trim(),
      returnDate: returnDate.trim(),
      wardenApprovalStatus: 'PENDING',
      createdAt
    };
  }

  /**
   * Retrieves all exeat requests submitted by a specific student sorted by creation date.
   */
  public static async getStudentExeatRequests(studentId: string): Promise<ExeatRequest[]> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.student_id = ?
            ORDER BY e.created_at DESC`,
      args: [studentId]
    });

    return res.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      destinationAddress: String(row.destination_address),
      reason: String(row.reason),
      departureDate: String(row.departure_date),
      returnDate: String(row.return_date),
      wardenApprovalStatus: String(row.warden_approval_status) as ExeatApprovalStatus,
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenComment: row.warden_comment ? String(row.warden_comment) : undefined,
      createdAt: String(row.created_at)
    }));
  }

  /**
   * Checks if a student has an active approved exeat permission covering the specified target date (defaults to today).
   */
  public static async getActiveApprovedExeat(
    studentId: string,
    targetDate?: string
  ): Promise<ExeatRequest | null> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const checkDate = targetDate || new Date().toISOString().split('T')[0];

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.student_id = ?
              AND e.warden_approval_status = 'APPROVED'
              AND e.departure_date <= ?
              AND e.return_date >= ?
            ORDER BY e.created_at DESC
            LIMIT 1`,
      args: [studentId, checkDate, checkDate]
    });

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      destinationAddress: String(row.destination_address),
      reason: String(row.reason),
      departureDate: String(row.departure_date),
      returnDate: String(row.return_date),
      wardenApprovalStatus: 'APPROVED',
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenComment: row.warden_comment ? String(row.warden_comment) : undefined,
      createdAt: String(row.created_at)
    };
  }

  /**
   * Retrieves all pending exeat requests awaiting Warden review across all hostels or for a specific hostel.
   */
  public static async getPendingExeatRequests(): Promise<ExeatRequest[]> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.warden_approval_status = 'PENDING'
            ORDER BY e.created_at ASC`,
      args: []
    });

    return res.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      destinationAddress: String(row.destination_address),
      reason: String(row.reason),
      departureDate: String(row.departure_date),
      returnDate: String(row.return_date),
      wardenApprovalStatus: 'PENDING',
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenComment: row.warden_comment ? String(row.warden_comment) : undefined,
      createdAt: String(row.created_at)
    }));
  }

  /**
   * Reviews and updates the warden approval status (APPROVED or DECLINED) for an exeat request.
   */
  public static async reviewExeatRequest(payload: ReviewExeatPayload): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { exeatId, wardenId, approvalStatus, wardenComment } = payload;

    if (!exeatId) {
      throw new Error('Exeat ID is required to perform a review.');
    }
    if (!wardenId) {
      throw new Error('Warden ID is required to perform a review.');
    }
    if (approvalStatus !== 'APPROVED' && approvalStatus !== 'DECLINED') {
      throw new Error('Approval status must be either APPROVED or DECLINED.');
    }

    const exeatRes = await client.execute({
      sql: `SELECT id FROM exeat_requests WHERE id = ?`,
      args: [exeatId]
    });

    if (exeatRes.rows.length === 0) {
      throw new Error(`Exeat request with ID '${exeatId}' was not found.`);
    }

    await client.execute({
      sql: `UPDATE exeat_requests
            SET warden_approval_status = ?, warden_id = ?, warden_comment = ?
            WHERE id = ?`,
      args: [approvalStatus, wardenId, wardenComment ? wardenComment.trim() : null, exeatId]
    });

    const updatedRes = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.id = ?`,
      args: [exeatId]
    });

    const row = updatedRes.rows[0];
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      destinationAddress: String(row.destination_address),
      reason: String(row.reason),
      departureDate: String(row.departure_date),
      returnDate: String(row.return_date),
      wardenApprovalStatus: String(row.warden_approval_status) as ExeatApprovalStatus,
      wardenId: String(row.warden_id),
      wardenComment: row.warden_comment ? String(row.warden_comment) : undefined,
      createdAt: String(row.created_at)
    };
  }
}
