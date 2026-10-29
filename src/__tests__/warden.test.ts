import { createClient } from '@libsql/client';
import { wardenService } from '../api/wardenService';
import { useWardenStore } from '../store/useWardenStore';

/**
 * Unit and UAT test suite for Warden Occupancy Metrics & Approval Queue [ADMIN-01 to ADMIN-04 / UAT-0079].
 * Tests real Turso libSQL Edge SQLite database operations without mocks.
 */
describe('Warden Executive Dashboard & Approval Queue [ADMIN-04 / UAT-0079]', () => {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:unilagstay.db',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  });

  const testHostelId = `hostel_w_test_${Date.now()}`;
  const testHostelName = `Mariere Test Hall ${Date.now()}`;
  const testRoomId = `room_w_test_${Date.now()}`;
  const testStudentId1 = `usr_student_w1_${Date.now()}`;
  const testStudentId2 = `usr_student_w2_${Date.now()}`;
  const testWardenId = `usr_warden_w1_${Date.now()}`;

  beforeAll(async () => {
    await wardenService.initTables();

    // Insert test hostel
    await client.execute({
      sql: `INSERT INTO hostels (id, name, gender_restriction, campus, total_capacity)
            VALUES (?, ?, 'MALE', 'MAIN_CAMPUS', 100)`,
      args: [testHostelId, testHostelName],
    });

    // Insert test room
    await client.execute({
      sql: `INSERT INTO rooms (id, hostel_id, room_number, floor_number, capacity)
            VALUES (?, ?, 'A101', 1, 4)`,
      args: [testRoomId, testHostelId],
    });

    // Insert bedspaces
    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_number, status)
            VALUES (?, ?, 'Bed 1', 'CONFIRMED')`,
      args: [`bed_w1_${Date.now()}`, testRoomId],
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_number, status)
            VALUES (?, ?, 'Bed 2', 'AVAILABLE')`,
      args: [`bed_w2_${Date.now()}`, testRoomId],
    });

    // Insert test student 1 with unique email
    await client.execute({
      sql: `INSERT INTO users (id, matric_number, full_name, email, password_hash, role, created_at)
            VALUES (?, ?, 'Kolawole Adams', ?, 'hashed_pw', 'STUDENT', ?)`,
      args: [testStudentId1, `MAT_${Date.now()}_1`, `kadams_${Date.now()}@unilag.edu.ng`, new Date().toISOString()],
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Engineering', 'Civil Engineering', 400, 'MAIN_CAMPUS', 'STALLITE', 1, 'PENDING_REVIEW')`,
      args: [testStudentId1],
    });

    // Insert clearance document for student 1
    await client.execute({
      sql: `INSERT INTO clearance_documents (id, user_id, doc_type, file_path, status, uploaded_at)
            VALUES (?, ?, 'MEDICAL_CERTIFICATE', '/docs/med_cert.pdf', 'PENDING', ?)`,
      args: [`doc_${Date.now()}`, testStudentId1, new Date().toISOString()],
    });

    // Insert test student 2 for exeat with unique email
    await client.execute({
      sql: `INSERT INTO users (id, matric_number, full_name, email, password_hash, role, created_at)
            VALUES (?, ?, 'Bisi Akande', ?, 'hashed_pw', 'STUDENT', ?)`,
      args: [testStudentId2, `MAT_${Date.now()}_2`, `bakande_${Date.now()}@unilag.edu.ng`, new Date().toISOString()],
    });

    // Insert exeat request for student 2
    await client.execute({
      sql: `INSERT INTO exeat_requests (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status)
            VALUES (?, ?, '12 Allen Avenue, Ikeja', 'Family emergency', '2026-11-01', '2026-11-03', 'PENDING')`,
      args: [`exeat_${Date.now()}`, testStudentId2],
    });
  });

  test('should compute accurate hostel occupancy metrics from Turso database', async () => {
    const metrics = await wardenService.getOccupancyMetrics(testHostelId);
    expect(metrics).toBeDefined();
    expect(metrics.hostelName).toBe(testHostelName);
    expect(metrics.totalBeds).toBe(2);
    expect(metrics.occupiedBeds).toBe(1);
    expect(metrics.allocatedBeds).toBe(1);
    expect(metrics.vacantBeds).toBe(1);
    expect(metrics.percentageOccupied).toBe(50);
  });

  test('should retrieve pending clearance review queue for Warden', async () => {
    const pendingClearances = await wardenService.getPendingClearances();
    expect(pendingClearances.length).toBeGreaterThanOrEqual(1);

    const studentRecord = pendingClearances.find((item) => item.userId === testStudentId1);
    expect(studentRecord).toBeDefined();
    expect(studentRecord?.studentName).toBe('Kolawole Adams');
    expect(studentRecord?.department).toBe('Civil Engineering');
  });

  test('should retrieve pending overnight exeat request queue for Warden', async () => {
    const pendingExeats = await wardenService.getPendingExeatRequests();
    expect(pendingExeats.length).toBeGreaterThanOrEqual(1);

    const exeatRecord = pendingExeats.find((item) => item.studentId === testStudentId2);
    expect(exeatRecord).toBeDefined();
    expect(exeatRecord?.studentName).toBe('Bisi Akande');
    expect(exeatRecord?.reason).toBe('Family emergency');
  });

  test('should process Warden clearance package approval and generate verification certificate hash', async () => {
    const success = await wardenService.reviewClearancePackage({
      userId: testStudentId1,
      wardenId: testWardenId,
      status: 'APPROVED',
      notes: 'All documents verified intact.',
    });

    expect(success).toBe(true);

    // Verify student profile status in SQLite database
    const rs = await client.execute({
      sql: `SELECT clearance_status, clearance_certificate_hash FROM student_profiles WHERE user_id = ?`,
      args: [testStudentId1],
    });

    expect(rs.rows[0].clearance_status).toBe('APPROVED');
    expect(String(rs.rows[0].clearance_certificate_hash)).toMatch(/^CERT-/);
  });

  test('should update exeat request status when Warden grants permission', async () => {
    const pendingExeats = await wardenService.getPendingExeatRequests();
    const exeatItem = pendingExeats.find((item) => item.studentId === testStudentId2);
    expect(exeatItem).toBeDefined();

    const success = await wardenService.reviewExeatRequest({
      exeatId: exeatItem!.exeatId,
      wardenId: testWardenId,
      status: 'APPROVED',
      notes: 'Approved for weekend departure.',
    });

    expect(success).toBe(true);

    const rs = await client.execute({
      sql: `SELECT warden_approval_status, warden_notes FROM exeat_requests WHERE id = ?`,
      args: [exeatItem!.exeatId],
    });

    expect(rs.rows[0].warden_approval_status).toBe('APPROVED');
    expect(rs.rows[0].warden_notes).toBe('Approved for weekend departure.');
  });

  test('should integrate with Zustand useWardenStore state actions', async () => {
    await useWardenStore.getState().fetchDashboardData(testHostelId);
    const state = useWardenStore.getState();

    expect(state.occupancyMetrics).toBeDefined();
    expect(state.occupancyMetrics?.hostelName).toBe(testHostelName);
    expect(state.isLoading).toBe(false);
  });
});
