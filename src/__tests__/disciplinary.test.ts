import { DisciplinaryService } from '../api/disciplinaryService';
import { AuthService } from '../api/authService';
import { useDisciplinaryStore } from '../store/useDisciplinaryStore';

describe('Student Disciplinary Flagging & Blacklists [ADMIN-01 / Issue #81 / UAT-0081]', () => {
  const testStudentId = `usr_std_disc_test_${Date.now()}`;
  const testMatricNo = `210905999_${Math.floor(Math.random() * 1000)}`;
  const testWardenId = `usr_warden_disc_${Date.now()}`;
  const hashedPassword = AuthService.hashPassword('password123');

  beforeAll(async () => {
    await DisciplinaryService.initializeSchema();
    const client = AuthService.getDbClient();

    // Create test user and student profile in Turso DB
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Disciplinary Test Student', ?, '08011112222', 'STUDENT', 'MALE', ?, 1)`,
      args: [testStudentId, testMatricNo, `${testStudentId}@unilag.edu.ng`, hashedPassword]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Engineering', 'Electrical Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED')`,
      args: [testStudentId]
    });
  });

  afterAll(async () => {
    const client = AuthService.getDbClient();
    await client.execute({ sql: `DELETE FROM disciplinary_records WHERE user_id = ?`, args: [testStudentId] });
    await client.execute({ sql: `DELETE FROM student_profiles WHERE user_id = ?`, args: [testStudentId] });
    await client.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [testStudentId] });
  });

  test('should initialize disciplinary schema without errors', async () => {
    await expect(DisciplinaryService.initializeSchema()).resolves.not.toThrow();
  });

  test('should return default CLEARED status for student without existing sanctions', async () => {
    const record = await DisciplinaryService.getDisciplinaryRecord(testStudentId);
    expect(record.userId).toBe(testStudentId);
    expect(record.status).toBe('CLEARED');
    expect(record.fullName).toBe('Disciplinary Test Student');
    expect(record.matricNo).toBe(testMatricNo);
  });

  test('should flag student violation and persist FLAGGED status in Turso DB', async () => {
    const reason = 'Hostel rule violation: Unauthorized electrical cooking appliance in room.';
    const record = await DisciplinaryService.flagStudent(testStudentId, 'FLAGGED', reason, testWardenId);

    expect(record.userId).toBe(testStudentId);
    expect(record.status).toBe('FLAGGED');
    expect(record.reason).toBe(reason);
    expect(record.flaggedByWardenId).toBe(testWardenId);

    // Verify record in database
    const dbRecord = await DisciplinaryService.getDisciplinaryRecord(testStudentId);
    expect(dbRecord.status).toBe('FLAGGED');
    expect(dbRecord.reason).toBe(reason);
  });

  test('should suspend student hall access and persist SUSPENDED status', async () => {
    const reason = 'Physical altercation at hostel gatehouse.';
    const record = await DisciplinaryService.flagStudent(testStudentId, 'SUSPENDED', reason, testWardenId);

    expect(record.status).toBe('SUSPENDED');
    expect(record.reason).toBe(reason);

    const dbRecord = await DisciplinaryService.getDisciplinaryRecord(testStudentId);
    expect(dbRecord.status).toBe('SUSPENDED');
  });

  test('should throw error when attempting to flag student without a violation reason', async () => {
    await expect(
      DisciplinaryService.flagStudent(testStudentId, 'FLAGGED', '   ', testWardenId)
    ).rejects.toThrow('A detailed reason or violation description is required');
  });

  test('should retrieve filtered disciplinary list matching FLAGGED / SUSPENDED status', async () => {
    const list = await DisciplinaryService.getDisciplinaryList('SUSPENDED');
    expect(list.length).toBeGreaterThan(0);
    const found = list.find((item) => item.userId === testStudentId);
    expect(found).toBeDefined();
    expect(found?.status).toBe('SUSPENDED');
  });

  test('should search disciplinary list by matric number', async () => {
    const list = await DisciplinaryService.getDisciplinaryList('ALL', testMatricNo);
    expect(list.length).toBe(1);
    expect(list[0].userId).toBe(testStudentId);
  });

  test('should clear student disciplinary status back to CLEARED', async () => {
    const cleared = await DisciplinaryService.clearDisciplinaryStatus(
      testStudentId,
      testWardenId,
      'Sanction completed and student counseled by Hall Warden'
    );

    expect(cleared.status).toBe('CLEARED');
    expect(cleared.reason).toBe('Sanction completed and student counseled by Hall Warden');

    const dbRecord = await DisciplinaryService.getDisciplinaryRecord(testStudentId);
    expect(dbRecord.status).toBe('CLEARED');
  });

  test('should manage store state transitions in useDisciplinaryStore', async () => {
    const store = useDisciplinaryStore.getState();

    // Fetch list
    await store.fetchDisciplinaryList('ALL', testMatricNo);
    expect(useDisciplinaryStore.getState().records.length).toBe(1);

    // Flag via store
    await store.flagStudentRecord(testStudentId, 'FLAGGED', 'Store test violation', testWardenId);
    expect(useDisciplinaryStore.getState().successMessage).toContain('Successfully updated');

    // Clear via store
    await store.clearDisciplinaryRecord(testStudentId, testWardenId, 'Store clearance remark');
    expect(useDisciplinaryStore.getState().successMessage).toContain('Successfully cleared');
  });
});
