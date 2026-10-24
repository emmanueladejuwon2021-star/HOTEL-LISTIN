import { Client } from '@libsql/client';
import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import {
  GatePassToken,
  GatePassTokenPayload,
  GateAccessLog,
  GateVerificationResult,
  GateType
} from '../types/gatepass';

const GATE_PASS_HMAC_SECRET = 'UNILAG_GATE_PASS_SECRET_AKOKA_CAMPUS_2026';
const TOKEN_EXPIRY_MS = 60 * 1000; // 60 seconds rolling window

/**
 * Service class for Dynamic QR Code Gate Pass Generation & Gatekeeper Verification.
 * Implements [GATEPASS-01] and [GATEPASS-02] adhering to PRD Sections 4.6 and Section 6.
 *
 * Direct Turso libSQL interaction with zero mocks.
 * Written with plain English comments for non-technical team members and hostel porters.
 */
export class GatePassService {
  /**
   * Initializes the database schema for gate access logging.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

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
   * Generates a dynamic time-bound QR gate pass token for an active resident student ([GATEPASS-01]).
   * Signed with HMAC-SHA256 and expires automatically in 60 seconds.
   *
   * @param userId Unique student user ID
   * @returns GatePassToken object with base64 encoded token string and payload
   */
  public static async generateDynamicGatePass(userId: string): Promise<GatePassToken> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Verify student exists, is active, and is an approved resident
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

    // Must have fees paid and cleared/active status
    const isResident =
      row.residency_status === 'ACTIVE_RESIDENT' ||
      (Boolean(row.fees_paid) && row.clearance_status === 'APPROVED');

    if (!isResident) {
      throw new Error('Student is not an active resident. Room check-in and clearance required before gate pass issuance.');
    }

