import { GatePassService } from '../api/gatepassService';
import { AuthService } from '../api/authService';

/**
 * Automated Test Suite for Dynamic QR Code Gate Pass Generation & Gatekeeper Verification.
 * Implements [GATEPASS-01 / UAT-0031] and [GATEPASS-02 / UAT-0032].
 *
 * Verifies dynamic token generation, HMAC-SHA256 cryptographic signatures,
 * 60-second expiration enforcement, offline signature validation, anti-replay protection,
 * disciplinary status blocks, curfew restrictions, and gate access audit logging against Turso DB.
 *
 * Commented with plain English descriptions for non-technical team members and hostel porters.
 */
describe('GatePassService - Dynamic QR Gate Pass & Gatekeeper Engine [GATEPASS-01 & GATEPASS-02]', () => {
  const residentStudentId = `usr_resident_${Date.now()}`;
  const nonResidentStudentId = `usr_non_resident_${Date.now()}`;
  const suspendedStudentId = `usr_suspended_${Date.now()}`;
  const porterId = `usr_porter_gate_${Date.now()}`;
  const hostelId = 'hostel_jaja';

  beforeAll(async () => {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Seed Active Resident Student
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Resident Test Student', ?, 'hash', '08012345678', 'STUDENT', 'MALE', 1)`,
      args: [residentStudentId, `MAT_RES_${Date.now()}`, `res_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Sciences', 'Computer Science', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [residentStudentId]
    });

    // 2. Seed Non-Resident Student (Fees unpaid, pending check-in)
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Non-Resident Student', ?, 'hash', '08022223333', 'STUDENT', 'FEMALE', 1)`,
      args: [nonResidentStudentId, `MAT_NON_${Date.now()}`, `non_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Arts', 'English', 200, 'MAIN_CAMPUS', 'STALLITE', 0, 'NOT_STARTED', 'PENDING_CHECKIN')`,
      args: [nonResidentStudentId]
    });

    // 3. Seed Suspended Student
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Suspended Student', ?, 'hash', '08033334444', 'STUDENT', 'MALE', 1)`,
      args: [suspendedStudentId, `MAT_SUSP_${Date.now()}`, `susp_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Law', 'Commercial Law', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [suspendedStudentId]
    });

    await client.execute({
      sql: `INSERT INTO disciplinary_records (user_id, status, reason)
            VALUES (?, 'SUSPENDED', 'Fighting in hostel courtyard')`,
      args: [suspendedStudentId]
    });

    // 4. Seed Gatekeeper Porter
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Gate Porter Officer', ?, 'hash', '08055556666', 'PORTER', 'MALE', 1)`,
      args: [porterId, `STF_POR_${Date.now()}`, `por_${Date.now()}@unilag.edu.ng`]
    });
  });

  describe('[GATEPASS-01 / UAT-0031] Dynamic QR Gate Pass Token Generation', () => {
    test('should generate a dynamic time-bound gate pass with HMAC-SHA256 signature for active resident', async () => {
      const pass = await GatePassService.generateDynamicGatePass(residentStudentId);

      expect(pass).toBeDefined();
      expect(pass.tokenString).toBeDefined();
      expect(pass.expiresInSeconds).toBe(60);
      expect(pass.payload.userId).toBe(residentStudentId);
      expect(pass.payload.fullName).toBe('Resident Test Student');
      expect(pass.payload.signature).toBeDefined();
      expect(pass.payload.signature).toMatch(/^[a-f0-9]{64}$/);
      expect(pass.payload.expiresAt).toBeGreaterThan(pass.payload.issuedAt);
    });

    test('should reject gate pass generation for student who has not completed residency check-in', async () => {
      await expect(
        GatePassService.generateDynamicGatePass(nonResidentStudentId)
      ).rejects.toThrow('Student is not an active resident');
    });

    test('should throw error when generating pass for non-existent user ID', async () => {
      await expect(
        GatePassService.generateDynamicGatePass('invalid_user_id')
      ).rejects.toThrow('Student account or active academic profile not found');
    });
  });

  describe('[GATEPASS-02 / UAT-0032] Gatekeeper Verification, Anti-Replay, and Curfew Controls', () => {
    test('should grant access when valid dynamic gate pass is presented during normal hours', async () => {
      const pass = await GatePassService.generateDynamicGatePass(residentStudentId);

      // Verify at 14:00 (normal daylight hours, no curfew)
      const result = await GatePassService.verifyGatePass(pass.tokenString, porterId, 'ENTRY', 14);

      expect(result.accessGranted).toBe(true);
      expect(result.accessStatus).toBe('GRANTED');
      expect(result.gateType).toBe('ENTRY');
      expect(result.student?.fullName).toBe('Resident Test Student');
    });

    test('should enforce anti-replay protection by rejecting re-use of an already scanned token nonce', async () => {
      const pass = await GatePassService.generateDynamicGatePass(residentStudentId);

      // First scan: GRANTED
      const firstScan = await GatePassService.verifyGatePass(pass.tokenString, porterId, 'ENTRY', 14);
      expect(firstScan.accessGranted).toBe(true);

      // Second scan of identical token: DENIED due to anti-replay
      const replayScan = await GatePassService.verifyGatePass(pass.tokenString, porterId, 'ENTRY', 14);
      expect(replayScan.accessGranted).toBe(false);
      expect(replayScan.accessStatus).toBe('DENIED');
      expect(replayScan.reason).toContain('Replay security violation');
    });

    test('should reject forged or tampered token signatures', async () => {
      const pass = await GatePassService.generateDynamicGatePass(residentStudentId);

      // Tamper with payload
      const tamperedPayload = { ...pass.payload, fullName: 'Impostor Person' };
      const tamperedTokenString = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64');

      const result = await GatePassService.verifyGatePass(tamperedTokenString, porterId, 'ENTRY', 14);

      expect(result.accessGranted).toBe(false);
      expect(result.accessStatus).toBe('DENIED');
      expect(result.reason).toContain('Invalid cryptographic signature');
    });

    test('should reject expired dynamic gate pass tokens', async () => {
      const pass = await GatePassService.generateDynamicGatePass(residentStudentId);

      // Simulate expired timestamp (2 minutes ago)
      const expiredPayload = {
        ...pass.payload,
        expiresAt: Date.now() - 120_000
      };
      // Note: Re-signing with secret to specifically test expiration check
      const rawData = `${expiredPayload.userId}:${expiredPayload.matricNo}:${expiredPayload.fullName}:${expiredPayload.hostelId}:${expiredPayload.issuedAt}:${expiredPayload.expiresAt}:${expiredPayload.nonce}`;
      const CryptoJS = require('crypto-js');
      expiredPayload.signature = CryptoJS.HmacSHA256(rawData, 'UNILAG_GATE_PASS_SECRET_AKOKA_CAMPUS_2026').toString();
      const expiredTokenString = Buffer.from(JSON.stringify(expiredPayload)).toString('base64');

      const result = await GatePassService.verifyGatePass(expiredTokenString, porterId, 'ENTRY', 14);

      expect(result.accessGranted).toBe(false);
      expect(result.reason).toContain('QR code has expired');
    });

    test('should deny access if student has active disciplinary suspension', async () => {
      const pass = await GatePassService.generateDynamicGatePass(suspendedStudentId);

      const result = await GatePassService.verifyGatePass(pass.tokenString, porterId, 'ENTRY', 14);

      expect(result.accessGranted).toBe(false);
      expect(result.accessStatus).toBe('DENIED');
      expect(result.reason).toContain('SUSPENDED');
      expect(result.reason).toContain('Fighting in hostel courtyard');
    });

    test('should deny access during curfew hours (23:00) without approved exeat permission', async () => {
      const pass = await GatePassService.generateDynamicGatePass(residentStudentId);

      // Simulate 23:00 (11:00 PM curfew hour)
      const result = await GatePassService.verifyGatePass(pass.tokenString, porterId, 'ENTRY', 23);

      expect(result.accessGranted).toBe(false);
      expect(result.accessStatus).toBe('DENIED');
      expect(result.reason).toContain('Curfew violation');
      expect(result.reason).toContain('10:00 PM');
    });

    test('should grant access during curfew hours if student has approved exeat permission', async () => {
      const client = AuthService.getDbClient();
      const today = new Date().toISOString().split('T')[0];

      // Seed approved exeat request
      await client.execute({
        sql: `INSERT INTO exeat_requests (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status)
              VALUES (?, ?, 'Lagos Island Hospital', 'Medical appointment with specialist', ?, ?, 'APPROVED')`,
        args: [`exeat_${Date.now()}`, residentStudentId, today, today]
      });

      const pass = await GatePassService.generateDynamicGatePass(residentStudentId);

      // Verify at 23:00 with approved exeat
      const result = await GatePassService.verifyGatePass(pass.tokenString, porterId, 'ENTRY', 23);

      expect(result.accessGranted).toBe(true);
      expect(result.accessStatus).toBe('GRANTED');
    });

    test('should record gate access attempts in gate_access_logs audit table', async () => {
      const logs = await GatePassService.getLogsByStudent(residentStudentId);

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].userId).toBe(residentStudentId);
      expect(logs[0].scannedByPorterId).toBe(porterId);
      expect(logs[0].timestamp).toBeDefined();
    });
  });
});
