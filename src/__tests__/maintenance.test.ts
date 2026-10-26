/**
 * Integration Test Suite for Student Maintenance Defect Categorization [MAINTENANCE-02 / UAT-0052]
 * Tests category selection, target SLA response calculation, description/photo validations,
 * database insertion into Turso DB (maintenance_tickets), student ticket listing, and cancellation.
 */

import { AuthService } from '../api/authService';
import { MaintenanceService } from '../api/maintenanceService';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { CATEGORY_METADATA, MaintenanceCategory } from '../types/maintenance';

describe('Student Maintenance System - Defect Categorization & Tickets [MAINTENANCE-02 / UAT-0052]', () => {
  const testStudentId = 'usr_maint_test_student';
  const testHostelId = 'hostel_jafojo';
  const testRoomNumber = 'B-301';

  beforeAll(async () => {
    // Initialize DB schema and seed test user
    await MaintenanceService.initializeDatabase();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, '190408099', 'Maint Test Student', 'maint@unilag.edu.ng', '08012345678', 'STUDENT', 'MALE', 'hash123')`,
      args: [testStudentId],
    });
  });

  beforeEach(async () => {
    // Clear test tickets for isolated test run
    const client = AuthService.getDbClient();
    await client.execute({
      sql: `DELETE FROM maintenance_tickets WHERE student_id = ?`,
      args: [testStudentId],
    });

    useMaintenanceStore.getState().resetForm();
  });

  test('CATEGORY_METADATA provides accurate PRD target SLA mapping for all 6 defect categories', () => {
    expect(CATEGORY_METADATA.ELECTRICAL.targetSla).toBe('< 2 Hours');
    expect(CATEGORY_METADATA.ELECTRICAL.defaultPriority).toBe('EMERGENCY');

    expect(CATEGORY_METADATA.PLUMBING.targetSla).toBe('< 24 Hours');
    expect(CATEGORY_METADATA.PLUMBING.defaultPriority).toBe('HIGH');

    expect(CATEGORY_METADATA.STRUCTURAL.targetSla).toBe('< 24 Hours');
    expect(CATEGORY_METADATA.STRUCTURAL.defaultPriority).toBe('HIGH');

    expect(CATEGORY_METADATA.CARPENTRY.targetSla).toBe('< 48 Hours');
    expect(CATEGORY_METADATA.CARPENTRY.defaultPriority).toBe('MEDIUM');

    expect(CATEGORY_METADATA.APPLIANCE.targetSla).toBe('< 48 Hours');
    expect(CATEGORY_METADATA.APPLIANCE.defaultPriority).toBe('MEDIUM');

    expect(CATEGORY_METADATA.MASONRY.targetSla).toBe('< 72 Hours');
    expect(CATEGORY_METADATA.MASONRY.defaultPriority).toBe('LOW');
  });

  test('MaintenanceService creates repair ticket in Turso DB with correct category, priority, and SLA', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
      category: 'ELECTRICAL',
      description: 'Bare wires exposed on socket panel near bed 2',
      photoBeforeUrl: 'https://unilagstay.edu.ng/uploads/electrical_bare_wire.jpg',
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.category).toBe('ELECTRICAL');
    expect(ticket.priority).toBe('EMERGENCY');
    expect(ticket.targetSla).toBe('< 2 Hours');
    expect(ticket.status).toBe('OPEN');

    // Verify row in Turso DB
    const client = AuthService.getDbClient();
    const result = await client.execute({
      sql: `SELECT * FROM maintenance_tickets WHERE id = ?`,
      args: [ticket.id],
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].category).toBe('ELECTRICAL');
    expect(result.rows[0].target_sla).toBe('< 2 Hours');
  });

  test('MaintenanceService rejects ticket creation if description is too short or photo is missing', async () => {
    await expect(
      MaintenanceService.createTicket({
        studentId: testStudentId,
        hostelId: testHostelId,
        roomNumber: testRoomNumber,
        category: 'PLUMBING',
        description: 'Tiny',
        photoBeforeUrl: 'https://unilagstay.edu.ng/uploads/photo.jpg',
      })
    ).rejects.toThrow('Please provide a detailed defect description (minimum 5 characters).');

    await expect(
      MaintenanceService.createTicket({
        studentId: testStudentId,
        hostelId: testHostelId,
        roomNumber: testRoomNumber,
        category: 'PLUMBING',
        description: 'Leaking water tap flooding floor',
        photoBeforeUrl: '',
      })
    ).rejects.toThrow('A photo proof attachment is required to submit a maintenance request.');
  });

  test('MaintenanceService retrieves student tickets sorted by newest first', async () => {
    await MaintenanceService.createTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
      category: 'CARPENTRY',
      description: 'Broken wardrobe door handle',
      photoBeforeUrl: 'https://unilagstay.edu.ng/uploads/door.jpg',
    });

    await MaintenanceService.createTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
      category: 'PLUMBING',
      description: 'Clogged bathroom sink drain',
      photoBeforeUrl: 'https://unilagstay.edu.ng/uploads/sink.jpg',
    });

    const tickets = await MaintenanceService.getStudentTickets(testStudentId);
    expect(tickets.length).toBe(2);
    expect(tickets[0].category).toBe('PLUMBING');
    expect(tickets[1].category).toBe('CARPENTRY');
  });

  test('MaintenanceService cancels open ticket successfully', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
      category: 'MASONRY',
      description: 'Flaking plaster on damp wall near window',
      photoBeforeUrl: 'https://unilagstay.edu.ng/uploads/wall.jpg',
    });

    const cancelled = await MaintenanceService.cancelTicket(ticket.id, testStudentId);
    expect(cancelled).toBe(true);

    const tickets = await MaintenanceService.getStudentTickets(testStudentId);
    expect(['REJECTED', 'CANCELLED']).toContain(tickets[0].status);
  });

  test('useMaintenanceStore handles category selection, validation errors, and ticket submission', async () => {
    const store = useMaintenanceStore.getState();

    // Change category to CARPENTRY
    store.setSelectedCategory('CARPENTRY');
    expect(useMaintenanceStore.getState().selectedCategory).toBe('CARPENTRY');

    // Attempt submission with empty description
    store.setDescription('');
    const failRes = await store.submitTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
    });
    expect(failRes).toBe(false);
    expect(useMaintenanceStore.getState().errorMessage).toContain('Please enter a description');

    // Fill valid description and submit
    store.setDescription('Broken study chair leg needs welding/repair');
    const successRes = await store.submitTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: testRoomNumber,
    });

    expect(successRes).toBe(true);
    expect(useMaintenanceStore.getState().successMessage).toContain('Target SLA: < 48 Hours');
    expect(useMaintenanceStore.getState().userTickets.length).toBe(1);
    expect(useMaintenanceStore.getState().userTickets[0].category).toBe('CARPENTRY');
  });
});
