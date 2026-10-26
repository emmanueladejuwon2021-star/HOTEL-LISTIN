import { createClient, Client } from '@libsql/client';
import { MaintenanceService } from '../api/maintenanceService';
import { AuthService } from '../api/authService';

describe('MaintenanceService & Artisan Repair Queue Engine [MAINTENANCE-04 / UAT-0059]', () => {
  let client: Client;

  beforeAll(async () => {
    client = AuthService.getDbClient();
    await MaintenanceService.initializeSchema();
  });

  beforeEach(async () => {
    // Disable foreign key constraints during unit test setup to allow isolated mock entity IDs
    await client.execute('PRAGMA foreign_keys = OFF;');
    await client.execute('DELETE FROM maintenance_tickets');
    await client.execute('DELETE FROM users');
    await client.execute('DELETE FROM hostels');
  });

  afterEach(async () => {
    await client.execute('PRAGMA foreign_keys = ON;');
  });

  test('should create a photo-backed maintenance ticket in Turso database [UAT-0059]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId: 'usr_student_01',
      hostelId: 'hostel_jaja',
      roomNumber: 'Room 204',
      category: 'PLUMBING',
      urgency: 'HIGH',
      description: 'Leaking tap fixture requiring washer replacement.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/photos/defect_204.jpg'
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.status).toBe('OPEN');
    expect(ticket.urgency).toBe('HIGH');
    expect(ticket.category).toBe('PLUMBING');

    // Verify record in SQLite database
    const dbRes = await client.execute({
      sql: `SELECT id, category, urgency, status FROM maintenance_tickets WHERE id = ?`,
      args: [ticket.id]
    });

    expect(dbRes.rows.length).toBe(1);
    expect(String(dbRes.rows[0].status)).toBe('OPEN');
    expect(String(dbRes.rows[0].urgency)).toBe('HIGH');
  });

  test('should fetch artisan work queue sorted by urgency SLA [UAT-0059]', async () => {
    // Insert 3 tickets with varying urgency levels
    await MaintenanceService.createTicket({
      studentId: 'usr_student_01',
      hostelId: 'hostel_jaja',
      roomNumber: 'Room 101',
      category: 'CARPENTRY',
      urgency: 'LOW',
      description: 'Squeaky wardrobe door hinge.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/photos/low.jpg'
    });

    await MaintenanceService.createTicket({
      studentId: 'usr_student_02',
      hostelId: 'hostel_moremi',
      roomNumber: 'Room 305',
      category: 'ELECTRICAL',
      urgency: 'EMERGENCY',
      description: 'Bare sparking electrical wire near bed.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/photos/emergency.jpg'
    });

    await MaintenanceService.createTicket({
      studentId: 'usr_student_03',
      hostelId: 'hostel_jaja',
      roomNumber: 'Room 202',
      category: 'PLUMBING',
      urgency: 'HIGH',
      description: 'Broken toilet flush valve.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/photos/high.jpg'
    });

    const queue = await MaintenanceService.getArtisanQueue();
    expect(queue.length).toBe(3);

    // Verify EMERGENCY priority is listed first, followed by HIGH, then LOW
    expect(queue[0].urgency).toBe('EMERGENCY');
    expect(queue[1].urgency).toBe('HIGH');
    expect(queue[2].urgency).toBe('LOW');
  });

  test('should update ticket status to IN_PROGRESS when artisan starts job [UAT-0059]', async () => {
    const created = await MaintenanceService.createTicket({
      studentId: 'usr_student_01',
      hostelId: 'hostel_jaja',
      roomNumber: 'Room 204',
      category: 'PLUMBING',
      urgency: 'HIGH',
      description: 'Leaking tap fixture.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/photos/defect_204.jpg'
    });

    const updated = await MaintenanceService.updateTicketStatus({
      ticketId: created.id,
      artisanId: 'artisan_plumber_01',
      status: 'IN_PROGRESS'
    });

    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.assignedArtisanId).toBe('artisan_plumber_01');

    const dbRes = await client.execute({
      sql: `SELECT status, assigned_artisan_id FROM maintenance_tickets WHERE id = ?`,
      args: [created.id]
    });

    expect(String(dbRes.rows[0].status)).toBe('IN_PROGRESS');
    expect(String(dbRes.rows[0].assigned_artisan_id)).toBe('artisan_plumber_01');
  });

  test('should throw error when resolving ticket without mandatory proof-of-fix photo [UAT-0059]', async () => {
    const created = await MaintenanceService.createTicket({
      studentId: 'usr_student_01',
      hostelId: 'hostel_jaja',
      roomNumber: 'Room 204',
      category: 'PLUMBING',
      urgency: 'MEDIUM',
      description: 'Leaking tap fixture.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/photos/defect_204.jpg'
    });

    await expect(
      MaintenanceService.updateTicketStatus({
        ticketId: created.id,
        artisanId: 'artisan_plumber_01',
        status: 'RESOLVED'
      })
    ).rejects.toThrow('Proof-of-fix photograph is required to resolve a maintenance ticket.');
  });

  test('should upload proof-of-fix photo and resolve ticket in database [UAT-0059]', async () => {
    const created = await MaintenanceService.createTicket({
      studentId: 'usr_student_01',
      hostelId: 'hostel_jaja',
      roomNumber: 'Room 204',
      category: 'PLUMBING',
      urgency: 'MEDIUM',
      description: 'Leaking tap fixture.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/photos/defect_204.jpg'
    });

    const proofPhotoUrl = 'https://unilagstay.edu.ng/proofs/fixed_204.jpg';
    const resolved = await MaintenanceService.updateTicketStatus({
      ticketId: created.id,
      artisanId: 'artisan_plumber_01',
      status: 'RESOLVED',
      photoAfterUrl: proofPhotoUrl
    });

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.photoAfterUrl).toBe(proofPhotoUrl);
    expect(resolved.resolvedAt).toBeDefined();

    const dbRes = await client.execute({
      sql: `SELECT status, photo_after_url, resolved_at FROM maintenance_tickets WHERE id = ?`,
      args: [created.id]
    });

    expect(String(dbRes.rows[0].status)).toBe('RESOLVED');
    expect(String(dbRes.rows[0].photo_after_url)).toBe(proofPhotoUrl);
    expect(dbRes.rows[0].resolved_at).not.toBeNull();
  });
});
