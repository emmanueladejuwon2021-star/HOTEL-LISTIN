import { AuthService } from './authService';
import {
  ExeatRequest,
  ApplyExeatParams,
  ReviewExeatParams,
  ExeatValidationResult,
  ExeatApprovalStatus
} from '../types/exeat';

/**
 * ExeatService handles all backend database operations and workflow logic for student overnight exeat applications
 * and warden permission approvals on the Turso libSQL edge SQLite database.
 *
 * Implements:
 * - [EXEAT-01] Night Exeat Application & Warden Approval (Issue #61)
 * - Strict Zero-Mock Policy: All operations execute real Turso libSQL SQLite queries.
 * - Clear English comments for non-technical team members and university stakeholders.
 */
export class ExeatService {
  /**
   * Initializes the Turso libSQL SQLite database schema for exeat tracking.
   * Ensures the `exeat_requests` table and performance indexes exist before any query runs.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Create exeat_requests table
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Attempt to add warden_comment and updated_at columns if schema previously created without them
    try {
      await client.execute({
        sql: `ALTER TABLE exeat_requests ADD COLUMN warden_comment TEXT`,
        args: []
      });
    } catch {}

    try {
      await client.execute({
        sql: `ALTER TABLE exeat_requests ADD COLUMN updated_at DATETIME`,
        args: []
      });
    } catch {}

    // 2. Create database indexes for performance
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
   * Validates form inputs for an overnight exeat request before submitting to the database.
   *
   * @param destinationAddress Street or city address where student will stay
   * @param reason Explanation for overnight leave
   * @param departureDate Planned departure date (YYYY-MM-DD)
   * @param returnDate Planned return date (YYYY-MM-DD)
   * @returns ExeatValidationResult containing boolean `isValid` and optional `errorMessage`
   */
  public static validateExeatForm(
    destinationAddress: string,
    reason: string,
    departureDate: string,
    returnDate: string
  ): ExeatValidationResult {
    if (!destinationAddress || destinationAddress.trim().length < 5) {
      return {
        isValid: false,
        errorMessage: 'Destination address is required and must be at least 5 characters long.'
      };
    }

    if (!reason || reason.trim().length < 5) {
      return {
        isValid: false,
        errorMessage: 'Reason for overnight exeat is required and must be at least 5 characters long.'
      };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!departureDate || !dateRegex.test(departureDate)) {
      return {
        isValid: false,
        errorMessage: 'Invalid departure date format. Must be YYYY-MM-DD.'
      };
    }

    if (!returnDate || !dateRegex.test(returnDate)) {
      return {
        isValid: false,
        errorMessage: 'Invalid return date format. Must be YYYY-MM-DD.'
      };
    }

    if (returnDate < departureDate) {
      return {
        isValid: false,
        errorMessage: 'Return date cannot be earlier than departure date.'
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (departureDate < todayStr) {
      return {
        isValid: false,
        errorMessage: 'Departure date cannot be in the past.'
      };
    }

    return { isValid: true };
  }

  /**
   * Submits a new overnight exeat application for a student into the Turso libSQL database.
   *
   * @param params Student ID, destination address, reason, departure date, return date
   * @returns Newly created ExeatRequest database record
   */
  public static async applyForExeat(params: ApplyExeatParams): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Validate form input parameters
    const validation = ExeatService.validateExeatForm(
      params.destinationAddress,
      params.reason,
      params.departureDate,
      params.returnDate
    );

    if (!validation.isValid) {
      throw new Error(validation.errorMessage || 'Invalid exeat form details.');
    }

    // 2. Confirm student existence in database
    const userRes = await client.execute({
      sql: `SELECT u.id, u.full_name, u.matric_or_staff_no FROM users u WHERE u.id = ?`,
      args: [params.studentId]
    });

    if (userRes.rows.length === 0) {
      throw new Error(`Student with ID '${params.studentId}' not found.`);
    }

    const userRow = userRes.rows[0];
    const studentName = String(userRow.full_name || 'UNILAG Student');
    const studentMatric = String(userRow.matric_or_staff_no || '');

    // 3. Lookup student hostel and room designation if available
    let hostelName = 'Main Campus Hostel';
    let roomNumber = 'Assigned Bedspace';

    try {
      const roomRes = await client.execute({
        sql: `SELECT r.room_number, h.name as hostel_name
              FROM bedspaces b
              JOIN rooms r ON b.room_id = r.id
              JOIN hostels h ON r.hostel_id = h.id
              WHERE b.allocated_to_user_id = ?
              LIMIT 1`,
        args: [params.studentId]
      });

      if (roomRes.rows.length > 0) {
        if (roomRes.rows[0].hostel_name) hostelName = String(roomRes.rows[0].hostel_name);
        if (roomRes.rows[0].room_number) roomNumber = String(roomRes.rows[0].room_number);
      }
    } catch {}

    // 4. Generate unique ID and timestamps
    const exeatId = `exeat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    // 5. Insert exeat request record into database with PENDING status
    await client.execute({
      sql: `INSERT INTO exeat_requests (
              id, student_id, destination_address, reason, departure_date, return_date,
              warden_approval_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      args: [
        exeatId,
        params.studentId,
        params.destinationAddress.trim(),
        params.reason.trim(),
        params.departureDate,
        params.returnDate,
        createdAt,
        createdAt
      ]
    });

    return {
      id: exeatId,
      studentId: params.studentId,
      studentName,
      studentMatric,
      hostelName,
      roomNumber,
      destinationAddress: params.destinationAddress.trim(),
      reason: params.reason.trim(),
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      wardenApprovalStatus: 'PENDING',
      createdAt,
      updatedAt: createdAt
    };
  }

