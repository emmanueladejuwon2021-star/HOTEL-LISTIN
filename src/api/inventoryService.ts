import { Client } from '@libsql/client';
import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import {
  RoomInventoryAudit,
  RecordAuditParams,
  ItemCondition,
  AuditType,
  CheckInActivationResult,
  ResidencyStatus
} from '../types/inventory';

/**
 * Service handling digital room check-in property inspections, inventory audits,
 * and residency activation lifecycles.
 * Connects directly to Turso libSQL edge SQLite database following strict zero-mock principles.
 *
 * Implements [INVENTORY-01 to INVENTORY-05] and supports:
 * - Full joint inspection checklists (mattress, fan, sockets, locks, lights, windows)
 * - Auto-defect maintenance ticket generation for items marked POOR
 * - Cryptographic SHA-256 certificate pass generation
 * - Physical room key issuance and tag tracking
 * - Resident status activation (transitioning student to ACTIVE_RESIDENT)
 * - Move-out / exit audit verification
 *
 * Commented with plain English descriptions for non-technical team members and hostel porters.
 */
export class InventoryService {
  /**
   * Initializes the database schema for room inventory audits.
   * Creates required tables and applies safe migrations.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS room_inventory_audits (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        porter_id TEXT NOT NULL,
        mattress_condition TEXT CHECK(mattress_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        fan_condition TEXT CHECK(fan_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        sockets_condition TEXT CHECK(sockets_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        locks_condition TEXT CHECK(locks_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        student_signature_url TEXT,
        porter_signature_url TEXT,
        notes TEXT,
        audited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (porter_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Safe schema migrations for Component 4 & 5 ([INVENTORY-04, INVENTORY-05])
    const migrationColumns = [
      `ALTER TABLE room_inventory_audits ADD COLUMN lights_condition TEXT DEFAULT 'GOOD'`,
      `ALTER TABLE room_inventory_audits ADD COLUMN windows_condition TEXT DEFAULT 'GOOD'`,
      `ALTER TABLE room_inventory_audits ADD COLUMN certificate_hash TEXT`,
      `ALTER TABLE room_inventory_audits ADD COLUMN key_issued INTEGER DEFAULT 0`,
      `ALTER TABLE room_inventory_audits ADD COLUMN key_tag_number TEXT`,
      `ALTER TABLE room_inventory_audits ADD COLUMN key_issued_at DATETIME`,
      `ALTER TABLE room_inventory_audits ADD COLUMN audit_type TEXT DEFAULT 'CHECK_IN'`,
      `ALTER TABLE student_profiles ADD COLUMN residency_status TEXT DEFAULT 'PENDING_CHECKIN'`
    ];

    for (const stmt of migrationColumns) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, safe to ignore
      }
    }

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_student ON room_inventory_audits(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_room ON room_inventory_audits(room_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_cert ON room_inventory_audits(certificate_hash)`,
      args: []
    });

    // Create maintenance_tickets table for auto-generated defect reports if not exists
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT DEFAULT 'hostel_main',
        room_number TEXT NOT NULL,
        category TEXT CHECK(category IN ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL')) NOT NULL,
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
  }

  /**
   * Helper method to map raw Turso database row into a strongly-typed RoomInventoryAudit object.
   */
  private static mapRowToAudit(row: any): RoomInventoryAudit {
    const studentSig = row.student_signature_url ? String(row.student_signature_url) : undefined;
    const porterSig = row.porter_signature_url ? String(row.porter_signature_url) : undefined;

    return {
      id: String(row.id),
      roomId: String(row.room_id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatricNo: row.student_matric ? String(row.student_matric) : undefined,
      porterId: String(row.porter_id),
      porterName: row.porter_name ? String(row.porter_name) : undefined,
      mattressCondition: String(row.mattress_condition) as ItemCondition,
      fanCondition: String(row.fan_condition) as ItemCondition,
      socketsCondition: String(row.sockets_condition) as ItemCondition,
      locksCondition: String(row.locks_condition) as ItemCondition,
      lightsCondition: (row.lights_condition ? String(row.lights_condition) : 'GOOD') as ItemCondition,
      windowsCondition: (row.windows_condition ? String(row.windows_condition) : 'GOOD') as ItemCondition,
      certificateHash: row.certificate_hash ? String(row.certificate_hash) : undefined,
      keyIssued: Boolean(row.key_issued),
      keyTagNumber: row.key_tag_number ? String(row.key_tag_number) : undefined,
      keyIssuedAt: row.key_issued_at ? String(row.key_issued_at) : undefined,
      auditType: (row.audit_type ? String(row.audit_type) : 'CHECK_IN') as AuditType,
      studentSignatureUrl: studentSig,
      porterSignatureUrl: porterSig,
      hasStudentSignature: Boolean(studentSig),
      hasPorterSignature: Boolean(porterSig),
      notes: row.notes ? String(row.notes) : undefined,
      auditedAt: String(row.audited_at || new Date().toISOString())
    };
  }

  /**
   * Records a joint room check-in or checkout property inventory audit conducted by a porter and student.
   * Generates a cryptographic SHA-256 audit certificate pass hash and auto-dispatches maintenance
   * tickets for any items flagged as POOR.
   *
   * @param params Audit parameters
   * @returns Newly created RoomInventoryAudit record
   */
  public static async recordAudit(params: RecordAuditParams): Promise<RoomInventoryAudit> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.roomId || !params.roomId.trim()) {
      throw new Error('Valid room ID is required for room audit.');
    }
    if (!params.studentId || !params.studentId.trim()) {
      throw new Error('Valid student ID is required for room audit.');
    }
    if (!params.porterId || !params.porterId.trim()) {
      throw new Error('Valid porter/staff ID is required for room audit.');
    }

