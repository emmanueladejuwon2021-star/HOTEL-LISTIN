import { MaintenanceService } from '../api/maintenanceService';
import { AuthService } from '../api/authService';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { MaintenanceCategory } from '../types/maintenance';

/**
 * Automated Test Suite for Photo-Backed Repair Request Creator [MAINTENANCE-01 / UAT-0051 / UAT-014].
 * Verifies:
 * - Database schema initialization for maintenance_tickets and hostels tables in Turso SQLite DB
 * - Input validation (category, description length, mandatory photo proof URL, student ID)
 * - Live database CRUD transactions with proper foreign key relationships
 * - Zustand state store integration for student maintenance requests
 * - Non-technical English comments for clarity
 */
describe('MaintenanceService - Photo-Backed Repair Request Creator [MAINTENANCE-01 / UAT-0051 / UAT-014]', () => {
  const testStudentId = `usr_student_maint_${Date.now()}`;
  const secondStudentId = `usr_student_maint2_${Date.now()}`;
  const testHostelId = `hostel_jaja_${Date.now()}`;

  beforeAll(async () => {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    // Register primary test student in database
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Maintenance Test Student', ?, 'hashed_pass_123', '08022223333', 'STUDENT', 'MALE', 1)`,
      args: [testStudentId, `MAT_MNT_${Date.now()}`, `mnt_student_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Sciences', 'Computer Sciences', 200, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [testStudentId]
    });

    // Register second test student in database
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Second Student', ?, 'hashed_pass_123', '08022224444', 'STUDENT', 'FEMALE', 1)`,
      args: [secondStudentId, `MAT_MNT2_${Date.now()}`, `mnt_student2_${Date.now()}@unilag.edu.ng`]
    });

    // Seed test hostel
    await client.execute({
      sql: `INSERT OR IGNORE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, 'King Jaja Hall Maint', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 1200, 400)`,
      args: [testHostelId]
    });
  });

  test('should initialize schema and return empty list for student with no tickets', async () => {
    const tickets = await MaintenanceService.getStudentTickets(testStudentId);
    expect(tickets).toBeDefined();
    expect(tickets).toHaveLength(0);
  });

  test('should throw validation error when student ID is missing or empty', async () => {
    await expect(
      MaintenanceService.createTicket({
        studentId: '',
        hostelId: testHostelId,
        roomNumber: 'A204',
        category: 'PLUMBING',
        description: 'Water leaking under the sink continuously',
        photoBeforeUrl: 'https://example.com/photo.jpg'
      })
    ).rejects.toThrow('Valid Student ID is required');
  });

  test('should throw validation error when description is under 10 characters', async () => {
    await expect(
      MaintenanceService.createTicket({
        studentId: testStudentId,
        hostelId: testHostelId,
        roomNumber: 'A204',
        category: 'ELECTRICAL',
        description: 'Short',
        photoBeforeUrl: 'https://example.com/photo.jpg'
      })
    ).rejects.toThrow('at least 10 characters long');
  });

  test('should throw validation error when photo proof URL is missing', async () => {
    await expect(
      MaintenanceService.createTicket({
        studentId: testStudentId,
        hostelId: testHostelId,
        roomNumber: 'A204',
        category: 'CARPENTRY',
        description: 'Wardrobe door handle broken and detached',
        photoBeforeUrl: '  '
      })
    ).rejects.toThrow('photograph showing the damage or issue is required');
  });

  test('should create a photo-backed maintenance ticket in live Turso DB [MAINTENANCE-01 / UAT-0051]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: 'B102',
      category: 'PLUMBING',
      description: 'The bathroom pipe is leaking heavily and causing water buildup on the floor.',
      photoBeforeUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7'
    });

    expect(ticket).toBeDefined();
    expect(ticket.id).toMatch(/^TKT-/);
    expect(ticket.studentId).toBe(testStudentId);
    expect(ticket.hostelId).toBe(testHostelId);
    expect(ticket.roomNumber).toBe('B102');
    expect(ticket.category).toBe('PLUMBING');
    expect(ticket.status).toBe('OPEN');
    expect(ticket.photoBeforeUrl).toBe('https://images.unsplash.com/photo-1585704032915-c3400ca199e7');
    expect(ticket.studentName).toBe('Maintenance Test Student');
    expect(ticket.hostelName).toBeDefined();
  });

  test('should retrieve student tickets for student [MAINTENANCE-01]', async () => {
    // Create second ticket for electrical defect
    await MaintenanceService.createTicket({
      studentId: testStudentId,
      hostelId: testHostelId,
      roomNumber: 'B102',
      category: 'ELECTRICAL',
      description: 'The wall socket near bed 2 is sparking when plugging in a lamp.',
      photoBeforeUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31'
    });

    const studentTickets = await MaintenanceService.getStudentTickets(testStudentId);
    expect(studentTickets).toHaveLength(2);
    const categories = studentTickets.map((t) => t.category);
    expect(categories).toContain('ELECTRICAL');
    expect(categories).toContain('PLUMBING');
  });

  test('should fetch ticket details by ID', async () => {
    const studentTickets = await MaintenanceService.getStudentTickets(testStudentId);
    const firstTicket = studentTickets[0];

    const fetched = await MaintenanceService.getTicketById(firstTicket.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(firstTicket.id);
    expect(fetched?.description).toBe(firstTicket.description);
  });

  test('should prevent unauthorized student from cancelling another student ticket', async () => {
    const studentTickets = await MaintenanceService.getStudentTickets(testStudentId);
    const ticketId = studentTickets[0].id;

    await expect(
      MaintenanceService.cancelTicket(ticketId, secondStudentId)
    ).rejects.toThrow('only authorized to cancel your own maintenance tickets');
  });

  test('should allow student to cancel an open ticket', async () => {
    const studentTickets = await MaintenanceService.getStudentTickets(testStudentId);
    const ticketId = studentTickets[0].id;

    const result = await MaintenanceService.cancelTicket(ticketId, testStudentId);
    expect(result).toBe(true);

    const remaining = await MaintenanceService.getStudentTickets(testStudentId);
    expect(remaining).toHaveLength(1);
    expect(remaining.find((t) => t.id === ticketId)).toBeUndefined();
  });

  test('should integrate with Zustand useMaintenanceStore [MAINTENANCE-01]', async () => {
    const store = useMaintenanceStore.getState();

    store.setCategory('JANITORIAL');
    store.setDescription('Corridor trash container overflowing near room A204.');
    store.setPhotoUrl('https://example.com/trash.jpg');
    store.setHostelId(testHostelId);
    store.setRoomNumber('A204');

    expect(useMaintenanceStore.getState().activeCategory).toBe('JANITORIAL');
    expect(useMaintenanceStore.getState().description).toBe('Corridor trash container overflowing near room A204.');

    const created = await store.submitTicket(testStudentId);
    expect(created).not.toBeNull();
    expect(created?.category).toBe('JANITORIAL');
    expect(useMaintenanceStore.getState().successMessage).toContain('Repair request submitted successfully');

    await store.fetchStudentTickets(testStudentId);
    expect(useMaintenanceStore.getState().tickets.length).toBeGreaterThan(0);
  });
});
