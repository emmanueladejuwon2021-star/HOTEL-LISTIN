import { GatePassService } from '../api/gatepassService';
import { AuthService } from '../api/authService';
import { useGatePassStore } from '../store/useGatePassStore';

/**
 * Automated Unit & UAT Test Suite for Visitor Pass PIN Generation & Visitor Management System.
 *
 * Implements:
 * - [VISITOR-03 / UAT-0048] Visitor Pass PIN Generation & Log - Feature Component 3
 *
 * Verifies:
 * - Student visitor pass creation with auto-generated 6-digit access PINs in Turso libSQL SQLite DB.
 * - Validation of visitor full name, phone number, and visit date.
 * - Foreign key integrity between student accounts and visitor passes.
 * - Chronological log retrieval of active and historical visitor passes.
 * - Porter 6-digit manual PIN gate lookup, check-in, and check-out status transitions.
 * - Zustand `useGatePassStore` state management integration.
 *
 * Written with plain English comments for non-technical university stakeholders and hostel porters.
 */
describe('Visitor Pass PIN Generation & Management [VISITOR-03 / UAT-0048]', () => {
  const testStudentId = `usr_visitor_test_48_${Date.now()}`;
  const testMatricNo = `200408${Math.floor(1000 + Math.random() * 9000)}`;
  const testPorterId = `usr_porter_v48_${Date.now()}`;
  const hashedPassword = AuthService.hashPassword('password123');

  beforeAll(async () => {
    // Initialize required database schemas
    await AuthService.initializeSchema();
    await GatePassService.initializeSchema();

    const client = AuthService.getDbClient();

    // Clean up any stale test records
    await client.execute({ sql: `DELETE FROM student_profiles WHERE user_id = ?`, args: [testStudentId] });
    await client.execute({ sql: `DELETE FROM users WHERE id IN (?, ?)`, args: [testStudentId, testPorterId] });

    // Seed test student user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Visitor Test Student 48', ?, '08011112222', 'STUDENT', 'MALE', ?, 1)`,
      args: [testStudentId, testMatricNo, `student48_${Date.now()}@unilag.edu.ng`, hashedPassword]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Engineering', 'Electrical Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [testStudentId]
    });

    // Seed test gate porter user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Gate Porter Officer 48', ?, '08033334444', 'PORTER', 'MALE', ?, 1)`,
      args: [testPorterId, `STF_POR_${Date.now()}`, `porter48_${Date.now()}@unilag.edu.ng`, hashedPassword]
    });
  });

  beforeEach(() => {
    useGatePassStore.getState().resetGatePassState();
  });

  describe('Visitor Pass Creation & Turso Database Storage', () => {
    test('creates expected visitor pass record with a 6-digit access PIN', async () => {
      const visitorName = 'Chidi Okonkwo';
      const visitorPhone = '08099887766';
      const visitDate = new Date().toISOString().split('T')[0];

      const pass = await GatePassService.createVisitorPass(
        testStudentId,
        visitorName,
        visitorPhone,
        visitDate
      );

      expect(pass.id).toBeDefined();
      expect(pass.id).toMatch(/^vp_\d+_[a-z0-9]+$/);
      expect(pass.studentId).toBe(testStudentId);
      expect(pass.visitorName).toBe(visitorName);
      expect(pass.visitorPhone).toBe(visitorPhone);
      expect(pass.passCode).toMatch(/^\d{6}$/); // Must be a valid 6-digit numeric string
      expect(pass.status).toBe('EXPECTED');
      expect(pass.studentName).toBe('Visitor Test Student 48');
      expect(pass.studentMatric).toBe(testMatricNo);
    });

    test('rejects visitor pass creation for non-existent student user ID', async () => {
      await expect(
        GatePassService.createVisitorPass(
          'non_existent_student_id',
          'John Doe',
          '08012345678'
        )
      ).rejects.toThrow('Host student with ID \'non_existent_student_id\' not found.');
    });

    test('retrieves student visitor pass log in reverse chronological order', async () => {
      const pass1 = await GatePassService.createVisitorPass(testStudentId, 'Guest One', '08011111111');
      const pass2 = await GatePassService.createVisitorPass(testStudentId, 'Guest Two', '08022222222');

      const passes = await GatePassService.getVisitorPassesByStudent(testStudentId);

      expect(passes).toBeDefined();
      expect(passes.length).toBeGreaterThanOrEqual(2);
      expect(passes[0].id).toBe(pass2.id); // Most recent pass first
      expect(passes[1].id).toBe(pass1.id);
    });
  });

  describe('Porter Gatehouse Manual 6-Digit PIN Verification & Check-In Lifecycle', () => {
    let activePassCode: string;
    let activePassId: string;

    beforeEach(async () => {
      const pass = await GatePassService.createVisitorPass(
        testStudentId,
        'Babatunde Lawal',
        '08055443322'
      );
      activePassCode = pass.passCode;
      activePassId = pass.id;
    });

    test('porter verifies valid EXPECTED 6-digit visitor PIN at gatehouse', async () => {
      const lookup = await GatePassService.verifyManualPin(activePassCode, testPorterId, 'ENTRY');

      expect(lookup.isValid).toBe(true);
      expect(lookup.passType).toBe('VISITOR');
      expect(lookup.actionAllowed).toBe('CHECK_IN');
      expect(lookup.visitor).toBeDefined();
      expect(lookup.visitor?.visitorName).toBe('Babatunde Lawal');
      expect(lookup.visitor?.visitorPhone).toBe('08055443322');
      expect(lookup.message).toContain('VALID VISITOR');
    });

    test('porter completes visitor check-in: status transitions to CHECKED_IN and logs gate entry', async () => {
      const checkedInPass = await GatePassService.checkInVisitor(activePassId, testPorterId);

      expect(checkedInPass.status).toBe('CHECKED_IN');
      expect(checkedInPass.checkInTime).toBeDefined();

      // Verify that next PIN lookup for exit returns CHECK_OUT permission
      const nextLookup = await GatePassService.verifyManualPin(activePassCode, testPorterId, 'EXIT');
      expect(nextLookup.isValid).toBe(true);
      expect(nextLookup.actionAllowed).toBe('CHECK_OUT');
      expect(nextLookup.message).toContain('ACTIVE VISITOR');
    });

    test('porter completes visitor check-out: status transitions to CHECKED_OUT and logs departure', async () => {
      await GatePassService.checkInVisitor(activePassId, testPorterId);
      const checkedOutPass = await GatePassService.checkOutVisitor(activePassId, testPorterId);

      expect(checkedOutPass.status).toBe('CHECKED_OUT');
      expect(checkedOutPass.checkOutTime).toBeDefined();

      // Subsequent lookup should indicate pass cannot be re-used
      const postLookup = await GatePassService.verifyManualPin(activePassCode, testPorterId, 'ENTRY');
      expect(postLookup.isValid).toBe(false);
      expect(postLookup.actionAllowed).toBe('NONE');
      expect(postLookup.message).toContain('CHECKED_OUT');
    });
  });

  describe('Zustand useGatePassStore State Management Integration', () => {
    test('creates visitor pass and updates Zustand store visitorPasses state', async () => {
      const store = useGatePassStore.getState();
      expect(store.createVisitorPass).toBeDefined();

      const createdPass = await store.createVisitorPass!(
        testStudentId,
        'Store Guest',
        '08077778888'
      );

      expect(createdPass).toBeDefined();
      expect(createdPass.passCode).toMatch(/^\d{6}$/);

      const updatedStoreState = useGatePassStore.getState();
      expect(updatedStoreState.visitorPasses).toBeDefined();
      expect(updatedStoreState.visitorPasses?.length).toBeGreaterThan(0);
      expect(updatedStoreState.visitorPasses![0].id).toBe(createdPass.id);
    });

    test('loads visitor passes into Zustand store for given student', async () => {
      const store = useGatePassStore.getState();
      expect(store.loadVisitorPasses).toBeDefined();

      await store.loadVisitorPasses!(testStudentId);

      const updatedStoreState = useGatePassStore.getState();
      expect(updatedStoreState.visitorPasses).toBeDefined();
      expect(updatedStoreState.visitorPasses?.length).toBeGreaterThan(0);
    });
  });
});
