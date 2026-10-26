import { MaintenanceService } from '../api/maintenanceService';
import { AuthService } from '../api/authService';
import { InventoryService } from '../api/inventoryService';

/**
 * Test suite for Facility Maintenance & Artisan Repair Job Queue [MAINTENANCE-01 & MAINTENANCE-02].
 * Tests real Turso libSQL Edge SQLite database interactions without mocks.
 * Covers ticket creation, job queue dispatch, artisan assignment, proof-of-fix photo upload,
 * status transitions (OPEN -> IN_PROGRESS -> RESOLVED), and rejection handling.
 */
describe('MaintenanceService - Artisan Job Queue & Proof-of-Fix Upload [MAINTENANCE-01 & MAINTENANCE-02 / UAT-0056 & UAT-0057]', () => {
  const studentId = `user_stu_mnt_${Date.now()}`;
  const artisanId = `user_art_${Date.now()}`;

  beforeAll(async () => {
    // Initialize database schema and insert test student & artisan users
    await MaintenanceService.initializeSchema();
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, '210408991', 'Maintenance Student Test', 'student_mnt@unilag.edu.ng', '08012345678', 'STUDENT', 'MALE', 'hash123')`,
      args: [studentId]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, 'STAFF-ART-101', 'Master Artisan Plumber', 'artisan@unilag.edu.ng', '08087654321', 'MAINTENANCE', 'MALE', 'hash123')`,
      args: [artisanId]
    });
  });

  test('should initialize maintenance schema and indexes without errors', async () => {
    await expect(MaintenanceService.initializeSchema()).resolves.not.toThrow();
  });

  test('should create a photo-backed repair request ticket [MAINTENANCE-01 / UAT-0056]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId,
      hostelId: 'hostel_jaja',
      roomNumber: 'Room 204',
      category: 'PLUMBING',
      description: 'Severe water pipe leak under the washbasin faucet.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/pipe_leak_before.jpg',
      priority: 'HIGH'
    });

    expect(ticket).toBeDefined();
    expect(ticket.id).toContain('tkt_');
    expect(ticket.studentId).toBe(studentId);
    expect(ticket.roomNumber).toBe('Room 204');
    expect(ticket.category).toBe('PLUMBING');
    expect(ticket.status).toBe('OPEN');
    expect(ticket.priority).toBe('HIGH');
    expect(ticket.photoBeforeUrl).toBe('https://unilagstay.edu.ng/defects/pipe_leak_before.jpg');
    expect(ticket.photoAfterUrl).toBeUndefined();
  });

  test('should fetch unassigned and open tickets in artisan work queue [MAINTENANCE-02 / UAT-0057]', async () => {
    const queue = await MaintenanceService.getTicketsForArtisan(artisanId, true);

    expect(queue).toBeDefined();
    expect(Array.isArray(queue)).toBe(true);
    expect(queue.length).toBeGreaterThan(0);
    const createdTicket = queue.find(t => t.roomNumber === 'Room 204');
    expect(createdTicket).toBeDefined();
    expect(createdTicket?.status).toBe('OPEN');
  });

  test('should assign an artisan to an open job and transition status to IN_PROGRESS [MAINTENANCE-02]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId,
      hostelId: 'hostel_moremi',
      roomNumber: 'Room 112',
      category: 'ELECTRICAL',
      description: 'Ceiling fan regulator shorted and sparking.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/fan_short_before.jpg',
      priority: 'EMERGENCY'
    });

    const assigned = await MaintenanceService.assignArtisan({
      ticketId: ticket.id,
      artisanId
    });

    expect(assigned).toBeDefined();
    expect(assigned.id).toBe(ticket.id);
    expect(assigned.assignedArtisanId).toBe(artisanId);
    expect(assigned.status).toBe('IN_PROGRESS');
  });

  test('should submit proof-of-fix photo and transition ticket to RESOLVED [MAINTENANCE-02 / UAT-0057]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId,
      hostelId: 'hostel_mariere',
      roomNumber: 'Room 305',
      category: 'CARPENTRY',
      description: 'Broken door hinge preventing door lock.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/hinge_broken.jpg',
      priority: 'MEDIUM'
    });

    await MaintenanceService.assignArtisan({ ticketId: ticket.id, artisanId });

    const resolved = await MaintenanceService.submitProofOfFix({
      ticketId: ticket.id,
      artisanId,
      photoAfterUrl: 'https://unilagstay.edu.ng/defects/hinge_repaired_after.jpg',
      notes: 'Hinge replaced with industrial brass fitting. Door latch tested and working.'
    });

    expect(resolved).toBeDefined();
    expect(resolved.id).toBe(ticket.id);
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.photoAfterUrl).toBe('https://unilagstay.edu.ng/defects/hinge_repaired_after.jpg');
    expect(resolved.resolvedAt).toBeDefined();
    expect(resolved.notes).toContain('Hinge replaced with industrial brass fitting');
  });

  test('should reject submitting proof-of-fix without photo proof [MAINTENANCE-02]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId,
      hostelId: 'hostel_kofo',
      roomNumber: 'Room 101',
      category: 'PLUMBING',
      description: 'Leaking shower valve.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/shower_before.jpg'
    });

    await expect(
      MaintenanceService.submitProofOfFix({
        ticketId: ticket.id,
        artisanId,
        photoAfterUrl: '   '
      })
    ).rejects.toThrow('Proof-of-fix completion photo is strictly required');
  });

  test('should reject an invalid maintenance ticket with reason notes [MAINTENANCE-02]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId,
      hostelId: 'hostel_eni_njoku',
      roomNumber: 'Room 402',
      category: 'JANITORIAL',
      description: 'Personal laundry service requested.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/laundry.jpg'
    });

    const rejected = await MaintenanceService.rejectTicket(
      ticket.id,
      'Out of scope. App maintenance is reserved for permanent hostel infrastructure repairs.'
    );

    expect(rejected).toBeDefined();
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.notes).toContain('REJECTED: Out of scope');
  });

  test('should fetch tickets submitted by a student', async () => {
    const studentTickets = await MaintenanceService.getTicketsByStudent(studentId);
    expect(Array.isArray(studentTickets)).toBe(true);
    expect(studentTickets.length).toBeGreaterThanOrEqual(4);
  });
});
