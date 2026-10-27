import { ExeatService } from '../api/exeatService';
import { AuthService } from '../api/authService';
import { GatePassService } from '../api/gatepassService';

/**
 * Automated Test Suite for Night Exeat Application & Warden Approval [EXEAT-01 through EXEAT-05 / UAT-0062].
 * Tests exeat request submission, input validations, date range verification, emergency contact checks,
 * Warden single-tap approvals and declines, student request cancellations, and gatepass curfew integration
 * using real Turso libSQL SQLite queries without mocks.
 *
 * Includes plain-language English comments for non-technical stakeholders.
 */
describe('ExeatService - Night Exeat Application & Warden Approval [EXEAT-02 / UAT-0062]', () => {
  const testStudentId = `usr_exeat_student_${Date.now()}`;
  const testWardenId = `usr_exeat_warden_${Date.now()}`;
  const testPorterId = `usr_exeat_porter_${Date.now()}`;

  beforeAll(async () => {
    await ExeatService.initializeSchema();
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // Register a test student user and profile
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Test Exeat Student', ?, 'hashed_pass_123', '08012345678', 'STUDENT', 'MALE', 1)`,
      args: [testStudentId, `MAT_EXEAT_${Date.now()}`, `exeat_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Science', 'Computer Science', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [testStudentId]
    });

    // Register Warden user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Test Hall Warden', ?, 'hashed_pass_warden', '08087654321', 'WARDEN', 'MALE', 1)`,
      args: [testWardenId, `STAFF_WARDEN_${Date.now()}`, `warden_${Date.now()}@unilag.edu.ng`]
    });
  });

  test('should initialize schema and fetch empty exeat list for new student', async () => {
    const list = await ExeatService.getExeatsByStudent(testStudentId);

    expect(list).toBeDefined();
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(0);
  });

  test('should reject exeat application with invalid or missing inputs', async () => {
    // Missing destination address
    await expect(ExeatService.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '',
      reason: 'Family visit',
      departureDate: '2026-11-01',
      returnDate: '2026-11-03',
      emergencyContactPhone: '08031234567'
    })).rejects.toThrow('Please provide a complete destination address');

    // Return date earlier than departure date
    await expect(ExeatService.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '15 Ikeja Street, Lagos',
      reason: 'Family visit',
      departureDate: '2026-11-05',
      returnDate: '2026-11-01',
      emergencyContactPhone: '08031234567'
    })).rejects.toThrow('Expected return date cannot be earlier than departure date');

    // Short emergency phone number
    await expect(ExeatService.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '15 Ikeja Street, Lagos',
      reason: 'Family visit',
      departureDate: '2026-11-01',
      returnDate: '2026-11-03',
      emergencyContactPhone: '080312'
    })).rejects.toThrow('Please provide a valid emergency contact phone number');
  });

  test('should successfully submit a valid night exeat application', async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const req = await ExeatService.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '24 Admiralty Way, Lekki Phase 1, Lagos',
      reason: 'Family wedding ceremony',
      departureDate: todayStr,
      returnDate: todayStr,
      emergencyContactPhone: '08031234567'
    });

    expect(req).toBeDefined();
    expect(req.id).toContain('exeat_');
    expect(req.studentId).toBe(testStudentId);
    expect(req.destinationAddress).toBe('24 Admiralty Way, Lekki Phase 1, Lagos');
    expect(req.reason).toBe('Family wedding ceremony');
    expect(req.wardenApprovalStatus).toBe('PENDING');

    const studentList = await ExeatService.getExeatsByStudent(testStudentId);
    expect(studentList).toHaveLength(1);
    expect(studentList[0].id).toBe(req.id);
  });

  test('should list pending exeat applications in Warden queue', async () => {
    const pendingList = await ExeatService.getPendingExeatsForWarden('PENDING');

    expect(pendingList).toBeDefined();
    expect(pendingList.length).toBeGreaterThan(0);
    const myReq = pendingList.find(r => r.studentId === testStudentId);
    expect(myReq).toBeDefined();
    expect(myReq?.reason).toBe('Family wedding ceremony');
  });

  test('should allow Warden to approve exeat application with optional remark', async () => {
    const pendingList = await ExeatService.getPendingExeatsForWarden('PENDING');
    const myReq = pendingList.find(r => r.studentId === testStudentId)!;

    const reviewed = await ExeatService.reviewExeat({
      exeatId: myReq.id,
      wardenId: testWardenId,
      status: 'APPROVED',
      comments: 'Approved. Take safety precautions.'
    });

    expect(reviewed.wardenApprovalStatus).toBe('APPROVED');
    expect(reviewed.wardenId).toBe(testWardenId);
    expect(reviewed.wardenComments).toBe('Approved. Take safety precautions.');
    expect(reviewed.reviewedAt).toBeDefined();
  });

  test('should permit gate entry during curfew hours (23:00) when exeat is approved', async () => {
    const token = await GatePassService.generateDynamicGatePass(testStudentId, 300);

    // Simulate gate pass verification at 23:00 curfew hour
    const result = await GatePassService.verifyGatePass(token.tokenString, testPorterId, 'ENTRY', 23);

    expect(result.accessGranted).toBe(true);
    expect(result.accessStatus).toBe('GRANTED');
    expect(result.message).toContain('ACCESS GRANTED');
  });

  test('should allow student to submit and cancel a pending exeat request', async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const newReq = await ExeatService.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '10 Yaba Road, Lagos',
      reason: 'Academic workshop',
      departureDate: todayStr,
      returnDate: todayStr,
      emergencyContactPhone: '08039998877'
    });

    expect(newReq.wardenApprovalStatus).toBe('PENDING');

    const cancelSuccess = await ExeatService.cancelExeat(newReq.id, testStudentId);
    expect(cancelSuccess).toBe(true);

    const studentList = await ExeatService.getExeatsByStudent(testStudentId);
    const cancelledReq = studentList.find(r => r.id === newReq.id);
    expect(cancelledReq?.wardenApprovalStatus).toBe('CANCELLED');
  });

  test('should allow Warden to decline an exeat request with reason', async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const newReq = await ExeatService.applyForExeat({
      studentId: testStudentId,
      destinationAddress: '55 Ikeja Crescent, Lagos',
      reason: 'Unspecified party',
      departureDate: todayStr,
      returnDate: todayStr,
      emergencyContactPhone: '08031112233'
    });

    const declined = await ExeatService.reviewExeat({
      exeatId: newReq.id,
      wardenId: testWardenId,
      status: 'DECLINED',
      comments: 'Reason provided is insufficiently clear.'
    });

    expect(declined.wardenApprovalStatus).toBe('DECLINED');
    expect(declined.wardenComments).toBe('Reason provided is insufficiently clear.');
  });
});