  /**
   * Retrieves all exeat requests submitted by a specific student from the Turso database.
   *
   * @param studentId Unique student user ID
   * @returns Array list of ExeatRequest objects ordered by newest first
   */
  public static async getExeatRequestsByStudent(studentId: string): Promise<ExeatRequest[]> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at, e.updated_at
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
      createdAt: String(row.created_at),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined
    }));
  }

  /**
   * Retrieves all pending exeat requests awaiting Warden review.
   *
   * @returns Array list of pending ExeatRequest objects
   */
  public static async getPendingExeatRequests(): Promise<ExeatRequest[]> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at, e.updated_at
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
      createdAt: String(row.created_at),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined
    }));
  }

  /**
   * Allows a Hall Warden to review and single-tap approve or decline a student's exeat request.
   *
   * @param params Exeat ID, Warden ID, status (APPROVED or DECLINED), and optional comment
   * @returns Updated ExeatRequest object
   */
  public static async reviewExeatRequest(params: ReviewExeatParams): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();
    const updatedAt = new Date().toISOString();

    const checkRes = await client.execute({
      sql: `SELECT id FROM exeat_requests WHERE id = ?`,
      args: [params.exeatId]
    });

    if (checkRes.rows.length === 0) {
      throw new Error(`Exeat request with ID '${params.exeatId}' not found.`);
    }

    await client.execute({
      sql: `UPDATE exeat_requests
            SET warden_approval_status = ?, warden_id = ?, warden_comment = ?, updated_at = ?
            WHERE id = ?`,
      args: [params.status, params.wardenId, params.comment ? params.comment.trim() : null, updatedAt, params.exeatId]
    });

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at, e.updated_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.id = ?`,
      args: [params.exeatId]
    });

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
      wardenApprovalStatus: String(row.warden_approval_status) as ExeatApprovalStatus,
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenComment: row.warden_comment ? String(row.warden_comment) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  /**
   * Checks if a student has an active approved exeat permission covering a specific date (e.g. for curfew bypass).
   *
   * @param studentId Unique student user ID
   * @param targetDate Date string (YYYY-MM-DD), defaults to today
   * @returns ExeatRequest object if approved exeat found, otherwise null
   */
  public static async getActiveApprovedExeat(studentId: string, targetDate?: string): Promise<ExeatRequest | null> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();
    const dateToCheck = targetDate || new Date().toISOString().split('T')[0];

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at, e.updated_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.student_id = ?
              AND e.warden_approval_status = 'APPROVED'
              AND e.departure_date <= ?
              AND e.return_date >= ?
            ORDER BY e.created_at DESC LIMIT 1`,
      args: [studentId, dateToCheck, dateToCheck]
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
      createdAt: String(row.created_at),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined
    };
  }
}
