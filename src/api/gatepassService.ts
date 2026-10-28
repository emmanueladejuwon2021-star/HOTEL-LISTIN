import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import { PaymentService } from './paymentService';
import { OfflineSyncService } from './offlineSyncService';
import {
  GatePassRecord,
  GatePassTokenPayload,
  GatePassVerificationResult,
  GatePassToken,
  GateAccessLog,
  GateType,
  AccessStatus,
  VisitorPass,
  ManualPinLookupResult,
  ShiftStatistics
} from '../types/gatepass';

export const GATE_PASS_SECRET = 'UNILAGSTAY_GATEPASS_HMAC_SECRET_2026_KEY';
const GATE_PASS_HMAC_SECRET = GATE_PASS_SECRET;

/**
 * Service managing dynamic QR code gate pass creation, database persistence,
 * automatic token refreshing, porter high-visibility camera scanning,
 * sub-500ms verification performance, 6-digit manual PIN visitor access codes,
 * emergency lockdown mode, and shift statistics.
 *
 * Implements:
 * - [GATEPASS-01] Dynamic QR Gate Pass Token Generation (Issue #31)
 * - [GATEPASS-02] Offline-first Gatekeeping & Curfew Verification (Issue #32)
 * - [GATEPASS-03] Dynamic QR Code Gate Pass Generation Component 3 (Issue #33)
 * - [GATEPASS-04] Dynamic 30-Second Refreshing QR Pass & Store Countdown (Issue #34)
 * - [GATEPASS-05] Dynamic QR Code Gate Pass Generation Component 5 (Issue #35)
 * - [SCANNER-01] Porter High-Visibility Gate Scanner View Component 1 (Issue #36)
 * - [SCANNER-02] Sub-500ms QR Verification Performance Component 2 (Issue #37)
 * - [SCANNER-03] Manual 6-Digit PIN Lookup Backup for Gate Access Component 3 (Issue #38)
 * - [SCANNER-04] Scanner Auto-Reset, Audio Feedback & Disciplinary Security Flags Component 4 (Issue #39)
 * - [SCANNER-05] Porter Shift Statistics, Occupancy Counters & Emergency Lockdown Component 5 (Issue #40)
 * - [OFFLINE-01] Offline Local Public Key Caching & Local SQLite Queue Component 1 (Issue #41)
 */
export class GatePassService {
  private static _isLockdownActive = false;

  /**
   * Toggles or sets the Emergency Gate Lockdown state ([SCANNER-05]).
   */
  public static setLockdown(active: boolean): void {
    GatePassService._isLockdownActive = active;
  }

  /**
   * Returns current Emergency Gate Lockdown state.
   */
  public static isLockdown(): boolean {
    return GatePassService._isLockdownActive;
  }

  /**
   * Initializes the Turso libSQL SQLite database schemas for gate pass tracking,
   * access logging, curfew controls, disciplinary records, visitor passes, and offline sync tables.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await PaymentService.initializeSchema();
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    try {
      await client.execute({
        sql: `ALTER TABLE student_profiles ADD COLUMN residency_status TEXT DEFAULT 'PENDING_CHECKIN'`,
        args: []
      });
    } catch {
      // Column already exists, ignore error
    }

    // 1. Create gate_passes table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS gate_passes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_string TEXT NOT NULL,
        signature_hash TEXT NOT NULL,
        status TEXT CHECK(status IN ('ACTIVE', 'EXPIRED', 'USED', 'REVOKED')) DEFAULT 'ACTIVE',
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_passes_user ON gate_passes(user_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_passes_sig ON gate_passes(signature_hash)`,
      args: []
    });

    // 2. Create disciplinary_records table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS disciplinary_records (
        user_id TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED')) DEFAULT 'CLEARED',
        reason TEXT,
        flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // 3. Create gate_access_logs audit table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS gate_access_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        gate_type TEXT CHECK(gate_type IN ('ENTRY', 'EXIT')) DEFAULT 'ENTRY',
        access_status TEXT CHECK(access_status IN ('GRANTED', 'DENIED')) NOT NULL,
        denial_reason TEXT,
        nonce TEXT,
        scanned_by_porter_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // 4. Create exeat_requests table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS exeat_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        reason TEXT NOT NULL,
        departure_date DATE NOT NULL,
        return_date DATE NOT NULL,
        warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED')) DEFAULT 'PENDING',
        warden_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // 5. Create visitor_passes table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS visitor_passes (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        visitor_name TEXT NOT NULL,
        visitor_phone TEXT NOT NULL,
        pass_code TEXT NOT NULL,
        visit_date DATE NOT NULL,
        check_in_time DATETIME,
        check_out_time DATETIME,
        status TEXT CHECK(status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED')) DEFAULT 'EXPECTED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_visitor_code ON visitor_passes(pass_code)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_visitor_student ON visitor_passes(student_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_visitor_date ON visitor_passes(visit_date)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_user ON gate_access_logs(user_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_hostel ON gate_access_logs(hostel_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_nonce ON gate_access_logs(nonce)`,
      args: []
    });
  }

  /**
   * Generates a new dynamic QR code gate pass for a student (30-second TTL).
   */
  public static async generateGatePass(userId: string): Promise<{
    record: GatePassRecord;
    payload: GatePassTokenPayload;
  }> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const userRes = await client.execute({
      sql: `SELECT u.id, u.full_name, u.matric_or_staff_no FROM users u WHERE u.id = ?`,
      args: [userId]
    });