    const auditType: AuditType = params.auditType || 'CHECK_IN';
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const studentSig = params.studentSignatureUrl?.trim() || null;
    const porterSig = params.porterSignatureUrl?.trim() || null;
    const notesContent = params.notes?.trim() || null;

    const lightsCond: ItemCondition = params.lightsCondition || 'GOOD';
    const windowsCond: ItemCondition = params.windowsCondition || 'GOOD';
    const isKeyIssued = params.keyIssued ? 1 : 0;
    const keyTag = params.keyTagNumber?.trim() || null;
    const nowIso = new Date().toISOString();

    // Generate cryptographic SHA-256 digital clearance certificate pass hash
    const rawPayload = `UNILAG_INVENTORY:${auditType}:${auditId}:${params.roomId.trim()}:${params.studentId.trim()}:${params.porterId.trim()}:${Date.now()}`;
    const certificateHash = `AUDIT-CERT-${CryptoJS.SHA256(rawPayload).toString().substring(0, 16).toUpperCase()}`;

    await client.execute({
      sql: `INSERT INTO room_inventory_audits (
        id, room_id, student_id, porter_id, mattress_condition, fan_condition, sockets_condition, locks_condition,
        lights_condition, windows_condition, certificate_hash, key_issued, key_tag_number, key_issued_at,
        audit_type, student_signature_url, porter_signature_url, notes, audited_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        auditId,
        params.roomId.trim(),
        params.studentId.trim(),
        params.porterId.trim(),
        params.mattressCondition,
        params.fanCondition,
        params.socketsCondition,
        params.locksCondition,
        lightsCond,
        windowsCond,
        certificateHash,
        isKeyIssued,
        keyTag,
        isKeyIssued ? nowIso : null,
        auditType,
        studentSig,
        porterSig,
        notesContent
      ]
    });

    // Auto-generate defect maintenance tickets for any items marked POOR during inspection
    const autoGeneratedDefects: string[] = [];
    const checkAndCreateDefect = async (category: string, itemLabel: string, condition: ItemCondition) => {
      if (condition === 'POOR') {
        const ticketId = `tkt_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const defectDesc = `Auto-reported ${auditType.toLowerCase()} defect: ${itemLabel} marked POOR in Room ${params.roomId.trim()}. ${notesContent ? `Remark: ${notesContent}` : ''}`;
        await client.execute({
          sql: `INSERT INTO maintenance_tickets (id, student_id, hostel_id, room_number, category, description, photo_before_url, status, created_at)
                VALUES (?, ?, 'hostel_main', ?, ?, ?, 'https://unilagstay.edu.ng/defects/checkin_defect.jpg', 'OPEN', CURRENT_TIMESTAMP)`,
          args: [ticketId, params.studentId.trim(), params.roomId.trim(), category, defectDesc]
        });
        autoGeneratedDefects.push(ticketId);
      }
    };

    await checkAndCreateDefect('CARPENTRY', 'Bed Mattress', params.mattressCondition);
    await checkAndCreateDefect('ELECTRICAL', 'Ceiling Fan & Regulator', params.fanCondition);
    await checkAndCreateDefect('ELECTRICAL', 'Electrical Wall Sockets', params.socketsCondition);
    await checkAndCreateDefect('CARPENTRY', 'Door Lock / Window Latches', params.locksCondition);
    await checkAndCreateDefect('ELECTRICAL', 'Ceiling Lights & Fixtures', lightsCond);
    await checkAndCreateDefect('CARPENTRY', 'Windows & Louvers', windowsCond);

