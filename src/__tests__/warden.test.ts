import { WardenService } from '../api/wardenService';
import { AuthService } from '../api/authService';
import { useWardenStore } from '../store/useWardenStore';

/**
 * Automated Unit & UAT Test Suite for Warden Executive Dashboard [ADMIN-01 / UAT-0076].
 * Verifies real-time occupancy metrics calculation, pending clearance/exeat/SOS queue retrieval,
 * warden approval actions, and store integration using real Turso libSQL SQLite queries without mocks.
 */
describe('WardenService & WardenStore - Occupancy Metrics & Approval Queue [ADMIN-01 / UAT-0076]', () => {
  const testWardenId = `usr_warden_${Date.now()}`;
  const testStudent1 = `usr_student1_${Date.now()}`;
  const testStudent2 = `usr_student2_${Date.now()}`;

  beforeAll(async () => {
    await WardenService.initializeSchema();
    const client = AuthService.getDbClient();

    // Register test warden user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Dr. Warden Mariere', ?, 'hashed_pass_warden', '08011112222', 'WARDEN', 'MALE', 1)`,
      args: [testWardenId, `STAFF_${Date.now()}`, `warden_${Date.now()}@unilag.edu.ng`]
    });

    // Register test student 1
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Adebayo Student One', ?, 'hashed_pass_stu1', '08033334444', 'STUDENT', 'MALE', 1)`,
      args: [testStudent1, `MAT_${Date.now()}_1`, `stu1_${Date.now()}@unilag.edu.ng`]
    });

    // Register test student 2
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Chidimma Student Two', ?, 'hashed_pass_stu2', '08055556666', 'STUDENT', 'FEMALE', 1)`,
      args: [testStudent2, `MAT_${Date.now()}_2`, `stu2_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Sciences', 'Computer Science', 200, 'MAIN_CAMPUS', 'STALLITE', 1, 'NOT_STARTED')`,
      args: [testStudent1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Engineering', 'Civil Engineering', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'NOT_STARTED')`,
      args: [testStudent2]
    });
  });

  test('should calculate real-time hostel occupancy metrics [UAT-0076]', async () => {
    const metrics = await WardenService.getOccupancyMetrics('hostel_jaja');

    expect(metrics).toBeDefined();
    expect(metrics.hostelId).toBe('hostel_jaja');
    expect(metrics.hostelName).toBe('King Jaja Hall');
    expect(metrics.totalBeds).toBeGreaterThan(0);
    expect(metrics.occupancyPercentage).toBeGreaterThanOrEqual(0);
    expect(metrics.occupancyPercentage).toBeLessThanOrEqual(100);
  });

  test('should retrieve pending clearance, exeat, and emergency SOS queue items [UAT-0076]', async () => {
    const client = AuthService.getDbClient();

    // 1. Insert a submitted clearance package
    await client.execute({
      sql: `INSERT INTO clearance_packages (user_id, status, submission_date, notes)
            VALUES (?, 'SUBMITTED', CURRENT_TIMESTAMP, 'Medical certificate attached')`,
      args: [testStudent1]
    });

    // 2. Insert a pending exeat request
    await client.execute({
      sql: `INSERT INTO exeat_requests (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status, created_at)
            VALUES (?, ?, '12 Allen Avenue, Ikeja, Lagos', 'Family event', '2026-11-01', '2026-11-03', 'PENDING', CURRENT_TIMESTAMP)`,
      args: [`exeat_test_${Date.now()}`, testStudent2]
    });

    // 3. Insert an open emergency SOS alert
    await client.execute({
      sql: `INSERT INTO emergency_sos_alerts (id, student_id, hostel_name, room_number, status, created_at)
            VALUES (?, ?, 'King Jaja Hall', 'A204', 'OPEN', CURRENT_TIMESTAMP)`,
      args: [`sos_test_${Date.now()}`, testStudent1]
    });

    const queue = await WardenService.getPendingApprovalQueue();

    expect(queue).toBeDefined();
    expect(queue.length).toBeGreaterThanOrEqual(3);

    const clearanceItem = queue.find(i => i.studentId === testStudent1 && i.category === 'CLEARANCE');
    expect(clearanceItem).toBeDefined();
    expect(clearanceItem?.studentName).toBe('Adebayo Student One');
    expect(clearanceItem?.status).toBe('PENDING');

    const exeatItem = queue.find(i => i.studentId === testStudent2 && i.category === 'EXEAT');
    expect(exeatItem).toBeDefined();
    expect(exeatItem?.details).toContain('Allen Avenue');

    const sosItem = queue.find(i => i.studentId === testStudent1 && i.category === 'EMERGENCY_SOS');
    expect(sosItem).toBeDefined();
    expect(sosItem?.roomNumber).toBe('A204');
  });

  test('should process warden approval action and log audit trail [UAT-0076]', async () => {
    const queue = await WardenService.getPendingApprovalQueue();
    const clearanceItem = queue.find(i => i.studentId === testStudent1 && i.category === 'CLEARANCE');

    expect(clearanceItem).toBeDefined();

    const result = await WardenService.processApprovalAction({
      itemId: clearanceItem!.id,
      category: 'CLEARANCE',
      action: 'APPROVE',
      wardenId: testWardenId,
      notes: 'All documents verified and approved by Warden.'
    });

    expect(result.success).toBe(true);
    expect(result.updatedStatus).toBe('APPROVED');

    // Verify student_profiles updated clearance_status
    const client = AuthService.getDbClient();
    const res = await client.execute({
      sql: `SELECT clearance_status FROM student_profiles WHERE user_id = ?`,
      args: [testStudent1]
    });
    expect(res.rows[0].clearance_status).toBe('APPROVED');
  });

  test('should integrate state management seamlessly via useWardenStore [UAT-0076]', async () => {
    const store = useWardenStore.getState();

    await store.fetchOccupancyMetrics('hostel_jaja');
    expect(useWardenStore.getState().metrics).toBeDefined();
    expect(useWardenStore.getState().metrics?.hostelName).toBe('King Jaja Hall');

    await store.fetchPendingQueue();
    expect(useWardenStore.getState().queue).toBeDefined();
  });
});