    if (userRes.rows.length === 0) {
      throw new Error(`Student user with ID '${userId}' not found.`);
    }

    const userRow = userRes.rows[0];
    const fullName = String(userRow.full_name || 'UNILAG Student');
    const matricNo = String(userRow.matric_or_staff_no || '2000000000');

    let hostelName = 'Main Campus Hostel';
    let roomNumber = 'Room A-101';
    let hostelId = 'hostel_main';

    try {
      const roomRes = await client.execute({
        sql: `SELECT r.room_number, h.id as hostel_id, h.name as hostel_name
              FROM payments p
              JOIN rooms r ON p.room_id = r.id
              JOIN hostels h ON r.hostel_id = h.id
              WHERE p.user_id = ? AND p.payment_status IN ('LOCKED', 'COMPLETED')
              LIMIT 1`,
        args: [userId]
      });

      if (roomRes.rows.length > 0) {
        if (roomRes.rows[0].hostel_id) hostelId = String(roomRes.rows[0].hostel_id);
        if (roomRes.rows[0].hostel_name) hostelName = String(roomRes.rows[0].hostel_name);
        if (roomRes.rows[0].room_number) roomNumber = String(roomRes.rows[0].room_number);
      } else {
        const bedRes = await client.execute({
          sql: `SELECT b.bed_label, r.room_number, h.id as hostel_id, h.name as hostel_name
                FROM bedspaces b
                JOIN rooms r ON b.room_id = r.id
                JOIN hostels h ON r.hostel_id = h.id
                WHERE b.allocated_to_user_id = ?
                LIMIT 1`,
          args: [userId]
        });
        if (bedRes.rows.length > 0) {
          if (bedRes.rows[0].hostel_id) hostelId = String(bedRes.rows[0].hostel_id);
          if (bedRes.rows[0].hostel_name) hostelName = String(bedRes.rows[0].hostel_name);
          roomNumber = `${bedRes.rows[0].room_number} (${bedRes.rows[0].bed_label})`;
        }
      }
    } catch {}

    const nowMs = Date.now();
    const expiryMs = nowMs + 30 * 1000; // 30 seconds validity TTL
    const salt = Math.random().toString(36).substring(2, 10).toUpperCase();
    const nonce = `n_${nowMs}_${salt}`;

    const payload: GatePassTokenPayload = {
      userId,
      fullName,
      matricNo,
      hostelId,
      hostelName,
      roomNumber,
      salt,
      nonce,
      issuedAt: nowMs,
      generatedAt: nowMs,
      expiresAt: expiryMs
    };

    const payloadJson = JSON.stringify(payload);
    const signatureHash = CryptoJS.HmacSHA256(payloadJson, GATE_PASS_SECRET).toString(CryptoJS.enc.Hex);
    payload.signature = signatureHash;

