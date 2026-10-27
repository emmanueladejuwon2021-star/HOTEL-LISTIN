import { AuthService } from './authService';
import { ExeatRequest, CreateExeatParams, ReviewExeatParams } from '../types/exeat';

/**
 * Service managing Night Exeat Application & Warden Approvals [EXEAT-01 through EXEAT-05].
 * Handles database schema migration, application submission, input validation,
 * date range checks, warden single-tap approvals/declines, and student cancellations.
 * Uses Turso libSQL SQLite client with zero mocks.
 */
export class ExeatService {
  /**
   * Initializes database schema for exeat_requests table if not already created.
   * Ensures necessary columns and indices are present.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS exeat_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        reason TEXT NOT NULL,
        departure_date DATE NOT NULL,
        return_date DATE NOT NULL,
        emergency_contact_phone TEXT NOT NULL DEFAULT '08000000000',
        warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED')) DEFAULT 'PENDING',
        warden_id TEXT,
        warden_comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Ensure emergency_contact_phone column exists if table was created in an earlier migration
    try {
      await client.execute({
        sql: `ALTER TABLE exeat_requests ADD COLUMN emergency_contact_phone TEXT NOT NULL DEFAULT '08000000000'`,
        args: []
      });
    } catch {}

    try {
      await client.execute({
        sql: `ALTER TABLE exeat_requests ADD COLUMN warden_comments TEXT`,
        args: []
      });
    } catch {}

    try {
      await client.execute({
        sql: `ALTER TABLE exeat_requests ADD COLUMN reviewed_at DATETIME`,
        args: []
      });
    } catch {}

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_exeat_student ON exeat_requests(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_exeat_status ON exeat_requests(warden_approval_status)`,
      args: []
    });
  }

  /**
   * Submits a new night exeat application for a student.
   * Validates required inputs, phone number format, and ensures return date is on or after departure date.
   */
  public static async applyForExeat(params: CreateExeatParams): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { studentId, destinationAddress, reason, departureDate, returnDate, emergencyContactPhone } = params;

    if (!studentId || !studentId.trim()) {
      throw new Error('Student ID is required to submit exeat application.');
    }
    if (!destinationAddress || !destinationAddress.trim() || destinationAddress.trim().length < 5) {
      throw new Error('Please provide a complete destination address (minimum 5 characters).');
    }
    if (!reason || !reason.trim() || reason.trim().length < 5) {
      throw new Error('Please state a valid reason for exeat (minimum 5 characters).');
    }
    if (!departureDate || !departureDate.trim()) {
      throw new Error('Departure date is required.');
    }
    if (!returnDate || !returnDate.trim()) {
      throw new Error('Return date is required.');
    }

    if (new Date(returnDate).getTime() < new Date(departureDate).getTime()) {
      throw new Error('Expected return date cannot be earlier than departure date.');
    }

    const phoneClean = emergencyContactPhone ? emergencyContactPhone.trim() : '';
    if (!phoneClean || phoneClean.length < 10) {
      throw new Error('Please provide a valid emergency contact phone number (minimum 10 digits).');
    }

    // Verify student exists
    const userRes = await client.execute({
      sql: `SELECT u.id, u.full_name, u.matric_or_staff_no FROM users u WHERE u.id = ?`,
      args: [studentId]
    });

    if (userRes.rows.length === 0) {
      throw new Error(`Student user with ID '${studentId}' not found in database.`);
    }

    const exeatId = `exeat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO exeat_requests (
              id, student_id, destination_address, reason, departure_date, return_date,
              emergency_contact_phone, warden_approval_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      args: [
        exeatId,
        studentId,
        destinationAddress.trim(),
        reason.trim(),
        departureDate.trim(),
        returnDate.trim(),
        phoneClean,
        createdAt
      ]
    });

    return {
      id: exeatId,
      studentId,
      studentName: String(userRes.rows[0].full_name),
      studentMatric: String(userRes.rows[0].matric_or_staff_no),
      destinationAddress: destinationAddress.trim(),
      reason: reason.trim(),
      departureDate: departureDate.trim(),
      returnDate: returnDate.trim(),
      emergencyContactPhone: phoneClean,
      wardenApprovalStatus: 'PENDING',
      createdAt
    };
  }

  /**
   * Retrieves all exeat requests submitted by a specific student.
   */
  public static async getExeatsByStudent(studentId: string): Promise<ExeatRequest[]> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.emergency_contact_phone, e.warden_approval_status, e.warden_id,
                   e.warden_comments, e.created_at, e.reviewed_at
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
      emergencyContactPhone: String(row.emergency_contact_phone || ''),
      wardenApprovalStatus: String(row.warden_approval_status) as any,
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenComments: row.warden_comments ? String(row.warden_comments) : undefined,
      createdAt: String(row.created_at),
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined
    }));
  }

  /**
   * Retrieves all exeat requests across the hostel for Warden review queue.
   */
  public static async getPendingExeatsForWarden(statusFilter?: string): Promise<ExeatRequest[]> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                     e.destination_address, e.reason, e.departure_date, e.return_date,
                     e.emergency_contact_phone, e.warden_approval_status, e.warden_id,
                     e.warden_comments, e.created_at, e.reviewed_at
              FROM exeat_requests e
              JOIN users u ON e.student_id = u.id`;
    const args: any[] = [];

