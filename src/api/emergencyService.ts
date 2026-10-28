/**
 * Emergency SOS & Security Alert Service
 *
 * This service handles real-time database operations for student panic SOS triggers,
 * alert tracking, emergency responses, and campus hotline directories using Turso libSQL edge DB.
 */

import { AuthService } from './authService';
import { PaymentService } from './paymentService';
import {
  EmergencyAlert,
  EmergencyHotline,
  TriggerSOSRequest,
  ResolveSOSRequest,
  EmergencyAlertStatus,
  EmergencyAlertType
} from '../types/emergency';

export class EmergencyService {
  /**
   * Initializes database tables and indexes for emergency alerts and campus hotlines.
   * Ensures zero-mock live database capability and default hotline seeding.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Create emergency_alerts table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS emergency_alerts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        alert_type TEXT CHECK(alert_type IN ('MEDICAL', 'SECURITY', 'FIRE', 'GENERAL_PANIC', 'MEDICAL_OR_SECURITY')) DEFAULT 'GENERAL_PANIC',
        status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED', 'CANCELLED')) DEFAULT 'ACTIVE',
        additional_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        resolved_at DATETIME,
        resolved_by_staff_id TEXT,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (hostel_id) REFERENCES hostels(id)
      )`,
      args: []
    });

    // Indexes for fast lookup by student, hostel, and active alert status
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_emergency_alerts_student ON emergency_alerts(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status)`,
      args: []
    });

    // 2. Create emergency_hotlines table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS emergency_hotlines (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        campus TEXT NOT NULL,
        description TEXT,
        badge_color TEXT DEFAULT 'red'
      )`,
      args: []
    });

    // 3. Seed default hotlines if table is empty
    const checkHotlines = await client.execute({
      sql: `SELECT COUNT(*) as count FROM emergency_hotlines`,
      args: []
    });

    const count = Number(checkHotlines.rows[0]?.count || 0);
    if (count === 0) {
      const defaultHotlines = [
        {
          id: 'hotline_sec_main',
          title: 'UNILAG Central Security Control Room',
          phone_number: '+234 802 300 1122',
          campus: 'MAIN_CAMPUS',
          description: '24/7 Security Patrol and Emergency Incident Response Unit for Main Campus Akoka.',
          badge_color: '#DC2626'
        },
        {
          id: 'hotline_med_main',
          title: 'UNILAG Health Center Medical Emergency',
          phone_number: '+234 803 400 3344',
          campus: 'MAIN_CAMPUS',
          description: 'Immediate Medical Ambulance Dispatch & On-call Doctors at Akoka Health Center.',
          badge_color: '#059669'
        },
        {
          id: 'hotline_fire_main',
          title: 'UNILAG Campus Fire Station',
          phone_number: '+234 801 500 5566',
          campus: 'MAIN_CAMPUS',
          description: 'Campus Fire Prevention & Emergency Extinguisher Response Desk.',
          badge_color: '#D97706'
        },
        {
          id: 'hotline_sec_cmul',
          title: 'CMUL Idi-Araba Security Desk',
          phone_number: '+234 802 600 7788',
          campus: 'CMUL_IDI_ARABA',
          description: '24/7 Security Patrol for College of Medicine Campus Idi-Araba.',
          badge_color: '#DC2626'
        }
      ];

      for (const h of defaultHotlines) {
        await client.execute({
          sql: `INSERT INTO emergency_hotlines (id, title, phone_number, campus, description, badge_color)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [h.id, h.title, h.phone_number, h.campus, h.description, h.badge_color]
        });
      }
    }
  }

  /**
   * Triggers a new panic SOS alert for a student in distress.
   * Inserts an ACTIVE emergency record into the database and returns the full alert model.
   */
  public static async triggerSOS(params: TriggerSOSRequest): Promise<EmergencyAlert> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    const alertId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAtIso = new Date().toISOString();

    // Check if student already has an active alert to prevent duplicate flooding
    const activeCheck = await client.execute({
      sql: `SELECT id FROM emergency_alerts WHERE student_id = ? AND status IN ('ACTIVE', 'RESPONDED') LIMIT 1`,
      args: [params.studentId]
    });

    if (activeCheck.rows.length > 0) {
      const existingId = String(activeCheck.rows[0].id);
      const existingAlert = await EmergencyService.getAlertById(existingId);
      if (existingAlert) {
        return existingAlert;
      }
    }

