import { ExeatService } from '../api/exeatService';
import { AuthService } from '../api/authService';
import { GatePassService } from '../api/gatepassService';
import { useExeatStore } from '../store/useExeatStore';

/**
 * Automated Test Suite for Night Exeat Application & Warden Approval [EXEAT-01 / UAT-0061].
 * Verifies exeat application creation, form validations, database persistence, student application history,
 * warden single-tap approval/decline, active exeat verification for gate curfew bypass, and Zustand store actions.
 *
 * All tests execute using real Turso libSQL SQLite queries following strict zero-mock policy.
 */
describe('ExeatService & useExeatStore - Night Exeat Application & Warden Approval [EXEAT-01 / UAT-0061]', () => {
  const testStudentId = `usr_exeat_student_${Date.now()}`;
  const testWardenId = `usr_exeat_warden_${Date.now()}`;
  const testPorterId = `usr_exeat_porter_${Date.now()}`;

  const todayStr = new Date().toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  beforeAll(async () => {
    await ExeatService.initializeSchema();
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // 1. Insert test student user & student_profile
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Exeat Test Student', ?, 'hashed_pass_123', '08099887766', 'STUDENT', 'MALE', 1)`,
      args: [testStudentId, `MAT_EX_${Date.now()}`, `exeat_student_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Engineering', 'Electrical', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [testStudentId]
    });

    // 2. Insert test warden user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Dr. J. O. Warden', ?, 'hashed_pass_123', '08011223344', 'WARDEN', 'MALE', 1)`,
      args: [testWardenId, `STF_EX_${Date.now()}`, `exeat_warden_${Date.now()}@unilag.edu.ng`]
    });
  });

  test('should validate exeat form parameters correctly', () => {
    // Valid inputs
    const validRes = ExeatService.validateExeatForm('15 University Road, Yaba, Lagos', 'Attending family event', todayStr, tomorrowStr);
    expect(validRes.isValid).toBe(true);

    // Short address
    const shortAddrRes = ExeatService.validateExeatForm('Yaba', 'Attending family event', todayStr, tomorrowStr);
    expect(shortAddrRes.isValid).toBe(false);
    expect(shortAddrRes.errorMessage).toContain('Destination address is required');

    // Short reason
    const shortReasonRes = ExeatService.validateExeatForm('15 University Road, Yaba, Lagos', 'Trip', todayStr, tomorrowStr);
    expect(shortReasonRes.isValid).toBe(false);
    expect(shortReasonRes.errorMessage).toContain('Reason for overnight exeat is required');

    // Invalid date format
    const badDateRes = ExeatService.validateExeatForm('15 University Road, Yaba, Lagos', 'Attending family event', '2026/05/12', tomorrowStr);
    expect(badDateRes.isValid).toBe(false);

    // Return date earlier than departure date
    const badRangeRes = ExeatService.validateExeatForm('15 University Road, Yaba, Lagos', 'Attending family event', tomorrowStr, todayStr);
    expect(badRangeRes.isValid).toBe(false);
    expect(badRangeRes.errorMessage).toContain('Return date cannot be earlier');
  });

  test('should apply for exeat and persist record in Turso DB with PENDING status', async () => {
    const exeat = await ExeatService.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '25 Ikeja Way, Ikeja, Lagos',
      reason: 'Attending sibling graduation ceremony',
      departureDate: todayStr,
      returnDate: tomorrowStr
    });

    expect(exeat).toBeDefined();
    expect(exeat.id).toBeDefined();
    expect(exeat.studentId).toBe(testStudentId);
    expect(exeat.destinationAddress).toBe('25 Ikeja Way, Ikeja, Lagos');
    expect(exeat.reason).toBe('Attending sibling graduation ceremony');
    expect(exeat.departureDate).toBe(todayStr);
    expect(exeat.returnDate).toBe(tomorrowStr);
    expect(exeat.wardenApprovalStatus).toBe('PENDING');
  });

  test('should retrieve student exeat history from database', async () => {
    const history = await ExeatService.getExeatRequestsByStudent(testStudentId);

    expect(history).toBeDefined();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].studentId).toBe(testStudentId);
    expect(history[0].wardenApprovalStatus).toBe('PENDING');
  });

  test('should retrieve pending exeat requests for Warden review', async () => {
    const pendingList = await ExeatService.getPendingExeatRequests();

    expect(pendingList).toBeDefined();
    expect(pendingList.length).toBeGreaterThan(0);
    const item = pendingList.find(p => p.studentId === testStudentId);
    expect(item).toBeDefined();
    expect(item?.wardenApprovalStatus).toBe('PENDING');
  });

  test('should allow Warden to single-tap review and approve exeat request with comment', async () => {
    const pendingList = await ExeatService.getPendingExeatRequests();
    const item = pendingList.find(p => p.studentId === testStudentId);
    expect(item).toBeDefined();

    const reviewedExeat = await ExeatService.reviewExeatRequest({
      exeatId: item!.id,
      wardenId: testWardenId,
      status: 'APPROVED',
      comment: 'Approved for graduation event. Return safely before 6:00 PM.'
    });

    expect(reviewedExeat).toBeDefined();
    expect(reviewedExeat.wardenApprovalStatus).toBe('APPROVED');
    expect(reviewedExeat.wardenId).toBe(testWardenId);
    expect(reviewedExeat.wardenComment).toBe('Approved for graduation event. Return safely before 6:00 PM.');
  });

  test('should verify active approved exeat for student today', async () => {
    const active = await ExeatService.getActiveApprovedExeat(testStudentId, todayStr);

    expect(active).not.toBeNull();
    expect(active?.studentId).toBe(testStudentId);
    expect(active?.wardenApprovalStatus).toBe('APPROVED');
  });

  test('should integrate approved exeat with GatePass curfew verification (11:00 PM)', async () => {
    // Generate dynamic gate pass token for student
    const pass = await GatePassService.generateDynamicGatePass(testStudentId);

    // Verify gate pass at 23:00 (11:00 PM - Curfew hours)
    const verification = await GatePassService.verifyGatePass(pass.tokenString, testPorterId, 'ENTRY', 23);

    expect(verification.accessGranted).toBe(true);
    expect(verification.isValid).toBe(true);
    expect(verification.message).toContain('ACCESS GRANTED');
  });

  test('should manage exeat state operations through useExeatStore', async () => {
    const store = useExeatStore.getState();

    // Test fetchStudentRequests
    await store.fetchStudentRequests(testStudentId);
    const studentRequests = useExeatStore.getState().requests;
    expect(studentRequests.length).toBeGreaterThan(0);

    // Test checkActiveExeat
    const active = await store.checkActiveExeat(testStudentId, todayStr);
    expect(active).not.toBeNull();
    expect(useExeatStore.getState().activeExeat?.id).toBe(active?.id);

    // Test applyForExeat via store
    const newExeat = await store.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '50 Victoria Island, Lagos',
      reason: 'Academic conference participation',
      departureDate: todayStr,
      returnDate: tomorrowStr
    });

    expect(newExeat).toBeDefined();
    expect(useExeatStore.getState().successMessage).toContain('submitted successfully');

    // Test reviewExeatRequest via store (decline second exeat)
    const updated = await store.reviewExeatRequest({
      exeatId: newExeat.id,
      wardenId: testWardenId,
      status: 'DECLINED',
      comment: 'Clashes with scheduled continuous assessment test.'
    });

    expect(updated.wardenApprovalStatus).toBe('DECLINED');
    expect(useExeatStore.getState().successMessage).toContain('declined successfully');

    // Reset store state
    store.resetExeatState();
    expect(useExeatStore.getState().requests).toHaveLength(0);
    expect(useExeatStore.getState().activeExeat).toBeNull();
  });
});
