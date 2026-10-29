import { AuthService } from '../api/authService';
import { DisciplinaryService } from '../api/disciplinaryService';
import { EligibilityService } from '../api/eligibilityService';

describe('DisciplinaryService & Warden Governance [ADMIN-04 / UAT-0084]', () => {
  const testWardenId = `usr_warden_disc_${Date.now()}`;
  const testStudentId = `usr_student_disc_${Date.now()}`;
  const testMatricNo = `200905${Math.floor(1000 + Math.random() * 9000)}`;

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean up test records
    await client.execute({ sql: `DELETE FROM users WHERE id IN (?, ?)`, args: [testWardenId, testStudentId] });
    await client.execute({ sql: `DELETE FROM disciplinary_records WHERE user_id = ?`, args: [testStudentId] });

    // Seed Warden User
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, password_hash, role, gender, is_active)
            VALUES (?, 'STAFF_WARDEN_01', 'Dr. Warden Admin', 'warden_test@unilag.edu.ng', '08011223344', 'hash123', 'WARDEN', 'MALE', 1)`,
      args: [testWardenId]
    });

    // Seed Student User & Profile
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, password_hash, role, gender, is_active)
            VALUES (?, ?, 'Disciplinary Test Student', 'student_disc@unilag.edu.ng', '08099887766', 'hash123', 'STUDENT', 'MALE', 1)`,
      args: [testStudentId, testMatricNo]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Science', 'Computer Science', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [testStudentId]
    });
  });

  afterAll(async () => {
    const client = AuthService.getDbClient();
    await client.execute({ sql: `DELETE FROM users WHERE id IN (?, ?)`, args: [testWardenId, testStudentId] });
    await client.execute({ sql: `DELETE FROM disciplinary_records WHERE user_id = ?`, args: [testStudentId] });
    await client.execute({ sql: `DELETE FROM disciplinary_audit_logs WHERE user_id = ?`, args: [testStudentId] });
  });

  test('searchStudents finds student by matric number or name', async () => {
    const results = await DisciplinaryService.searchStudents(testMatricNo);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].userId).toBe(testStudentId);
    expect(results[0].fullName).toBe('Disciplinary Test Student');
    expect(results[0].currentDisciplinaryStatus).toBe('CLEARED');
  });

  test('issueSanction applies SUSPENDED sanction and updates eligibility status', async () => {
    const updated = await DisciplinaryService.issueSanction({
      wardenId: testWardenId,
      studentUserId: testStudentId,
      status: 'SUSPENDED',
      reason: 'Hostel rule violation - Unauthorized noise & property damage',
      durationDays: 14
    });

    expect(updated.currentDisciplinaryStatus).toBe('SUSPENDED');
    expect(updated.currentReason).toContain('Hostel rule violation');

    // Verify EligibilityService registers student as ineligible due to disciplinary standing
    const eligibility = await EligibilityService.verifyEligibility(testStudentId);
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.disciplinaryStatus).toBe('SUSPENDED');
  });

  test('getActiveBlacklist includes suspended student', async () => {
    const blacklist = await DisciplinaryService.getActiveBlacklist();
    const found = blacklist.find((s) => s.userId === testStudentId);
    expect(found).toBeDefined();
    expect(found?.currentDisciplinaryStatus).toBe('SUSPENDED');
  });

  test('getSummaryMetrics accurately reflects active sanctions count', async () => {
    const metrics = await DisciplinaryService.getSummaryMetrics();
    expect(metrics.totalActiveSanctions).toBeGreaterThan(0);
    expect(metrics.totalSuspendedCount).toBeGreaterThan(0);
  });

  test('clearSanction restores student standing to CLEARED and re-enables eligibility', async () => {
    const cleared = await DisciplinaryService.clearSanction({
      wardenId: testWardenId,
      studentUserId: testStudentId,
      clearanceNote: 'Student served 14-day suspension and submitted apology letter.'
    });

    expect(cleared.currentDisciplinaryStatus).toBe('CLEARED');

    // Verify EligibilityService reflects restored eligibility
    const eligibility = await EligibilityService.verifyEligibility(testStudentId);
    expect(eligibility.disciplinaryStatus).toBe('CLEARED');
    expect(eligibility.isEligible).toBe(true);
  });

  test('getAuditLogs returns chronological history entries for student', async () => {
    const logs = await DisciplinaryService.getAuditLogs(testStudentId);
    expect(logs.length).toBeGreaterThanOrEqual(2); // One sanction issued, one cleared
    expect(logs[0].wardenId).toBe(testWardenId);
  });
});
