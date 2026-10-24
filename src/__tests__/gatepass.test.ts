import { GatePassService } from '../api/gatePassService';
import { AuthService } from '../api/authService';
import { useGatePassStore } from '../store/useGatePassStore';

describe('Dynamic QR Code Gate Pass Generation (Issue #33 / GATEPASS-03 / UAT-0033)', () => {
  const testStudentId = 'usr_gatepass_test_33';
  const testMatricNo = '200407033';
  const hashedPassword = AuthService.hashPassword('password123');

  beforeAll(async () => {
    // Initialize Turso database schemas
    await AuthService.initializeSchema();
    await GatePassService.initializeSchema();

    const client = AuthService.getDbClient();

    // Clean up test records
    await client.execute({ sql: `DELETE FROM student_profiles WHERE user_id = ?`, args: [testStudentId] });
    await client.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [testStudentId] });

    // Seed test student user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testStudentId, testMatricNo, 'Test GatePass Student', 'gatepass33@unilag.edu.ng', '08012345678', 'STUDENT', 'MALE', hashedPassword, 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testStudentId, 'Engineering', 'Systems Engineering', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED']
    });
  });

  afterEach(() => {
    useGatePassStore.getState().resetGatePassState();
  });

  test('generates dynamic gate pass token with 30s TTL and Turso DB record', async () => {
    const { record, payload } = await GatePassService.generateGatePass(testStudentId);

    expect(record.id).toBeDefined();
    expect(record.userId).toBe(testStudentId);
    expect(record.status).toBe('ACTIVE');
    expect(record.remainingSeconds).toBe(30);

    expect(payload.userId).toBe(testStudentId);
    expect(payload.fullName).toBe('Test GatePass Student');
    expect(payload.matricNo).toBe(testMatricNo);
    expect(payload.expiresAt).toBeGreaterThan(payload.generatedAt);
    expect(payload.expiresAt - payload.generatedAt).toBe(30000);
  });

  test('verifies valid dynamic QR token at hostel gate', async () => {
    const { record } = await GatePassService.generateGatePass(testStudentId);

    const verification = await GatePassService.verifyGatePassToken(record.tokenString);

    expect(verification.isValid).toBe(true);
    expect(verification.message).toContain('ACCESS GRANTED');
    expect(verification.payload?.userId).toBe(testStudentId);
    expect(verification.passId).toBe(record.id);
  });

  test('rejects tampered or malformed gate pass token', async () => {
    const verification = await GatePassService.verifyGatePassToken('INVALID_TAMPERED_TOKEN_STRING');

    expect(verification.isValid).toBe(false);
    expect(verification.message).toContain('Access Denied');
  });

  test('retrieves or auto-refreshes active pass via GatePassService', async () => {
    const pass1 = await GatePassService.getOrRefreshGatePass(testStudentId);
    expect(pass1.record.status).toBe('ACTIVE');

    const pass2 = await GatePassService.getOrRefreshGatePass(testStudentId);
    expect(pass2.record.id).toBe(pass1.record.id);
  });

  test('manages state and timer countdown in Zustand useGatePassStore', async () => {
    const store = useGatePassStore.getState();

    await store.loadGatePass(testStudentId);
    const loadedState = useGatePassStore.getState();

    expect(loadedState.currentPass).not.toBeNull();
    expect(loadedState.payload?.userId).toBe(testStudentId);
    expect(loadedState.secondsRemaining).toBeGreaterThan(0);

    // Simulate timer tick
    const currentSeconds = loadedState.secondsRemaining;
    useGatePassStore.getState().tickTimer(testStudentId);
    expect(useGatePassStore.getState().secondsRemaining).toBe(currentSeconds - 1);
  });
});