    return {
      id: auditId,
      roomId: params.roomId.trim(),
      studentId: params.studentId.trim(),
      porterId: params.porterId.trim(),
      mattressCondition: params.mattressCondition,
      fanCondition: params.fanCondition,
      socketsCondition: params.socketsCondition,
      locksCondition: params.locksCondition,
      lightsCondition: lightsCond,
      windowsCondition: windowsCond,
      certificateHash,
      keyIssued: Boolean(isKeyIssued),
      keyTagNumber: keyTag || undefined,
      keyIssuedAt: isKeyIssued ? nowIso : undefined,
      auditType,
      studentSignatureUrl: studentSig || undefined,
      porterSignatureUrl: porterSig || undefined,
      hasStudentSignature: Boolean(studentSig),
      hasPorterSignature: Boolean(porterSig),
      autoGeneratedDefects: autoGeneratedDefects.length > 0 ? autoGeneratedDefects : undefined,
      notes: notesContent || undefined,
      auditedAt: nowIso
    };
  }

  /**
   * Finalizes room check-in inspection, verifies touchscreen signatures and key handover,
   * and transitions student status to ACTIVE_RESIDENT in Turso DB ([INVENTORY-05]).
   *
   * @param auditId The unique room inventory audit ID
   * @returns CheckInActivationResult with activated residency details
   */
  public static async completeCheckInAndActivateResident(auditId: string): Promise<CheckInActivationResult> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    const audit = await InventoryService.getAuditById(auditId);

    // Rule 1: Audit must have student signature
    if (!audit.hasStudentSignature) {
      throw new Error('Check-in cannot be completed without student touchscreen signature.');
    }

    // Rule 2: Audit must have porter signature
    if (!audit.hasPorterSignature) {
      throw new Error('Check-in cannot be completed without porter touchscreen signature.');
    }

    // Rule 3: Key must be issued
    if (!audit.keyIssued || !audit.keyTagNumber) {
      throw new Error('Check-in cannot be completed without official room key issuance and tag number.');
    }

    // Update student_profiles table: set residency_status = 'ACTIVE_RESIDENT'
    await client.execute({
      sql: `UPDATE student_profiles
            SET residency_status = 'ACTIVE_RESIDENT'
            WHERE user_id = ?`,
      args: [audit.studentId]
    });

    // Update allocated bedspace status to CONFIRMED / OCCUPIED if bedspaces table exists
    try {
      await client.execute({
        sql: `UPDATE bedspaces
              SET status = 'CONFIRMED'
              WHERE allocated_to_user_id = ?`,
        args: [audit.studentId]
      });
    } catch {
      // Safe to ignore if bedspaces table has not been initialized yet
    }

    const nowIso = new Date().toISOString();

    return {
      auditId: audit.id,
      studentId: audit.studentId,
      roomId: audit.roomId,
      residencyStatus: 'ACTIVE_RESIDENT',
      keyIssued: audit.keyIssued,
      keyTagNumber: audit.keyTagNumber,
      certificateHash: audit.certificateHash || 'AUDIT-CERT-VERIFIED',
      activatedAt: nowIso,
      message: `Residency activated successfully for student ${audit.studentId} in Room ${audit.roomId}. Official key: ${audit.keyTagNumber}`
    };
  }

  /**
   * Records official physical room key handover to a student following joint inspection.
   * Updates key_issued status, key tag number, and issuance timestamp in Turso DB.
   *
   * @param auditId The unique room inventory audit ID
   * @param keyTagNumber Tag identifier on physical key (e.g. "KEY-JAJA-101-A")
   * @returns Updated RoomInventoryAudit record
   */
  public static async issueRoomKey(auditId: string, keyTagNumber: string): Promise<RoomInventoryAudit> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!auditId || !auditId.trim()) {
      throw new Error('Valid audit ID is required for key handover.');
    }
    if (!keyTagNumber || !keyTagNumber.trim()) {
      throw new Error('Key tag number or label identifier is required.');
    }

    const cleanTag = keyTagNumber.trim().toUpperCase();

    const result = await client.execute({
      sql: `UPDATE room_inventory_audits
            SET key_issued = 1,
                key_tag_number = ?,
                key_issued_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [cleanTag, auditId.trim()]
    });

    if (result.rowsAffected === 0) {
      throw new Error(`Room inventory audit record not found for ID: ${auditId}`);
    }

    return await InventoryService.getAuditById(auditId.trim());
  }

  /**
   * Fetches an audit record by its unique ID.
   *
   * @param auditId Unique audit identifier
   * @returns RoomInventoryAudit record
   */
  public static async getAuditById(auditId: string): Promise<RoomInventoryAudit> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT ria.id, ria.room_id, ria.student_id, ria.porter_id, ria.mattress_condition, ria.fan_condition,
                   ria.sockets_condition, ria.locks_condition, ria.lights_condition, ria.windows_condition,
                   ria.certificate_hash, ria.key_issued, ria.key_tag_number, ria.key_issued_at, ria.audit_type,
                   ria.student_signature_url, ria.porter_signature_url, ria.notes, ria.audited_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_por.full_name as porter_name
            FROM room_inventory_audits ria
            LEFT JOIN users u_stu ON ria.student_id = u_stu.id
            LEFT JOIN users u_por ON ria.porter_id = u_por.id
            WHERE ria.id = ?`,
      args: [auditId.trim()]
    });

    if (result.rows.length === 0) {
      throw new Error(`Room inventory audit record not found for ID: ${auditId}`);
    }

    return InventoryService.mapRowToAudit(result.rows[0]);
  }

  /**
   * Verifies the authenticity of a room inventory audit certificate using its SHA-256 hash.
   *
   * @param certificateHash The cryptographic certificate hash
   * @returns Verified RoomInventoryAudit record
   */
  public static async verifyAuditCertificate(certificateHash: string): Promise<RoomInventoryAudit> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!certificateHash || !certificateHash.trim()) {
      throw new Error('Valid certificate verification hash is required.');
    }

    const cleanHash = certificateHash.trim().toUpperCase();

    const result = await client.execute({
      sql: `SELECT ria.id, ria.room_id, ria.student_id, ria.porter_id, ria.mattress_condition, ria.fan_condition,
                   ria.sockets_condition, ria.locks_condition, ria.lights_condition, ria.windows_condition,
                   ria.certificate_hash, ria.key_issued, ria.key_tag_number, ria.key_issued_at, ria.audit_type,
                   ria.student_signature_url, ria.porter_signature_url, ria.notes, ria.audited_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_por.full_name as porter_name
            FROM room_inventory_audits ria
            LEFT JOIN users u_stu ON ria.student_id = u_stu.id
            LEFT JOIN users u_por ON ria.porter_id = u_por.id
            WHERE ria.certificate_hash = ?`,
      args: [cleanHash]
    });

    if (result.rows.length === 0) {
      throw new Error(`Room inventory audit certificate not found or invalid for hash: ${cleanHash}`);
    }

    return InventoryService.mapRowToAudit(result.rows[0]);
  }

  /**
   * Fetches all inventory audits recorded for a specific student.
   *
   * @param studentId Student ID
   * @returns Array of RoomInventoryAudit records
   */
  public static async getAuditsByStudent(studentId: string): Promise<RoomInventoryAudit[]> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT ria.id, ria.room_id, ria.student_id, ria.porter_id, ria.mattress_condition, ria.fan_condition,
                   ria.sockets_condition, ria.locks_condition, ria.lights_condition, ria.windows_condition,
                   ria.certificate_hash, ria.key_issued, ria.key_tag_number, ria.key_issued_at, ria.audit_type,
                   ria.student_signature_url, ria.porter_signature_url, ria.notes, ria.audited_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_por.full_name as porter_name
            FROM room_inventory_audits ria
            LEFT JOIN users u_stu ON ria.student_id = u_stu.id
            LEFT JOIN users u_por ON ria.porter_id = u_por.id
            WHERE ria.student_id = ?
            ORDER BY ria.audited_at DESC`,
      args: [studentId]
    });

    return result.rows.map(row => InventoryService.mapRowToAudit(row));
  }

  /**
   * Fetches all inventory audits recorded for a specific room.
   *
   * @param roomId Room ID
   * @returns Array of RoomInventoryAudit records
   */
  public static async getAuditsByRoom(roomId: string): Promise<RoomInventoryAudit[]> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT ria.id, ria.room_id, ria.student_id, ria.porter_id, ria.mattress_condition, ria.fan_condition,
                   ria.sockets_condition, ria.locks_condition, ria.lights_condition, ria.windows_condition,
                   ria.certificate_hash, ria.key_issued, ria.key_tag_number, ria.key_issued_at, ria.audit_type,
                   ria.student_signature_url, ria.porter_signature_url, ria.notes, ria.audited_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_por.full_name as porter_name
            FROM room_inventory_audits ria
            LEFT JOIN users u_stu ON ria.student_id = u_stu.id
            LEFT JOIN users u_por ON ria.porter_id = u_por.id
            WHERE ria.room_id = ?
            ORDER BY ria.audited_at DESC`,
      args: [roomId]
    });

    return result.rows.map(row => InventoryService.mapRowToAudit(row));
  }
}
