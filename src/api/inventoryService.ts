import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { RoomInventoryAudit, RecordAuditParams, ItemCondition } from '../types/inventory';

/**
 * Service handling digital room check-in property inspections and inventory audits.
 * Connects directly to Turso libSQL edge SQLite database following strict zero-mock principles.
 *
 * Commented with plain English descriptions for non-technical team members and hostel porters.
 */
export class InventoryService {
  /**
   * Initializes the database schema for room inventory audits.
   * Creates the room_inventory_audits table if it does not already exist.
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
        certificate_hash TEXT UNIQUE,
        student_signature_url TEXT,
        porter_signature_url TEXT,
        notes TEXT,
        audited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (porter_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_student ON room_inventory_audits(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_room ON room_inventory_audits(room_id)`,
      args: []
    });

    // Add certificate_hash column if it doesn't exist for schema migration compatibility
    try {
      await client.execute({
        sql: `ALTER TABLE room_inventory_audits ADD COLUMN certificate_hash TEXT`,
        args: []
      });
    } catch {
      // Column already exists
    }

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
   * Records a joint room check-in property inventory audit conducted by a porter and student.
   *
   * @param params Audit parameters including room ID, student ID, porter ID, item conditions, signatures, and notes
   * @returns Newly created RoomInventoryAudit record
   */
  public static async recordAudit(params: RecordAuditParams): Promise<RoomInventoryAudit> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.roomId.trim()) {
      throw new Error('Valid room ID is required for room audit.');
    }
    if (!params.studentId.trim()) {
      throw new Error('Valid student ID is required for room audit.');
    }
    if (!params.porterId.trim()) {
      throw new Error('Valid porter/staff ID is required for room audit.');
    }

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const studentSig = params.studentSignatureUrl?.trim() || null;
    const porterSig = params.porterSignatureUrl?.trim() || null;
    const notesContent = params.notes?.trim() || null;
    const nowIso = new Date().toISOString();
    const certificateHash = `CERT-INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await client.execute({
      sql: `INSERT INTO room_inventory_audits (
        id, room_id, student_id, porter_id, mattress_condition, fan_condition, sockets_condition, locks_condition, certificate_hash, student_signature_url, porter_signature_url, notes, audited_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        auditId,
        params.roomId.trim(),
        params.studentId.trim(),
        params.porterId.trim(),
        params.mattressCondition,
        params.fanCondition,
        params.socketsCondition,
        params.locksCondition,
        certificateHash,
        studentSig,
        porterSig,
        notesContent
      ]
    });

    // Auto-generate defect maintenance tickets for any items marked POOR during check-in inspection
    const autoGeneratedDefects: string[] = [];
    const checkAndCreateDefect = async (category: string, itemLabel: string, condition: ItemCondition) => {
      if (condition === 'POOR') {
        const ticketId = `tkt_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const defectDesc = `Auto-reported check-in defect: ${itemLabel} marked POOR in Room ${params.roomId}. ${notesContent ? `Remark: ${notesContent}` : ''}`;
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

    return {
      id: auditId,
      roomId: params.roomId.trim(),
      studentId: params.studentId.trim(),
      porterId: params.porterId.trim(),
      mattressCondition: params.mattressCondition,
      fanCondition: params.fanCondition,
      socketsCondition: params.socketsCondition,
      locksCondition: params.locksCondition,
      certificateHash,
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
   * Fetches and verifies a room inventory audit certificate using its unique certificate reference hash code.
   *
   * @param certificateHash Certificate reference code (e.g. "CERT-INV-...")
   * @returns RoomInventoryAudit record or null if not found
   */
  public static async getAuditByCertificateHash(certificateHash: string): Promise<RoomInventoryAudit | null> {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    const cleanHash = certificateHash.trim().toUpperCase();
    if (!cleanHash) {
      return null;
    }

    const result = await client.execute({
      sql: `SELECT ria.id, ria.room_id, ria.student_id, ria.porter_id, ria.mattress_condition, ria.fan_condition,
                   ria.sockets_condition, ria.locks_condition, ria.certificate_hash, ria.student_signature_url,
                   ria.porter_signature_url, ria.notes, ria.audited_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_por.full_name as porter_name
            FROM room_inventory_audits ria
            LEFT JOIN users u_stu ON ria.student_id = u_stu.id
            LEFT JOIN users u_por ON ria.porter_id = u_por.id
            WHERE UPPER(ria.certificate_hash) = ?
            LIMIT 1`,
      args: [cleanHash]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
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
      certificateHash: row.certificate_hash ? String(row.certificate_hash) : undefined,
      studentSignatureUrl: studentSig,
      porterSignatureUrl: porterSig,
      hasStudentSignature: Boolean(studentSig),
      hasPorterSignature: Boolean(porterSig),
      notes: row.notes ? String(row.notes) : undefined,
      auditedAt: String(row.audited_at || new Date().toISOString())
    };
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
                   ria.sockets_condition, ria.locks_condition, ria.student_signature_url, ria.porter_signature_url,
                   ria.notes, ria.audited_at, u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_por.full_name as porter_name
            FROM room_inventory_audits ria
            LEFT JOIN users u_stu ON ria.student_id = u_stu.id
            LEFT JOIN users u_por ON ria.porter_id = u_por.id
            WHERE ria.student_id = ?
            ORDER BY ria.audited_at DESC`,
      args: [studentId]
    });

    return result.rows.map(row => ({
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
      studentSignatureUrl: row.student_signature_url ? String(row.student_signature_url) : undefined,
      porterSignatureUrl: row.porter_signature_url ? String(row.porter_signature_url) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      auditedAt: String(row.audited_at || new Date().toISOString())
    }));
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
                   ria.sockets_condition, ria.locks_condition, ria.student_signature_url, ria.porter_signature_url,
                   ria.notes, ria.audited_at, u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
                   u_por.full_name as porter_name
            FROM room_inventory_audits ria
            LEFT JOIN users u_stu ON ria.student_id = u_stu.id
            LEFT JOIN users u_por ON ria.porter_id = u_por.id
            WHERE ria.room_id = ?
            ORDER BY ria.audited_at DESC`,
      args: [roomId]
    });

    return result.rows.map(row => ({
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
      studentSignatureUrl: row.student_signature_url ? String(row.student_signature_url) : undefined,
      porterSignatureUrl: row.porter_signature_url ? String(row.porter_signature_url) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      auditedAt: String(row.audited_at || new Date().toISOString())
    }));
  }
}
