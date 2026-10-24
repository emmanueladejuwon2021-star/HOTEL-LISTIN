import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import { PaymentService } from './paymentService';
import { GatePassDetails, GatePassVerificationResult } from '../types/gatepass';

/**
 * Service handling dynamic QR gate pass generation, token refreshing, and verification for residents.
 * Connects directly to Turso libSQL SQLite database following zero-mock policy.
 */
export class GatePassService {
  /**
   * Secret key used for signing dynamic QR gate pass tokens.
   */
  private static readonly GATE_PASS_SECRET = 'UNILAG_GATE_PASS_RSA256_SECRET_KEY_2026';

  /**
   * Token refresh duration in seconds (30 seconds auto-refresh).
   */
  public static readonly TOKEN_REFRESH_INTERVAL_SECONDS = 30;

  /**
   * Initializes the `gate_passes` database table schema in Turso DB if not exists.
   */
  public static async initializeSchema(): Promise<void> {
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS gate_passes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bedspace_id TEXT NOT NULL,
        qr_token TEXT NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        token_expires_at DATETIME NOT NULL,
        pass_expires_at DATETIME NOT NULL,
        status TEXT CHECK(status IN ('ACTIVE', 'EXPIRED', 'REVOKED')) DEFAULT 'ACTIVE',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bedspace_id) REFERENCES bedspaces(id) ON DELETE CASCADE
      );`,
      args: []
    });
  }

  /**
   * Generates or fetches an active dynamic QR gate pass for a verified resident student.
   * Verifies that student has a confirmed room reservation in Turso DB before issuing pass.
   *
   * @param userId - Student's unique user ID
   * @returns GatePassDetails containing token, student info, room assignment, and countdown timer
   */
  public static async generateGatePass(userId: string): Promise<GatePassDetails> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query confirmed bedspace assignment & student profile
    const res = await client.execute({
      sql: `SELECT u.full_name, u.matric_or_staff_no,
                   b.id as bedspace_id, b.bed_label, b.status as bedspace_status,
                   r.room_number, r.block_name,
                   h.name as hostel_name
            FROM bedspaces b
            JOIN users u ON b.allocated_to_user_id = u.id
            JOIN rooms r ON b.room_id = r.id
            JOIN hostels h ON r.hostel_id = h.id
            WHERE b.allocated_to_user_id = ? AND b.status = 'CONFIRMED'
            LIMIT 1`,
      args: [userId]
    });

    if (res.rows.length === 0) {
      throw new Error('Access Denied: You do not have a confirmed hostel room allocation. Please complete fee payment first.');
    }

    const row = res.rows[0];
    const bedspaceId = String(row.bedspace_id);
    const passId = `GP_${String(row.matric_or_staff_no)}_${userId}`;

    const now = new Date();
    const generatedAt = now.toISOString();

    // 30 seconds token refresh expiration time
    const tokenExpiresDate = new Date(now.getTime() + GatePassService.TOKEN_REFRESH_INTERVAL_SECONDS * 1000);
    const tokenExpiresAt = tokenExpiresDate.toISOString();

    // Pass validity duration (e.g. 1 academic session / 1 year)
    const passExpiresDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const passExpiresAt = passExpiresDate.toISOString();

    // Construct cryptographic payload string
    const payloadObject = {
      passId,
      userId,
      matric: String(row.matric_or_staff_no),
      name: String(row.full_name),
      hostel: String(row.hostel_name),
      room: `Block ${row.block_name} Room ${row.room_number} (${row.bed_label})`,
      timestamp: generatedAt,
      salt: Math.random().toString(36).substring(2, 10)
    };

    const rawPayloadStr = JSON.stringify(payloadObject);
    const signature = CryptoJS.SHA256(rawPayloadStr + GatePassService.GATE_PASS_SECRET).toString(CryptoJS.enc.Hex);
    const qrToken = `${rawPayloadStr}|SIG:${signature}`;

    // Upsert gate pass record in Turso DB
    const existingPassRes = await client.execute({
      sql: `SELECT id FROM gate_passes WHERE user_id = ?`,
      args: [userId]
    });

    if (existingPassRes.rows.length > 0) {
      await client.execute({
        sql: `UPDATE gate_passes
              SET qr_token = ?,
                  generated_at = CURRENT_TIMESTAMP,
                  token_expires_at = ?,
                  status = 'ACTIVE'
              WHERE user_id = ?`,
        args: [qrToken, tokenExpiresAt, userId]
      });
    } else {
      await client.execute({
        sql: `INSERT INTO gate_passes (id, user_id, bedspace_id, qr_token, token_expires_at, pass_expires_at, status)
              VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        args: [passId, userId, bedspaceId, qrToken, tokenExpiresAt, passExpiresAt]
      });
    }

    return {
      passId,
      userId,
      studentName: String(row.full_name),
      studentMatricNo: String(row.matric_or_staff_no),
      hostelName: String(row.hostel_name),
      blockName: String(row.block_name),
      roomNumber: String(row.room_number),
      bedLabel: String(row.bed_label),
      qrToken,
      generatedAt,
      tokenExpiresAt,
      passExpiresAt,
      status: 'ACTIVE',
      refreshCountdownSeconds: GatePassService.TOKEN_REFRESH_INTERVAL_SECONDS
    };
  }

  /**
   * Verifies the validity and signature of a dynamic QR gate pass token.
   * Performs signature recalculation and database residency status lookup.
   *
   * @param qrToken - Full QR payload string containing raw JSON and signature
   * @returns GatePassVerificationResult containing validity flag and student info
   */
  public static async verifyGatePassToken(qrToken: string): Promise<GatePassVerificationResult> {
    await GatePassService.initializeSchema();

    if (!qrToken || !qrToken.includes('|SIG:')) {
      return {
        isValid: false,
        message: 'Invalid Gate Pass Format: Missing signature payload.'
      };
    }

    const parts = qrToken.split('|SIG:');
    const rawPayloadStr = parts[0];
    const signature = parts[1];

    // Re-verify signature cryptographic integrity
    const expectedSignature = CryptoJS.SHA256(rawPayloadStr + GatePassService.GATE_PASS_SECRET).toString(CryptoJS.enc.Hex);
    if (signature !== expectedSignature) {
      return {
        isValid: false,
        message: 'Security Alert: Gate pass signature mismatch or anti-tamper violation!'
      };
    }

    try {
      const payload = JSON.parse(rawPayloadStr);
      const userId = payload.userId;

      // Verify active residency in Turso DB
      const client = AuthService.getDbClient();
      const res = await client.execute({
        sql: `SELECT b.status as bedspace_status, gp.status as pass_status
              FROM gate_passes gp
              JOIN bedspaces b ON gp.bedspace_id = b.id
              WHERE gp.user_id = ?`,
        args: [userId]
      });

      if (res.rows.length === 0) {
        return {
          isValid: false,
          message: 'Access Denied: Student has no active gate pass record.'
        };
      }

      const row = res.rows[0];
      if (String(row.bedspace_status) !== 'CONFIRMED' || String(row.pass_status) !== 'ACTIVE') {
        return {
          isValid: false,
          message: 'Access Denied: Room allocation is inactive or gate pass is revoked.'
        };
      }

      return {
        isValid: true,
        studentName: payload.name,
        studentMatricNo: payload.matric,
        hostelName: payload.hostel,
        roomDetails: payload.room,
        issuedAt: payload.timestamp,
        message: `ACCESS GRANTED: Verified Resident ${payload.name} (${payload.matric})`
      };
    } catch (e: any) {
      return {
        isValid: false,
        message: `Verification Error: Failed to parse pass payload - ${e.message}`
      };
    }
  }
}
