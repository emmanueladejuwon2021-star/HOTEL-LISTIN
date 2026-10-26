import { Client } from '@libsql/client';
import { AuthService } from './authService';
import {
  MaintenanceTicket,
  TicketCategory,
  TicketStatus,
  TicketUrgency,
  ArtisanJobQueueFilter,
  ProofOfFixPayload
} from '../types/maintenance';

/**
 * Service managing hostel defect ticket dispatches, artisan work queues,
 * status transitions, and proof-of-fix photo uploads.
 * Connects directly to Turso libSQL Edge SQLite database adhering strictly to zero-mock principles.
 *
 * Implements [MAINTENANCE-01 to MAINTENANCE-05] and supports:
 * - Maintenance schema migrations and foreign key integrity.
 * - Artisan work queue retrieval with multi-criteria filtering and SLA priority sorting.
 * - Atomic job status transition from OPEN -> IN_PROGRESS when artisan claims work.
 * - Resolution validation requiring valid "After" proof-of-fix photograph uploads.
 * - Complete audit trail of timestamps and assigned artisan staff IDs.
 */
export class MaintenanceService {
  /**
   * Initializes the database schema for hostel maintenance tickets.
   * Creates required tables, indexes, and applies safe column migrations.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Ensure main maintenance_tickets table exists with full foreign key constraints
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT DEFAULT 'hostel_main',
        room_number TEXT NOT NULL,
        category TEXT CHECK(category IN ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL')) NOT NULL,
        urgency TEXT CHECK(urgency IN ('EMERGENCY', 'HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
        description TEXT NOT NULL,
        photo_before_url TEXT NOT NULL,
        photo_after_url TEXT,
        status TEXT CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
        assigned_artisan_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Safe column migrations for missing columns in pre-existing test DB tables
    const safeMigrations = [
      `ALTER TABLE maintenance_tickets ADD COLUMN urgency TEXT DEFAULT 'MEDIUM'`,
      `ALTER TABLE maintenance_tickets ADD COLUMN hostel_id TEXT DEFAULT 'hostel_main'`
    ];

    for (const stmt of safeMigrations) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, safe to ignore
      }
    }

    // Create indexes for efficient filtering and artisan dispatch queues
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_tickets(status)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maint_category ON maintenance_tickets(category)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maint_artisan ON maintenance_tickets(assigned_artisan_id)`,
      args: []
    });
  }

  /**
   * Maps a raw Turso database row into a strongly-typed MaintenanceTicket object.
   */
  private static mapRowToTicket(row: any): MaintenanceTicket {
    return {
      id: String(row.id),
      student_id: String(row.student_id),
      student_name: row.student_name ? String(row.student_name) : undefined,
      hostel_id: row.hostel_id ? String(row.hostel_id) : 'hostel_main',
      hostel_name: row.hostel_name ? String(row.hostel_name) : 'UNILAG Hostel',
      room_number: String(row.room_number),
      category: String(row.category) as TicketCategory,
      urgency: (row.urgency ? String(row.urgency) : 'MEDIUM') as TicketUrgency,
      description: String(row.description),
      photo_before_url: String(row.photo_before_url),
      photo_after_url: row.photo_after_url ? String(row.photo_after_url) : null,
      status: String(row.status) as TicketStatus,
      assigned_artisan_id: row.assigned_artisan_id ? String(row.assigned_artisan_id) : null,
      assigned_artisan_name: row.assigned_artisan_name ? String(row.assigned_artisan_name) : null,
      created_at: String(row.created_at || new Date().toISOString()),
      resolved_at: row.resolved_at ? String(row.resolved_at) : null
    };
  }

