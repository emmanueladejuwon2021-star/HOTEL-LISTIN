import { AuthService } from './authService';
import {
  EmergencyAlert,
  EmergencyHotline,
  TriggerSOSParams,
  UpdateAlertStatusParams
} from '../types/emergency';

/**
 * Service managing emergency panic SOS alert triggers, porter gatehouse notifications,
 * alert status transitions, and UNILAG campus emergency hotline directory.
 *
 * Implements [EMERGENCY-02] (Issue #67 / UAT-0067) for UnilagStay.
 */
export class EmergencyService {
  /**
   * Initializes the Turso libSQL SQLite database schemas for emergency alerts and hotlines.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Table for emergency panic alerts
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS emergency_alerts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        emergency_type TEXT CHECK(emergency_type IN ('MEDICAL', 'FIRE', 'SECURITY', 'GENERAL_PANIC')) NOT NULL,
        description TEXT,
        status TEXT CHECK(status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM')) DEFAULT 'ACTIVE',
        acknowledged_by_porter_id TEXT,
        acknowledged_at DATETIME,
        resolved_at DATETIME,
        resolution_notes TEXT,
        triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_emergency_student ON emergency_alerts(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_alerts(status)`,
      args: []
    });

    // 2. Table for campus emergency hotlines
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS emergency_hotlines (
        id TEXT PRIMARY KEY,
        department TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        description TEXT NOT NULL,
        is_available_24_7 INTEGER DEFAULT 1,
        priority_order INTEGER DEFAULT 1
      )`,
      args: []
    });

    // Seed default emergency hotlines if empty
    const countRes = await client.execute({
      sql: `SELECT COUNT(*) as cnt FROM emergency_hotlines`,
      args: []
    });

    if (Number(countRes.rows[0]?.cnt || 0) === 0) {
      await client.batch([
        {
          sql: `INSERT INTO emergency_hotlines (id, department, phone_number, description, is_available_24_7, priority_order)
                VALUES ('hotline_1', 'UNILAG Medical Centre Emergency', '08099930001', 'Direct 24/7 ambulance and emergency medical response team', 1, 1)`,
          args: []
        },
        {
          sql: `INSERT INTO emergency_hotlines (id, department, phone_number, description, is_available_24_7, priority_order)
                VALUES ('hotline_2', 'Campus Security Control Room', '08099930002', 'Hostel security unit, gate control & patrol dispatch', 1, 2)`,
          args: []
        },
        {
          sql: `INSERT INTO emergency_hotlines (id, department, phone_number, description, is_available_24_7, priority_order)
                VALUES ('hotline_3', 'UNILAG Fire & Safety Service', '08099930003', 'Campus fire rescue and emergency hazard control unit', 1, 3)`,
          args: []
        },
        {
          sql: `INSERT INTO emergency_hotlines (id, department, phone_number, description, is_available_24_7, priority_order)
                VALUES ('hotline_4', 'Student Affairs Welfare Office', '08099930004', 'Student distress support and hostel warden command desk', 1, 4)`,
          args: []
        }
      ], 'write');
    }
  }

  /**
   * Triggers a new emergency panic SOS alert for a resident student.
   *
   * @param params - Parameters containing student ID, emergency category, and optional notes
   * @returns Newly created EmergencyAlert record
   */
  public static async triggerEmergencySOS(params: TriggerSOSParams): Promise<EmergencyAlert> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    // Verify student account exists
    const userRes = await client.execute({
      sql: `SELECT u.id, u.full_name, u.matric_or_staff_no, u.phone_number
            FROM users u WHERE u.id = ? AND u.role = 'STUDENT'`,
      args: [params.studentId]
    });

    if (userRes.rows.length === 0) {
      throw new Error(`Student account with ID '${params.studentId}' not found.`);
    }

    const uRow = userRes.rows[0];
    const studentName = String(uRow.full_name);
    const studentMatric = String(uRow.matric_or_staff_no);
    const studentPhone = String(uRow.phone_number || '');

    // Resolve hostel and room assignment
    let hostelName = 'Main Campus Hostel';
    let roomNumber = 'Room A-101';

    try {
      const bedRes = await client.execute({
        sql: `SELECT b.bed_label, r.room_number, h.name as hostel_name
              FROM bedspaces b
              JOIN rooms r ON b.room_id = r.id
              JOIN hostels h ON r.hostel_id = h.id
              WHERE b.allocated_to_user_id = ?
              LIMIT 1`,
        args: [params.studentId]
      });

      if (bedRes.rows.length > 0) {
        if (bedRes.rows[0].hostel_name) hostelName = String(bedRes.rows[0].hostel_name);
        roomNumber = `${bedRes.rows[0].room_number} (${bedRes.rows[0].bed_label})`;
      } else {
        const payRes = await client.execute({
          sql: `SELECT r.room_number, h.name as hostel_name
                FROM payments p
                JOIN rooms r ON p.room_id = r.id
                JOIN hostels h ON r.hostel_id = h.id
                WHERE p.user_id = ? AND p.payment_status IN ('LOCKED', 'COMPLETED')
                LIMIT 1`,
          args: [params.studentId]
        });
        if (payRes.rows.length > 0) {
          if (payRes.rows[0].hostel_name) hostelName = String(payRes.rows[0].hostel_name);
          if (payRes.rows[0].room_number) roomNumber = String(payRes.rows[0].room_number);
        }
      }
    } catch {}

