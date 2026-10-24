import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { RoomInventoryAudit, RecordAuditParams, ItemCondition, AuditType, CheckoutStatus } from '../types/inventory';

/**
 * Service handling digital room check-in and check-out property inspections, inventory audits,
 * and check-out damage liability assessment for UNILAG hostels.
 * Connects directly to Turso libSQL edge SQLite database following strict zero-mock principles.
 *
 * Commented with plain English descriptions for non-technical team members and hostel porters.
 */
export class InventoryService {
  /**
   * Initializes the database schema for room inventory audits.
   * Creates the room_inventory_audits table and adds check-out columns if they do not exist.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      )`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        block_name TEXT NOT NULL,
        floor_number INTEGER NOT NULL,
        room_number TEXT NOT NULL,
        total_beds INTEGER DEFAULT 4,
        occupied_beds INTEGER DEFAULT 0
      )`,
      args: []
    });

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
        audit_type TEXT CHECK(audit_type IN ('CHECK_IN', 'CHECK_OUT')) DEFAULT 'CHECK_IN',
        checkout_status TEXT CHECK(checkout_status IN ('CLEARED', 'DAMAGES_ASSESSED', 'PENDING')) DEFAULT 'CLEARED',
        damage_fee REAL DEFAULT 0.0,
        audited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (porter_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Safely apply column migration for existing tables if columns were created earlier without check-out fields
    try {
      await client.execute({
        sql: `ALTER TABLE room_inventory_audits ADD COLUMN audit_type TEXT DEFAULT 'CHECK_IN'`,
        args: []
      });
    } catch (_e) {
      // Column already exists
    }

    try {
      await client.execute({
        sql: `ALTER TABLE room_inventory_audits ADD COLUMN checkout_status TEXT DEFAULT 'CLEARED'`,
        args: []
      });
    } catch (_e) {
      // Column already exists
    }

    try {
      await client.execute({
        sql: `ALTER TABLE room_inventory_audits ADD COLUMN damage_fee REAL DEFAULT 0.0`,
        args: []
      });
    } catch (_e) {
      // Column already exists
    }

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_student ON room_inventory_audits(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_inventory_room ON room_inventory_audits(room_id)`,
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

    // Ensure bedspaces table exists for check-out release/recycling actions
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS bedspaces (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        bed_label TEXT NOT NULL,
        status TEXT CHECK(status IN ('AVAILABLE', 'LOCKED_HOLD', 'CONFIRMED', 'MAINTENANCE_BLOCKED')) DEFAULT 'AVAILABLE',
        allocated_to_user_id TEXT,
        hold_expires_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: []
    });
  }

  /**
   * Records a joint room check-in or check-out property inventory audit conducted by a porter and student.
   * For check-out audits, calculates damage liability fees, assesses checkout clearance status,
   * auto-generates defect repair tickets, and recycles room bedspace back to available status upon clean clearance.
   *
   * @param params Audit parameters including room ID, student ID, porter ID, item conditions, signatures, audit type, and notes
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
    const auditType: AuditType = params.auditType || 'CHECK_IN';
    const nowIso = new Date().toISOString();

    // Calculate damage fee if items are marked POOR during check-out inspection
    let poorItemCount = 0;
    if (params.mattressCondition === 'POOR') poorItemCount++;
    if (params.fanCondition === 'POOR') poorItemCount++;
    if (params.socketsCondition === 'POOR') poorItemCount++;
    if (params.locksCondition === 'POOR') poorItemCount++;

    const calculatedDamageFee = params.damageFee !== undefined
      ? params.damageFee
      : (auditType === 'CHECK_OUT' ? poorItemCount * 2500.0 : 0.0);

    let checkoutStatus: CheckoutStatus = 'CLEARED';
    if (auditType === 'CHECK_OUT') {
      checkoutStatus = (poorItemCount > 0 || calculatedDamageFee > 0) ? 'DAMAGES_ASSESSED' : 'CLEARED';
    }

    await client.execute({
      sql: `INSERT INTO room_inventory_audits (
        id, room_id, student_id, porter_id, mattress_condition, fan_condition, sockets_condition, locks_condition,
        student_signature_url, porter_signature_url, notes, audit_type, checkout_status, damage_fee, audited_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        auditId,
        params.roomId.trim(),
        params.studentId.trim(),
        params.porterId.trim(),
        params.mattressCondition,
        params.fanCondition,
        params.socketsCondition,
        params.locksCondition,
        studentSig,
        porterSig,
        notesContent,
        auditType,
        checkoutStatus,
        calculatedDamageFee
      ]
    });

    // Auto-generate defect maintenance tickets for any items marked POOR during check-in or check-out inspection
    const autoGeneratedDefects: string[] = [];
    const checkAndCreateDefect = async (category: string, itemLabel: string, condition: ItemCondition) => {
      if (condition === 'POOR') {
        const ticketId = `tkt_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const defectDesc = `Auto-reported ${auditType.toLowerCase()} defect: ${itemLabel} marked POOR in Room ${params.roomId}. ${notesContent ? `Remark: ${notesContent}` : ''}`;
        await client.execute({
          sql: `INSERT INTO maintenance_tickets (id, student_id, hostel_id, room_number, category, description, photo_before_url, status, created_at)
                VALUES (?, ?, 'hostel_main', ?, ?, ?, 'https://unilagstay.edu.ng/defects/inspection_defect.jpg', 'OPEN', CURRENT_TIMESTAMP)`,
          args: [ticketId, params.studentId.trim(), params.roomId.trim(), category, defectDesc]
        });
        autoGeneratedDefects.push(ticketId);
      }
    };

    await checkAndCreateDefect('CARPENTRY', 'Bed Mattress', params.mattressCondition);
    await checkAndCreateDefect('ELECTRICAL', 'Ceiling Fan & Regulator', params.fanCondition);
    await checkAndCreateDefect('ELECTRICAL', 'Electrical Wall Sockets', params.socketsCondition);
    await checkAndCreateDefect('CARPENTRY', 'Door Lock / Window Latches', params.locksCondition);

    // If check-out inspection is completed and cleared, release student's allocated bedspace back to AVAILABLE
    if (auditType === 'CHECK_OUT' && checkoutStatus === 'CLEARED') {
      await client.execute({
        sql: `UPDATE bedspaces
              SET status = 'AVAILABLE',
                  allocated_to_user_id = NULL,
                  updated_at = CURRENT_TIMESTAMP
              WHERE allocated_to_user_id = ?`,
        args: [params.studentId.trim()]
      });
    }

    return {
      id: auditId,
      roomId: params.roomId.trim(),
      studentId: params.studentId.trim(),
      porterId: params.porterId.trim(),
      mattressCondition: params.mattressCondition,
      fanCondition: params.fanCondition,
      socketsCondition: params.socketsCondition,
      locksCondition: params.locksCondition,
      studentSignatureUrl: studentSig || undefined,
      porterSignatureUrl: porterSig || undefined,
      hasStudentSignature: Boolean(studentSig),
      hasPorterSignature: Boolean(porterSig),
      autoGeneratedDefects: autoGeneratedDefects.length > 0 ? autoGeneratedDefects : undefined,
      notes: notesContent || undefined,
      auditType,
      checkoutStatus,
      damageFee: calculatedDamageFee,
      auditedAt: nowIso
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
                   ria.notes, ria.audit_type, ria.checkout_status, ria.damage_fee, ria.audited_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
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
      auditType: (row.audit_type ? String(row.audit_type) : 'CHECK_IN') as AuditType,
      checkoutStatus: (row.checkout_status ? String(row.checkout_status) : 'CLEARED') as CheckoutStatus,
      damageFee: row.damage_fee !== null && row.damage_fee !== undefined ? Number(row.damage_fee) : 0,
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
                   ria.notes, ria.audit_type, ria.checkout_status, ria.damage_fee, ria.audited_at,
                   u_stu.full_name as student_name, u_stu.matric_or_staff_no as student_matric,
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
      auditType: (row.audit_type ? String(row.audit_type) : 'CHECK_IN') as AuditType,
      checkoutStatus: (row.checkout_status ? String(row.checkout_status) : 'CLEARED') as CheckoutStatus,
      damageFee: row.damage_fee !== null && row.damage_fee !== undefined ? Number(row.damage_fee) : 0,
      auditedAt: String(row.audited_at || new Date().toISOString())
    }));
  }
}
