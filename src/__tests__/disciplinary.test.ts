import { AuthService } from '../api/authService';
import { DisciplinaryService } from '../api/disciplinaryService';
import { EligibilityService } from '../api/eligibilityService';
import { GatePassService } from '../api/gatepassService';

describe('DisciplinaryService & UAT-0085 Student Disciplinary Flagging & Blacklists', () => {
  const testWardenId = 'WARDEN_TEST_USER_001';
  const testStudentId = 'STUDENT_DISC_TEST_001';
  const testMatricNo = '190407099';

  beforeAll(async () => {
    // Initialize schema tables
    await AuthService.initializeSchema();
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean up test users and records by user_id and matric_or_staff_no
    await client.execute({ sql: 'DELETE FROM disciplinary_records WHERE user_id = ?', args: [testStudentId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?) OR matric_or_staff_no IN (?, ?)', args: [testStudentId, testWardenId, testMatricNo, 'STAFF_WARDEN_01'] });

    // Seed test Warden user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, 'STAFF_WARDEN_01', 'Dr. Hall Warden', 'warden@unilag.edu.ng', '08011112222', 'WARDEN', 'MALE', 'hash123')`,
      args: [testWardenId]
    });

    // Seed test Student user and profile
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, ?, 'John Disciplinary Student', 'johndisc@student.unilag.edu.ng', '08033334444', 'STUDENT', 'MALE', 'hash123')`,
      args: [testStudentId, testMatricNo]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Engineering', 'Civil Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [testStudentId]
    });
  });

  afterAll(async () => {
    const client = AuthService.getDbClient();
    await client.execute({ sql: 'DELETE FROM disciplinary_records WHERE user_id = ?', args: [testStudentId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?) OR matric_or_staff_no IN (?, ?)', args: [testStudentId, testWardenId, testMatricNo, 'STAFF_WARDEN_01'] });
  });

  test('successfully initializes disciplinary_records table in Turso DB', async () => {
    await expect(DisciplinaryService.initializeSchema()).resolves.not.toThrow();
  });

  test('warden can apply disciplinary FLAGGED status to student', async () => {
    const record = await DisciplinaryService.flagStudent({
      matricOrStaffNo: testMatricNo,
      status: 'FLAGGED',
      reason: 'Late night noise disturbance in Jaja Hall Block B',
      wardenId: testWardenId
    });

    expect(record).toBeDefined();
    expect(record.userId).toBe(testStudentId);
    expect(record.status).toBe('FLAGGED');
    expect(record.reason).toContain('Late night noise disturbance');
    expect(record.matricOrStaffNo).toBe(testMatricNo);
  });

  test('retrieves student disciplinary history', async () => {
    const record = await DisciplinaryService.getStudentDisciplinaryHistory(testStudentId);
    expect(record).not.toBeNull();
    expect(record?.status).toBe('FLAGGED');
    expect(record?.fullName).toBe('John Disciplinary Student');
  });

  test('[UAT-0085] warden enforces SUSPENDED status and verifies gate scanner blocks access', async () => {
    // 1. Warden issues suspension for vandalism
    const record = await DisciplinaryService.flagStudent({
      matricOrStaffNo: testMatricNo,
      status: 'SUSPENDED',
      reason: 'Hostel property vandalism and rule violation',
      wardenId: testWardenId
    });

    expect(record.status).toBe('SUSPENDED');

    // 2. Eligibility service reflects ineligible status due to disciplinary suspension
    const eligibility = await EligibilityService.verifyEligibility(testStudentId);
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.disciplinaryStatus).toBe('SUSPENDED');

    // 3. Gatekeeper scanner verification denies gate access for suspended student
    const pass = await GatePassService.generateDynamicGatePass(testStudentId);
    const gateCheck = await GatePassService.verifyGatePass(pass.tokenString, 'PORTER_TEST_01', 'ENTRY', 14);

    expect(gateCheck.accessGranted).toBe(false);
    expect(gateCheck.reason).toContain('SUSPENDED');
  });

  test('warden can search and filter disciplinary records list', async () => {
    const allSuspended = await DisciplinaryService.getDisciplinaryRecords({ status: 'SUSPENDED' });
    expect(allSuspended.length).toBeGreaterThan(0);
    expect(allSuspended[0].matricOrStaffNo).toBe(testMatricNo);

    const searchResult = await DisciplinaryService.getDisciplinaryRecords({ searchQuery: 'vandalism' });
    expect(searchResult.length).toBeGreaterThan(0);
    expect(searchResult[0].userId).toBe(testStudentId);
  });

  test('warden can clear disciplinary sanctions and revert student standing to CLEARED', async () => {
    const clearedRecord = await DisciplinaryService.clearDisciplinaryFlag(testStudentId, testWardenId);
    expect(clearedRecord.status).toBe('CLEARED');

    const eligibility = await EligibilityService.verifyEligibility(testStudentId);
    expect(eligibility.disciplinaryStatus).toBe('CLEARED');
  });
});
