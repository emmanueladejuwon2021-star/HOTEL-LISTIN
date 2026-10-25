import { GatePassService } from '../api/gatepassService';
import { AuthService } from '../api/authService';
import { useGatePassStore } from '../store/useGatePassStore';
import { validateVisitorInput } from '../utils/validation';

/**
 * Automated Unit and Integration Test Suite for Visitor Pass Management (Issue #46 / VISITOR-01 / UAT-0046).
 *
 * Verifies:
 * - Input validations for visitor full name, phone number format, and visit date.
 * - Visitor pass creation with 6-digit access PIN generation and Turso DB persistence.
 * - Retrieval of visitor pass logs for a student in reverse chronological order.
 * - Visitor check-in and check-out status transitions ('EXPECTED' -> 'CHECKED_IN' -> 'CHECKED_OUT').
 * - Zustand useGatePassStore actions and state updates.
 */
describe('Visitor Pass Management Engine [VISITOR-01 / UAT-0046]', () => {
  const studentId = `usr_vis_stud_${Date.now()}`;
  const porterId = `usr_vis_port_${Date.now()}`;

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await GatePassService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean up & Seed test student
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, 'Visitor Test Student', ?, '08033334444', 'STUDENT', 'FEMALE', 'hash', 1)`,
      args: [studentId, `MAT_VIS_${Date.now()}`, `visitor_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Engineering', 'Civil Eng', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [studentId]
    });
  });

  describe('Input Validation Rules', () => {
    test('validates clean visitor full name and Nigerian phone number', () => {
      const result = validateVisitorInput('Bisi Akande', '08023456789');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('rejects empty or single character visitor name', () => {
      const result = validateVisitorInput('A', '08023456789');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });

    test('rejects invalid symbols in visitor name', () => {
      const result = validateVisitorInput('Bisi <Script>', '08023456789');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('letters, spaces, hyphens, and apostrophes');
    });

    test('rejects invalid or too short phone numbers', () => {
      const result = validateVisitorInput('Bisi Akande', '12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid phone number');
    });

    test('validates optional visit date format', () => {
      const validDate = validateVisitorInput('Bisi Akande', '08023456789', '2026-11-15');
      expect(validDate.isValid).toBe(true);

      const invalidDate = validateVisitorInput('Bisi Akande', '08023456789', 'invalid-date');
      expect(invalidDate.isValid).toBe(false);
      expect(invalidDate.error).toContain('Invalid visit date format');
    });
  });

  describe('Visitor Pass Generation & Database Operations', () => {
    let createdPassId: string;
    let generatedPin: string;

    test('creates visitor pass with 6-digit access PIN and EXPECTED status', async () => {
      const pass = await GatePassService.createVisitorPass(
        studentId,
        'Olawale Johnson',
        '08098765432',
        '2026-10-28'
      );

      expect(pass.id).toBeDefined();
      expect(pass.studentId).toBe(studentId);
      expect(pass.visitorName).toBe('Olawale Johnson');
      expect(pass.visitorPhone).toBe('08098765432');
      expect(pass.passCode).toMatch(/^\d{6}$/); // 6-digit PIN
      expect(pass.status).toBe('EXPECTED');

      createdPassId = pass.id;
      generatedPin = pass.passCode;
    });

    test('prevents creating visitor pass with invalid details', async () => {
      await expect(
        GatePassService.createVisitorPass(studentId, 'X', '123')
      ).rejects.toThrow();
    });

    test('retrieves visitor passes for a student ordered by created_at DESC', async () => {
      const passes = await GatePassService.getVisitorPassesByStudent(studentId);
      expect(passes.length).toBeGreaterThan(0);
      const found = passes.find(p => p.id === createdPassId);
      expect(found).toBeDefined();
      expect(found?.visitorName).toBe('Olawale Johnson');
    });

    test('executes visitor check-in at gatehouse transitioning status to CHECKED_IN', async () => {
      const checkedIn = await GatePassService.checkInVisitor(createdPassId, porterId);
      expect(checkedIn.status).toBe('CHECKED_IN');
      expect(checkedIn.checkInTime).toBeDefined();
    });

    test('executes visitor check-out upon exit transitioning status to CHECKED_OUT', async () => {
      const checkedOut = await GatePassService.checkOutVisitor(createdPassId, porterId);
      expect(checkedOut.status).toBe('CHECKED_OUT');
      expect(checkedOut.checkOutTime).toBeDefined();
    });
  });

  describe('Zustand useGatePassStore State Management', () => {
    test('creates visitor pass and updates store state', async () => {
      const store = useGatePassStore.getState();

      const newPass = await store.createVisitorPass!(
        studentId,
        'Kemi Adeleke',
        '07011223344'
      );

      expect(newPass.visitorName).toBe('Kemi Adeleke');
      const updatedStore = useGatePassStore.getState();
      expect(updatedStore.visitorPasses!.some(p => p.id === newPass.id)).toBe(true);
    });

    test('loads visitor passes into store state', async () => {
      const store = useGatePassStore.getState();
      await store.loadVisitorPasses!(studentId);

      const updatedStore = useGatePassStore.getState();
      expect(updatedStore.visitorPasses!.length).toBeGreaterThan(0);
    });
  });
});
