import { AuthService } from './authService';
import { GatePassService } from './gatepassService';
import {
  ExeatRequest,
  SubmitExeatPayload,
  ReviewExeatPayload,
  CancelExeatPayload,
  RequestExtensionPayload,
  BatchReviewExeatPayload,
  ExeatSummaryMetrics,
  ExeatApprovalStatus
} from '../types/exeat';

/**
 * Service managing student overnight hostel leave (Night Exeat) applications,
 * warden approvals, curfew gate verification checks, cancellations, date extension requests,
 * emergency exeat flagging, warden batch approvals, and summary metrics.
 *
 * Implements:
 * - [EXEAT-01] Student Night Exeat Application Form & Validation (Issue #61)
 * - [EXEAT-02] Active Approved Exeat Status Banner & Gate Curfew Override (Issue #62)
 * - [EXEAT-03] Warden Review Queue & Approval Workflow (Issue #63)
 * - [EXEAT-04] Exeat Cancellation, Return Date Extension, Filtering & Auto-Expiry (Issue #64 / UAT-0064)
 * - [EXEAT-05] Emergency Exeat Flagging, Warden Batch Approval & Summary Metrics (Issue #65 / UAT-0065)
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

    // Migration check: If exeat_requests table exists with old restricted CHECK constraint, migrate to expanded CHECK constraint
    try {
      const tableInfo = await client.execute({
        sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name='exeat_requests'`,
        args: []
      });

      if (tableInfo.rows.length > 0) {
        const createSql = String(tableInfo.rows[0].sql || '');
        if (createSql.includes("('PENDING', 'APPROVED', 'DECLINED')")) {
          // Add missing columns first to ensure SELECT copy succeeds
          const tempCols = [
            `ALTER TABLE exeat_requests ADD COLUMN warden_comment TEXT`,
            `ALTER TABLE exeat_requests ADD COLUMN cancellation_reason TEXT`,
            `ALTER TABLE exeat_requests ADD COLUMN original_return_date DATE`,
            `ALTER TABLE exeat_requests ADD COLUMN extension_reason TEXT`,
            `ALTER TABLE exeat_requests ADD COLUMN is_emergency INTEGER DEFAULT 0`,
            `ALTER TABLE exeat_requests ADD COLUMN emergency_contact_phone TEXT`
          ];
          for (const stmt of tempCols) {
            try { await client.execute({ sql: stmt, args: [] }); } catch {}
          }

          await client.execute({
            sql: `CREATE TABLE IF NOT EXISTS exeat_requests_v2 (
              id TEXT PRIMARY KEY,
              student_id TEXT NOT NULL,
              destination_address TEXT NOT NULL,
              reason TEXT NOT NULL,
              departure_date DATE NOT NULL,
              return_date DATE NOT NULL,
              warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED')) DEFAULT 'PENDING',
              warden_id TEXT,
              warden_comment TEXT,
              cancellation_reason TEXT,
              original_return_date DATE,
              extension_reason TEXT,
              is_emergency INTEGER DEFAULT 0,
              emergency_contact_phone TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            args: []
          });

          await client.execute({
            sql: `INSERT INTO exeat_requests_v2 (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status, warden_id, warden_comment, cancellation_reason, original_return_date, extension_reason, is_emergency, emergency_contact_phone, created_at)
                  SELECT id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status, warden_id, warden_comment, cancellation_reason, original_return_date, extension_reason, COALESCE(is_emergency, 0), emergency_contact_phone, created_at FROM exeat_requests`,
            args: []
          });

          await client.execute({ sql: `DROP TABLE exeat_requests`, args: [] });
          await client.execute({ sql: `ALTER TABLE exeat_requests_v2 RENAME TO exeat_requests`, args: [] });
        }
      }
    } catch {
      // Table doesn't exist yet or migration completed
    }

    // Ensure exeat_requests table exists
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS exeat_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        reason TEXT NOT NULL,
        departure_date DATE NOT NULL,
        return_date DATE NOT NULL,
        warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED')) DEFAULT 'PENDING',
        warden_id TEXT,
        warden_comment TEXT,
        cancellation_reason TEXT,
        original_return_date DATE,
        extension_reason TEXT,
        is_emergency INTEGER DEFAULT 0,
        emergency_contact_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Migration: add columns if missing in existing database schema
    const migrationColumns = [
      `ALTER TABLE exeat_requests ADD COLUMN warden_comment TEXT`,
      `ALTER TABLE exeat_requests ADD COLUMN cancellation_reason TEXT`,
      `ALTER TABLE exeat_requests ADD COLUMN original_return_date DATE`,
      `ALTER TABLE exeat_requests ADD COLUMN extension_reason TEXT`,
      `ALTER TABLE exeat_requests ADD COLUMN is_emergency INTEGER DEFAULT 0`,
      `ALTER TABLE exeat_requests ADD COLUMN emergency_contact_phone TEXT`
    ];

    for (const stmt of migrationColumns) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, ignore error
      }
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
   * Helper function mapping a raw database row to a structured ExeatRequest object.
   */
  private static mapRowToExeatRequest(row: any): ExeatRequest {
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      destinationAddress: String(row.destination_address),
      reason: String(row.reason),
      departureDate: String(row.departure_date),
      returnDate: String(row.return_date),
      originalReturnDate: row.original_return_date ? String(row.original_return_date) : undefined,
      extensionReason: row.extension_reason ? String(row.extension_reason) : undefined,
      isExtended: Boolean(row.original_return_date),
      cancellationReason: row.cancellation_reason ? String(row.cancellation_reason) : undefined,
      isEmergency: Boolean(row.is_emergency),
      emergencyContactPhone: row.emergency_contact_phone ? String(row.emergency_contact_phone) : undefined,
      wardenApprovalStatus: String(row.warden_approval_status) as ExeatApprovalStatus,
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenComment: row.warden_comment ? String(row.warden_comment) : undefined,
      createdAt: String(row.created_at)
    };
  }

  /**
   * Submits a new overnight exeat request for a student.
   * Validates required inputs, emergency contact details if emergency mode is flagged, and ensures departure date is on or before return date.
   */
  public static async submitExeatRequest(payload: SubmitExeatPayload): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { studentId, destinationAddress, reason, departureDate, returnDate, isEmergency, emergencyContactPhone } = payload;

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

    if (new Date(departureDate) > new Date(returnDate)) {
      throw new Error('Departure date cannot be later than the return date.');
    }

    if (isEmergency && (!emergencyContactPhone || !emergencyContactPhone.trim())) {
      throw new Error('An emergency contact phone number is required for emergency exeat applications.');
    }

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
      sql: `INSERT INTO exeat_requests (id, student_id, destination_address, reason, departure_date, return_date, is_emergency, emergency_contact_phone, warden_approval_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      args: [
        exeatId,
        studentId,
        destinationAddress.trim(),
        reason.trim(),
        departureDate.trim(),
        returnDate.trim(),
        isEmergency ? 1 : 0,
        emergencyContactPhone ? emergencyContactPhone.trim() : null,
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
      isEmergency: Boolean(isEmergency),
      emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.trim() : undefined,
      wardenApprovalStatus: 'PENDING',
      createdAt
    };
  }

  /**
   * Cancels an existing pending or approved exeat request on behalf of the student.
   * Updates status to 'CANCELLED' and logs cancellation reason if provided.
   */
  public static async cancelExeatRequest(payload: CancelExeatPayload): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { exeatId, studentId, cancellationReason } = payload;

    if (!exeatId || !exeatId.trim()) {
      throw new Error('Exeat ID is required for cancellation.');
    }
    if (!studentId || !studentId.trim()) {
      throw new Error('Student ID is required for verification.');
    }

    const existingRes = await client.execute({
      sql: `SELECT e.id, e.student_id, e.warden_approval_status
            FROM exeat_requests e
            WHERE e.id = ?`,
      args: [exeatId]
    });

    if (existingRes.rows.length === 0) {
      throw new Error(`Exeat request with ID '${exeatId}' was not found.`);
    }

    const exeatRow = existingRes.rows[0];

    if (String(exeatRow.student_id) !== studentId) {
      throw new Error('Unauthorized: You can only cancel your own exeat requests.');
    }

    const currentStatus = String(exeatRow.warden_approval_status);
    if (currentStatus !== 'PENDING' && currentStatus !== 'APPROVED') {
      throw new Error(`Cannot cancel exeat request in status '${currentStatus}'. Only PENDING or APPROVED requests can be cancelled.`);
    }

    const cleanReason = cancellationReason ? cancellationReason.trim() : 'Cancelled by student prior to travel.';

    await client.execute({
      sql: `UPDATE exeat_requests
            SET warden_approval_status = 'CANCELLED', cancellation_reason = ?
            WHERE id = ?`,
      args: [cleanReason, exeatId]
    });

    const updatedRes = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.original_return_date, e.extension_reason, e.cancellation_reason,
                   e.is_emergency, e.emergency_contact_phone,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.id = ?`,
      args: [exeatId]
    });

    return ExeatService.mapRowToExeatRequest(updatedRes.rows[0]);
  }

  /**
   * Submits a return date extension request for an active approved exeat permission.
   * Saves the original return date, updates return date, sets extension reason, and resets status to 'PENDING'.
   */
  public static async requestExeatExtension(payload: RequestExtensionPayload): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { exeatId, studentId, newReturnDate, extensionReason } = payload;

    if (!exeatId || !exeatId.trim()) {
      throw new Error('Exeat ID is required to request an extension.');
    }
    if (!studentId || !studentId.trim()) {
      throw new Error('Student ID is required to request an extension.');
    }
    if (!newReturnDate || !newReturnDate.trim()) {
      throw new Error('New return date is required.');
    }
    if (!extensionReason || !extensionReason.trim()) {
      throw new Error('Reason for return date extension is required.');
    }

    const existingRes = await client.execute({
      sql: `SELECT e.id, e.student_id, e.return_date, e.original_return_date, e.warden_approval_status
            FROM exeat_requests e
            WHERE e.id = ?`,
      args: [exeatId]
    });

    if (existingRes.rows.length === 0) {
      throw new Error(`Exeat request with ID '${exeatId}' was not found.`);
    }

    const exeatRow = existingRes.rows[0];

    if (String(exeatRow.student_id) !== studentId) {
      throw new Error('Unauthorized: You can only extend your own exeat requests.');
    }

    const currentStatus = String(exeatRow.warden_approval_status);
    if (currentStatus !== 'APPROVED') {
      throw new Error('Return date extensions can only be requested for APPROVED exeat permissions.');
    }

    const currentReturnDate = String(exeatRow.return_date);
    if (new Date(newReturnDate) <= new Date(currentReturnDate)) {
      throw new Error('New return date must be later than the current scheduled return date.');
    }

    const origReturnDate = exeatRow.original_return_date ? String(exeatRow.original_return_date) : currentReturnDate;

    await client.execute({
      sql: `UPDATE exeat_requests
            SET original_return_date = ?, return_date = ?, extension_reason = ?, warden_approval_status = 'PENDING', warden_id = NULL, warden_comment = NULL
            WHERE id = ?`,
      args: [origReturnDate, newReturnDate.trim(), extensionReason.trim(), exeatId]
    });

    const updatedRes = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.original_return_date, e.extension_reason, e.cancellation_reason,
                   e.is_emergency, e.emergency_contact_phone,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.id = ?`,
      args: [exeatId]
    });

    return ExeatService.mapRowToExeatRequest(updatedRes.rows[0]);
  }

  /**
   * Retrieves exeat requests with optional filters for approval status, student ID, or search keyword.
   */
  public static async getFilteredExeatRequests(filter?: {
    status?: ExeatApprovalStatus;
    studentId?: string;
    search?: string;
  }): Promise<ExeatRequest[]> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                      e.destination_address, e.reason, e.departure_date, e.return_date,
                      e.original_return_date, e.extension_reason, e.cancellation_reason,
                      e.is_emergency, e.emergency_contact_phone,
                      e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
               FROM exeat_requests e
               JOIN users u ON e.student_id = u.id
               WHERE 1=1`;
    const args: any[] = [];

    if (filter?.status) {
      sql += ` AND e.warden_approval_status = ?`;
      args.push(filter.status);
    }

    if (filter?.studentId) {
      sql += ` AND e.student_id = ?`;
      args.push(filter.studentId);
    }

    if (filter?.search && filter.search.trim()) {
      const pattern = `%${filter.search.trim()}%`;
      sql += ` AND (e.destination_address LIKE ? OR e.reason LIKE ? OR u.full_name LIKE ? OR u.matric_or_staff_no LIKE ? OR e.emergency_contact_phone LIKE ?)`;
      args.push(pattern, pattern, pattern, pattern, pattern);
    }

    sql += ` ORDER BY e.is_emergency DESC, e.created_at DESC`;

    const res = await client.execute({ sql, args });
    return res.rows.map(row => ExeatService.mapRowToExeatRequest(row));
  }

  /**
   * Scans active/approved or pending exeat records and automatically marks unreturned requests as 'EXPIRED'
   * if the current date is strictly past their return date.
   */
  public static async markExpiredExeatRequests(targetDate?: string): Promise<number> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const checkDate = targetDate || new Date().toISOString().split('T')[0];

    const result = await client.execute({
      sql: `UPDATE exeat_requests
            SET warden_approval_status = 'EXPIRED'
            WHERE return_date < ?
              AND warden_approval_status IN ('APPROVED', 'PENDING')`,
      args: [checkDate]
    });

    return result.rowsAffected;
  }

  /**
   * Retrieves all exeat requests submitted by a specific student sorted by creation date.
   */
  public static async getStudentExeatRequests(studentId: string): Promise<ExeatRequest[]> {
    return ExeatService.getFilteredExeatRequests({ studentId });
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
                   e.original_return_date, e.extension_reason, e.cancellation_reason,
                   e.is_emergency, e.emergency_contact_phone,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.student_id = ?
              AND e.warden_approval_status = 'APPROVED'
              AND e.departure_date <= ?
              AND e.return_date >= ?
            ORDER BY e.is_emergency DESC, e.created_at DESC
            LIMIT 1`,
      args: [studentId, checkDate, checkDate]
    });

    if (res.rows.length === 0) {
      return null;
    }

    return ExeatService.mapRowToExeatRequest(res.rows[0]);
  }

  /**
   * Retrieves all pending exeat requests awaiting Warden review across all hostels or for a specific hostel.
   */
  public static async getPendingExeatRequests(): Promise<ExeatRequest[]> {
    return ExeatService.getFilteredExeatRequests({ status: 'PENDING' });
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
                   e.original_return_date, e.extension_reason, e.cancellation_reason,
                   e.is_emergency, e.emergency_contact_phone,
                   e.warden_approval_status, e.warden_id, e.warden_comment, e.created_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.id = ?`,
      args: [exeatId]
    });

    return ExeatService.mapRowToExeatRequest(updatedRes.rows[0]);
  }

  /**
   * Performs batch approval or refusal on multiple student exeat requests at once ([EXEAT-05]).
   */
  public static async batchReviewExeatRequests(payload: BatchReviewExeatPayload): Promise<number> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { exeatIds, wardenId, approvalStatus, wardenComment } = payload;

    if (!exeatIds || exeatIds.length === 0) {
      throw new Error('At least one exeat ID is required for batch review.');
    }
    if (!wardenId) {
      throw new Error('Warden ID is required for batch review.');
    }
    if (approvalStatus !== 'APPROVED' && approvalStatus !== 'DECLINED') {
      throw new Error('Approval status must be APPROVED or DECLINED.');
    }

    const placeholders = exeatIds.map(() => '?').join(',');
    const commentStr = wardenComment ? wardenComment.trim() : `Batch ${approvalStatus.toLowerCase()} by warden.`;

    const result = await client.execute({
      sql: `UPDATE exeat_requests
            SET warden_approval_status = ?, warden_id = ?, warden_comment = ?
            WHERE id IN (${placeholders}) AND warden_approval_status = 'PENDING'`,
      args: [approvalStatus, wardenId, commentStr, ...exeatIds]
    });

    return result.rowsAffected;
  }

  /**
   * Retrieves summary executive statistics metrics of all exeat requests for Warden dashboard view ([EXEAT-05]).
   */
  public static async getExeatSummaryMetrics(): Promise<ExeatSummaryMetrics> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT
              COUNT(*) as total_requests,
              SUM(CASE WHEN warden_approval_status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
              SUM(CASE WHEN warden_approval_status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
              SUM(CASE WHEN warden_approval_status = 'DECLINED' THEN 1 ELSE 0 END) as declined_count,
              SUM(CASE WHEN warden_approval_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_count,
              SUM(CASE WHEN warden_approval_status = 'EXPIRED' THEN 1 ELSE 0 END) as expired_count,
              SUM(CASE WHEN is_emergency = 1 THEN 1 ELSE 0 END) as emergency_count
            FROM exeat_requests`,
      args: []
    });

    const row = res.rows[0];

    return {
      totalRequests: Number(row.total_requests || 0),
      pendingCount: Number(row.pending_count || 0),
      approvedCount: Number(row.approved_count || 0),
      declinedCount: Number(row.declined_count || 0),
      cancelledCount: Number(row.cancelled_count || 0),
      expiredCount: Number(row.expired_count || 0),
      emergencyCount: Number(row.emergency_count || 0)
    };
  }
}
