/**
 * Emergency SOS & Security Alert Automated Test Suite
 *
 * Verifies Issue #70 / [EMERGENCY-05] and scenario UAT-0070 acceptance criteria:
 * - Turso libSQL Database schema DDL creation for emergency_alerts & emergency_hotlines
 * - Panic SOS alert creation and status transitions (ACTIVE -> RESOLVED/CANCELLED)
 * - Emergency campus hotline directory lookup and campus filtering
 * - Global Zustand store actions (triggerSOS, cancelActiveAlert, fetchHotlines)
 */

import { AuthService } from '../api/authService';
import { PaymentService } from '../api/paymentService';
import { EmergencyService } from '../api/emergencyService';
import { useEmergencyStore } from '../store/useEmergencyStore';

describe('[EMERGENCY-05 / UAT-0070] Emergency Panic SOS Trigger & Porter Alarm System', () => {
  const timestamp = Date.now();
  const testStudentId = `student_sos_${timestamp}`;
  const testMatricNo = `MAT${timestamp.toString().slice(-8)}`;
  const testEmail = `sos_${timestamp}@unilag.edu.ng`;
  const testHostelId = `hostel_jaja_${timestamp}`;
  const testRoomNumber = 'Room 302';

  beforeAll(async () => {
    // Initialize Turso DB tables across auth, hostels, and emergency
    await AuthService.initializeSchema();
    await PaymentService.initializeSchema();
    await EmergencyService.initializeSchema();

    // Create test student user and hostel
    const client = AuthService.getDbClient();
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, password_hash, role, full_name, matric_or_staff_no, phone_number, gender, is_active)
            VALUES (?, ?, 'hash123', 'STUDENT', 'SOS Test Student', ?, '+2348001112233', 'MALE', 1)`,
      args: [testStudentId, testEmail, testMatricNo]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, ?, 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 1000, 500)`,
      args: [testHostelId, `King Jaja Hall ${timestamp}`]
    });
  });

  afterEach(() => {
    useEmergencyStore.getState().clearMessages();
  });

  test('UAT-0070: EmergencyService schema initialization creates required tables & seeds default hotlines', async () => {
    const client = AuthService.getDbClient();

    // Verify emergency_alerts table exists
    const alertTableCheck = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='emergency_alerts'`,
      args: []
    });
    expect(alertTableCheck.rows.length).toBe(1);

    // Verify emergency_hotlines table exists and default hotlines are seeded
    const hotlines = await EmergencyService.getEmergencyHotlines();
    expect(hotlines.length).toBeGreaterThanOrEqual(3);
    const mainSecHotline = hotlines.find((h) => h.id === 'hotline_sec_main');
    expect(mainSecHotline).toBeDefined();
    expect(mainSecHotline?.phoneNumber).toContain('+234 802 300 1122');
  });

  test('UAT-0070: Student triggers a new panic SOS alert and persists record in Turso DB', async () => {
    const alert = await EmergencyService.triggerSOS({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
      alertType: 'MEDICAL',
      additionalNotes: 'Severe allergic reaction in room'
    });

    expect(alert).toBeDefined();
    expect(alert.id).toContain('sos_');
    expect(alert.studentId).toBe(testStudentId);
    expect(alert.hostelId).toBe(testHostelId);
    expect(alert.roomNumber).toBe(testRoomNumber);
    expect(alert.alertType).toBe('MEDICAL');
    expect(alert.status).toBe('ACTIVE');
    expect(alert.additionalNotes).toBe('Severe allergic reaction in room');
  });

  test('UAT-0070: Retrieves active SOS alerts for hostel porter and warden monitoring', async () => {
    const activeAlerts = await EmergencyService.getActiveAlerts(undefined, testHostelId);
    expect(activeAlerts.length).toBeGreaterThan(0);

    const studentAlert = activeAlerts.find((a) => a.studentId === testStudentId);
    expect(studentAlert).toBeDefined();
    expect(studentAlert?.studentName).toBe('SOS Test Student');
    expect(studentAlert?.hostelName).toBe(`King Jaja Hall ${timestamp}`);
  });

  test('UAT-0070: Prevents duplicate active SOS alerts for the same student', async () => {
    const secondAlert = await EmergencyService.triggerSOS({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
      alertType: 'SECURITY',
      additionalNotes: 'Second trigger attempt'
    });

    // Should return the existing active alert instead of creating a second active record
    expect(secondAlert).toBeDefined();
    expect(secondAlert.alertType).toBe('MEDICAL'); // Original type remains
  });

  test('UAT-0070: Student cancels active SOS panic alarm', async () => {
    const activeAlert = await EmergencyService.getStudentActiveAlert(testStudentId);
    expect(activeAlert).not.toBeNull();

    if (activeAlert) {
      const cancelled = await EmergencyService.cancelAlert(activeAlert.id, testStudentId);
      expect(cancelled).toBe(true);

      const postCheck = await EmergencyService.getStudentActiveAlert(testStudentId);
      expect(postCheck).toBeNull();
    }
  });

  test('UAT-0070: Zustand store integration tests for SOS triggers, cancellation and hotline loading', async () => {
    const store = useEmergencyStore.getState();

    // 1. Fetch hotlines
    await store.fetchHotlines('MAIN_CAMPUS');
    expect(useEmergencyStore.getState().hotlines.length).toBeGreaterThan(0);

    // 2. Trigger SOS via store action
    const triggered = await store.triggerSOS({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
      alertType: 'FIRE',
      additionalNotes: 'Smoke in hallway'
    });

    expect(triggered).toBeDefined();
    expect(useEmergencyStore.getState().activeAlert).not.toBeNull();
    expect(useEmergencyStore.getState().successMessage).toContain('EMERGENCY SOS TRIGGERED');

    // 3. Cancel active alert via store action
    const cancelSuccess = await store.cancelActiveAlert(testStudentId);
    expect(cancelSuccess).toBe(true);
    expect(useEmergencyStore.getState().activeAlert).toBeNull();
    expect(useEmergencyStore.getState().successMessage).toContain('cancelled successfully');
  });
});
