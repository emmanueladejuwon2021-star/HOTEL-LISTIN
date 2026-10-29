import { AuthService } from '../api/authService';
import { AdminService } from '../api/adminService';
import { useWardenStore } from '../store/useWardenStore';

describe('AdminService & Warden Store - Occupancy Metrics & Approval Queue [ADMIN-05 / UAT-0080]', () => {
  const testWardenId = `usr_warden_${Date.now()}`;
  const testStudentId = `usr_student_warden_test_${Date.now()}`;
  const testMatricNo = `190905${Math.floor(100 + Math.random() * 900)}`;

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await AdminService.initializeSchema();

    const client = AuthService.getDbClient();

    // Seed test Warden user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, 'STAFF-WARDEN-101', 'Dr. Olumide Warden', 'warden101@unilag.edu.ng', '08011112222', 'WARDEN', 'MALE', ?, 1)`,
      args: [testWardenId, AuthService.hashPassword('Secret123!')]
    });

    // Seed test Student user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Adebayo Test Student', 'adebayo@student.unilag.edu.ng', '08033334444', 'STUDENT', 'MALE', ?, 1)`,
      args: [testStudentId, testMatricNo, AuthService.hashPassword('Secret123!')]
    });

    // Seed test Student Profile with PENDING clearance status
    await client.execute({
      sql: `INSERT OR REPLACE INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Science', 'Computer Sciences', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'PENDING', 'PENDING_CHECKIN')`,
      args: [testStudentId]
    });
  });

  test('should calculate real-time occupancy metrics accurately from Turso DB', async () => {
    const metrics = await AdminService.getOccupancyMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.totalCapacity).toBeGreaterThan(0);
    expect(metrics.occupancyRatePercentage).toBeGreaterThanOrEqual(0);
    expect(metrics.occupancyRatePercentage).toBeLessThanOrEqual(100);
    expect(metrics.availableBeds).toBeGreaterThanOrEqual(0);
  });

  test('should retrieve action queue summary with pending clearance count', async () => {
    const summary = await AdminService.getActionQueueSummary();

    expect(summary).toBeDefined();
    expect(summary.pendingClearanceCount).toBeGreaterThanOrEqual(1);
  });

  test('should fetch pending student clearance submissions', async () => {
    const pendingList = await AdminService.getPendingClearances();

    expect(Array.isArray(pendingList)).toBe(true);
    const item = pendingList.find(i => i.studentId === testStudentId);
    expect(item).toBeDefined();
    expect(item?.studentName).toBe('Adebayo Test Student');
    expect(item?.clearanceStatus).toBe('PENDING');
  });

  test('should approve clearance package and update student profile in Turso DB', async () => {
    const result = await AdminService.approveClearancePackage(
      `clr_pkg_${testStudentId}`,
      testWardenId,
      'Medical report and fees verified.'
    );

    expect(result.success).toBe(true);
    expect(result.updatedStatus).toBe('APPROVED');

    // Verify database record status update
    const client = AuthService.getDbClient();
    const profileRes = await client.execute({
      sql: `SELECT clearance_status FROM student_profiles WHERE user_id = ?`,
      args: [testStudentId]
    });

    expect(String(profileRes.rows[0].clearance_status)).toBe('APPROVED');
  });

  test('should reject clearance package with mandatory feedback reason', async () => {
    // Reset student status to PENDING for rejection test
    const client = AuthService.getDbClient();
    await client.execute({
      sql: `UPDATE student_profiles SET clearance_status = 'PENDING' WHERE user_id = ?`,
      args: [testStudentId]
    });

    // Reject clearance
    const result = await AdminService.rejectClearancePackage(
      `clr_pkg_${testStudentId}`,
      testWardenId,
      'Missing authentic UNILAG Health Centre stamp.'
    );

    expect(result.success).toBe(true);
    expect(result.updatedStatus).toBe('REJECTED');

    // Verify DB update
    const profileRes = await client.execute({
      sql: `SELECT clearance_status FROM student_profiles WHERE user_id = ?`,
      args: [testStudentId]
    });

    expect(String(profileRes.rows[0].clearance_status)).toBe('REJECTED');
  });

  test('should require rejection reason when rejecting clearance package', async () => {
    await expect(
      AdminService.rejectClearancePackage(`clr_pkg_${testStudentId}`, testWardenId, '   ')
    ).rejects.toThrow('Rejection feedback reason is mandatory');
  });

  test('should process night exeat approval workflow', async () => {
    const exeatId = `exeat_${Date.now()}`;
    const client = AuthService.getDbClient();

    // Seed pending exeat request
    await client.execute({
      sql: `INSERT INTO exeat_requests (id, student_id, destination_address, departure_date, return_date, reason, warden_approval_status)
            VALUES (?, ?, 'Ikeja, Lagos', '2026-11-01', '2026-11-03', 'Family emergency', 'PENDING')`,
      args: [exeatId, testStudentId]
    });

    const pendingExeats = await AdminService.getPendingExeats();
    const exeatItem = pendingExeats.find(e => e.id === exeatId);
    expect(exeatItem).toBeDefined();

    // Approve exeat
    const result = await AdminService.approveExeatRequest(exeatId, testWardenId, 'Exeat granted.');
    expect(result.success).toBe(true);
    expect(result.updatedStatus).toBe('APPROVED');

    // Verify DB state
    const exeatRes = await client.execute({
      sql: `SELECT warden_approval_status FROM exeat_requests WHERE id = ?`,
      args: [exeatId]
    });
    expect(String(exeatRes.rows[0].warden_approval_status)).toBe('APPROVED');
  });

  test('should verify Zustand store fetch and action state transitions [UAT-0080]', async () => {
    const store = useWardenStore.getState();

    await store.fetchDashboardData();

    const stateAfterFetch = useWardenStore.getState();
    expect(stateAfterFetch.metrics).toBeDefined();
    expect(stateAfterFetch.summary).toBeDefined();
    expect(stateAfterFetch.isLoading).toBe(false);
  });
});
