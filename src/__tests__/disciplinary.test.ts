/**
 * Disciplinary Integration & UAT Test Suite
 * Target Module: [ADMIN-03] Student Disciplinary Flagging & Blacklists (Issue #83)
 * Verification: UAT-0083 / UAT-024 / UAT-049
 */

import { AuthService } from '../api/authService';
import { DisciplinaryService } from '../api/disciplinaryService';
import { EligibilityService } from '../api/eligibilityService';

describe('DisciplinaryService - Student Flagging & Blacklists [ADMIN-03]', () => {
  const testWardenId = 'WARDEN-TEST-001';
  const testStudentUserId = 'USER-STU-DISC-99';
  const testMatric = '200805099';

  beforeAll(async () => {
    await DisciplinaryService.initializeTables();
  });

  beforeEach(async () => {
    const client = AuthService.getDbClient();

    // Clear test tables
    await client.execute({ sql: `DELETE FROM disciplinary_records`, args: [] });
    await client.execute({ sql: `DELETE FROM student_profiles WHERE user_id = ?`, args: [testStudentUserId] });
    await client.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [testStudentUserId] });

    // Seed test student user record with proper schema columns
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active, created_at)
            VALUES (?, ?, 'Adebayo Ogunlesi', 'discstudent@unilag.edu.ng', '08012345678', 'STUDENT', 'MALE', 'hash123', 1, datetime('now'))`,
      args: [testStudentUserId, testMatric],
    });

    // Seed test student profile record
    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid)
            VALUES (?, 'Engineering', 'Mechanical Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1)`,
      args: [testStudentUserId],
    });
  });

  test('[UAT-0083] searchStudents should return student profiles matching matric number or full name', async () => {
    const resultsByMatric = await DisciplinaryService.searchStudents('200805099');
    expect(resultsByMatric.length).toBeGreaterThan(0);
    expect(resultsByMatric[0].userId).toBe(testStudentUserId);
    expect(resultsByMatric[0].fullName).toBe('Adebayo Ogunlesi');
    expect(resultsByMatric[0].currentStatus).toBe('CLEARED');

    const resultsByName = await DisciplinaryService.searchStudents('Ogunlesi');
    expect(resultsByName.length).toBeGreaterThan(0);
    expect(resultsByName[0].userId).toBe(testStudentUserId);
  });

  test('[UAT-0083] issueDisciplinarySanction should log sanction and block student balloting eligibility', async () => {
    // 1. Issue SUSPENDED sanction
    const result = await DisciplinaryService.issueDisciplinarySanction({
      userId: testStudentUserId,
      status: 'SUSPENDED',
      reason: 'Unauthorized access attempt to female hostel wing',
      durationDays: 30,
      wardenId: testWardenId,
    });

    expect(result).toBe(true);

    // 2. Check student history
    const history = await DisciplinaryService.getStudentDisciplinaryHistory(testStudentUserId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].status).toBe('SUSPENDED');
    expect(history[0].reason).toBe('Unauthorized access attempt to female hostel wing');
    expect(history[0].durationDays).toBe(30);

    // 3. Verify student search reflects active SUSPENDED status
    const searchRes = await DisciplinaryService.searchStudents(testMatric);
    expect(searchRes[0].currentStatus).toBe('SUSPENDED');

    // 4. Verify eligibility check blocks suspended student
    const eligibility = await EligibilityService.verifyEligibility(testStudentUserId);
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.disciplinaryStatus).toBe('SUSPENDED');
  });

  test('[UAT-0083] revokeDisciplinarySanction should set status to CLEARED and restore eligibility', async () => {
    // 1. Issue sanction
    await DisciplinaryService.issueDisciplinarySanction({
      userId: testStudentUserId,
      status: 'FLAGGED',
      reason: 'Noise disturbance in quiet hours',
      durationDays: 7,
      wardenId: testWardenId,
    });

    // Verify initially flagged
    let searchRes = await DisciplinaryService.searchStudents(testMatric);
    expect(searchRes[0].currentStatus).toBe('FLAGGED');

    // 2. Revoke sanction
    const revokeRes = await DisciplinaryService.revokeDisciplinarySanction({
      userId: testStudentUserId,
      wardenId: testWardenId,
      reason: 'First time offender apology accepted',
    });

    expect(revokeRes).toBe(true);

    // 3. Verify status cleared in search
    searchRes = await DisciplinaryService.searchStudents(testMatric);
    expect(searchRes[0].currentStatus).toBe('CLEARED');

    // 4. Verify history log contains resolution entry
    const history = await DisciplinaryService.getStudentDisciplinaryHistory(testStudentUserId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].status).toBe('CLEARED');

    // 5. Verify eligibility restored
    const eligibility = await EligibilityService.verifyEligibility(testStudentUserId);
    expect(eligibility.disciplinaryStatus).toBe('CLEARED');
  });

  test('[UAT-0083] getDisciplinaryMetrics should return aggregated active sanction counts', async () => {
    // Issue sanctions against test student
    await DisciplinaryService.issueDisciplinarySanction({
      userId: testStudentUserId,
      status: 'RUSTICATED',
      reason: 'Major disciplinary violation',
      wardenId: testWardenId,
    });

    const metrics = await DisciplinaryService.getDisciplinaryMetrics();
    expect(metrics.totalRusticated).toBeGreaterThanOrEqual(1);
    expect(metrics.totalActiveSanctions).toBeGreaterThanOrEqual(1);
  });
});