    // Insert new emergency alert record
    await client.execute({
      sql: `INSERT INTO emergency_alerts (id, student_id, hostel_id, room_number, alert_type, status, additional_notes, created_at)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      args: [
        alertId,
        params.studentId,
        params.hostelId,
        params.roomNumber,
        params.alertType,
        params.additionalNotes || null,
        createdAtIso
      ]
    });

    const newAlert = await EmergencyService.getAlertById(alertId);
    if (!newAlert) {
      throw new Error('Failed to create emergency SOS panic alert');
    }

    return newAlert;
  }

  /**
   * Retrieves an emergency alert record by its unique ID with populated student & hostel information.
   */
  public static async getAlertById(alertId: string): Promise<EmergencyAlert | null> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT ea.*,
                   u.full_name as student_name,
                   u.matric_or_staff_no as student_matric,
                   u.phone_number as student_phone,
                   h.name as hostel_name
            FROM emergency_alerts ea
            LEFT JOIN users u ON ea.student_id = u.id
            LEFT JOIN hostels h ON ea.hostel_id = h.id
            WHERE ea.id = ?`,
      args: [alertId]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : 'Student',
      studentMatricNo: row.student_matric ? String(row.student_matric) : undefined,
      studentPhone: row.student_phone ? String(row.student_phone) : undefined,
      hostelId: String(row.hostel_id),
      hostelName: row.hostel_name ? String(row.hostel_name) : 'Hostel Building',
      roomNumber: String(row.room_number),
      alertType: String(row.alert_type) as EmergencyAlertType,
      status: String(row.status) as EmergencyAlertStatus,
      additionalNotes: row.additional_notes ? String(row.additional_notes) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      respondedAt: row.responded_at ? String(row.responded_at) : undefined,
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
      resolvedByStaffId: row.resolved_by_staff_id ? String(row.resolved_by_staff_id) : undefined
    };
  }

  /**
   * Fetches active or responded emergency alerts for porter alarms and warden monitoring.
   */
  public static async getActiveAlerts(studentId?: string, hostelId?: string): Promise<EmergencyAlert[]> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    let query = `SELECT ea.*,
                        u.full_name as student_name,
                        u.matric_or_staff_no as student_matric,
                        u.phone_number as student_phone,
                        h.name as hostel_name
                 FROM emergency_alerts ea
                 LEFT JOIN users u ON ea.student_id = u.id
                 LEFT JOIN hostels h ON ea.hostel_id = h.id
                 WHERE ea.status IN ('ACTIVE', 'RESPONDED')`;
    const args: any[] = [];

    if (studentId) {
      query += ` AND ea.student_id = ?`;
      args.push(studentId);
    }

    if (hostelId) {
      query += ` AND ea.hostel_id = ?`;
      args.push(hostelId);
    }

    query += ` ORDER BY ea.created_at DESC`;

    const result = await client.execute({ sql: query, args });

    return result.rows.map((row) => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : 'Student',
      studentMatricNo: row.student_matric ? String(row.student_matric) : undefined,
      studentPhone: row.student_phone ? String(row.student_phone) : undefined,
      hostelId: String(row.hostel_id),
      hostelName: row.hostel_name ? String(row.hostel_name) : 'Hostel Building',
      roomNumber: String(row.room_number),
      alertType: String(row.alert_type) as EmergencyAlertType,
      status: String(row.status) as EmergencyAlertStatus,
      additionalNotes: row.additional_notes ? String(row.additional_notes) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      respondedAt: row.responded_at ? String(row.responded_at) : undefined,
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
      resolvedByStaffId: row.resolved_by_staff_id ? String(row.resolved_by_staff_id) : undefined
    }));
  }

  /**
   * Retrieves current active SOS alert for a given student if one exists.
   */
  public static async getStudentActiveAlert(studentId: string): Promise<EmergencyAlert | null> {
    const alerts = await EmergencyService.getActiveAlerts(studentId);
    return alerts.length > 0 ? alerts[0] : null;
  }

  /**
   * Resolves or cancels an active emergency alert.
   */
  public static async resolveAlert(params: ResolveSOSRequest): Promise<boolean> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    const resolvedAtIso = new Date().toISOString();

    const result = await client.execute({
      sql: `UPDATE emergency_alerts
            SET status = ?, resolved_at = ?, resolved_by_staff_id = ?
            WHERE id = ? AND status IN ('ACTIVE', 'RESPONDED')`,
      args: [params.status, resolvedAtIso, params.userId, params.alertId]
    });

    return (result.rowsAffected || 0) > 0;
  }

  /**
   * Allows a student to cancel their active panic SOS alert if triggered by mistake.
   */
  public static async cancelAlert(alertId: string, studentId: string): Promise<boolean> {
    return EmergencyService.resolveAlert({
      alertId,
      userId: studentId,
      status: 'CANCELLED',
      resolutionNotes: 'Cancelled by student'
    });
  }

  /**
   * Returns list of emergency campus hotlines for phone dialing.
   */
  public static async getEmergencyHotlines(campus?: string): Promise<EmergencyHotline[]> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    let query = `SELECT * FROM emergency_hotlines`;
    const args: any[] = [];

    if (campus && campus !== 'ALL') {
      query += ` WHERE campus = ? OR campus = 'ALL'`;
      args.push(campus);
    }

    const result = await client.execute({ sql: query, args });

    return result.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      phoneNumber: String(row.phone_number),
      campus: String(row.campus) as 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA' | 'ALL',
      description: String(row.description || ''),
      badgeColor: String(row.badge_color || '#DC2626')
    }));
  }
}