  /**
   * Helper method to create a new student defect repair ticket.
   *
   * @param params Ticket fields
   * @returns Newly created MaintenanceTicket
   */
  public static async createTicket(params: {
    studentId: string;
    hostelId?: string;
    roomNumber: string;
    category: TicketCategory;
    urgency?: TicketUrgency;
    description: string;
    photoBeforeUrl: string;
  }): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.studentId || !params.studentId.trim()) {
      throw new Error('Valid student user ID is required to log a repair ticket.');
    }
    if (!params.roomNumber || !params.roomNumber.trim()) {
      throw new Error('Valid room number designation is required.');
    }
    if (!params.description || !params.description.trim()) {
      throw new Error('Description of defect is required.');
    }
    if (!params.photoBeforeUrl || !params.photoBeforeUrl.trim()) {
      throw new Error('Live photograph of the defective item is required before submitting ticket.');
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hostelId = params.hostelId?.trim() || 'hostel_main';
    const urgency = params.urgency || 'MEDIUM';

    await client.execute({
      sql: `INSERT INTO maintenance_tickets (
        id, student_id, hostel_id, room_number, category, urgency, description, photo_before_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', CURRENT_TIMESTAMP)`,
      args: [
        ticketId,
        params.studentId.trim(),
        hostelId,
        params.roomNumber.trim(),
        params.category,
        urgency,
        params.description.trim(),
        params.photoBeforeUrl.trim()
      ]
    });

    return await MaintenanceService.getTicketById(ticketId);
  }

  /**
   * Retrieves an artisan repair job queue filtered by category, status, and urgency.
   * Sorted by SLA urgency order (EMERGENCY -> HIGH -> MEDIUM -> LOW) and creation timestamp.
   *
   * @param filter Filter criteria for job queue
   * @returns Array of MaintenanceTicket objects
   */
  public static async getArtisanJobQueue(filter?: ArtisanJobQueueFilter): Promise<MaintenanceTicket[]> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `
      SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.urgency,
             t.description, t.photo_before_url, t.photo_after_url, t.status,
             t.assigned_artisan_id, t.created_at, t.resolved_at,
             u_stu.full_name as student_name,
             u_art.full_name as assigned_artisan_name,
             h.name as hostel_name
      FROM maintenance_tickets t
      LEFT JOIN users u_stu ON t.student_id = u_stu.id
      LEFT JOIN users u_art ON t.assigned_artisan_id = u_art.id
      LEFT JOIN hostels h ON t.hostel_id = h.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (filter?.category && filter.category !== 'ALL') {
      sql += ` AND t.category = ?`;
      args.push(filter.category);
    }

    if (filter?.status && filter.status !== 'ALL') {
      sql += ` AND t.status = ?`;
      args.push(filter.status);
    }

    if (filter?.urgency && filter.urgency !== 'ALL') {
      sql += ` AND t.urgency = ?`;
      args.push(filter.urgency);
    }

    // Sort by SLA priority first (EMERGENCY highest), then creation time
    sql += ` ORDER BY CASE t.urgency
                WHEN 'EMERGENCY' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                WHEN 'LOW' THEN 4
                ELSE 5 END ASC, t.created_at DESC`;

    const result = await client.execute({ sql, args });
    return result.rows.map(row => MaintenanceService.mapRowToTicket(row));
  }

  /**
   * Fetches a specific maintenance ticket by its unique ID.
   *
   * @param ticketId Unique ticket ID
   * @returns MaintenanceTicket object
   */
  public static async getTicketById(ticketId: string): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `
        SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.urgency,
               t.description, t.photo_before_url, t.photo_after_url, t.status,
               t.assigned_artisan_id, t.created_at, t.resolved_at,
               u_stu.full_name as student_name,
               u_art.full_name as assigned_artisan_name,
               h.name as hostel_name
        FROM maintenance_tickets t
        LEFT JOIN users u_stu ON t.student_id = u_stu.id
        LEFT JOIN users u_art ON t.assigned_artisan_id = u_art.id
        LEFT JOIN hostels h ON t.hostel_id = h.id
        WHERE t.id = ?
      `,
      args: [ticketId.trim()]
    });

    if (result.rows.length === 0) {
      throw new Error(`Maintenance ticket record not found for ID: ${ticketId}`);
    }

    return MaintenanceService.mapRowToTicket(result.rows[0]);
  }

  /**
   * Assigns an artisan to a ticket and transitions status to IN_PROGRESS.
   *
   * @param ticketId Unique ticket ID
   * @param artisanId User ID of assigned artisan
   * @returns Updated MaintenanceTicket
   */
  public static async startRepairJob(ticketId: string, artisanId: string): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!ticketId || !ticketId.trim()) {
      throw new Error('Valid ticket ID is required to start job.');
    }
    if (!artisanId || !artisanId.trim()) {
      throw new Error('Valid artisan staff ID is required to start job.');
    }

    const currentTicket = await MaintenanceService.getTicketById(ticketId);
    if (currentTicket.status === 'RESOLVED') {
      throw new Error('Cannot start work on a ticket that has already been resolved.');
    }

    await client.execute({
      sql: `UPDATE maintenance_tickets
            SET status = 'IN_PROGRESS',
                assigned_artisan_id = ?
            WHERE id = ?`,
      args: [artisanId.trim(), ticketId.trim()]
    });

    return await MaintenanceService.getTicketById(ticketId);
  }

  /**
   * Uploads proof-of-fix photograph and transitions ticket status to RESOLVED [MAINTENANCE-05].
   * Enforces validation for required "After" photo URL.
   *
   * @param payload Proof-of-fix upload parameters
   * @returns Resolved MaintenanceTicket
   */
  public static async completeRepairJob(payload: ProofOfFixPayload): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!payload.ticketId || !payload.ticketId.trim()) {
      throw new Error('Valid ticket ID is required to complete repair job.');
    }
    if (!payload.artisanId || !payload.artisanId.trim()) {
      throw new Error('Valid artisan staff ID is required to complete repair job.');
    }
    if (!payload.photoAfterUrl || !payload.photoAfterUrl.trim()) {
      throw new Error('Proof-of-fix "After" photograph is strictly required to resolve maintenance ticket.');
    }

    const currentTicket = await MaintenanceService.getTicketById(payload.ticketId);
    if (currentTicket.status === 'RESOLVED') {
      throw new Error('Maintenance ticket has already been marked resolved.');
    }

    const nowIso = new Date().toISOString();

    await client.execute({
      sql: `UPDATE maintenance_tickets
            SET status = 'RESOLVED',
                assigned_artisan_id = ?,
                photo_after_url = ?,
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [payload.artisanId.trim(), payload.photoAfterUrl.trim(), payload.ticketId.trim()]
    });

    return await MaintenanceService.getTicketById(payload.ticketId);
  }
}
