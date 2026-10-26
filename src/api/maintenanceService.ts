import { AuthService } from './authService';
import {
  MaintenanceTicket,
  CreateTicketParams,
  UpdateTicketStatusParams,
  ArtisanQueueFilter,
  TicketCategory,
  TicketStatus,
  UrgencyLevel
} from '../types/maintenance';

/**
 * Service managing hostel facility maintenance tickets, photo-backed defect submissions,
 * artisan work queue dispatching, urgency priority filters, and proof-of-fix verification.
 *
 * Implements:
 * - [MAINTENANCE-01] Photo-Backed Repair Request Creator
 * - [MAINTENANCE-02] Artisan Repair Job Queue Dispatch & SLA Priority Sorting
 * - [MAINTENANCE-03] Proof-of-Fix Upload System & Job Status Updating
 * - [MAINTENANCE-04] Artisan Repair Job Queue & Proof-of-Fix Upload - Feature Component 4 (Issue #59)
 */
export class MaintenanceService {
  /**
   * Initializes the Turso libSQL SQLite database schema for maintenance tickets.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Ensure maintenance_tickets table exists with required fields
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
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
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_artisan_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      args: []
    });

    // Safely attempt migration if table was created earlier without 'urgency' column
    try {
      await client.execute({
        sql: `ALTER TABLE maintenance_tickets ADD COLUMN urgency TEXT DEFAULT 'MEDIUM'`,
        args: []
      });
    } catch {}

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_tickets(status)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maint_artisan ON maintenance_tickets(assigned_artisan_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maint_category ON maintenance_tickets(category)`,
      args: []
    });
  }

  /**
   * Submits a new photo-backed maintenance repair request for a student.
   */
  public static async createTicket(params: CreateTicketParams): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.studentId || !params.description.trim() || !params.photoBeforeUrl.trim()) {
      throw new Error('Missing required fields: Student ID, problem description, and photo are mandatory.');
    }

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const urgency = params.urgency || 'MEDIUM';
    const createdAt = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO maintenance_tickets (
        id, student_id, hostel_id, room_number, category, urgency, description, photo_before_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      args: [
        ticketId,
        params.studentId,
        params.hostelId,
        params.roomNumber,
        params.category,
        urgency,
        params.description.trim(),
        params.photoBeforeUrl.trim(),
        createdAt
      ]
    });

    return {
      id: ticketId,
      studentId: params.studentId,
      hostelId: params.hostelId,
      roomNumber: params.roomNumber,
      category: params.category,
      urgency,
      description: params.description.trim(),
      photoBeforeUrl: params.photoBeforeUrl.trim(),
      status: 'OPEN',
      createdAt
    };
  }

  /**
   * Retrieves the queue of maintenance tickets for artisans, supporting filters by urgency, category, and status.
   */
  public static async getArtisanQueue(filter?: ArtisanQueueFilter): Promise<MaintenanceTicket[]> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `
      SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.urgency,
             t.description, t.photo_before_url, t.photo_after_url, t.status,
             t.assigned_artisan_id, t.created_at, t.resolved_at,
             u.full_name as student_name, h.name as hostel_name,
             a.full_name as artisan_name
      FROM maintenance_tickets t
      LEFT JOIN users u ON t.student_id = u.id
      LEFT JOIN hostels h ON t.hostel_id = h.id
      LEFT JOIN users a ON t.assigned_artisan_id = a.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (filter?.status) {
      sql += ` AND t.status = ?`;
      args.push(filter.status);
    }

    if (filter?.category) {
      sql += ` AND t.category = ?`;
      args.push(filter.category);
    }

    if (filter?.urgency) {
      sql += ` AND t.urgency = ?`;
      args.push(filter.urgency);
    }

    if (filter?.hostelId) {
      sql += ` AND t.hostel_id = ?`;
      args.push(filter.hostelId);
    }

    // Order by urgency priority (EMERGENCY first, then HIGH, MEDIUM, LOW) and creation date
    sql += ` ORDER BY
      CASE t.urgency
        WHEN 'EMERGENCY' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END ASC, t.created_at DESC`;

    const res = await client.execute({ sql, args });

    return res.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : 'UNILAG Resident',
      hostelId: String(row.hostel_id),
      hostelName: row.hostel_name ? String(row.hostel_name) : 'Hostel Facility',
      roomNumber: String(row.room_number),
      category: String(row.category) as TicketCategory,
      urgency: (row.urgency ? String(row.urgency) : 'MEDIUM') as UrgencyLevel,
      description: String(row.description),
      photoBeforeUrl: String(row.photo_before_url),
      photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
      status: String(row.status) as TicketStatus,
      assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
      artisanName: row.artisan_name ? String(row.artisan_name) : undefined,
      createdAt: String(row.created_at),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined
    }));
  }

  /**
   * Updates a ticket status (e.g. marking IN_PROGRESS or RESOLVED with proof of fix photo).
   */
  public static async updateTicketStatus(params: UpdateTicketStatusParams): Promise<MaintenanceTicket> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.ticketId || !params.artisanId) {
      throw new Error('Ticket ID and Artisan ID are required.');
    }

    if (params.status === 'RESOLVED' && !params.photoAfterUrl) {
      throw new Error('Proof-of-fix photograph is required to resolve a maintenance ticket.');
    }

    const resolvedAt = params.status === 'RESOLVED' ? new Date().toISOString() : null;

    if (params.status === 'RESOLVED') {
      await client.execute({
        sql: `UPDATE maintenance_tickets
              SET status = ?, assigned_artisan_id = ?, photo_after_url = ?, resolved_at = ?
              WHERE id = ?`,
        args: [params.status, params.artisanId, params.photoAfterUrl!, resolvedAt, params.ticketId]
      });
    } else {
      await client.execute({
        sql: `UPDATE maintenance_tickets
              SET status = ?, assigned_artisan_id = ?
              WHERE id = ?`,
        args: [params.status, params.artisanId, params.ticketId]
      });
    }

    const res = await MaintenanceService.getTicketById(params.ticketId);
    if (!res) {
      throw new Error(`Ticket '${params.ticketId}' not found after update.`);
    }
    return res;
  }

  /**
   * Retrieves a single ticket by its unique ID.
   */
  public static async getTicketById(ticketId: string): Promise<MaintenanceTicket | null> {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT t.id, t.student_id, t.hostel_id, t.room_number, t.category, t.urgency,
                   t.description, t.photo_before_url, t.photo_after_url, t.status,
                   t.assigned_artisan_id, t.created_at, t.resolved_at,
                   u.full_name as student_name, h.name as hostel_name,
                   a.full_name as artisan_name
            FROM maintenance_tickets t
            LEFT JOIN users u ON t.student_id = u.id
            LEFT JOIN hostels h ON t.hostel_id = h.id
            LEFT JOIN users a ON t.assigned_artisan_id = a.id
            WHERE t.id = ?`,
      args: [ticketId]
    });

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : 'UNILAG Resident',
      hostelId: String(row.hostel_id),
      hostelName: row.hostel_name ? String(row.hostel_name) : 'Hostel Facility',
      roomNumber: String(row.room_number),
      category: String(row.category) as TicketCategory,
      urgency: (row.urgency ? String(row.urgency) : 'MEDIUM') as UrgencyLevel,
      description: String(row.description),
      photoBeforeUrl: String(row.photo_before_url),
      photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
      status: String(row.status) as TicketStatus,
      assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
      artisanName: row.artisan_name ? String(row.artisan_name) : undefined,
      createdAt: String(row.created_at),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined
    };
  }
}