    const tokenString = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify({
      p: payload,
      sig: signatureHash
    })));

    const passId = `gp_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
    const genIso = new Date(nowMs).toISOString();
    const expIso = new Date(expiryMs).toISOString();

    await client.execute({
      sql: `INSERT INTO gate_passes (id, user_id, token_string, signature_hash, status, generated_at, expires_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      args: [passId, userId, tokenString, signatureHash, genIso, expIso]
    });

    const record: GatePassRecord = {
      id: passId,
      userId,
      tokenString,
      signatureHash,
      generatedAt: genIso,
      expiresAt: expIso,
      status: 'ACTIVE',
      remainingSeconds: 30
    };

    return { record, payload };
  }

  /**
   * Retrieves the current active gate pass for a student, or automatically creates a fresh one if expired.
   */
  public static async getOrRefreshGatePass(userId: string): Promise<{
    record: GatePassRecord;
    payload: GatePassTokenPayload;
  }> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT id, user_id, token_string, signature_hash, status, generated_at, expires_at
            FROM gate_passes
            WHERE user_id = ? AND status = 'ACTIVE'
            ORDER BY generated_at DESC LIMIT 1`,
      args: [userId]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const expTime = new Date(String(row.expires_at)).getTime();
      const remainingSec = Math.max(0, Math.floor((expTime - Date.now()) / 1000));

      if (remainingSec > 0) {
        try {
          const rawUtf8 = CryptoJS.enc.Base64.parse(String(row.token_string)).toString(CryptoJS.enc.Utf8);
          const parsed = JSON.parse(rawUtf8);
          const record: GatePassRecord = {
            id: String(row.id),
            userId: String(row.user_id),
            tokenString: String(row.token_string),
            signatureHash: String(row.signature_hash),
            generatedAt: String(row.generated_at),
            expiresAt: String(row.expires_at),
            status: 'ACTIVE',
            remainingSeconds: remainingSec
          };
          return { record, payload: parsed.p };
        } catch {}
      }
    }

    return await GatePassService.generateGatePass(userId);
  }

  /**
   * Verifies the validity of a dynamic QR gate pass scanned at the hostel gatehouse.
   */
  public static async verifyGatePassToken(tokenString: string): Promise<GatePassVerificationResult> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!tokenString || !tokenString.trim()) {
      return {
        isValid: false,
        message: 'Invalid Gate Pass: QR code data is empty.'
      };
    }

    try {
      const rawUtf8 = CryptoJS.enc.Base64.parse(tokenString.trim()).toString(CryptoJS.enc.Utf8);
      const parsed = JSON.parse(rawUtf8);

      if (!parsed.p || !parsed.sig) {
        return {
          isValid: false,
          message: 'Access Denied: Malformed or untrusted gate pass payload format.'
        };
      }

      const payload: GatePassTokenPayload = parsed.p;
      const payloadForSig = { ...payload };
      delete payloadForSig.signature;
      const expectedSig = CryptoJS.HmacSHA256(JSON.stringify(payloadForSig), GATE_PASS_SECRET).toString(CryptoJS.enc.Hex);

      if (parsed.sig !== expectedSig) {
        return {
          isValid: false,
          message: 'Access Denied: Invalid security signature. Dynamic pass has been tampered with.'
        };
      }

      const nowMs = Date.now();
      if (nowMs > payload.expiresAt) {
        return {
          isValid: false,
          message: 'Access Denied: Dynamic QR gate pass has expired. Student must present a refreshed code.'
        };
      }

      const dbResult = await client.execute({
        sql: `SELECT id, status FROM gate_passes WHERE signature_hash = ?`,
        args: [parsed.sig]
      });

      if (dbResult.rows.length === 0) {
        return {
          isValid: false,
          message: 'Access Denied: Unrecognized gate pass record in university database.'
        };
      }

      const dbStatus = String(dbResult.rows[0].status);
      if (dbStatus !== 'ACTIVE') {
        return {
          isValid: false,
          message: `Access Denied: Gate pass status is '${dbStatus}'.`
        };
      }

      // Check disciplinary suspension or flags ([SCANNER-04])
      const discRes = await client.execute({
        sql: `SELECT status, reason, flagged_at FROM disciplinary_records WHERE user_id = ? LIMIT 1`,
        args: [payload.userId]
      });

      if (discRes.rows.length > 0) {
        const dStatus = String(discRes.rows[0].status);
        if (dStatus === 'SUSPENDED' || dStatus === 'FLAGGED' || dStatus === 'RUSTICATED') {
          const reason = String(discRes.rows[0].reason || 'Hostel disciplinary sanctions');
          return {
            isValid: false,
            accessGranted: false,
            accessStatus: 'DENIED',
            message: `ACCESS DENIED: Student is ${dStatus} - "${reason}"`,
            reason: `Disciplinary sanction: ${dStatus}. ${reason}`,
            disciplinaryFlag: {
              status: dStatus as any,
              reason,
              flaggedAt: discRes.rows[0].flagged_at ? String(discRes.rows[0].flagged_at) : undefined
            },
            student: {
              userId: payload.userId,
              matricNo: payload.matricNo,
              fullName: payload.fullName,
              hostelName: payload.hostelName,
              roomNumber: payload.roomNumber
            }
          };
        }
      }

      return {
        isValid: true,
        message: `ACCESS GRANTED: ${payload.fullName} (${payload.matricNo}) - ${payload.hostelName}, ${payload.roomNumber}`,
        payload,
        passId: String(dbResult.rows[0].id),
        verifiedAt: new Date().toISOString(),
        student: {
          userId: payload.userId,
          matricNo: payload.matricNo,
          fullName: payload.fullName,
          hostelName: payload.hostelName,
          roomNumber: payload.roomNumber
        }
      };
    } catch {
      return {
        isValid: false,
        message: 'Access Denied: Failed to process QR pass token.'
      };
    }
  }

  /**
   * Fast Sub-500ms QR Verification Engine for Porter Camera Scanner ([SCANNER-02]).
   * Enhanced with Emergency Lockdown check ([SCANNER-05]) and Offline validation fallback ([OFFLINE-01]).
   */
  public static async fastVerifyGatePass(
    tokenString: string,
    porterId: string,
    gateType: GateType = 'ENTRY',
    forceOffline: boolean = false
  ): Promise<GatePassVerificationResult> {
    const startTime = Date.now();

    // 1. Emergency Gate Lockdown Check ([SCANNER-05])
    if (GatePassService._isLockdownActive) {
      return {
        isValid: false,
        accessGranted: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'Hostel gate is under Emergency Lockdown by Hall Administration.',
        message: 'ACCESS DENIED: Emergency Gate Lockdown in Effect',
        latencyMs: Date.now() - startTime
      };
    }

    // 2. Offline Mode Validation ([OFFLINE-01])
    if (forceOffline) {
      return await OfflineSyncService.verifyOfflineToken(tokenString, porterId, gateType);
    }

    // 3. Attempt modern 30s token verification
    const modernResult = await GatePassService.verifyGatePassToken(tokenString);

    if (modernResult.isValid && modernResult.payload) {
      const latencyMs = Date.now() - startTime;
      const client = AuthService.getDbClient();

      const logId = `gate_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      client.execute({
        sql: `INSERT INTO gate_access_logs (id, user_id, hostel_id, gate_type, access_status, denial_reason, nonce, scanned_by_porter_id)
              VALUES (?, ?, ?, ?, 'GRANTED', NULL, ?, ?)`,
        args: [
          logId,
          modernResult.payload.userId,
          modernResult.payload.hostelId || 'hostel_main',
          gateType,
          modernResult.payload.nonce || null,
          porterId
        ]
      }).catch(() => {});

      return {
        ...modernResult,
        accessGranted: true,
        accessStatus: 'GRANTED',
        gateType,
        latencyMs
      };
    }

    if (modernResult.disciplinaryFlag) {
      return {
        ...modernResult,
        accessGranted: false,
        accessStatus: 'DENIED',
        gateType,
        latencyMs: Date.now() - startTime
      };
    }

    // 4. Fallback to legacy/offline-first gate pass verification
    const legacyResult = await GatePassService.verifyGatePass(tokenString, porterId, gateType);
    const latencyMs = Date.now() - startTime;

    return {
      ...legacyResult,
      latencyMs
    };
  }

  /**
   * Retrieves Porter Shift Statistics & Occupancy Counters ([SCANNER-05]).
   */
  public static async getShiftStatistics(porterId?: string): Promise<ShiftStatistics> {
    await GatePassService.initializeSchema();
    await OfflineSyncService.initializeSchema();
    const client = AuthService.getDbClient();

    // Total Entries
    const entriesRes = await client.execute({
      sql: `SELECT COUNT(*) as count FROM gate_access_logs WHERE gate_type = 'ENTRY' AND access_status = 'GRANTED'`,
      args: []
    });
    const totalEntries = Number(entriesRes.rows[0]?.count || 0);

    // Total Exits
    const exitsRes = await client.execute({
      sql: `SELECT COUNT(*) as count FROM gate_access_logs WHERE gate_type = 'EXIT' AND access_status = 'GRANTED'`,
      args: []
    });
    const totalExits = Number(exitsRes.rows[0]?.count || 0);

    // Active Visitors On-Site
    const visitorsRes = await client.execute({
      sql: `SELECT COUNT(*) as count FROM visitor_passes WHERE status = 'CHECKED_IN'`,
      args: []
    });
    const activeVisitors = Number(visitorsRes.rows[0]?.count || 0);

    // Pending Offline Sync Queue
    const pendingOfflineSyncs = await OfflineSyncService.getPendingScansCount();

    return {
      totalEntries,
      totalExits,
      activeVisitors,
      pendingOfflineSyncs,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Reports a disciplinary security incident for a student ([SCANNER-04]).
   */
  public static async reportDisciplinaryIncident(
    studentId: string,
    porterId: string,
    reason: string
  ): Promise<void> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `INSERT OR REPLACE INTO disciplinary_records (user_id, status, reason, flagged_at)
            VALUES (?, 'FLAGGED', ?, CURRENT_TIMESTAMP)`,
      args: [studentId, `Porter Incident (${porterId}): ${reason}`]
    });
  }

  /**
   * Creates an expected visitor pass with a 6-digit access PIN ([SCANNER-03] / PRD Section 9).
   */
  public static async createVisitorPass(
    studentId: string,
    visitorName: string,
    visitorPhone: string,
    visitDate?: string
  ): Promise<VisitorPass> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const studentRes = await client.execute({
      sql: `SELECT u.id, u.full_name, u.matric_or_staff_no FROM users u WHERE u.id = ?`,
      args: [studentId]
    });

    if (studentRes.rows.length === 0) {
      throw new Error(`Host student with ID '${studentId}' not found.`);
    }

    const studentRow = studentRes.rows[0];
    const passId = `vp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const passCode = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedDate = visitDate || new Date().toISOString().split('T')[0];
    const createdAt = new Date().toISOString();

    let hostelName = 'Main Campus Hostel';
    let roomNumber = 'Room A-101';

    try {
      const roomRes = await client.execute({
        sql: `SELECT r.room_number, h.name as hostel_name
              FROM payments p
              JOIN rooms r ON p.room_id = r.id
              JOIN hostels h ON r.hostel_id = h.id
              WHERE p.user_id = ? AND p.payment_status IN ('LOCKED', 'COMPLETED')
              LIMIT 1`,
        args: [studentId]
      });
      if (roomRes.rows.length > 0) {
        if (roomRes.rows[0].hostel_name) hostelName = String(roomRes.rows[0].hostel_name);
        if (roomRes.rows[0].room_number) roomNumber = String(roomRes.rows[0].room_number);
      }
    } catch {}

    await client.execute({
      sql: `INSERT INTO visitor_passes (id, student_id, visitor_name, visitor_phone, pass_code, visit_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'EXPECTED', ?)`,
      args: [passId, studentId, visitorName.trim(), visitorPhone.trim(), passCode, formattedDate, createdAt]
    });

    return {
      id: passId,
      studentId,
      studentName: String(studentRow.full_name),
      studentMatric: String(studentRow.matric_or_staff_no),
      hostelName,
      roomNumber,
      visitorName: visitorName.trim(),
      visitorPhone: visitorPhone.trim(),
      passCode,
      visitDate: formattedDate,
      status: 'EXPECTED',
      createdAt
    };
  }

  /**
   * Retrieves visitor passes issued by a student.
   */
  public static async getVisitorPassesByStudent(studentId: string): Promise<VisitorPass[]> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT vp.id, vp.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   vp.visitor_name, vp.visitor_phone, vp.pass_code, vp.visit_date,
                   vp.check_in_time, vp.check_out_time, vp.status, vp.created_at
            FROM visitor_passes vp
            JOIN users u ON vp.student_id = u.id
            WHERE vp.student_id = ?
            ORDER BY vp.created_at DESC`,
      args: [studentId]
    });

    return res.rows.map(row => ({
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      visitorName: String(row.visitor_name),
      visitorPhone: String(row.visitor_phone),
      passCode: String(row.pass_code),
      visitDate: String(row.visit_date),
      checkInTime: row.check_in_time ? String(row.check_in_time) : undefined,
      checkOutTime: row.check_out_time ? String(row.check_out_time) : undefined,
      status: String(row.status) as any,
      createdAt: String(row.created_at)
    }));
  }

  /**
   * Manual 6-Digit PIN Lookup Backup for Gate Access ([SCANNER-03] / PRD Spec P-01).
   */
  public static async verifyManualPin(
    pinOrMatric: string,
    porterId: string,
    gateType: GateType = 'ENTRY'
  ): Promise<ManualPinLookupResult> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();
    const startTime = Date.now();
    const cleanInput = pinOrMatric ? pinOrMatric.trim() : '';

    if (GatePassService._isLockdownActive) {
      return {
        isValid: false,
        message: 'ACCESS DENIED: Emergency Gate Lockdown in effect. Manual entries suspended.',
        passType: 'VISITOR',
        actionAllowed: 'NONE',
        latencyMs: Date.now() - startTime
      };
    }

    if (!cleanInput) {
      return {
        isValid: false,
        message: 'Please enter a valid 6-digit visitor PIN or student matric number.',
        passType: 'VISITOR',
        actionAllowed: 'NONE',
        latencyMs: Date.now() - startTime
      };
    }

    // 1. Look up in visitor_passes
    const visitorRes = await client.execute({
      sql: `SELECT vp.id, vp.student_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   vp.visitor_name, vp.visitor_phone, vp.pass_code, vp.visit_date,
                   vp.check_in_time, vp.check_out_time, vp.status, vp.created_at
            FROM visitor_passes vp
            JOIN users u ON vp.student_id = u.id
            WHERE vp.pass_code = ?
            ORDER BY vp.created_at DESC LIMIT 1`,
      args: [cleanInput]
    });

    if (visitorRes.rows.length > 0) {
      const row = visitorRes.rows[0];
      const status = String(row.status);
      const latencyMs = Date.now() - startTime;

      const visitor: VisitorPass = {
        id: String(row.id),
        studentId: String(row.student_id),
        studentName: row.student_name ? String(row.student_name) : undefined,
        studentMatric: row.student_matric ? String(row.student_matric) : undefined,
        visitorName: String(row.visitor_name),
        visitorPhone: String(row.visitor_phone),
        passCode: String(row.pass_code),
        visitDate: String(row.visit_date),
        checkInTime: row.check_in_time ? String(row.check_in_time) : undefined,
        checkOutTime: row.check_out_time ? String(row.check_out_time) : undefined,
        status: status as any,
        createdAt: String(row.created_at)
      };

      if (status === 'EXPECTED') {
        return {
          isValid: true,
          message: `VALID VISITOR: ${visitor.visitorName} visiting ${visitor.studentName} (${visitor.studentMatric}). Ready for Entry Check-In.`,
          passType: 'VISITOR',
          visitor,
          actionAllowed: 'CHECK_IN',
          latencyMs
        };
      }

      if (status === 'CHECKED_IN') {
        return {
          isValid: true,
          message: `ACTIVE VISITOR: ${visitor.visitorName} currently in hostel. Ready for Exit Check-Out.`,
          passType: 'VISITOR',
          visitor,
          actionAllowed: 'CHECK_OUT',
          latencyMs
        };
      }

      return {
        isValid: false,
        message: `Visitor pass status is '${status}'. Cannot proceed with gate entry.`,
        passType: 'VISITOR',
        visitor,
        actionAllowed: 'NONE',
        latencyMs
      };
    }

    // 2. Emergency Backup: Student matric lookup
    const studentRes = await client.execute({
      sql: `SELECT u.id, u.matric_or_staff_no, u.full_name, u.role, u.is_active,
                   sp.residency_status, sp.clearance_status
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            WHERE (u.matric_or_staff_no = ? OR u.id = ?) AND u.is_active = 1`,
      args: [cleanInput, cleanInput]
    });

    if (studentRes.rows.length > 0) {
      const sRow = studentRes.rows[0];
      const isResident = sRow.residency_status === 'ACTIVE_RESIDENT' || sRow.clearance_status === 'APPROVED';
      const latencyMs = Date.now() - startTime;

      if (!isResident) {
        return {
          isValid: false,
          message: `Access Denied: Student ${sRow.full_name} (${sRow.matric_or_staff_no}) has not completed hostel check-in.`,
          passType: 'STUDENT_BACKUP',
          actionAllowed: 'NONE',
          latencyMs
        };
      }

      const discRes = await client.execute({
        sql: `SELECT status, reason FROM disciplinary_records WHERE user_id = ? LIMIT 1`,
        args: [String(sRow.id)]
      });

      if (discRes.rows.length > 0) {
        const dStatus = String(discRes.rows[0].status);
        if (dStatus === 'SUSPENDED' || dStatus === 'RUSTICATED') {
          return {
            isValid: false,
            message: `Access Denied: Student has disciplinary status '${dStatus}'.`,
            passType: 'STUDENT_BACKUP',
            actionAllowed: 'NONE',
            latencyMs
          };
        }
      }

      const logId = `gate_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.execute({
        sql: `INSERT INTO gate_access_logs (id, user_id, hostel_id, gate_type, access_status, denial_reason, nonce, scanned_by_porter_id)
              VALUES (?, ?, 'hostel_main', ?, 'GRANTED', 'Emergency Manual Matric Lookup', NULL, ?)`,
        args: [logId, String(sRow.id), gateType, porterId]
      });

      return {
        isValid: true,
        message: `EMERGENCY STUDENT ACCESS GRANTED: ${sRow.full_name} (${sRow.matric_or_staff_no})`,
        passType: 'STUDENT_BACKUP',
        student: {
          userId: String(sRow.id),
          matricNo: String(sRow.matric_or_staff_no),
          fullName: String(sRow.full_name),
          hostelName: 'Hostel Facility',
          roomNumber: 'Assigned Resident Bedspace'
        },
        actionAllowed: 'CHECK_IN',
        latencyMs
      };
    }

    return {
      isValid: false,
      message: `Unrecognized access code: No matching 6-digit visitor PIN or active student matric number found.`,
      passType: 'VISITOR',
      actionAllowed: 'NONE',
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Executes visitor check-in at the hostel gatehouse ([SCANNER-03]).
   */
  public static async checkInVisitor(visitorPassId: string, porterId: string): Promise<VisitorPass> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();
    const checkInTime = new Date().toISOString();

    await client.execute({
      sql: `UPDATE visitor_passes
            SET status = 'CHECKED_IN', check_in_time = ?
            WHERE id = ?`,
      args: [checkInTime, visitorPassId]
    });

    const res = await client.execute({
      sql: `SELECT vp.*, u.full_name as student_name, u.matric_or_staff_no as student_matric
            FROM visitor_passes vp
            JOIN users u ON vp.student_id = u.id
            WHERE vp.id = ?`,
      args: [visitorPassId]
    });

    if (res.rows.length === 0) {
      throw new Error(`Visitor pass '${visitorPassId}' not found.`);
    }

    const row = res.rows[0];

    const logId = `gate_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO gate_access_logs (id, user_id, hostel_id, gate_type, access_status, denial_reason, nonce, scanned_by_porter_id)
            VALUES (?, ?, 'hostel_main', 'ENTRY', 'GRANTED', ?, NULL, ?)`,
      args: [logId, String(row.student_id), `Visitor Checked In: ${row.visitor_name}`, porterId]
    });

    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      visitorName: String(row.visitor_name),
      visitorPhone: String(row.visitor_phone),
      passCode: String(row.pass_code),
      visitDate: String(row.visit_date),
      checkInTime,
      status: 'CHECKED_IN',
      createdAt: String(row.created_at)
    };
  }

  /**
   * Executes visitor check-out upon exit from the hostel ([SCANNER-03]).
   */
  public static async checkOutVisitor(visitorPassId: string, porterId: string): Promise<VisitorPass> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();
    const checkOutTime = new Date().toISOString();

    await client.execute({
      sql: `UPDATE visitor_passes
            SET status = 'CHECKED_OUT', check_out_time = ?
            WHERE id = ?`,
      args: [checkOutTime, visitorPassId]
    });

    const res = await client.execute({
      sql: `SELECT vp.*, u.full_name as student_name, u.matric_or_staff_no as student_matric
            FROM visitor_passes vp
            JOIN users u ON vp.student_id = u.id
            WHERE vp.id = ?`,
      args: [visitorPassId]
    });

    if (res.rows.length === 0) {
      throw new Error(`Visitor pass '${visitorPassId}' not found.`);
    }

    const row = res.rows[0];

    const logId = `gate_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO gate_access_logs (id, user_id, hostel_id, gate_type, access_status, denial_reason, nonce, scanned_by_porter_id)
            VALUES (?, ?, 'hostel_main', 'EXIT', 'GRANTED', ?, NULL, ?)`,
      args: [logId, String(row.student_id), `Visitor Checked Out: ${row.visitor_name}`, porterId]
    });

    return {
      id: String(row.id),
      studentId: String(row.student_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      visitorName: String(row.visitor_name),
      visitorPhone: String(row.visitor_phone),
      passCode: String(row.pass_code),
      visitDate: String(row.visit_date),
      checkInTime: row.check_in_time ? String(row.check_in_time) : undefined,
      checkOutTime,
      status: 'CHECKED_OUT',
      createdAt: String(row.created_at)
    };
  }

  /**
   * Generates a dynamic time-bound QR gate pass token for an active resident student ([GATEPASS-01]).
   */
  public static async generateDynamicGatePass(userId: string, ttlSeconds: number = 60): Promise<GatePassToken> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT u.id, u.matric_or_staff_no, u.full_name, u.role, u.is_active,
                   sp.faculty, sp.department, sp.level, sp.campus, sp.fees_paid,
                   sp.clearance_status, sp.residency_status
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            WHERE u.id = ? AND u.is_active = 1`,
      args: [userId]
    });

    if (result.rows.length === 0) {
      throw new Error('Student account or active academic profile not found in Turso database.');
    }

    const row = result.rows[0];

    const isResident =
      row.residency_status === 'ACTIVE_RESIDENT' ||
      (Boolean(row.fees_paid) && row.clearance_status === 'APPROVED');

    if (!isResident) {
      throw new Error('Student is not an active resident. Room check-in and clearance required before gate pass issuance.');
    }

    let hostelId = 'hostel_jaja';
    let hostelName = 'King Jaja Hall';
    let roomNumber = 'Room 101 (Bed A)';

    try {
      const allocResult = await client.execute({
        sql: `SELECT b.bed_label, r.room_number, h.id as hostel_id, h.name as hostel_name
              FROM bedspaces b
              JOIN rooms r ON b.room_id = r.id
              JOIN hostels h ON r.hostel_id = h.id
              WHERE b.allocated_to_user_id = ?
              LIMIT 1`,
        args: [userId]
      });

      if (allocResult.rows.length > 0) {
        hostelId = String(allocResult.rows[0].hostel_id);
        hostelName = String(allocResult.rows[0].hostel_name);
        roomNumber = `${allocResult.rows[0].room_number} (${allocResult.rows[0].bed_label})`;
      }
    } catch {}

    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const nonce = `n_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const rawSignatureData = `${userId}:${row.matric_or_staff_no}:${row.full_name}:${hostelId}:${now}:${expiresAt}:${nonce}`;
    const signature = CryptoJS.HmacSHA256(rawSignatureData, GATE_PASS_HMAC_SECRET).toString();

    const payload: GatePassTokenPayload = {
      userId: String(row.id),
      matricNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      hostelId,
      hostelName,
      roomNumber,
      nonce,
      issuedAt: now,
      generatedAt: now,
      expiresAt,
      signature
    };

    const tokenString = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(payload)));

    const passId = `gp_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const genIso = new Date(now).toISOString();
    const expIso = new Date(expiresAt).toISOString();

    await client.execute({
      sql: `INSERT INTO gate_passes (id, user_id, token_string, signature_hash, status, generated_at, expires_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      args: [passId, userId, tokenString, signature, genIso, expIso]
    });

    return {
      tokenString,
      payload,
      expiresInSeconds: ttlSeconds
    };
  }

  /**
   * Verifies a student gate pass presented to a hostel porter at the gatehouse ([GATEPASS-02]).
   */
  public static async verifyGatePass(
    tokenString: string,
    porterId: string,
    gateType: GateType = 'ENTRY',
    currentHour?: number
  ): Promise<GatePassVerificationResult> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();
    const verifiedAt = new Date().toISOString();

    let payload: GatePassTokenPayload;
    try {
      const jsonStr = CryptoJS.enc.Base64.parse(tokenString).toString(CryptoJS.enc.Utf8);
      payload = JSON.parse(jsonStr);
      if ((payload as any).p) {
        payload = (payload as any).p;
      }
    } catch {
      return {
        accessGranted: false,
        isValid: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'Malformed or corrupt QR code payload. Re-scan required.',
        verifiedAt,
        message: 'Access Denied: Malformed QR payload'
      };
    }

    const { userId, matricNo, fullName, hostelId, hostelName, roomNumber, nonce, issuedAt, expiresAt, signature } = payload;

    const logAccess = async (status: AccessStatus, denialReason?: string) => {
      try {
        const logId = `gate_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await client.execute({
          sql: `INSERT INTO gate_access_logs (id, user_id, hostel_id, gate_type, access_status, denial_reason, nonce, scanned_by_porter_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [logId, userId, hostelId || 'unknown_hostel', gateType, status, denialReason || null, nonce || null, porterId]
        });
      } catch {}
    };

    // Signature check
    const rawSignatureData = `${userId}:${matricNo}:${fullName}:${hostelId}:${issuedAt || payload.generatedAt}:${expiresAt}:${nonce}`;
    const expectedSignature = CryptoJS.HmacSHA256(rawSignatureData, GATE_PASS_HMAC_SECRET).toString();
    const sigMatches = signature === expectedSignature || payload.signature === expectedSignature;

    if (!sigMatches) {
      await logAccess('DENIED', 'Invalid cryptographic signature');
      return {
        accessGranted: false,
        isValid: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'Invalid cryptographic signature. QR code has been altered or forged.',
        verifiedAt,
        message: 'Access Denied: Invalid signature'
      };
    }

    // Expiration check
    const now = Date.now();
    if (now > expiresAt) {
      await logAccess('DENIED', 'Token expired');
      return {
        accessGranted: false,
        isValid: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'Dynamic QR code has expired. Student app refreshes token automatically every 30-60 seconds.',
        verifiedAt,
        message: 'Access Denied: Token expired'
      };
    }

    // Anti-replay check
    if (nonce) {
      const nonceCheck = await client.execute({
        sql: `SELECT id FROM gate_access_logs WHERE nonce = ? AND access_status = 'GRANTED' LIMIT 1`,
        args: [nonce]
      });

      if (nonceCheck.rows.length > 0) {
        await logAccess('DENIED', 'Replay security violation: Token already used');
        return {
          accessGranted: false,
          isValid: false,
          accessStatus: 'DENIED',
          gateType,
          reason: 'Replay security violation: This specific QR code pass was already presented and scanned.',
          verifiedAt,
          message: 'Access Denied: Replay token detected'
        };
      }
    }

    // Disciplinary suspension check
    const discCheck = await client.execute({
      sql: `SELECT status, reason FROM disciplinary_records WHERE user_id = ? LIMIT 1`,
      args: [userId]
    });

    if (discCheck.rows.length > 0) {
      const discStatus = String(discCheck.rows[0].status);
      if (discStatus === 'SUSPENDED' || discStatus === 'RUSTICATED') {
        const discReason = String(discCheck.rows[0].reason || 'Hostel disciplinary sanctions');
        await logAccess('DENIED', `Disciplinary sanction: ${discStatus}`);
        return {
          accessGranted: false,
          isValid: false,
          accessStatus: 'DENIED',
          gateType,
          reason: `Student status is ${discStatus}. Entry denied by Student Affairs Division: "${discReason}".`,
          verifiedAt,
          message: `Access Denied: ${discStatus}`,
          disciplinaryFlag: {
            status: discStatus as any,
            reason: discReason
          }
        };
      }
    }

    // Curfew check
    const hour = currentHour !== undefined ? currentHour : new Date().getHours();
    const isCurfew = hour >= 22 || hour < 5;

    if (isCurfew) {
      const todayDate = new Date().toISOString().split('T')[0];
      const exeatCheck = await client.execute({
        sql: `SELECT id FROM exeat_requests
              WHERE student_id = ?
                AND warden_approval_status = 'APPROVED'
                AND departure_date <= ?
                AND return_date >= ?
              LIMIT 1`,
        args: [userId, todayDate, todayDate]
      });

      if (exeatCheck.rows.length === 0) {
        await logAccess('DENIED', 'Curfew violation: No approved exeat permission');
        return {
          accessGranted: false,
          isValid: false,
          accessStatus: 'DENIED',
          gateType,
          reason: 'Curfew violation: Hostel gates close at 10:00 PM. No approved overnight exeat permission on file.',
          verifiedAt,
          message: 'Access Denied: Curfew violation'
        };
      }
    }

    await logAccess('GRANTED');

    return {
      accessGranted: true,
      isValid: true,
      accessStatus: 'GRANTED',
      gateType,
      student: {
        userId,
        matricNo,
        fullName,
        hostelName,
        roomNumber
      },
      verifiedAt,
      message: `ACCESS GRANTED: ${fullName} (${matricNo}) - ${hostelName}, ${roomNumber}`
    };
  }

  /**
   * Retrieves past gate entry/exit logs for a given student.
   */
  public static async getLogsByStudent(userId: string): Promise<GateAccessLog[]> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT l.id, l.user_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   l.hostel_id, l.gate_type, l.access_status, l.denial_reason, l.scanned_by_porter_id, l.timestamp
            FROM gate_access_logs l
            JOIN users u ON l.user_id = u.id
            WHERE l.user_id = ?
            ORDER BY l.timestamp DESC`,
      args: [userId]
    });

    return res.rows.map(row => ({
      id: String(row.id),
      userId: String(row.user_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      hostelId: String(row.hostel_id),
      gateType: String(row.gate_type) as GateType,
      accessStatus: String(row.access_status) as AccessStatus,
      denialReason: row.denial_reason ? String(row.denial_reason) : undefined,
      scannedByPorterId: String(row.scanned_by_porter_id),
      timestamp: String(row.timestamp)
    }));
  }

  /**
   * Retrieves recent gate logs for a specific hostel.
   */
  public static async getLogsByHostel(hostelId: string, limit: number = 50): Promise<GateAccessLog[]> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT l.id, l.user_id, u.full_name as student_name, u.matric_or_staff_no as student_matric,
                   l.hostel_id, l.gate_type, l.access_status, l.denial_reason, l.scanned_by_porter_id, l.timestamp
            FROM gate_access_logs l
            JOIN users u ON l.user_id = u.id
            WHERE l.hostel_id = ?
            ORDER BY l.timestamp DESC
            LIMIT ?`,
      args: [hostelId, limit]
    });

    return res.rows.map(row => ({
      id: String(row.id),
      userId: String(row.user_id),
      studentName: row.student_name ? String(row.student_name) : undefined,
      studentMatric: row.student_matric ? String(row.student_matric) : undefined,
      hostelId: String(row.hostel_id),
      gateType: String(row.gate_type) as GateType,
      accessStatus: String(row.access_status) as AccessStatus,
      denialReason: row.denial_reason ? String(row.denial_reason) : undefined,
      scannedByPorterId: String(row.scanned_by_porter_id),
      timestamp: String(row.timestamp)
    }));
  }
}