    // 2. Fetch assigned room and hostel details if allocated
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
    } catch {
      // Safe fallback if allocation tables are not seeded yet
    }

    // 3. Construct time-bound rolling token payload (60-second validity window)
    const now = Date.now();
    const expiresAt = now + TOKEN_EXPIRY_MS;
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
      expiresAt,
      signature
    };

    // Serialize to Base64 token string
    const jsonStr = JSON.stringify(payload);
    let tokenString: string;
    if (typeof Buffer !== 'undefined') {
      tokenString = Buffer.from(jsonStr).toString('base64');
    } else {
      tokenString = btoa(unescape(encodeURIComponent(jsonStr)));
    }

    return {
      tokenString,
      payload,
      expiresInSeconds: 60
    };
  }

  /**
   * Verifies a dynamic QR pass token presented at a hostel gate ([GATEPASS-02]).
   * Performs offline HMAC signature validation, expiration checking, anti-replay nonce protection,
   * disciplinary suspension checks, curfew hour validation, and audit trail logging.
   *
   * @param tokenString Base64 dynamic token string scanned by porter camera
   * @param porterId User ID of the porter operating the scanner
   * @param gateType 'ENTRY' or 'EXIT' (defaults to 'ENTRY')
   * @param mockCurrentHour Optional hour (0-23) for testing curfew enforcement deterministically
   * @returns GateVerificationResult
   */
  public static async verifyGatePass(
    tokenString: string,
    porterId: string,
    gateType: GateType = 'ENTRY',
    mockCurrentHour?: number
  ): Promise<GateVerificationResult> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const logId = `glog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const verifiedAt = new Date().toISOString();

    // Helper to log access attempts to Turso DB
    const logAttempt = async (
      userId: string,
      hostelId: string,
      status: 'GRANTED' | 'DENIED',
      reason?: string,
      nonce?: string
    ) => {
      try {
        await client.execute({
          sql: `INSERT INTO gate_access_logs (
            id, user_id, hostel_id, gate_type, access_status, denial_reason, nonce, scanned_by_porter_id, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [logId, userId, hostelId, gateType, status, reason || null, nonce || null, porterId]
        });
      } catch {
        // Log failure should not break verification decision
      }
    };

    // Step 1: Decode Base64 token string
    let payload: GatePassTokenPayload;
    try {
      let jsonStr: string;
      if (typeof Buffer !== 'undefined') {
        jsonStr = Buffer.from(tokenString, 'base64').toString('utf-8');
      } else {
        jsonStr = decodeURIComponent(escape(atob(tokenString)));
      }
      payload = JSON.parse(jsonStr);
    } catch {
      await logAttempt('UNKNOWN_USER', 'UNKNOWN_HOSTEL', 'DENIED', 'Corrupted or unreadable QR code format');
      return {
        accessGranted: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'Corrupted or unreadable QR code format.',
        verifiedAt
      };
    }

    // Step 2: Validate HMAC-SHA256 signature
    const expectedData = `${payload.userId}:${payload.matricNo}:${payload.fullName}:${payload.hostelId}:${payload.issuedAt}:${payload.expiresAt}:${payload.nonce}`;
    const expectedSignature = CryptoJS.HmacSHA256(expectedData, GATE_PASS_HMAC_SECRET).toString();

    if (payload.signature !== expectedSignature) {
      await logAttempt(payload.userId, payload.hostelId, 'DENIED', 'Invalid cryptographic signature - fraudulent pass detected', payload.nonce);
      return {
        accessGranted: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'Invalid cryptographic signature. Forged or altered gate pass rejected.',
        student: {
          userId: payload.userId,
          matricNo: payload.matricNo,
          fullName: payload.fullName,
          hostelName: payload.hostelName,
          roomNumber: payload.roomNumber
        },
        verifiedAt
      };
    }

    // Step 3: Check dynamic token expiration (with 5-second grace window for scanner clock drift)
    const now = Date.now();
    if (now > payload.expiresAt + 5000) {
      await logAttempt(payload.userId, payload.hostelId, 'DENIED', 'QR code has expired. Screen refresh required.', payload.nonce);
      return {
        accessGranted: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'QR code has expired. Student must tap to refresh pass.',
        student: {
          userId: payload.userId,
          matricNo: payload.matricNo,
          fullName: payload.fullName,
          hostelName: payload.hostelName,
          roomNumber: payload.roomNumber
        },
        verifiedAt
      };
    }

    // Step 4: Anti-Replay protection: Check if nonce was already used for a granted entry/exit
    const replayCheck = await client.execute({
      sql: `SELECT id FROM gate_access_logs WHERE nonce = ? AND access_status = 'GRANTED'`,
      args: [payload.nonce]
    });

    if (replayCheck.rows.length > 0) {
      await logAttempt(payload.userId, payload.hostelId, 'DENIED', 'Replay attack detected - token already used', payload.nonce);
      return {
        accessGranted: false,
        accessStatus: 'DENIED',
        gateType,
        reason: 'Replay security violation: this QR code was already scanned. Refresh required.',
        student: {
          userId: payload.userId,
          matricNo: payload.matricNo,
          fullName: payload.fullName,
          hostelName: payload.hostelName,
          roomNumber: payload.roomNumber
        },
        verifiedAt
      };
    }

    // Step 5: Check disciplinary status
    const discCheck = await client.execute({
      sql: `SELECT status, reason FROM disciplinary_records WHERE user_id = ?`,
      args: [payload.userId]
    });

    if (discCheck.rows.length > 0) {
      const discStatus = String(discCheck.rows[0].status);
      if (discStatus === 'SUSPENDED' || discStatus === 'RUSTICATED') {
        const reason = `Student is ${discStatus} by Student Affairs: ${discCheck.rows[0].reason || 'Hostel Rule Violation'}`;
        await logAttempt(payload.userId, payload.hostelId, 'DENIED', reason, payload.nonce);
        return {
          accessGranted: false,
          accessStatus: 'DENIED',
          gateType,
          reason,
          student: {
            userId: payload.userId,
            matricNo: payload.matricNo,
            fullName: payload.fullName,
            hostelName: payload.hostelName,
            roomNumber: payload.roomNumber
          },
          verifiedAt
        };
      }
    }

    // Step 6: Curfew hours check (10:00 PM to 05:00 AM)
    const currentHour = mockCurrentHour !== undefined ? mockCurrentHour : new Date().getHours();
    const isCurfew = currentHour >= 22 || currentHour < 5;

    if (isCurfew) {
      // Check if student has an active approved exeat permission
      const todayIso = new Date().toISOString().split('T')[0];
      const exeatCheck = await client.execute({
        sql: `SELECT id FROM exeat_requests
              WHERE student_id = ?
                AND warden_approval_status = 'APPROVED'
                AND date('now') >= date(departure_date)
                AND date('now') <= date(return_date)`,
        args: [payload.userId]
      });

      if (exeatCheck.rows.length === 0) {
        const curfewReason = 'Curfew violation: Hall gates close at 10:00 PM. No approved warden exeat found.';
        await logAttempt(payload.userId, payload.hostelId, 'DENIED', curfewReason, payload.nonce);
        return {
          accessGranted: false,
          accessStatus: 'DENIED',
          gateType,
          reason: curfewReason,
          student: {
            userId: payload.userId,
            matricNo: payload.matricNo,
            fullName: payload.fullName,
            hostelName: payload.hostelName,
            roomNumber: payload.roomNumber
          },
          verifiedAt
        };
      }
    }

    // Step 7: Access GRANTED! Log and return approved result
    await logAttempt(payload.userId, payload.hostelId, 'GRANTED', undefined, payload.nonce);

    return {
      accessGranted: true,
      accessStatus: 'GRANTED',
      gateType,
      student: {
        userId: payload.userId,
        matricNo: payload.matricNo,
        fullName: payload.fullName,
        hostelName: payload.hostelName,
        roomNumber: payload.roomNumber
      },
      verifiedAt
    };
  }

  /**
   * Fetches recent gate access logs for a specific student.
   *
   * @param userId Student ID
   * @returns Array of GateAccessLog
   */
  public static async getLogsByStudent(userId: string): Promise<GateAccessLog[]> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT id, user_id, hostel_id, gate_type, access_status, denial_reason, scanned_by_porter_id, timestamp
            FROM gate_access_logs
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT 50`,
      args: [userId]
    });

    return result.rows.map(r => ({
      id: String(r.id),
      userId: String(r.user_id),
      hostelId: String(r.hostel_id),
      gateType: String(r.gate_type) as GateType,
      accessStatus: String(r.access_status) as 'GRANTED' | 'DENIED',
      denialReason: r.denial_reason ? String(r.denial_reason) : undefined,
      scannedByPorterId: String(r.scanned_by_porter_id),
      timestamp: String(r.timestamp)
    }));
  }

  /**
   * Fetches recent gate access logs for a hostel gatehouse.
   *
   * @param hostelId Hostel ID
   * @param limit Number of logs to fetch
   * @returns Array of GateAccessLog
   */
  public static async getRecentGateLogs(hostelId: string, limit: number = 30): Promise<GateAccessLog[]> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT gal.id, gal.user_id, gal.hostel_id, gal.gate_type, gal.access_status, gal.denial_reason,
                   gal.scanned_by_porter_id, gal.timestamp, u.full_name as student_name, u.matric_or_staff_no as student_matric
            FROM gate_access_logs gal
            LEFT JOIN users u ON gal.user_id = u.id
            WHERE gal.hostel_id = ?
            ORDER BY gal.timestamp DESC
            LIMIT ?`,
      args: [hostelId, limit]
    });

    return result.rows.map(r => ({
      id: String(r.id),
      userId: String(r.user_id),
      studentName: r.student_name ? String(r.student_name) : undefined,
      studentMatric: r.student_matric ? String(r.student_matric) : undefined,
      hostelId: String(r.hostel_id),
      gateType: String(r.gate_type) as GateType,
      accessStatus: String(r.access_status) as 'GRANTED' | 'DENIED',
      denialReason: r.denial_reason ? String(r.denial_reason) : undefined,
      scannedByPorterId: String(r.scanned_by_porter_id),
      timestamp: String(r.timestamp)
    }));
  }
}
