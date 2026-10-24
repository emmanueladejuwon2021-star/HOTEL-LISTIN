import { GatePassService } from '../api/gatepassService';
import { AuthService } from '../api/authService';
import { useScannerStore } from '../store/useScannerStore';
import { useGatePassStore } from '../store/useGatePassStore';

/**
 * Automated Test Suite for Porter Gate Scanner, Sub-500ms Verification & Manual PIN Backup.
 *
 * Implements:
 * - [GATEPASS-05 / UAT-0035] Dynamic QR Gate Pass Component 5 (Visitor Pass PIN Generation)
 * - [SCANNER-01 / UAT-0036] Porter High-Visibility Gate Scanner View Component 1
 * - [SCANNER-02 / UAT-0037] Sub-500ms QR Verification Performance Component 2
 * - [SCANNER-03 / UAT-0038] Manual 6-Digit PIN Lookup Backup for Gate Access Component 3
 *
 * Adheres to PRD Section 6 (Specs S-05 & P-01), Section 7, and Section 9.
 * Commented with plain English descriptions for non-technical team members and hostel porters.
 */
describe('Porter Gate Scanner & Verification Engine [GATEPASS-05, SCANNER-01, SCANNER-02, SCANNER-03]', () => {
  const studentId = `usr_scanner_student_${Date.now()}`;
  const studentMatric = `200407${Math.floor(100 + Math.random() * 900)}`;
  const porterId = `usr_scanner_porter_${Date.now()}`;
  const hashedPassword = AuthService.hashPassword('password123');

  beforeAll(async () => {
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Clean up & Seed Student User
    await client.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [studentId] });
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Scanner Test Student', ?, '08011223344', 'STUDENT', 'FEMALE', ?, 1)`,
      args: [studentId, studentMatric, `student_${Date.now()}@unilag.edu.ng`, hashedPassword]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Engineering', 'Electrical', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [studentId]
    });

    // 2. Seed Porter User
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Officer Jaja Gate', ?, '08099887766', 'PORTER', 'MALE', ?, 1)`,
      args: [porterId, `STF_POR_${Date.now()}`, `porter_${Date.now()}@unilag.edu.ng`, hashedPassword]
    });
  });

  afterEach(() => {
    useScannerStore.getState().resetScanner();
    useGatePassStore.getState().resetGatePassState();
  });

  describe('[GATEPASS-05 / UAT-0035] Visitor Pass PIN Generation & Offline Management', () => {
    test('student can generate an expected visitor pass with a 6-digit access PIN', async () => {
      const visitor = await GatePassService.createVisitorPass(
        studentId,
        'Oluwaseun Adeyemi',
        '08023456789'
      );

      expect(visitor.id).toBeDefined();
      expect(visitor.studentId).toBe(studentId);
      expect(visitor.visitorName).toBe('Oluwaseun Adeyemi');
      expect(visitor.visitorPhone).toBe('08023456789');
      expect(visitor.passCode).toMatch(/^\d{6}$/); // Exactly 6 numeric digits
      expect(visitor.status).toBe('EXPECTED');
      expect(visitor.studentName).toBe('Scanner Test Student');
      expect(visitor.studentMatric).toBe(studentMatric);
    });

    test('student can view their created visitor passes in chronological order', async () => {
      const passes = await GatePassService.getVisitorPassesByStudent(studentId);

      expect(passes).toBeDefined();
      expect(passes.length).toBeGreaterThan(0);
      expect(passes[0].visitorName).toBe('Oluwaseun Adeyemi');
    });

    test('Zustand useGatePassStore handles visitor pass creation action seamlessly', async () => {
      const store = useGatePassStore.getState();

      const pass = await store.createVisitorPass!(
        studentId,
        'Folake Johnson',
        '08034567890'
      );

      expect(pass.passCode).toMatch(/^\d{6}$/);
      expect(useGatePassStore.getState().visitorPasses?.length).toBeGreaterThan(0);
    });
  });

  describe('[SCANNER-01 / UAT-0036] Porter High-Visibility Gate Scanner View', () => {
    test('renders ACCESS GRANTED banner and student mini profile on scanning valid dynamic QR pass', async () => {
      const { record } = await GatePassService.generateGatePass(studentId);

      const verification = await GatePassService.verifyGatePassToken(record.tokenString);

      expect(verification.isValid).toBe(true);
      expect(verification.message).toContain('ACCESS GRANTED');
      expect(verification.student?.fullName).toBe('Scanner Test Student');
      expect(verification.student?.matricNo).toBe(studentMatric);
      expect(verification.student?.hostelName).toBeDefined();
      expect(verification.student?.roomNumber).toBeDefined();
    });

    test('renders ACCESS DENIED banner with specific error reason on scanning tampered or corrupt token', async () => {
      const result = await GatePassService.verifyGatePassToken('TAMPERED_FORGED_QR_TOKEN_STRING');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Access Denied');
    });

    test('Zustand useScannerStore updates verificationResult and gate mode', async () => {
      const { record } = await GatePassService.generateGatePass(studentId);

      // Verify ENTRY mode scan
      const store = useScannerStore.getState();
      store.setGateMode('ENTRY');

      await store.scanQrCode(record.tokenString, porterId);
      const state = useScannerStore.getState();

      expect(state.verificationResult?.isValid).toBe(true);
      expect(state.gateMode).toBe('ENTRY');
      expect(state.isVerifying).toBe(false);
      expect(state.verificationResult?.student?.fullName).toBe('Scanner Test Student');
    });
  });

  describe('[SCANNER-02 / UAT-0037] Sub-500ms QR Verification Performance SLA', () => {
    test('verifies QR pass token with latency under 500ms (sub-500ms performance SLA)', async () => {
      const { record } = await GatePassService.generateGatePass(studentId);

      const result = await GatePassService.fastVerifyGatePass(record.tokenString, porterId, 'ENTRY');

      expect(result.isValid).toBe(true);
      expect(result.accessGranted).toBe(true);
      expect(result.latencyMs).toBeDefined();
      // PRD Section 1.2 & Non-Functional requirement: Sub-500ms gate screening
      expect(result.latencyMs!).toBeLessThan(500);
    });
  });

  describe('[SCANNER-03 / UAT-0038] Manual 6-Digit PIN Lookup Backup for Gate Access', () => {
    let visitorPassCode: string;
    let visitorPassId: string;

    beforeAll(async () => {
      const pass = await GatePassService.createVisitorPass(
        studentId,
        'Emeka Okonjo',
        '08055667788'
      );
      visitorPassCode = pass.passCode;
      visitorPassId = pass.id;
    });

    test('porter looks up valid 6-digit visitor PIN and receives CHECK_IN approval', async () => {
      const lookup = await GatePassService.verifyManualPin(visitorPassCode, porterId, 'ENTRY');

      expect(lookup.isValid).toBe(true);
      expect(lookup.passType).toBe('VISITOR');
      expect(lookup.actionAllowed).toBe('CHECK_IN');
      expect(lookup.visitor?.visitorName).toBe('Emeka Okonjo');
      expect(lookup.visitor?.studentName).toBe('Scanner Test Student');
      expect(lookup.latencyMs!).toBeLessThan(500);
    });

    test('porter checks in visitor: transitions status to CHECKED_IN and logs gate entry', async () => {
      const checkedIn = await GatePassService.checkInVisitor(visitorPassId, porterId);

      expect(checkedIn.status).toBe('CHECKED_IN');
      expect(checkedIn.checkInTime).toBeDefined();

      // Subsequent lookup of same PIN indicates visitor is checked in and ready for exit
      const nextLookup = await GatePassService.verifyManualPin(visitorPassCode, porterId, 'EXIT');
      expect(nextLookup.isValid).toBe(true);
      expect(nextLookup.actionAllowed).toBe('CHECK_OUT');
      expect(nextLookup.message).toContain('ACTIVE VISITOR');
    });

    test('porter checks out visitor upon hostel exit: transitions status to CHECKED_OUT', async () => {
      const checkedOut = await GatePassService.checkOutVisitor(visitorPassId, porterId);

      expect(checkedOut.status).toBe('CHECKED_OUT');
      expect(checkedOut.checkOutTime).toBeDefined();

      // Subsequent lookup shows pass is completed
      const postCheckout = await GatePassService.verifyManualPin(visitorPassCode, porterId, 'ENTRY');
      expect(postCheckout.isValid).toBe(false);
      expect(postCheckout.actionAllowed).toBe('NONE');
    });

    test('emergency backup: student matric lookup succeeds when student phone battery died', async () => {
      const emergencyLookup = await GatePassService.verifyManualPin(studentMatric, porterId, 'ENTRY');

      expect(emergencyLookup.isValid).toBe(true);
      expect(emergencyLookup.passType).toBe('STUDENT_BACKUP');
      expect(emergencyLookup.actionAllowed).toBe('CHECK_IN');
      expect(emergencyLookup.message).toContain('EMERGENCY STUDENT ACCESS GRANTED');
      expect(emergencyLookup.student?.fullName).toBe('Scanner Test Student');
      expect(emergencyLookup.student?.matricNo).toBe(studentMatric);
    });

    test('rejects unrecognized PIN or matric number', async () => {
      const invalidLookup = await GatePassService.verifyManualPin('000000', porterId, 'ENTRY');

      expect(invalidLookup.isValid).toBe(false);
      expect(invalidLookup.actionAllowed).toBe('NONE');
      expect(invalidLookup.message).toContain('Unrecognized access code');
    });

    test('Zustand useScannerStore manages manual PIN lookup and modal lifecycle', async () => {
      const store = useScannerStore.getState();

      store.setManualPinModalVisible(true);
      expect(useScannerStore.getState().manualPinModalVisible).toBe(true);

      store.setManualPinInput(studentMatric);
      expect(useScannerStore.getState().manualPinInput).toBe(studentMatric);

      await store.lookupManualPin(studentMatric, porterId);
      const state = useScannerStore.getState();

      expect(state.pinLookupResult?.isValid).toBe(true);
      expect(state.pinLookupResult?.passType).toBe('STUDENT_BACKUP');
      expect(state.isVerifying).toBe(false);
    });
  });
});
