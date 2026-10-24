import { AuthService } from '../api/authService';
import { PaymentService } from '../api/paymentService';
import { GatePassService } from '../api/gatepassService';
import { useGatePassStore } from '../store/useGatePassStore';

describe('Dynamic QR Gate Pass Generation & Verification (Issue #31 - GATEPASS-01)', () => {
  const timestamp = Date.now();
  const residentUserId = `test_res_user_${timestamp}`;
  const nonResidentUserId = `test_nonres_user_${timestamp}`;
  const residentMatric = `2009051${Math.floor(100 + Math.random() * 900)}`;
  const nonResidentMatric = `2009052${Math.floor(100 + Math.random() * 900)}`;

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await PaymentService.initializeSchema();
    await GatePassService.initializeSchema();

    const client = AuthService.getDbClient();

    // Create resident user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, password_hash, role, gender, is_active)
            VALUES (?, ?, 'Resident Student', ?, '08012345678', 'dummy_hash', 'STUDENT', 'MALE', 1)`,
      args: [residentUserId, residentMatric, `${residentUserId}@unilag.edu.ng`]
    });

    // Create non-resident user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, password_hash, role, gender, is_active)
            VALUES (?, ?, 'Non-Resident Student', ?, '08087654321', 'dummy_hash', 'STUDENT', 'FEMALE', 1)`,
      args: [nonResidentUserId, nonResidentMatric, `${nonResidentUserId}@unilag.edu.ng`]
    });

    // Seed hostel, room, and confirmed bedspace for resident user
    const hostelId = `hostel_gp_${timestamp}`;
    const hostelName = `King Jaja Hall GatePass Test ${timestamp}`;
    const roomId = `room_gp_${timestamp}`;
    const bedId = `bed_gp_${timestamp}`;

    await client.batch([
      {
        sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
              VALUES (?, ?, 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 100, 50)`,
        args: [hostelId, hostelName]
      },
      {
        sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
              VALUES (?, ?, 'Block A', 1, 'A101', 4, 1)`,
        args: [roomId, hostelId]
      },
      {
        sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id)
              VALUES (?, ?, 'Bed A Down', 'CONFIRMED', ?)`,
        args: [bedId, roomId, residentUserId]
      }
    ], 'write');
  });

  test('generates a valid dynamic cryptographic gate pass for a confirmed resident student', async () => {
    const pass = await GatePassService.generateGatePass(residentUserId);

    expect(pass).toBeDefined();
    expect(pass.userId).toBe(residentUserId);
    expect(pass.studentName).toBe('Resident Student');
    expect(pass.studentMatricNo).toBe(residentMatric);
    expect(pass.hostelName).toContain('King Jaja Hall GatePass Test');
    expect(pass.blockName).toBe('Block A');
    expect(pass.roomNumber).toBe('A101');
    expect(pass.bedLabel).toBe('Bed A Down');
    expect(pass.status).toBe('ACTIVE');
    expect(pass.qrToken).toContain('|SIG:');
    expect(pass.refreshCountdownSeconds).toBe(30);
  });

  test('prevents gate pass generation for non-resident student without confirmed reservation', async () => {
    await expect(GatePassService.generateGatePass(nonResidentUserId)).rejects.toThrow(
      'Access Denied: You do not have a confirmed hostel room allocation'
    );
  });

  test('verifies a valid dynamic QR gate pass token successfully', async () => {
    const pass = await GatePassService.generateGatePass(residentUserId);
    const result = await GatePassService.verifyGatePassToken(pass.qrToken);

    expect(result.isValid).toBe(true);
    expect(result.studentName).toBe('Resident Student');
    expect(result.studentMatricNo).toBe(residentMatric);
    expect(result.message).toContain('ACCESS GRANTED');
  });

  test('rejects tampered or malformed gate pass tokens', async () => {
    const pass = await GatePassService.generateGatePass(residentUserId);
    const tamperedToken = pass.qrToken.replace('Resident Student', 'Hacker Attacker');

    const result = await GatePassService.verifyGatePassToken(tamperedToken);

    expect(result.isValid).toBe(false);
    expect(result.message).toContain('signature mismatch or anti-tamper violation');
  });

  test('Zustand useGatePassStore generates pass and verifies token correctly', async () => {
    const store = useGatePassStore.getState();

    await store.fetchOrGenerateGatePass(residentUserId);
    const activePass = useGatePassStore.getState().activePass;

    expect(activePass).not.toBeNull();
    expect(activePass?.userId).toBe(residentUserId);

    if (activePass) {
      const verifyRes = await store.verifyPassToken(activePass.qrToken);
      expect(verifyRes.isValid).toBe(true);
      expect(useGatePassStore.getState().verificationResult?.isValid).toBe(true);
    }
  });
});
