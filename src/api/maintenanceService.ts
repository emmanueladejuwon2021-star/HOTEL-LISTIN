import { AuthService } from './authService';
import {
  MaintenanceTicket,
  CreateTicketParams,
  ProofOfFixParams,
  AssignArtisanParams,
  TicketFilterParams,
  DefectCategory,
  TicketStatus,
  TicketPriority
} from '../types/maintenance';

/**
 * Service managing facility defect reporting, artisan work dispatch,
 * status lifecycle state transitions (OPEN -> IN_PROGRESS -> RESOLVED),
 * and proof-of-fix photo upload verification.
 *
 * Connects directly to Turso libSQL Edge SQLite database adhering to strict zero-mock principles.
 * Implements [MAINTENANCE-01] through [MAINTENANCE-05] / UAT-0056 & UAT-0057 & UAT-0058.
 */
export class MaintenanceService {
  /**
   * Initializes the database schema for maintenance tickets and creates necessary indexes.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL DEFAULT 'hostel_main',
        room_number TEXT NOT NULL,
        category TEXT CHECK(category IN ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL')) NOT NULL,
        description TEXT NOT NULL,
        photo_before_url TEXT NOT NULL,
        photo_after_url TEXT,
        status TEXT CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
        priority TEXT CHECK(priority IN ('EMERGENCY', 'HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
        assigned_artisan_id TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_artisan_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      args: []
    });

    // Safe migrations for priority & notes columns
    const safeMigrations = [
      `ALTER TABLE maintenance_tickets ADD COLUMN priority TEXT DEFAULT 'MEDIUM'`,
      `ALTER TABLE maintenance_tickets ADD COLUMN notes TEXT`
    ];

    for (const stmt of safeMigrations) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, safe to ignore
      }
    }

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_artisan ON maintenance_tickets(assigned_artisan_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_student ON maintenance_tickets(student_id)`,
      args: []
    });
  }

  /**
   * Helper method to convert a raw database row into a MaintenanceTicket object.
   */
  private static mapRowToTicket(row: any): MaintenanceTicket {
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatricNo: row.student_matric ? String(row.student_matric) : undefined,
      hostelId: String(row.hostel_id || 'hostel_main'),
      hostelName: row.hostel_name ? String(row.hostel_name) : String(row.hostel_id || 'Main Campus Hostel'),
      roomNumber: String(row.room_number),
      category: String(row.category) as DefectCategory,
      description: String(row.description),
      photoBeforeUrl: String(row.photo_before_url),
      photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
      status: String(row.status) as TicketStatus,
      priority: (row.priority ? String(row.priority) : 'MEDIUM') as TicketPriority,
      assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
      artisanName: row.artisan_name ? String(row.artisan_name) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
      notes: row.notes ? String(row.notes) : undefined
    };
  }

  /**
   * Submits a new photo-backed repair request ticket.
   *
   * @param params Ticket creation parameters
   * @returns Newly created MaintenanceTicket record
   */
  public static async createTicket(params: CreateTicketParams): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.studentId || !params.studentId.trim()) {
      throw new Error('Valid student ID is required to log a maintenance ticket.');
    }
    if (!params.roomNumber || !params.roomNumber.trim()) {
      throw new Error('Room number is required.');
    }
    if (!params.category) {
      throw new Error('Defect category is required.');
    }
    if (!params.description || !params.description.trim()) {
      throw new Error('Defect description is required.');
    }
    if (!params.photoBeforeUrl || !params.photoBeforeUrl.trim()) {
      throw new Error('Photo proof of defect before repair is required.');
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const priority = params.priority || 'MEDIUM';
    const hostelId = params.hostelId?.trim() || 'hostel_main';

    await client.execute({
      sql: `INSERT INTO maintenance_tickets (
        id, student_id, hostel_id, room_number, category, description,
        photo_before_url, status, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, CURRENT_TIMESTAMP)`,
      args: [
        ticketId,
        params.studentId.trim(),
        hostelId,
        params.roomNumber.trim(),
        params.category,
        params.description.trim(),
        params.photoBeforeUrl.trim(),
        priority
      ]
    });

    return await MaintenanceService.getTicketById(ticketId);
  }

  /**
   * Retrieves a single maintenance ticket by ID with joined student and artisan user details.
   *
   * @param ticketId Unique ticket identifier
   * @returns MaintenanceTicket record
   */
  public static async getTicketById(ticketId: string): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!ticketId || !ticketId.trim()) {
      throw new Error('Valid ticket ID is required.');
    }

    const result = await client.execute({
      sql: `SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.description,
                   t.photo_before_url, t.photo_after_url, t.status, t.priority,
                   t.assigned_artisan_id, t.notes, t.created_at, t.resolved_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_art.full_name as artisan_name, h.name as hostel_name
            FROM maintenance_tickets t
            LEFT JOIN users u_stu ON t.student_id = u_stu.id
            LEFT JOIN users u_art ON t.assigned_artisan_id = u_art.id
            LEFT JOIN hostels h ON t.hostel_id = h.id
            WHERE t.id = ?`,
      args: [ticketId.trim()]
    });

    if (result.rows.length === 0) {
      throw new Error(`Maintenance ticket not found for ID: ${ticketId}`);
    }

    return MaintenanceService.mapRowToTicket(result.rows[0]);
  }

  /**
   * Queries maintenance tickets with flexible filtering options.
   *
   * @param filter Filter criteria (status, category, priority, artisanId, hostelId)
   * @returns Array of MaintenanceTicket records
   */
  public static async getTickets(filter: TicketFilterParams = {}): Promise<MaintenanceTicket[]> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.description,
                      t.photo_before_url, t.photo_after_url, t.status, t.priority,
                      t.assigned_artisan_id, t.notes, t.created_at, t.resolved_at,
                      u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                      u_art.full_name as artisan_name, h.name as hostel_name
               FROM maintenance_tickets t
               LEFT JOIN users u_stu ON t.student_id = u_stu.id
               LEFT JOIN users u_art ON t.assigned_artisan_id = u_art.id
               LEFT JOIN hostels h ON t.hostel_id = h.id
               WHERE 1=1`;
    const args: any[] = [];

    if (filter.status) {
      sql += ` AND t.status = ?`;
      args.push(filter.status);
    }
    if (filter.category) {
      sql += ` AND t.category = ?`;
      args.push(filter.category);
    }
    if (filter.priority) {
      sql += ` AND t.priority = ?`;
      args.push(filter.priority);
    }
    if (filter.artisanId) {
      sql += ` AND t.assigned_artisan_id = ?`;
      args.push(filter.artisanId);
    }
    if (filter.hostelId) {
      sql += ` AND t.hostel_id = ?`;
      args.push(filter.hostelId);
    }

    sql += ` ORDER BY CASE t.priority
              WHEN 'EMERGENCY' THEN 1
              WHEN 'HIGH' THEN 2
              WHEN 'MEDIUM' THEN 3
              WHEN 'LOW' THEN 4
              ELSE 5 END, t.created_at DESC`;

    const result = await client.execute({ sql, args });
    return result.rows.map(row => MaintenanceService.mapRowToTicket(row));
  }

  /**
   * Retrieves repair jobs assigned to or available for a specific artisan in the work queue.
   *
   * @param artisanId Maintenance staff ID
   * @param includeUnassigned If true, includes open unassigned tickets in the work queue
   * @returns Array of MaintenanceTicket records
   */
  public static async getTicketsForArtisan(
    artisanId: string,
    includeUnassigned: boolean = true
  ): Promise<MaintenanceTicket[]> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.description,
                      t.photo_before_url, t.photo_after_url, t.status, t.priority,
                      t.assigned_artisan_id, t.notes, t.created_at, t.resolved_at,
                      u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                      u_art.full_name as artisan_name, h.name as hostel_name
               FROM maintenance_tickets t
               LEFT JOIN users u_stu ON t.student_id = u_stu.id
               LEFT JOIN users u_art ON t.assigned_artisan_id = u_art.id
               LEFT JOIN hostels h ON t.hostel_id = h.id
               WHERE (t.assigned_artisan_id = ?`;

    const args: any[] = [artisanId];

    if (includeUnassigned) {
      sql += ` OR (t.assigned_artisan_id IS NULL AND t.status = 'OPEN')`;
    }

    sql += `) ORDER BY CASE t.status
              WHEN 'IN_PROGRESS' THEN 1
              WHEN 'OPEN' THEN 2
              WHEN 'RESOLVED' THEN 3
              ELSE 4 END, t.created_at DESC`;

    const result = await client.execute({ sql, args });
    return result.rows.map(row => MaintenanceService.mapRowToTicket(row));
  }

  /**
   * Assigns an artisan to an open maintenance ticket and transitions status to IN_PROGRESS.
   *
   * @param params AssignArtisanParams containing ticketId and artisanId
   * @returns Updated MaintenanceTicket record
   */
  public static async assignArtisan(params: AssignArtisanParams): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.ticketId || !params.ticketId.trim()) {
      throw new Error('Valid ticket ID is required for artisan assignment.');
    }
    if (!params.artisanId || !params.artisanId.trim()) {
      throw new Error('Valid artisan ID is required.');
    }

    const ticket = await MaintenanceService.getTicketById(params.ticketId);

    if (ticket.status === 'RESOLVED') {
      throw new Error('Cannot assign artisan to an already resolved maintenance ticket.');
    }

    await client.execute({
      sql: `UPDATE maintenance_tickets
            SET assigned_artisan_id = ?,
                status = 'IN_PROGRESS'
            WHERE id = ?`,
      args: [params.artisanId.trim(), params.ticketId.trim()]
    });

    return await MaintenanceService.getTicketById(params.ticketId);
  }

  /**
   * Submits proof-of-fix completion photo and marks job as RESOLVED ([MAINTENANCE-02] / UAT-0057).
   *
   * @param params ProofOfFixParams containing ticketId, artisanId, photoAfterUrl, and optional notes
   * @returns Updated MaintenanceTicket record
   */
  public static async submitProofOfFix(params: ProofOfFixParams): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.ticketId || !params.ticketId.trim()) {
      throw new Error('Valid ticket ID is required to submit proof-of-fix.');
    }
    if (!params.photoAfterUrl || !params.photoAfterUrl.trim()) {
      throw new Error('Proof-of-fix completion photo is strictly required before marking job resolved.');
    }

    const ticket = await MaintenanceService.getTicketById(params.ticketId);

    if (ticket.status === 'RESOLVED') {
      throw new Error('Maintenance ticket is already marked as resolved.');
    }

    const nowIso = new Date().toISOString();
    const notesContent = params.notes?.trim() || 'Repair completed successfully and verified by artisan.';

    await client.execute({
      sql: `UPDATE maintenance_tickets
            SET photo_after_url = ?,
                status = 'RESOLVED',
                assigned_artisan_id = COALESCE(assigned_artisan_id, ?),
                resolved_at = ?,
                notes = ?
            WHERE id = ?`,
      args: [
        params.photoAfterUrl.trim(),
        params.artisanId || null,
        nowIso,
        notesContent,
        params.ticketId.trim()
      ]
    });

    return await MaintenanceService.getTicketById(params.ticketId);
  }

  /**
   * Rejects an invalid or out-of-scope maintenance ticket with reason notes.
   *
   * @param ticketId Unique ticket identifier
   * @param reason Rejection remark or reason
   * @returns Updated MaintenanceTicket record
   */
  public static async rejectTicket(ticketId: string, reason: string): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!ticketId || !ticketId.trim()) {
      throw new Error('Valid ticket ID is required to reject a ticket.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Rejection reason or remark is required.');
    }

    await client.execute({
      sql: `UPDATE maintenance_tickets
            SET status = 'REJECTED',
                notes = ?
            WHERE id = ?`,
      args: [`REJECTED: ${reason.trim()}`, ticketId.trim()]
    });

    return await MaintenanceService.getTicketById(ticketId);
  }

  /**
   * Fetches all maintenance tickets submitted by a specific student resident.
   *
   * @param studentId Student user ID
   * @returns Array of MaintenanceTicket records
   */
  public static async getTicketsByStudent(studentId: string): Promise<MaintenanceTicket[]> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.description,
                   t.photo_before_url, t.photo_after_url, t.status, t.priority,
                   t.assigned_artisan_id, t.notes, t.created_at, t.resolved_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_art.full_name as artisan_name, h.name as hostel_name
            FROM maintenance_tickets t
            LEFT JOIN users u_stu ON t.student_id = u_stu.id
            LEFT JOIN users u_art ON t.assigned_artisan_id = u_art.id
            LEFT JOIN hostels h ON t.hostel_id = h.id
            WHERE t.student_id = ?
            ORDER BY t.created_at DESC`,
      args: [studentId]
    });

    return result.rows.map(row => MaintenanceService.mapRowToTicket(row));
  }
}