    const alertId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const triggeredAt = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO emergency_alerts (id, student_id, emergency_type, description, status, triggered_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      args: [alertId, params.studentId, params.emergencyType, params.description || null, triggeredAt]
    });

    return {
      id: alertId,
      studentId: params.studentId,
      studentName,
      studentMatric,
      studentPhone,
      hostelName,
      roomNumber,
      emergencyType: params.emergencyType,
      description: params.description,
      status: 'ACTIVE',
      triggeredAt
    };
  }

  /**
   * Retrieves active or acknowledged emergency panic alerts for porters and hostel admins.
   */
  public static async getActiveAlertsForPorter(): Promise<EmergencyAlert[]> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT ea.id, ea.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   u.phone_number as student_phone, ea.emergency_type, ea.description, ea.status,
                   ea.acknowledged_by_porter_id, p.full_name as porter_name, ea.acknowledged_at,
                   ea.resolved_at, ea.resolution_notes, ea.triggered_at
            FROM emergency_alerts ea
            JOIN users u ON ea.student_id = u.id
            LEFT JOIN users p ON ea.acknowledged_by_porter_id = p.id
            WHERE ea.status IN ('ACTIVE', 'ACKNOWLEDGED')
            ORDER BY ea.triggered_at DESC`,
      args: []
    });

    return res.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: String(row.student_name),
      studentMatric: String(row.student_matric),
      studentPhone: String(row.student_phone || ''),
      hostelName: 'Hostel Facility',
      roomNumber: 'Assigned Resident Bedspace',
      emergencyType: String(row.emergency_type) as any,
      description: row.description ? String(row.description) : undefined,
      status: String(row.status) as any,
      acknowledgedByPorterId: row.acknowledged_by_porter_id ? String(row.acknowledged_by_porter_id) : undefined,
      acknowledgedByPorterName: row.porter_name ? String(row.porter_name) : undefined,
      acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
      resolutionNotes: row.resolution_notes ? String(row.resolution_notes) : undefined,
      triggeredAt: String(row.triggered_at)
    }));
  }

  /**
   * Updates an alert status to ACKNOWLEDGED or RESOLVED.
   */
  public static async updateAlertStatus(params: UpdateAlertStatusParams): Promise<void> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();
    const nowIso = new Date().toISOString();

    if (params.status === 'ACKNOWLEDGED') {
      await client.execute({
        sql: `UPDATE emergency_alerts
              SET status = 'ACKNOWLEDGED', acknowledged_by_porter_id = ?, acknowledged_at = ?
              WHERE id = ?`,
        args: [params.porterId, nowIso, params.alertId]
      });
    } else if (params.status === 'RESOLVED') {
      await client.execute({
        sql: `UPDATE emergency_alerts
              SET status = 'RESOLVED', resolved_at = ?, resolution_notes = ?
              WHERE id = ?`,
        args: [nowIso, params.resolutionNotes || 'Resolved by hostel gate porter', params.alertId]
      });
    }
  }

  /**
   * Cancels a triggered SOS alert (e.g., student accidental trigger / false alarm).
   */
  public static async cancelSOS(alertId: string, studentId: string): Promise<void> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `UPDATE emergency_alerts
            SET status = 'FALSE_ALARM', resolution_notes = 'Cancelled by student (False Alarm)'
            WHERE id = ? AND student_id = ?`,
      args: [alertId, studentId]
    });
  }

  /**
   * Retrieves emergency panic alert history for a specific student.
   */
  public static async getStudentAlertHistory(studentId: string): Promise<EmergencyAlert[]> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT ea.id, ea.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   u.phone_number as student_phone, ea.emergency_type, ea.description, ea.status,
                   ea.acknowledged_by_porter_id, p.full_name as porter_name, ea.acknowledged_at,
                   ea.resolved_at, ea.resolution_notes, ea.triggered_at
            FROM emergency_alerts ea
            JOIN users u ON ea.student_id = u.id
            LEFT JOIN users p ON ea.acknowledged_by_porter_id = p.id
            WHERE ea.student_id = ?
            ORDER BY ea.triggered_at DESC`,
      args: [studentId]
    });

    return res.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: String(row.student_name),
      studentMatric: String(row.student_matric),
      studentPhone: String(row.student_phone || ''),
      hostelName: 'Hostel Facility',
      roomNumber: 'Assigned Resident Bedspace',
      emergencyType: String(row.emergency_type) as any,
      description: row.description ? String(row.description) : undefined,
      status: String(row.status) as any,
      acknowledgedByPorterId: row.acknowledged_by_porter_id ? String(row.acknowledged_by_porter_id) : undefined,
      acknowledgedByPorterName: row.porter_name ? String(row.porter_name) : undefined,
      acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
      resolutionNotes: row.resolution_notes ? String(row.resolution_notes) : undefined,
      triggeredAt: String(row.triggered_at)
    }));
  }

  /**
   * Retrieves all registered campus emergency hotlines.
   */
  public static async getCampusHotlines(): Promise<EmergencyHotline[]> {
    await EmergencyService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT id, department, phone_number, description, is_available_24_7, priority_order
            FROM emergency_hotlines
            ORDER BY priority_order ASC`,
      args: []
    });

    return res.rows.map(row => ({
      id: String(row.id),
      department: String(row.department),
      phoneNumber: String(row.phone_number),
      description: String(row.description),
      isAvailable24_7: Boolean(row.is_available_24_7),
      priorityOrder: Number(row.priority_order)
    }));
  }
}
