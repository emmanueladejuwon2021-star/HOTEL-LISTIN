import { AuthService } from '../api/authService';
import { maintenanceService } from '../api/maintenanceService';

describe('MaintenanceService - Artisan Repair Queue & Proof-of-Fix [MAINTENANCE-01 / UAT-0056]', () => {
  const studentId = 'STU-MAINT-TEST-001';
  const artisanId = 'ARTISAN-PLUMBER-001';
  const hostelId = 'JAJA-HALL-01';
  const roomNumber = '204';
  const ticketId = 'TICKET-REPAIR-001';

  beforeAll(async () => {
    await maintenanceService.initializeSchema();

    const client = AuthService.getDbClient();

    // Create required base tables if not exists
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      )`,
      args: [],
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        matric_or_staff_no TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        gender TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    });

    // Seed test hostel, student, artisan, and repair ticket
    await client.execute({
      sql: `INSERT OR REPLACE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, 'King Jaja Hall', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 400, 300)`,
      args: [hostelId],
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, phone_number, password_hash, full_name, matric_or_staff_no, role, gender, is_active)
            VALUES (?, 'student.maint@unilag.edu.ng', '08012345678', 'hash', 'Babalola Johnson', '200905001', 'STUDENT', 'MALE', 1)`,
      args: [studentId],
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, phone_number, password_hash, full_name, matric_or_staff_no, role, gender, is_active)
            VALUES (?, 'artisan.plumber@unilag.edu.ng', '08087654321', 'hash', 'Mr. Ade Plumber', 'STAFF-PLUMB-01', 'MAINTENANCE', 'MALE', 1)`,
      args: [artisanId],
    });

    // Clean up existing ticket
    await client.execute({
      sql: `DELETE FROM maintenance_tickets WHERE id = ?`,
      args: [ticketId],
    });

    // Insert test defect ticket
    await client.execute({
      sql: `INSERT INTO maintenance_tickets (id, student_id, hostel_id, room_number, category, description, photo_before_url, status)
            VALUES (?, ?, ?, ?, 'PLUMBING', 'Leaking washroom tap fixture', 'http://example.com/tap_broken.jpg', 'OPEN')`,
      args: [ticketId, studentId, hostelId, roomNumber],
    });
  });

  test('[UAT-0056] Artisan Queue Retrieval: Should fetch open repair ticket queue with hostel and student details', async () => {
    const queue = await maintenanceService.getArtisanQueue(artisanId, 'PLUMBING');

    expect(queue.length).toBeGreaterThan(0);
    const ticket = queue.find((t) => t.id === ticketId);
    expect(ticket).toBeDefined();
    expect(ticket?.roomNumber).toBe(roomNumber);
    expect(ticket?.category).toBe('PLUMBING');
    expect(ticket?.status).toBe('OPEN');
    expect(ticket?.hostelName).toBe('King Jaja Hall');
    expect(ticket?.studentName).toBe('Babalola Johnson');
  });

  test('[UAT-0056] Status Transition: Should start repair job and update ticket status to IN_PROGRESS', async () => {
    const result = await maintenanceService.updateTicketStatus({
      ticketId,
      status: 'IN_PROGRESS',
      artisanId,
    });

    expect(result.status).toBe('IN_PROGRESS');
    expect(result.assignedArtisanId).toBe(artisanId);

    const updatedTicket = await maintenanceService.getTicketById(ticketId);
    expect(updatedTicket?.status).toBe('IN_PROGRESS');
    expect(updatedTicket?.assignedArtisanId).toBe(artisanId);
  });

  test('[UAT-0056] Proof-of-Fix Upload: Should upload photo_after_url, set status to RESOLVED, and update Turso DB timestamp', async () => {
    const photoAfterUrl = 'http://example.com/tap_fixed_proof.jpg';

    const result = await maintenanceService.uploadProofOfFix({
      ticketId,
      artisanId,
      photoAfterUrl,
      resolutionNotes: 'Replaced tap washer and tested water supply without leaks.',
    });

    expect(result.status).toBe('RESOLVED');
    expect(result.photoAfterUrl).toBe(photoAfterUrl);
    expect(result.resolvedAt).toBeDefined();

    const resolvedTicket = await maintenanceService.getTicketById(ticketId);
    expect(resolvedTicket?.status).toBe('RESOLVED');
    expect(resolvedTicket?.photoAfterUrl).toBe(photoAfterUrl);
    expect(resolvedTicket?.resolvedAt).not.toBeNull();
  });

  test('[UAT-0056] Input Validation: Should reject upload if proof-of-fix photo is missing', async () => {
    await expect(
      maintenanceService.uploadProofOfFix({
        ticketId,
        artisanId,
        photoAfterUrl: '   ',
      })
    ).rejects.toThrow('Proof-of-fix photo is required to mark repair as resolved.');
  });
});
