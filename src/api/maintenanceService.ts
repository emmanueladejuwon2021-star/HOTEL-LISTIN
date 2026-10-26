/**
 * Maintenance Service for UnilagStay Hostel Management App
 * Interacts with Turso libSQL SQLite DB to manage student repair tickets, defect categories, and SLAs.
 */

import { AuthService } from './authService';
import {
  CreateTicketParams,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTicket,
  CATEGORY_METADATA,
} from '../types/maintenance';

export class MaintenanceService {
  /**
   * Initializes the maintenance_tickets table in Turso libSQL SQLite database.
   */
  static async initializeDatabase(): Promise<void> {
    const client = AuthService.getDbClient();

    // Create base maintenance_tickets table matching PRD Section 9 DDL
    await client.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_before_url TEXT NOT NULL,
        photo_after_url TEXT,
        status TEXT CHECK(status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CANCELLED')) DEFAULT 'OPEN',
        assigned_artisan_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      );
    `);

    // Safely alter table to add priority and target_sla columns if not present
    try {
      await client.execute(`ALTER TABLE maintenance_tickets ADD COLUMN priority TEXT DEFAULT 'MEDIUM'`);
    } catch (_e) {}

    try {
      await client.execute(`ALTER TABLE maintenance_tickets ADD COLUMN target_sla TEXT DEFAULT '< 48 Hours'`);
    } catch (_e) {}

    // Create index on student_id for fast student history queries
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_maintenance_student ON maintenance_tickets(student_id);
    `);

    // Create index on status for artisan job queue queries
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);
    `);
  }

  /**
   * Creates a new student photo-backed maintenance repair request ticket.
   */
  static async createTicket(params: CreateTicketParams): Promise<MaintenanceTicket> {
    await this.initializeDatabase();
    const client = AuthService.getDbClient();

    const { studentId, hostelId, roomNumber, category, description, photoBeforeUrl } = params;

    // Validate category
    if (!category || !CATEGORY_METADATA[category]) {
      throw new Error('Please select a valid defect category.');
    }

    // Validate description (minimum 5 characters required)
    if (!description || description.trim().length < 5) {
      throw new Error('Please provide a detailed defect description (minimum 5 characters).');
    }

    // Validate photo
    if (!photoBeforeUrl || photoBeforeUrl.trim() === '') {
      throw new Error('A photo proof attachment is required to submit a maintenance request.');
    }

    const categoryMeta = CATEGORY_METADATA[category];
    const priority: MaintenancePriority = params.priority || categoryMeta.defaultPriority;
    const targetSla: string = categoryMeta.targetSla;

    const ticketId = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO maintenance_tickets (
        id, student_id, hostel_id, room_number, category, priority, target_sla, description, photo_before_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      args: [
        ticketId,
        studentId,
        hostelId,
        roomNumber,
        category,
        priority,
        targetSla,
        description.trim(),
        photoBeforeUrl.trim(),
        createdAt,
      ],
    });

    return {
      id: ticketId,
      studentId,
      hostelId,
      roomNumber,
      category,
      priority,
      targetSla,
      description: description.trim(),
      photoBeforeUrl: photoBeforeUrl.trim(),
      status: 'OPEN',
      createdAt,
    };
  }

  /**
   * Retrieves all maintenance tickets logged by a specific student.
   */
  static async getStudentTickets(studentId: string): Promise<MaintenanceTicket[]> {
    await this.initializeDatabase();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT id, student_id, hostel_id, room_number, category, priority, target_sla, description, photo_before_url, photo_after_url, status, assigned_artisan_id, created_at, resolved_at
            FROM maintenance_tickets
            WHERE student_id = ?
            ORDER BY created_at DESC`,
      args: [studentId],
    });

    return result.rows.map((row) => ({
      id: String(row.id),
      studentId: String(row.student_id),
      hostelId: String(row.hostel_id),
      roomNumber: String(row.room_number),
      category: String(row.category) as MaintenanceCategory,
      priority: (row.priority ? String(row.priority) : 'MEDIUM') as MaintenancePriority,
      targetSla: row.target_sla ? String(row.target_sla) : '< 48 Hours',
      description: String(row.description),
      photoBeforeUrl: String(row.photo_before_url),
      photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
      status: String(row.status) as MaintenanceStatus,
      assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
      createdAt: String(row.created_at),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    }));
  }

  /**
   * Cancels a pending maintenance ticket if it has not yet been resolved or assigned.
   */
  static async cancelTicket(ticketId: string, studentId: string): Promise<boolean> {
    await this.initializeDatabase();
    const client = AuthService.getDbClient();

    let result = await client.execute({
      sql: `UPDATE maintenance_tickets
            SET status = 'REJECTED'
            WHERE id = ? AND student_id = ? AND status = 'OPEN'`,
      args: [ticketId, studentId],
    });

    return result.rowsAffected > 0;
  }
}
