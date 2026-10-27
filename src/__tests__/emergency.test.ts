import { EmergencyService } from '../api/emergencyService';
import { AuthService } from '../api/authService';
import { useEmergencyStore } from '../store/useEmergencyStore';

/**
 * Automated Unit & Integration Test Suite for Emergency Panic SOS Alert Trigger & Hotline Directory.
 * Implements [EMERGENCY-02] (Issue #67 / UAT-0067) for UnilagStay.
 *
 * Verifies panic SOS trigger creation, emergency category selection,
 * porter alert querying, acknowledgment, resolution, false alarm cancellation,
 * campus hotline directory, and Zustand store state management.
 */
describe('Emergency Panic SOS Alert System (Issue #67 / UAT-0067)', () => {
  const timestamp = Date.now();
  const studentId = `usr_sos_student_${timestamp}`;
  const studentMatric = `MAT_SOS_${timestamp}`;
  const studentEmail = `sos_${timestamp}@unilag.edu.ng`;
  const porterId = `usr_sos_porter_${timestamp}`;
  const porterEmail = `porter_${timestamp}@unilag.edu.ng`;
  const hashedPassword = AuthService.hashPassword('password123');

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await EmergencyService.initializeSchema();

    const client = AuthService.getDbClient();

    // Seed student user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'SOS Test Student', ?, '08012345678', 'STUDENT', 'MALE', ?, 1)`,
      args: [studentId, studentMatric, studentEmail, hashedPassword]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Sciences', 'Computer Science', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [studentId]
    });

    // Seed porter user
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Gate Porter Officer', ?, '08055556666', 'PORTER', 'MALE', ?, 1)`,
      args: [porterId, `STF_POR_${timestamp}`, porterEmail, hashedPassword]
    });
  });

  afterEach(() => {
    useEmergencyStore.getState().resetState();
  });

  test('triggers an emergency medical panic SOS alert for resident student', async () => {
    const alert = await EmergencyService.triggerEmergencySOS({
      studentId,
      emergencyType: 'MEDICAL',
      description: 'Asthma attack in Room 204'
    });

    expect(alert.id).toBeDefined();
    expect(alert.studentId).toBe(studentId);
    expect(alert.studentName).toBe('SOS Test Student');
    expect(alert.studentMatric).toBe(studentMatric);
    expect(alert.emergencyType).toBe('MEDICAL');
    expect(alert.description).toBe('Asthma attack in Room 204');
    expect(alert.status).toBe('ACTIVE');
    expect(alert.triggeredAt).toBeDefined();
  });

  test('retrieves active alerts for porter gatehouse dashboard', async () => {
    const activeAlerts = await EmergencyService.getActiveAlertsForPorter();

    expect(activeAlerts.length).toBeGreaterThan(0);
    const testAlert = activeAlerts.find(a => a.studentId === studentId);
    expect(testAlert).toBeDefined();
    expect(testAlert?.emergencyType).toBe('MEDICAL');
    expect(testAlert?.status).toBe('ACTIVE');
  });

  test('acknowledges active panic alert by hostel porter', async () => {
    const activeAlerts = await EmergencyService.getActiveAlertsForPorter();
    const alert = activeAlerts.find(a => a.studentId === studentId && a.status === 'ACTIVE');

    expect(alert).toBeDefined();

    await EmergencyService.updateAlertStatus({
      alertId: alert!.id,
      porterId,
      status: 'ACKNOWLEDGED'
    });

    const studentHistory = await EmergencyService.getStudentAlertHistory(studentId);
    const updated = studentHistory.find(a => a.id === alert!.id);

    expect(updated?.status).toBe('ACKNOWLEDGED');
    expect(updated?.acknowledgedByPorterId).toBe(porterId);
  });

  test('resolves acknowledged emergency alert', async () => {
    const studentHistory = await EmergencyService.getStudentAlertHistory(studentId);
    const alert = studentHistory.find(a => a.status === 'ACKNOWLEDGED');

    expect(alert).toBeDefined();

    await EmergencyService.updateAlertStatus({
      alertId: alert!.id,
      porterId,
      status: 'RESOLVED',
      resolutionNotes: 'Medical team dispatched and student stabilized.'
    });

    const updatedHistory = await EmergencyService.getStudentAlertHistory(studentId);
    const resolved = updatedHistory.find(a => a.id === alert!.id);

    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.resolutionNotes).toContain('Medical team dispatched');
  });

  test('cancels active panic SOS alert (false alarm)', async () => {
    const newAlert = await EmergencyService.triggerEmergencySOS({
      studentId,
      emergencyType: 'GENERAL_PANIC',
      description: 'Accidental trigger'
    });

    expect(newAlert.status).toBe('ACTIVE');

    await EmergencyService.cancelSOS(newAlert.id, studentId);

    const history = await EmergencyService.getStudentAlertHistory(studentId);
    const cancelled = history.find(a => a.id === newAlert.id);

    expect(cancelled?.status).toBe('FALSE_ALARM');
    expect(cancelled?.resolutionNotes).toContain('Cancelled by student');
  });

  test('queries UNILAG campus emergency hotline directory', async () => {
    const hotlines = await EmergencyService.getCampusHotlines();

    expect(hotlines.length).toBeGreaterThan(0);
    expect(hotlines[0].phoneNumber).toBeDefined();
    expect(hotlines[0].department).toContain('UNILAG Medical Centre');
    expect(hotlines[0].isAvailable24_7).toBe(true);
  });

  test('manages state in Zustand useEmergencyStore', async () => {
    const store = useEmergencyStore.getState();

    await store.loadHotlines();
    expect(useEmergencyStore.getState().hotlines.length).toBeGreaterThan(0);

    const alert = await store.triggerSOS({
      studentId,
      emergencyType: 'FIRE',
      description: 'Smoke detected in common room'
    });

    expect(useEmergencyStore.getState().activeAlert?.id).toBe(alert.id);
    expect(useEmergencyStore.getState().activeAlert?.emergencyType).toBe('FIRE');

    await store.cancelSOS(studentId);
    expect(useEmergencyStore.getState().activeAlert).toBeNull();
  });
});
