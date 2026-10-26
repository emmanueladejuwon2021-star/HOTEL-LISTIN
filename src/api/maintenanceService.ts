import { AuthService } from './authService';
import {
  MaintenanceCategory,
  MaintenanceTicket,
  MaintenanceTicketStatus,
  UpdateTicketStatusParams,
  ProofOfFixParams,
  MaintenanceOperationResult,
} from '../types/maintenance';

/**
 * Service class handling facility maintenance ticket queue retrieval, job status updates,
 * artisan assignments, and photo-backed proof-of-fix uploads against Turso libSQL SQLite database.
 */
class MaintenanceService {
  /**
   * Initializes maintenance tables in Turso libSQL database if they do not exist.
   * Ensures schema compliance with PRD Section 9.
   */
  async initializeSchema(): Promise<void> {
    const client = AuthService.getDbClient();
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        category TEXT CHECK(category IN ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL')) NOT NULL,
        description TEXT NOT NULL,
        photo_before_url TEXT NOT NULL,
        photo_after_url TEXT,
        status TEXT CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
        assigned_artisan_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      );`,
      args: [],
    });
  }

  /**
   * Retrieves repair ticket queue for maintenance artisans.
   * Supports filtering by trade category or assigned artisan ID.
   * Joins with `hostels` and `users` tables to fetch human-readable hostel names and student details.
   *
   * @param artisanId Optional ID of artisan to filter assigned tickets
   * @param category Optional trade category filter (e.g. 'PLUMBING')
   * @returns Array of MaintenanceTicket objects
   */
  async getArtisanQueue(
    artisanId?: string,
    category?: MaintenanceCategory
  ): Promise<MaintenanceTicket[]> {
    await this.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `
      SELECT
        mt.id,
        mt.student_id AS studentId,
        mt.hostel_id AS hostelId,
        mt.room_number AS roomNumber,
        mt.category,
        mt.description,
        mt.photo_before_url AS photoBeforeUrl,
        mt.photo_after_url AS photoAfterUrl,
        mt.status,
        mt.assigned_artisan_id AS assignedArtisanId,
        mt.created_at AS createdAt,
        mt.resolved_at AS resolvedAt,
        COALESCE(h.name, 'Hostel ' || mt.hostel_id) AS hostelName,
        COALESCE(u_student.full_name, 'Student') AS studentName,
        u_student.matric_or_staff_no AS studentMatricNo,
        u_artisan.full_name AS assignedArtisanName
      FROM maintenance_tickets mt
      LEFT JOIN hostels h ON mt.hostel_id = h.id
      LEFT JOIN users u_student ON mt.student_id = u_student.id
      LEFT JOIN users u_artisan ON mt.assigned_artisan_id = u_artisan.id
      WHERE 1=1
    `;

    const args: any[] = [];

    if (category) {
      sql += ` AND mt.category = ?`;
      args.push(category);
    }

    if (artisanId) {
      sql += ` AND (mt.assigned_artisan_id = ? OR mt.assigned_artisan_id IS NULL OR mt.status = 'OPEN')`;
      args.push(artisanId);
    }

    sql += ` ORDER BY CASE WHEN mt.status = 'OPEN' THEN 1 WHEN mt.status = 'IN_PROGRESS' THEN 2 ELSE 3 END, mt.created_at DESC`;

    const result = await client.execute({ sql, args });

    return result.rows.map((row: any) => ({
      id: String(row.id),
      studentId: String(row.studentId),
      studentName: row.studentName ? String(row.studentName) : undefined,
      studentMatricNo: row.studentMatricNo ? String(row.studentMatricNo) : undefined,
      hostelId: String(row.hostelId),
      hostelName: row.hostelName ? String(row.hostelName) : undefined,
      roomNumber: String(row.roomNumber),
      category: row.category as MaintenanceCategory,
      description: String(row.description),
      photoBeforeUrl: String(row.photoBeforeUrl),
      photoAfterUrl: row.photoAfterUrl ? String(row.photoAfterUrl) : null,
      status: row.status as MaintenanceTicketStatus,
      assignedArtisanId: row.assignedArtisanId ? String(row.assignedArtisanId) : null,
      assignedArtisanName: row.assignedArtisanName ? String(row.assignedArtisanName) : null,
      createdAt: String(row.createdAt),
      resolvedAt: row.resolvedAt ? String(row.resolvedAt) : null,
    }));
  }

  /**
   * Retrieves a single maintenance ticket by ID with full details.
   */
  async getTicketById(ticketId: string): Promise<MaintenanceTicket | null> {
    await this.initializeSchema();
    const client = AuthService.getDbClient();

    const sql = `
      SELECT
        mt.id,
        mt.student_id AS studentId,
        mt.hostel_id AS hostelId,
        mt.room_number AS roomNumber,
        mt.category,
        mt.description,
        mt.photo_before_url AS photoBeforeUrl,
        mt.photo_after_url AS photoAfterUrl,
        mt.status,
        mt.assigned_artisan_id AS assignedArtisanId,
        mt.created_at AS createdAt,
        mt.resolved_at AS resolvedAt,
        COALESCE(h.name, 'Hostel ' || mt.hostel_id) AS hostelName,
        COALESCE(u_student.full_name, 'Student') AS studentName,
        u_student.matric_or_staff_no AS studentMatricNo,
        u_artisan.full_name AS assignedArtisanName
      FROM maintenance_tickets mt
      LEFT JOIN hostels h ON mt.hostel_id = h.id
      LEFT JOIN users u_student ON mt.student_id = u_student.id
      LEFT JOIN users u_artisan ON mt.assigned_artisan_id = u_artisan.id
      WHERE mt.id = ?
    `;

    const result = await client.execute({ sql, args: [ticketId] });

    if (result.rows.length === 0) {
      return null;
    }

    const row: any = result.rows[0];
    return {
      id: String(row.id),
      studentId: String(row.studentId),
      studentName: row.studentName ? String(row.studentName) : undefined,
      studentMatricNo: row.studentMatricNo ? String(row.studentMatricNo) : undefined,
      hostelId: String(row.hostelId),
      hostelName: row.hostelName ? String(row.hostelName) : undefined,
      roomNumber: String(row.roomNumber),
      category: row.category as MaintenanceCategory,
      description: String(row.description),
      photoBeforeUrl: String(row.photoBeforeUrl),
      photoAfterUrl: row.photoAfterUrl ? String(row.photoAfterUrl) : null,
      status: row.status as MaintenanceTicketStatus,
      assignedArtisanId: row.assignedArtisanId ? String(row.assignedArtisanId) : null,
      assignedArtisanName: row.assignedArtisanName ? String(row.assignedArtisanName) : null,
      createdAt: String(row.createdAt),
      resolvedAt: row.resolvedAt ? String(row.resolvedAt) : null,
    };
  }

  /**
   * Updates status of a repair ticket (e.g. IN_PROGRESS, RESOLVED, REJECTED).
   * Assigns artisan ID if provided or transitioning from OPEN.
   */
  async updateTicketStatus(params: UpdateTicketStatusParams): Promise<MaintenanceOperationResult> {
    await this.initializeSchema();
    const client = AuthService.getDbClient();

    const { ticketId, status, artisanId } = params;

    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error(`Maintenance ticket with ID ${ticketId} not found.`);
    }

    const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : null;
    const assignedArtisanId = artisanId || ticket.assignedArtisanId || null;

    let sql = `
      UPDATE maintenance_tickets
      SET status = ?, assigned_artisan_id = COALESCE(?, assigned_artisan_id)
    `;
    const args: any[] = [status, assignedArtisanId];

    if (resolvedAt) {
      sql += `, resolved_at = ?`;
      args.push(resolvedAt);
    }

    sql += ` WHERE id = ?`;
    args.push(ticketId);

    await client.execute({ sql, args });

    return {
      ticketId,
      status,
      assignedArtisanId: assignedArtisanId || undefined,
      resolvedAt: resolvedAt || undefined,
      message: `Repair job status updated successfully to ${status}.`,
    };
  }

  /**
   * Uploads proof-of-fix photo after artisan completes repair job.
   * Updates `photo_after_url`, sets ticket status to `RESOLVED`, and records completion timestamp.
   */
  async uploadProofOfFix(params: ProofOfFixParams): Promise<MaintenanceOperationResult> {
    await this.initializeSchema();
    const client = AuthService.getDbClient();

    const { ticketId, artisanId, photoAfterUrl } = params;

    if (!photoAfterUrl || photoAfterUrl.trim() === '') {
      throw new Error('Proof-of-fix photo is required to mark repair as resolved.');
    }

    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error(`Maintenance ticket with ID ${ticketId} not found.`);
    }

    const resolvedAt = new Date().toISOString();

    await client.execute({
      sql: `
        UPDATE maintenance_tickets
        SET photo_after_url = ?, status = 'RESOLVED', assigned_artisan_id = COALESCE(?, assigned_artisan_id), resolved_at = ?
        WHERE id = ?
      `,
      args: [photoAfterUrl, artisanId, resolvedAt, ticketId],
    });

    return {
      ticketId,
      status: 'RESOLVED',
      assignedArtisanId: artisanId,
      photoAfterUrl,
      resolvedAt,
      message: 'Proof-of-fix photo uploaded successfully and repair ticket resolved.',
    };
  }
}

export const maintenanceService = new MaintenanceService();
