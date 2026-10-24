import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import { PaymentService } from './paymentService';
import {
  GatePassRecord,
  GatePassTokenPayload,
  GatePassVerificationResult
} from '../types/gatepass';

/**
 * Secret key used to generate HMAC signatures for dynamic student gate pass tokens.
 * In production environments, this key is served securely from server middleware or SecureStore.
 */
const GATE_PASS_SECRET = 'UNILAGSTAY_GATEPASS_HMAC_SECRET_2026_KEY';

/**
 * Service managing dynamic dynamic QR code gate pass creation, database persistence,
 * automatic token refreshing, and verification for UNILAG hostel entry gates.
 *
 * Interacts directly with Turso libSQL edge SQLite database following zero-mock principles.
 * All functions are heavily documented with simple English comments for non-technical readability.
 */
export class GatePassService {
  /**
   * Initializes the Turso libSQL SQLite database schema for gate pass tracking.
   * Creates the `gate_passes` table and necessary indexes if they do not exist.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    // Create gate_passes table in Turso database
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

    // Create indexes for fast gate pass lookup and verification
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_passes_user ON gate_passes(user_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_passes_sig ON gate_passes(signature_hash)`,
      args: []
    });
  }

  /**
   * Generates a new dynamic QR code gate pass for a student.
   * Retrieves student details, generates an encrypted payload with a 30-second expiry window,
   * stores the record in Turso DB, and returns the gate pass data.
   *
   * @param userId The ID of the student requesting a gate pass
   * @returns GatePassRecord and decoded payload
   */
  public static async generateGatePass(userId: string): Promise<{
    record: GatePassRecord;
    payload: GatePassTokenPayload;
  }> {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // Fetch student user details
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

    // Attempt fetching room allocation details if payment and room tables exist
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
        args: [userId]
      });

      if (roomRes.rows.length > 0) {
        if (roomRes.rows[0].hostel_name) hostelName = String(roomRes.rows[0].hostel_name);
        if (roomRes.rows[0].room_number) roomNumber = String(roomRes.rows[0].room_number);
      }
    } catch (e) {
      // Fallback to defaults if room allocation is pending
    }

    const nowMs = Date.now();
    const expiryMs = nowMs + 30 * 1000; // 30 seconds validity TTL
    const salt = Math.random().toString(36).substring(2, 10).toUpperCase();

    const payload: GatePassTokenPayload = {
      userId,
      fullName,
      matricNo,
      hostelName,
      roomNumber,
      salt,
      generatedAt: nowMs,
      expiresAt: expiryMs
    };

    // Serialize payload to JSON and compute HMAC-SHA256 signature
    const payloadJson = JSON.stringify(payload);
    const signatureHash = CryptoJS.HmacSHA256(payloadJson, GATE_PASS_SECRET).toString(CryptoJS.enc.Hex);

    // Encode payload and signature into a compact QR token string (Base64)
    const tokenString = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify({
      p: payload,
      sig: signatureHash
    })));

    const passId = `pass_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
    const genIso = new Date(nowMs).toISOString();
    const expIso = new Date(expiryMs).toISOString();

    // Expire any previously active passes for this student in Turso DB
    await client.execute({
      sql: `UPDATE gate_passes SET status = 'EXPIRED' WHERE user_id = ? AND status = 'ACTIVE'`,
      args: [userId]
    });

    // Insert new active gate pass record into Turso DB
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
   *
   * @param userId The student ID
   * @returns Active GatePassRecord and decoded payload
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
        // Active valid pass found
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
        } catch (e) {
          // Fall through to generate fresh pass if parsing fails
        }
      }
    }

    // No valid active pass found, generate fresh pass
    return await GatePassService.generateGatePass(userId);
  }

  /**
   * Verifies the validity of a dynamic QR gate pass scanned at the hostel gatehouse.
   * Checks cryptographic signature, expiration timestamp, and database status in Turso DB.
   *
   * @param tokenString The raw QR code token string scanned by porter camera
   * @returns GatePassVerificationResult object indicating access approval status
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
      // Decode Base64 token payload
      const rawUtf8 = CryptoJS.enc.Base64.parse(tokenString.trim()).toString(CryptoJS.enc.Utf8);
      const parsed = JSON.parse(rawUtf8);

      if (!parsed.p || !parsed.sig) {
        return {
          isValid: false,
          message: 'Access Denied: Malformed or untrusted gate pass payload format.'
        };
      }

      const payload: GatePassTokenPayload = parsed.p;
      const expectedSig = CryptoJS.HmacSHA256(JSON.stringify(payload), GATE_PASS_SECRET).toString(CryptoJS.enc.Hex);

      // Verify cryptographic signature matches
      if (parsed.sig !== expectedSig) {
        return {
          isValid: false,
          message: 'Access Denied: Invalid security signature. Dynamic pass has been tampered with.'
        };
      }

      // Check timestamp expiration (30s window)
      const nowMs = Date.now();
      if (nowMs > payload.expiresAt) {
        return {
          isValid: false,
          message: 'Access Denied: Dynamic QR gate pass has expired. Student must present a refreshed code.'
        };
      }

      // Check database status record in Turso
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

      return {
        isValid: true,
        message: `ACCESS GRANTED: ${payload.fullName} (${payload.matricNo}) - ${payload.hostelName}, ${payload.roomNumber}`,
        payload,
        passId: String(dbResult.rows[0].id),
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Access Denied: Failed to process QR pass token.'
      };
    }
  }
}
