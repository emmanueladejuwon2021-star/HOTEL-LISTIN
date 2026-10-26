import { MaintenanceService } from '../api/maintenanceService';
import { createClient } from '@libsql/client';

describe('MaintenanceService - Photo-Backed Repair Request Creator [MAINTENANCE-05 / UAT-0055]', () => {
  const studentId = 'student_test_55';
  const hostelId = 'JAJA_HALL';
  const roomNumber = 'Room A-102';

  beforeAll(async () => {
    // Ensure clean database state before running maintenance service tests
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:unilagstay.db',
      authToken: process.env.TURSO_AUTH_TOKEN
    });
    await client.execute('DROP TABLE IF EXISTS maintenance_tickets');
    await MaintenanceService.initDatabase();
  });

  test('should initialize maintenance_tickets table and performance indexes', async () => {
    await expect(MaintenanceService.initDatabase()).resolves.not.toThrow();
  });

  test('should reject ticket submission without mandatory photo_before_url [PRD TC-005 / UAT-0055]', async () => {
    await expect(
      MaintenanceService.createTicket({
        studentId,
        hostelId,
        roomNumber,
        category: 'PLUMBING',
        description: 'Leaking water tap',
        photoBeforeUrl: ''
      })
    ).rejects.toThrow('A photo of the defect is required before submitting a repair ticket.');
  });

  test('should reject ticket submission missing description or location parameters', async () => {
    await expect(
      MaintenanceService.createTicket({
        studentId: '',
        hostelId,
        roomNumber,
        category: 'ELECTRICAL',
        description: 'Blown bulb',
        photoBeforeUrl: 'https://unilagstay.edu.ng/photo1.jpg'
      })
    ).rejects.toThrow('Student identification code is required.');

    await expect(
      MaintenanceService.createTicket({
        studentId,
        hostelId,
        roomNumber,
        category: 'ELECTRICAL',
        description: '',
        photoBeforeUrl: 'https://unilagstay.edu.ng/photo1.jpg'
      })
    ).rejects.toThrow('Please provide a brief description of the repair needed.');
  });

  test('should successfully create a photo-backed repair request ticket [MAINTENANCE-05 / UAT-0055]', async () => {
    const photoBeforeUrl = 'https://unilagstay.edu.ng/uploads/defects/tap_leak.jpg';
    const ticket = await MaintenanceService.createTicket({
      studentId,
      hostelId,
      roomNumber,
      category: 'PLUMBING',
      description: 'Main bathroom sink faucet is leaking persistently.',
      photoBeforeUrl
    });

    expect(ticket).toBeDefined();
    expect(ticket.id).toMatch(/^TKT-/);
    expect(ticket.studentId).toBe(studentId);
    expect(ticket.hostelId).toBe(hostelId);
    expect(ticket.roomNumber).toBe(roomNumber);
    expect(ticket.category).toBe('PLUMBING');
    expect(ticket.description).toBe('Main bathroom sink faucet is leaking persistently.');
    expect(ticket.photoBeforeUrl).toBe(photoBeforeUrl);
    expect(ticket.status).toBe('OPEN');
    expect(ticket.createdAt).toBeDefined();
  });

  test('should retrieve student tickets ordered by creation date [MAINTENANCE-05]', async () => {
    const photo2 = 'https://unilagstay.edu.ng/uploads/defects/fan_short.jpg';
    await MaintenanceService.createTicket({
      studentId,
      hostelId,
      roomNumber,
      category: 'ELECTRICAL',
      description: 'Ceiling fan regulator short circuit.',
      photoBeforeUrl: photo2
    });

    const studentTickets = await MaintenanceService.getStudentTickets(studentId);
    expect(studentTickets.length).toBeGreaterThanOrEqual(2);
    expect(studentTickets[0].category).toBe('ELECTRICAL');
    expect(studentTickets[1].category).toBe('PLUMBING');
  });

  test('should fetch single repair ticket by unique ID', async () => {
    const studentTickets = await MaintenanceService.getStudentTickets(studentId);
    const existingTicket = studentTickets[0];

    const fetchedTicket = await MaintenanceService.getTicketById(existingTicket.id);
    expect(fetchedTicket).toBeDefined();
    expect(fetchedTicket?.id).toBe(existingTicket.id);
    expect(fetchedTicket?.description).toBe(existingTicket.description);
  });

  test('should update ticket status to IN_PROGRESS and RESOLVED with artisan assignment', async () => {
    const studentTickets = await MaintenanceService.getStudentTickets(studentId);
    const targetTicket = studentTickets[0];

    // Assign artisan and update status to IN_PROGRESS
    const inProgressTicket = await MaintenanceService.updateTicketStatus({
      ticketId: targetTicket.id,
      status: 'IN_PROGRESS',
      assignedArtisanId: 'artisan_electrician_01'
    });

    expect(inProgressTicket?.status).toBe('IN_PROGRESS');
    expect(inProgressTicket?.assignedArtisanId).toBe('artisan_electrician_01');

    // Resolve ticket with proof-of-fix photo
    const proofOfFixUrl = 'https://unilagstay.edu.ng/uploads/fixes/fan_repaired.jpg';
    const resolvedTicket = await MaintenanceService.updateTicketStatus({
      ticketId: targetTicket.id,
      status: 'RESOLVED',
      photoAfterUrl: proofOfFixUrl
    });

    expect(resolvedTicket?.status).toBe('RESOLVED');
    expect(resolvedTicket?.photoAfterUrl).toBe(proofOfFixUrl);
    expect(resolvedTicket?.resolvedAt).toBeDefined();
  });
});
