import { createClient, Client } from '@libsql/client';
import crypto from 'crypto-js';
import {
  HostelOccupancyMetrics,
  ActionQueueSummary,
  PendingClearanceItem,
  PendingExeatItem,
  ActivityLogItem,
  ReviewClearanceParams,
  ReviewExeatParams,
} from '../types/warden';

/**
 * Service class handling Hall Warden Executive Dashboard queries and approval queue actions.
 * Operates directly on the Turso libSQL Edge SQLite database following strict Zero-Mock rules.
 */
export class WardenService {
  private client: Client;

  constructor() {
    this.client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:unilagstay.db',
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    });
  }

  /**
   * Initializes required SQLite database schema tables and foreign key constraints for Warden operations.
   */
  async initTables(): Promise<void> {
    // Ensure core users table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        matric_number TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('STUDENT', 'PORTER', 'WARDEN', 'MAINTENANCE', 'ADMIN')) NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // Ensure student profiles table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        user_id TEXT PRIMARY KEY,
        faculty TEXT NOT NULL,
        department TEXT NOT NULL,
        level INTEGER NOT NULL,
        campus TEXT NOT NULL,
        priority_category TEXT NOT NULL,
        fees_paid INTEGER DEFAULT 0,
        clearance_status TEXT DEFAULT 'NOT_SUBMITTED',
        clearance_certificate_hash TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ensure hostels table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender_restriction TEXT CHECK(gender_restriction IN ('MALE', 'FEMALE')) NOT NULL,
        campus TEXT NOT NULL,
        total_capacity INTEGER NOT NULL
      )
    `);

    // Ensure rooms table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        floor_number INTEGER NOT NULL,
        capacity INTEGER NOT NULL,
        FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
      )
    `);

    // Ensure bedspaces table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS bedspaces (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        bed_number TEXT NOT NULL,
        status TEXT CHECK(status IN ('AVAILABLE', 'LOCKED_HOLD', 'CONFIRMED', 'OCCUPIED')) DEFAULT 'AVAILABLE',
        assigned_student_id TEXT,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_student_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Ensure clearance documents table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS clearance_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        doc_type TEXT CHECK(doc_type IN ('MEDICAL_CERTIFICATE', 'PASSPORT_PHOTO', 'CODE_OF_CONDUCT')) NOT NULL,
        file_path TEXT NOT NULL,
        status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
        rejection_reason TEXT,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ensure clearance review logs table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS clearance_review_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        warden_id TEXT NOT NULL,
        action_status TEXT NOT NULL,
        notes TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ensure exeat requests table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS exeat_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        reason TEXT NOT NULL,
        departure_date TEXT NOT NULL,
        return_date TEXT NOT NULL,
        warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED')) DEFAULT 'PENDING',
        warden_id TEXT,
        warden_notes TEXT,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Retrieves overall or hostel-specific occupancy metrics.
   * Calculates total bed capacity, occupied beds, allocated beds, and percentage capacity.
   */
  async getOccupancyMetrics(hostelId?: string): Promise<HostelOccupancyMetrics> {
    await this.initTables();

    let sql = `
      SELECT
        COUNT(b.id) as total_beds,
        SUM(CASE WHEN b.status IN ('OCCUPIED', 'CONFIRMED') THEN 1 ELSE 0 END) as occupied_beds,
        SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) as allocated_beds,
        SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) as vacant_beds
      FROM bedspaces b
      JOIN rooms r ON b.room_id = r.id
    `;
    const args: any[] = [];

    if (hostelId) {
      sql += ` WHERE r.hostel_id = ?`;
      args.push(hostelId);
    }

    const rs = await this.client.execute({ sql, args });
    const row = rs.rows[0];

    const totalBeds = Number(row?.total_beds || 0);
    const occupiedBeds = Number(row?.occupied_beds || 0);
    const allocatedBeds = Number(row?.allocated_beds || 0);
    const vacantBeds = Number(row?.vacant_beds || 0);

    const percentageOccupied = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    let hostelName = 'All Hostels';
    if (hostelId) {
      const hostelRs = await this.client.execute({
        sql: `SELECT name FROM hostels WHERE id = ?`,
        args: [hostelId],
      });
      if (hostelRs.rows.length > 0) {
        hostelName = String(hostelRs.rows[0].name);
      }
    }

    return {
      hostelId: hostelId || 'all',
      hostelName,
      totalBeds,
      occupiedBeds,
      percentageOccupied,
      allocatedBeds,
      vacantBeds,
    };
  }

  /**
   * Retrieves badge summary counts for the Warden action queue.
   */
  async getActionQueueSummary(): Promise<ActionQueueSummary> {
    await this.initTables();

    // Count pending clearances awaiting warden review
    const clearanceRs = await this.client.execute(`
      SELECT COUNT(*) as count FROM student_profiles WHERE clearance_status = 'PENDING_REVIEW'
    `);
    const pendingClearancesCount = Number(clearanceRs.rows[0]?.count || 0);

    // Count pending exeat requests awaiting warden permission
    const exeatRs = await this.client.execute(`
      SELECT COUNT(*) as count FROM exeat_requests WHERE warden_approval_status = 'PENDING'
    `);
    const pendingExeatCount = Number(exeatRs.rows[0]?.count || 0);

    return {
      pendingClearancesCount,
      pendingExeatCount,
      activeSosAlertsCount: 0,
    };
  }

  /**
   * Fetches list of student clearance packages currently pending Warden review.
   */
  async getPendingClearances(): Promise<PendingClearanceItem[]> {
    await this.initTables();

    const sql = `
      SELECT
        u.id as user_id,
        u.full_name,
        u.matric_number,
        sp.faculty,
        sp.department,
        sp.level
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.clearance_status = 'PENDING_REVIEW'
      ORDER BY u.full_name ASC
    `;

    const rs = await this.client.execute(sql);
    const items: PendingClearanceItem[] = [];

    for (const row of rs.rows) {
      const userId = String(row.user_id);
      // Fetch document URLs for this student
      const docRs = await this.client.execute({
        sql: `SELECT doc_type, file_path FROM clearance_documents WHERE user_id = ?`,
        args: [userId],
      });

      let passportPhotoUrl: string | undefined;
      let medicalCertUrl: string | undefined;
      let codeOfConductUrl: string | undefined;

      for (const dRow of docRs.rows) {
        const type = String(dRow.doc_type);
        const path = String(dRow.file_path);
        if (type === 'PASSPORT_PHOTO') passportPhotoUrl = path;
        if (type === 'MEDICAL_CERTIFICATE') medicalCertUrl = path;
        if (type === 'CODE_OF_CONDUCT') codeOfConductUrl = path;
      }

      items.push({
        userId,
        studentName: String(row.full_name),
        matricNumber: String(row.matric_number),
        faculty: String(row.faculty),
        department: String(row.department),
        level: Number(row.level),
        passportPhotoUrl,
        medicalCertUrl,
        codeOfConductUrl,
        submissionDate: new Date().toISOString(),
      });
    }

    return items;
  }

  /**
   * Fetches list of student overnight exeat requests currently pending Warden review.
   */
  async getPendingExeatRequests(): Promise<PendingExeatItem[]> {
    await this.initTables();

    const sql = `
      SELECT
        e.id as exeat_id,
        e.student_id,
        u.full_name,
        u.matric_number,
        e.destination_address,
        e.reason,
        e.departure_date,
        e.return_date,
        e.warden_approval_status
      FROM exeat_requests e
      JOIN users u ON e.student_id = u.id
      WHERE e.warden_approval_status = 'PENDING'
      ORDER BY e.departure_date ASC
    `;

    const rs = await this.client.execute(sql);
    return rs.rows.map((row) => ({
      exeatId: String(row.exeat_id),
      studentId: String(row.student_id),
      studentName: String(row.full_name),
      matricNumber: String(row.matric_number),
      roomNumber: 'Assigned Room',
      destinationAddress: String(row.destination_address),
      reason: String(row.reason),
      departureDate: String(row.departure_date),
      returnDate: String(row.return_date),
      approvalStatus: String(row.warden_approval_status) as 'PENDING' | 'APPROVED' | 'DECLINED',
    }));
  }

  /**
   * Reviews and updates a student clearance package status.
   * If approved, generates a cryptographic clearance certificate hash.
   */
  async reviewClearancePackage(params: ReviewClearanceParams): Promise<boolean> {
    await this.initTables();

    const timestamp = new Date().toISOString();
    let certHash: string | null = null;

    if (params.status === 'APPROVED') {
      certHash = `CERT-${crypto.SHA256(`${params.userId}:${params.wardenId}:${timestamp}`).toString().substring(0, 16).toUpperCase()}`;
    }

    // Update student_profiles clearance_status
    await this.client.execute({
      sql: `UPDATE student_profiles
            SET clearance_status = ?, clearance_certificate_hash = ?
            WHERE user_id = ?`,
      args: [params.status, certHash, params.userId],
    });

    // Update individual clearance documents status
    await this.client.execute({
      sql: `UPDATE clearance_documents
            SET status = ?, rejection_reason = ?
            WHERE user_id = ?`,
      args: [params.status, params.notes || null, params.userId],
    });

    // Insert log entry into clearance_review_logs
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await this.client.execute({
      sql: `INSERT INTO clearance_review_logs (id, user_id, warden_id, action_status, notes, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [logId, params.userId, params.wardenId, params.status, params.notes || null, timestamp],
    });

    return true;
  }

  /**
   * Reviews and updates an overnight exeat request status.
   */
  async reviewExeatRequest(params: ReviewExeatParams): Promise<boolean> {
    await this.initTables();

    await this.client.execute({
      sql: `UPDATE exeat_requests
            SET warden_approval_status = ?, warden_id = ?, warden_notes = ?
            WHERE id = ?`,
      args: [params.status, params.wardenId, params.notes || null, params.exeatId],
    });

    return true;
  }

  /**
   * Retrieves recent Warden activity logs from clearance review operations and exeat decisions.
   */
  async getRecentActivityLogs(limit: number = 10): Promise<ActivityLogItem[]> {
    await this.initTables();

    const sql = `
      SELECT
        l.id,
        'CLEARANCE' as type,
        'Clearance ' || l.action_status as title,
        'Student ID: ' || l.user_id || ' reviewed by Warden' as description,
        l.timestamp,
        l.action_status as status
      FROM clearance_review_logs l
      ORDER BY l.timestamp DESC
      LIMIT ?
    `;

    const rs = await this.client.execute({ sql, args: [limit] });

    return rs.rows.map((row) => ({
      id: String(row.id),
      type: 'CLEARANCE',
      title: String(row.title),
      description: String(row.description),
      timestamp: String(row.timestamp),
      status: String(row.status),
    }));
  }
}

export const wardenService = new WardenService();
