import { createClient, Client } from '@libsql/client';
import {
  CreateTicketParams,
  MaintenanceTicket,
  CATEGORY_METADATA,
  MaintenanceStatus,
  MaintenancePriority,
} from '../types/maintenance';

/**
 * Maintenance Service for UNILAG Hostel Management Ecosystem.
 * Manages database schema DDL initialization, ticket insertion, student ticket fetching, and ticket cancellation
 * directly against the Turso libSQL SQLite edge database with zero mock data.
 * Includes clear, jargon-free English comments explaining each operation.
 */

// Initialize Turso libSQL Database Client using local SQLite file for offline/dev sync or environment variables
const TURSO_URL = process.env.TURSO_DATABASE_URL || 'file:unilagstay.db';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

const client: Client = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

/**
 * Initializes the `maintenance_tickets` table and associated indexes in Turso DB if they do not exist.
 */
export const initMaintenanceTables = async (): Promise<void> => {
  await client.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_before_url TEXT NOT NULL,
        photo_after_url TEXT,
        status TEXT DEFAULT 'OPEN',
        target_sla TEXT NOT NULL,
        assigned_artisan_id TEXT,
        student_feedback TEXT,
        rating INTEGER,
        confirmed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      );
    `,
    args: [],
  });

  // Safe migrations for existing databases that don't have the new columns yet
  try {
    await client.execute({ sql: `ALTER TABLE maintenance_tickets ADD COLUMN student_feedback TEXT`, args: [] });
  } catch (_e) {}
  try {
    await client.execute({ sql: `ALTER TABLE maintenance_tickets ADD COLUMN rating INTEGER`, args: [] });
  } catch (_e) {}
  try {
    await client.execute({ sql: `ALTER TABLE maintenance_tickets ADD COLUMN confirmed_at DATETIME`, args: [] });
  } catch (_e) {}

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_student ON maintenance_tickets(student_id);`,
    args: [],
  });

  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);`,
    args: [],
  });
};

/**
 * Creates a new photo-backed repair request ticket in Turso DB for a student.
 */
export const createMaintenanceTicket = async (
  params: CreateTicketParams
): Promise<MaintenanceTicket> => {
  await initMaintenanceTables();

  if (!params.description || params.description.trim().length === 0) {
    throw new Error('Please enter a description of the defect or damage in your room.');
  }

  if (!params.photoBeforeUrl || params.photoBeforeUrl.trim().length === 0) {
    throw new Error('A photo attachment showing the broken facility or defect is required.');
  }

  const categoryMeta = CATEGORY_METADATA[params.category];
  const priority: MaintenancePriority = params.priority || categoryMeta.defaultPriority;
  const targetSla = categoryMeta.targetSla;
  const ticketId = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date().toISOString();

  await client.execute({
    sql: `
      INSERT INTO maintenance_tickets (
        id, student_id, hostel_id, room_number, category, priority,
        description, photo_before_url, status, target_sla, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?);
    `,
    args: [
      ticketId,
      params.studentId,
      params.hostelId,
      params.roomNumber,
      params.category,
      priority,
      params.description.trim(),
      params.photoBeforeUrl.trim(),
      targetSla,
      createdAt,
    ],
  });

  return {
    id: ticketId,
    studentId: params.studentId,
    hostelId: params.hostelId,
    roomNumber: params.roomNumber,
    category: params.category,
    priority,
    description: params.description.trim(),
    photoBeforeUrl: params.photoBeforeUrl.trim(),
    status: 'OPEN',
    targetSla,
    createdAt,
  };
};

/**
 * Fetches all maintenance tickets submitted by a specific student.
 */
export const getStudentTickets = async (studentId: string): Promise<MaintenanceTicket[]> => {
  await initMaintenanceTables();

  const result = await client.execute({
    sql: `
      SELECT id, student_id, hostel_id, room_number, category, priority,
             description, photo_before_url, photo_after_url, status, target_sla,
             assigned_artisan_id, student_feedback, rating, confirmed_at, created_at, resolved_at
      FROM maintenance_tickets
      WHERE student_id = ?
      ORDER BY created_at DESC;
    `,
    args: [studentId],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    studentId: String(row.student_id),
    hostelId: String(row.hostel_id),
    roomNumber: String(row.room_number),
    category: row.category as any,
    priority: row.priority as MaintenancePriority,
    description: String(row.description),
    photoBeforeUrl: String(row.photo_before_url),
    photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
    status: row.status as MaintenanceStatus,
    targetSla: String(row.target_sla),
    assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
    studentFeedback: row.student_feedback ? String(row.student_feedback) : undefined,
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : undefined,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : undefined,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  }));
};

/**
 * Fetches tickets filtered by status for a specific student.
 */
export const getStudentTicketsByStatus = async (
  studentId: string,
  status: string
): Promise<MaintenanceTicket[]> => {
  await initMaintenanceTables();

  if (status === 'ALL') {
    return getStudentTickets(studentId);
  }

  const result = await client.execute({
    sql: `
      SELECT id, student_id, hostel_id, room_number, category, priority,
             description, photo_before_url, photo_after_url, status, target_sla,
             assigned_artisan_id, student_feedback, rating, confirmed_at, created_at, resolved_at
      FROM maintenance_tickets
      WHERE student_id = ? AND status = ?
      ORDER BY created_at DESC;
    `,
    args: [studentId, status],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    studentId: String(row.student_id),
    hostelId: String(row.hostel_id),
    roomNumber: String(row.room_number),
    category: row.category as any,
    priority: row.priority as MaintenancePriority,
    description: String(row.description),
    photoBeforeUrl: String(row.photo_before_url),
    photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
    status: row.status as MaintenanceStatus,
    targetSla: String(row.target_sla),
    assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
    studentFeedback: row.student_feedback ? String(row.student_feedback) : undefined,
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : undefined,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : undefined,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  }));
};

/**
 * Retrieves full details for a single maintenance ticket by ID.
 */
export const getTicketDetails = async (
  ticketId: string
): Promise<MaintenanceTicket | null> => {
  await initMaintenanceTables();

  const result = await client.execute({
    sql: `
      SELECT id, student_id, hostel_id, room_number, category, priority,
             description, photo_before_url, photo_after_url, status, target_sla,
             assigned_artisan_id, student_feedback, rating, confirmed_at, created_at, resolved_at
      FROM maintenance_tickets
      WHERE id = ?;
    `,
    args: [ticketId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    hostelId: String(row.hostel_id),
    roomNumber: String(row.room_number),
    category: row.category as any,
    priority: row.priority as MaintenancePriority,
    description: String(row.description),
    photoBeforeUrl: String(row.photo_before_url),
    photoAfterUrl: row.photo_after_url ? String(row.photo_after_url) : undefined,
    status: row.status as MaintenanceStatus,
    targetSla: String(row.target_sla),
    assignedArtisanId: row.assigned_artisan_id ? String(row.assigned_artisan_id) : undefined,
    studentFeedback: row.student_feedback ? String(row.student_feedback) : undefined,
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : undefined,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : undefined,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  };
};

/**
 * Confirms resolution of a maintenance repair ticket, saving student satisfaction rating and feedback to Turso DB.
 */
export const confirmTicketResolution = async (params: {
  ticketId: string;
  studentId: string;
  rating: number;
  studentFeedback?: string;
}): Promise<boolean> => {
  await initMaintenanceTables();

  if (params.rating < 1 || params.rating > 5) {
    throw new Error('Please select a star rating between 1 and 5.');
  }

  const confirmedAt = new Date().toISOString();

  const result = await client.execute({
    sql: `
      UPDATE maintenance_tickets
      SET rating = ?,
          student_feedback = ?,
          confirmed_at = ?
      WHERE id = ? AND student_id = ? AND status = 'RESOLVED';
    `,
    args: [
      params.rating,
      params.studentFeedback ? params.studentFeedback.trim() : null,
      confirmedAt,
      params.ticketId,
      params.studentId,
    ],
  });

  return result.rowsAffected > 0;
};

/**
 * Cancels an open maintenance ticket submitted by a student.
 */
export const cancelMaintenanceTicket = async (
  ticketId: string,
  studentId: string
): Promise<boolean> => {
  await initMaintenanceTables();

  const result = await client.execute({
    sql: `
      UPDATE maintenance_tickets
      SET status = 'CANCELLED'
      WHERE id = ? AND student_id = ? AND status = 'OPEN';
    `,
    args: [ticketId, studentId],
  });

  return result.rowsAffected > 0;
};