    if (statusFilter) {
      sql += ` WHERE e.warden_approval_status = ?`;
      args.push(statusFilter);
    }

    sql += ` ORDER BY e.created_at DESC`;

    const res = await client.execute({ sql, args });

    return res.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      destinationAddress: String(row.destination_address),
      reason: String(row.reason),
      departureDate: String(row.departure_date),
      returnDate: String(row.return_date),
      emergencyContactPhone: String(row.emergency_contact_phone || ''),
      wardenApprovalStatus: String(row.warden_approval_status) as any,
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenComments: row.warden_comments ? String(row.warden_comments) : undefined,
      createdAt: String(row.created_at),
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined
    }));
  }

  /**
   * Allows Warden to single-tap review (approve or decline) an exeat request.
   */
  public static async reviewExeat(params: ReviewExeatParams): Promise<ExeatRequest> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const { exeatId, wardenId, status, comments } = params;

    if (!exeatId || !exeatId.trim()) {
      throw new Error('Exeat request ID is required.');
    }
    if (!wardenId || !wardenId.trim()) {
      throw new Error('Warden ID is required.');
    }
    if (status !== 'APPROVED' && status !== 'DECLINED') {
      throw new Error('Status must be APPROVED or DECLINED.');
    }

    const reviewedAt = new Date().toISOString();

    await client.execute({
      sql: `UPDATE exeat_requests
            SET warden_approval_status = ?, warden_id = ?, warden_comments = ?, reviewed_at = ?
            WHERE id = ?`,
      args: [status, wardenId, comments ? comments.trim() : null, reviewedAt, exeatId]
    });

    const res = await client.execute({
      sql: `SELECT e.id, e.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   e.destination_address, e.reason, e.departure_date, e.return_date,
                   e.emergency_contact_phone, e.warden_approval_status, e.warden_id,
                   e.warden_comments, e.created_at, e.reviewed_at
            FROM exeat_requests e
            JOIN users u ON e.student_id = u.id
            WHERE e.id = ?`,
      args: [exeatId]
    });

    if (res.rows.length === 0) {
      throw new Error(`Exeat request with ID '${exeatId}' not found.`);
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
      emergencyContactPhone: String(row.emergency_contact_phone || ''),
      wardenApprovalStatus: String(row.warden_approval_status) as any,
      wardenId: String(row.warden_id),
      wardenComments: row.warden_comments ? String(row.warden_comments) : undefined,
      createdAt: String(row.created_at),
      reviewedAt: String(row.reviewed_at)
    };
  }

  /**
   * Allows student to cancel a pending exeat request.
   */
  public static async cancelExeat(exeatId: string, studentId: string): Promise<boolean> {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    const checkRes = await client.execute({
      sql: `SELECT id, warden_approval_status FROM exeat_requests WHERE id = ? AND student_id = ?`,
      args: [exeatId, studentId]
    });

    if (checkRes.rows.length === 0) {
      throw new Error('Exeat request not found or not owned by student.');
    }

    const currentStatus = String(checkRes.rows[0].warden_approval_status);
    if (currentStatus !== 'PENDING') {
      throw new Error(`Cannot cancel exeat request with status '${currentStatus}'. Only PENDING requests can be cancelled.`);
    }

    await client.execute({
      sql: `UPDATE exeat_requests SET warden_approval_status = 'CANCELLED' WHERE id = ?`,
      args: [exeatId]
    });

    return true;
  }
}
