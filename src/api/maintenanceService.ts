/**
 * Maintenance API Service Layer.
 * Interacts directly with Turso libSQL Edge SQLite database to handle photo-backed repair request creation,
 * ticket retrieval for students and artisans, status updates, and database schema initialization.
 *
 * Enforces zero-mock real database integration and strict input validation rules (e.g. mandatory photo submission per PRD TC-005).
 * Written with clear, jargon-free comments for non-technical university administrators.
 */

import { createClient, Client } from '@libsql/client';
import {
  MaintenanceTicket,
  CreateTicketParams,
  UpdateTicketStatusParams,
  TicketCategory,
  TicketStatus
} from '../types/maintenance';

/**
 * Creates and initializes a Turso libSQL client connected to local SQLite database.
 */
const getTursoClient = (): Client => {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:unilagstay.db',
    authToken: process.env.TURSO_AUTH_TOKEN
  });
};

export class MaintenanceService {
  /**
   * Initializes database schema for the maintenance tickets system in Turso libSQL DB if not already present.
   * Creates indexes on status, student_id, and hostel_id for high-performance work queue lookup.
   */
  static async initDatabase(): Promise<void> {
    const client = getTursoClient();
    try {
      // Create maintenance_tickets table with strict foreign key constraint logic and default values
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
        )`,
        args: []
      });

      // Create database performance indexes
      await client.execute({
        sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status)`,
        args: []
      });
      await client.execute({
        sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_student ON maintenance_tickets(student_id)`,
        args: []
      });
      await client.execute({
        sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_hostel ON maintenance_tickets(hostel_id)`,
        args: []
      });
    } catch (error) {
      console.error('Error initializing maintenance database schema:', error);
      throw error;
    }
  }

  /**
   * Submits a new photo-backed repair request from a student.
   * Validates mandatory inputs: category, description, student ID, hostel ID, room number, and photo_before_url.
   * Rejects submission with a user-friendly error if any required field or defect photo is missing (PRD TC-005).
   */
  static async createTicket(params: CreateTicketParams): Promise<MaintenanceTicket> {
    // Input validation checks
    if (!params.studentId || !params.studentId.trim()) {
      throw new Error('Student identification code is required.');
    }
    if (!params.hostelId || !params.hostelId.trim()) {
      throw new Error('Hostel location is required.');
    }
    if (!params.roomNumber || !params.roomNumber.trim()) {
      throw new Error('Room number is required.');
    }
    if (!params.category) {
      throw new Error('Please select a valid maintenance category (e.g. Plumbing, Electrical).');
    }
    if (!params.description || !params.description.trim()) {
      throw new Error('Please provide a brief description of the repair needed.');
    }
    if (!params.photoBeforeUrl || !params.photoBeforeUrl.trim()) {
      throw new Error('A photo of the defect is required before submitting a repair ticket.');
    }

    const client = getTursoClient();
    const ticketId = `TKT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();

    try {
      await this.initDatabase();

      await client.execute({
        sql: `INSERT INTO maintenance_tickets (
          id, student_id, hostel_id, room_number, category, description, photo_before_url, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
        args: [
          ticketId,
          params.studentId,
          params.hostelId,
          params.roomNumber,
          params.category,
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
        description: params.description.trim(),
        photoBeforeUrl: params.photoBeforeUrl.trim(),
        status: 'OPEN',
        createdAt
      };
    } catch (error) {
      console.error('Error creating maintenance ticket:', error);
      throw error;
    }
  }

  /**
   * Fetches all repair tickets created by a specific student, ordered from newest to oldest.
   */
  static async getStudentTickets(studentId: string): Promise<MaintenanceTicket[]> {
    if (!studentId || !studentId.trim()) return [];

    const client = getTursoClient();
    try {
      await this.initDatabase();

      const result = await client.execute({
        sql: `SELECT id, student_id, hostel_id, room_number, category, description,
                     photo_before_url, photo_after_url, status, assigned_artisan_id,
                     created_at, resolved_at
              FROM maintenance_tickets
              WHERE student_id = ?
              ORDER BY created_at DESC`,
        args: [studentId]
      });

      return result.rows.map((row) => ({
        id: String(row.id),
        studentId: String(row.student_id),
        hostelId: String(row.hostel_id),
        roomNumber: String(row.room_number),
        category: row.category as TicketCategory,
        description: String(row.description),
        photoBeforeUrl: String(row.photo_before_url),
        photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
        status: row.status as TicketStatus,
        assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
        createdAt: String(row.created_at),
        resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined
      }));
    } catch (error) {
      console.error('Error fetching student maintenance tickets:', error);
      return [];
    }
  }

  /**
   * Fetches a single repair ticket by its unique ticket ID.
   */
  static async getTicketById(ticketId: string): Promise<MaintenanceTicket | null> {
    if (!ticketId || !ticketId.trim()) return null;

    const client = getTursoClient();
    try {
      await this.initDatabase();

      const result = await client.execute({
        sql: `SELECT id, student_id, hostel_id, room_number, category, description,
                     photo_before_url, photo_after_url, status, assigned_artisan_id,
                     created_at, resolved_at
              FROM maintenance_tickets
              WHERE id = ?`,
        args: [ticketId]
      });

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: String(row.id),
        studentId: String(row.student_id),
        hostelId: String(row.hostel_id),
        roomNumber: String(row.room_number),
        category: row.category as TicketCategory,
        description: String(row.description),
        photoBeforeUrl: String(row.photo_before_url),
        photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
        status: row.status as TicketStatus,
        assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
        createdAt: String(row.created_at),
        resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined
      };
    } catch (error) {
      console.error('Error fetching ticket by ID:', error);
      return null;
    }
  }

  /**
   * Updates status of a repair ticket (e.g. IN_PROGRESS, RESOLVED).
   * When resolving a ticket, sets resolved_at timestamp and records proof-of-fix photo if provided.
   */
  static async updateTicketStatus(params: UpdateTicketStatusParams): Promise<MaintenanceTicket | null> {
    if (!params.ticketId || !params.ticketId.trim()) {
      throw new Error('Ticket ID is required.');
    }

    const client = getTursoClient();
    const resolvedAt = params.status === 'RESOLVED' ? new Date().toISOString() : null;

    try {
      await this.initDatabase();

      await client.execute({
        sql: `UPDATE maintenance_tickets
              SET status = ?,
                  photo_after_url = COALESCE(?, photo_after_url),
                  assigned_artisan_id = COALESCE(?, assigned_artisan_id),
                  resolved_at = CASE WHEN ? = 'RESOLVED' THEN ? ELSE resolved_at END
              WHERE id = ?`,
        args: [
          params.status,
          params.photoAfterUrl || null,
          params.assignedArtisanId || null,
          params.status,
          resolvedAt,
          params.ticketId
        ]
      });

      return await this.getTicketById(params.ticketId);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }
}
