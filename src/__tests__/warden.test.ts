import { WardenService } from '../api/wardenService';
import { AuthService } from '../api/authService';
import { ClearanceService } from '../api/clearanceService';
import { useWardenStore } from '../store/useWardenStore';

/**
 * Automated Test Suite for Warden Executive Dashboard & Occupancy Metrics [ADMIN-01 through ADMIN-05 / UAT-0078].
 * Tests real-time occupancy metric calculations, queue summary badge counts, pending clearance approvals,
 * and single-tap exeat request reviews using real Turso libSQL SQLite queries without mocks.
 */
describe('WardenService & useWardenStore - Warden Occupancy Metrics & Approval Queue [ADMIN-01 to ADMIN-05 / UAT-0078]', () => {
  const timestamp = Date.now();
  const testWardenId = `warden_test_${timestamp}`;
  const testStudentId = `student_warden_test_${timestamp}`;
  const testExeatId = `exeat_test_${timestamp}`;
  const testHostelId = `hostel_test_${timestamp}`;

  beforeAll(async () => {
    await WardenService.initializeSchema();
    const client = AuthService.getDbClient();

    // Register a test warden
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Dr. J. O. Warden', ?, 'hash123', '08098765432', 'WARDEN', 'MALE', 1)`,
      args: [testWardenId, `WRD/${timestamp}`, `warden_${timestamp}@unilag.edu.ng`]
    });

    // Register a test student and profile with PENDING clearance
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Warden Test Student', ?, 'hash123', '08011122233', 'STUDENT', 'FEMALE', 1)`,
      args: [testStudentId, `MAT/${timestamp}`, `student_w_${timestamp}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Engineering', 'Civil Engineering', 200, 'MAIN_CAMPUS', 'STALLITE', 1, 'PENDING')`,
      args: [testStudentId]
    });

    // Upload clearance documents for student
    await ClearanceService.uploadDocument({
      userId: testStudentId,
      documentType: 'MEDICAL_CERTIFICATE',
      fileUrl: 'https://unilagstay.edu.ng/docs/med.pdf',
      fileName: 'Med.pdf'
    });

    // Seed a hostel and room for occupancy metrics test
    await client.execute({
      sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, ?, 'FEMALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 100, 15)`,
      args: [testHostelId, `Moremi Hall ${timestamp}`]
    });

    // Seed a pending exeat request
    await client.execute({
      sql: `INSERT INTO exeat_requests (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status)
            VALUES (?, ?, '12 Allen Avenue, Ikeja, Lagos', 'Attending family ceremony', '2026-11-01', '2026-11-03', 'PENDING')`,
      args: [testExeatId, testStudentId]
    });
  });

  test('should initialize schema and query hostel occupancy metrics correctly', async () => {
    const metrics = await WardenService.getHostelOccupancyMetrics(testHostelId);

    expect(metrics).toBeDefined();
    expect(metrics.length).toBeGreaterThan(0);
    const hall = metrics.find(m => m.hostelId === testHostelId);
    expect(hall).toBeDefined();
    expect(hall?.hostelName).toBe(`Moremi Hall ${timestamp}`);
    expect(hall?.occupiedBedspaces).toBe(85);
    expect(hall?.totalBedspaces).toBe(100);
    expect(hall?.occupancyPercentage).toBe(85);
  });

  test('should return accurate Warden action queue badge summary counts', async () => {
    const summary = await WardenService.getWardenQueueSummary();

    expect(summary).toBeDefined();
    expect(summary.pendingClearancesCount).toBeGreaterThanOrEqual(1);
    expect(summary.pendingExeatsCount).toBeGreaterThanOrEqual(1);
  });

  test('should retrieve pending clearance submissions for Warden review queue', async () => {
    const pendingList = await WardenService.getPendingClearances();

    expect(pendingList).toBeDefined();
    const item = pendingList.find(p => p.userId === testStudentId);
    expect(item).toBeDefined();
    expect(item?.fullName).toBe('Warden Test Student');
    expect(item?.department).toBe('Civil Engineering');
  });

  test('should retrieve pending exeat requests for Warden permission review', async () => {
    const pendingExeats = await WardenService.getPendingExeats();

    expect(pendingExeats).toBeDefined();
    const exeatItem = pendingExeats.find(e => e.exeatId === testExeatId);
    expect(exeatItem).toBeDefined();
    expect(exeatItem?.studentName).toBe('Warden Test Student');
    expect(exeatItem?.destinationAddress).toBe('12 Allen Avenue, Ikeja, Lagos');
    expect(exeatItem?.status).toBe('PENDING');
  });

  test('should approve exeat request with single-tap action in WardenService', async () => {
    const result = await WardenService.reviewExeatRequest(testExeatId, testWardenId, 'APPROVED');

    expect(result.success).toBe(true);
    expect(result.updatedStatus).toBe('APPROVED');
    expect(result.message).toContain('Exeat departure permission approved');
  });

  test('should approve student clearance package and issue certificate in WardenService', async () => {
    const result = await WardenService.reviewClearancePackage(testStudentId, testWardenId, 'APPROVED');

    expect(result.success).toBe(true);
    expect(result.updatedStatus).toBe('APPROVED');
    expect(result.message).toContain('Student clearance approved successfully');
  });

  test('should load dashboard state and execute reviews via Zustand useWardenStore', async () => {
    const store = useWardenStore.getState();

    await store.fetchDashboardData();

    const updatedStore = useWardenStore.getState();
    expect(updatedStore.isLoading).toBe(false);
    expect(updatedStore.occupancyMetrics.length).toBeGreaterThan(0);
    expect(updatedStore.queueSummary).toBeDefined();
  });
});
