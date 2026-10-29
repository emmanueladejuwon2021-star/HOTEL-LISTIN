import { DisciplinaryService } from '../api/disciplinaryService';
import { AuthService } from '../api/authService';

describe('DisciplinaryService - Student Disciplinary Flagging & Blacklists [ADMIN-02 / UAT-0082]', () => {
  const testStudentId = 'usr_stu_disc_test_1';
  const testWardenId = 'usr_warden_disc_test_1';

  beforeAll(async () => {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean up test data
    await client.execute({ sql: 'DELETE FROM disciplinary_records WHERE user_id = ?', args: [testStudentId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?)', args: [testStudentId, testWardenId] });

    // Seed test users (Student & Warden)
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, '190408099', 'Disciplinary Test Student', 'disc_stu@unilag.edu.ng', '08011112222', 'STUDENT', 'MALE', 'hash123')`,
      args: [testStudentId]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Engineering', 'Electrical Eng', 400, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [testStudentId]
    });

    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, 'STAFF_WAR_001', 'Prof. Warden Disciplinary', 'warden_disc@unilag.edu.ng', '08033334444', 'WARDEN', 'MALE', 'hash123')`,
      args: [testWardenId]
    });
  });

  afterAll(async () => {
    const client = AuthService.getDbClient();
    await client.execute({ sql: 'DELETE FROM disciplinary_records WHERE user_id = ?', args: [testStudentId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?)', args: [testStudentId, testWardenId] });
  });

  test('returns default CLEARED standing for student with no prior infractions', async () => {
    const standing = await DisciplinaryService.getStudentStanding(testStudentId);
    expect(standing.status).toBe('CLEARED');
    expect(standing.userId).toBe(testStudentId);
    expect(standing.studentName).toBe('Disciplinary Test Student');
  });

  test('successfully flags a student for noise disturbance (UAT-0082)', async () => {
    const result = await DisciplinaryService.flagStudent({
      userId: testStudentId,
      status: 'FLAGGED',
      reason: 'Late night noise disturbance in Jaja Hall Room 204',
      wardenId: testWardenId
    });

    expect(result.status).toBe('FLAGGED');
    expect(result.reason).toContain('Late night noise disturbance');
    expect(result.studentName).toBe('Disciplinary Test Student');
  });

  test('queries active disciplinary records filtered by status and search query', async () => {
    const records = await DisciplinaryService.getDisciplinaryRecords('FLAGGED', 'Disciplinary');
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].userId).toBe(testStudentId);
    expect(records[0].status).toBe('FLAGGED');
  });

  test('updates student status to SUSPENDED upon severe infraction', async () => {
    const result = await DisciplinaryService.flagStudent({
      userId: testStudentId,
      status: 'SUSPENDED',
      reason: 'Unauthorized hostel bedspace resale violation',
      wardenId: testWardenId
    });

    expect(result.status).toBe('SUSPENDED');
    expect(result.reason).toContain('bedspace resale');
  });

  test('lifts active sanction when warden approves resolution and adds notes', async () => {
    const result = await DisciplinaryService.liftDisciplinaryFlag({
      userId: testStudentId,
      wardenId: testWardenId,
      resolutionNotes: 'Disciplinary hearing completed. Student issued formal warning and cleared.'
    });

    expect(result.status).toBe('CLEARED');
    expect(result.resolutionNotes).toContain('Disciplinary hearing completed');
  });
});
