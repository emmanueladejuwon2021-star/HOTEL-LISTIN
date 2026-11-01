import {
  initMaintenanceTables,
  createMaintenanceTicket,
  getStudentTickets,
  getStudentTicketsByStatus,
  getTicketDetails,
  confirmTicketResolution,
  cancelMaintenanceTicket,
} from '../api/maintenanceService';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { createClient } from '@libsql/client';

describe('Maintenance Ticket System [MAINTENANCE-04 / UAT-0054]', () => {
  const studentId = 'std-test-54';

  beforeEach(() => {
    useMaintenanceStore.getState().resetForm();
    useMaintenanceStore.setState({ tickets: [], statusFilter: 'ALL', selectedTicket: null });
  });

  test('should initialize maintenance_tickets database table without throwing errors', async () => {
    await expect(initMaintenanceTables()).resolves.not.toThrow();
  });

  test('should create a photo-backed repair ticket in Turso DB with correct SLA and OPEN status', async () => {
    const ticket = await createMaintenanceTicket({
      studentId,
      hostelId: 'Moremi Hall',
      roomNumber: 'B-102',
      category: 'PLUMBING',
      description: 'The bathroom tap is leaking heavily.',
      photoBeforeUrl: 'https://example.com/tap-leak.jpg',
    });

    expect(ticket.id).toMatch(/^TKT-/);
    expect(ticket.studentId).toBe(studentId);
    expect(ticket.category).toBe('PLUMBING');
    expect(ticket.priority).toBe('HIGH');
    expect(ticket.targetSla).toBe('< 24 Hours');
    expect(ticket.status).toBe('OPEN');
  });

  test('should throw validation error if description is empty when creating ticket', async () => {
    await expect(
      createMaintenanceTicket({
        studentId,
        hostelId: 'King Jaja Hall',
        roomNumber: 'A-204',
        category: 'ELECTRICAL',
        description: '',
        photoBeforeUrl: 'https://example.com/spark.jpg',
      })
    ).rejects.toThrow('Please enter a description of the defect or damage in your room.');
  });

  test('should throw validation error if photo URL is missing when creating ticket', async () => {
    await expect(
      createMaintenanceTicket({
        studentId,
        hostelId: 'King Jaja Hall',
        roomNumber: 'A-204',
        category: 'CARPENTRY',
        description: 'Door hinge broken.',
        photoBeforeUrl: '',
      })
    ).rejects.toThrow('A photo attachment showing the broken facility or defect is required.');
  });

  test('should retrieve all repair tickets for a given student from Turso DB', async () => {
    await createMaintenanceTicket({
      studentId,
      hostelId: 'Kofo Hall',
      roomNumber: 'C-301',
      category: 'APPLIANCE',
      description: 'Ceiling fan light fitting flickering.',
      photoBeforeUrl: 'https://example.com/fan.jpg',
    });

    const list = await getStudentTickets(studentId);
    expect(list.length).toBeGreaterThan(0);
    const found = list.find((t) => t.studentId === studentId && t.category === 'APPLIANCE');
    expect(found).toBeDefined();
    expect(found?.description).toBe('Ceiling fan light fitting flickering.');
  });

  test('should allow student to cancel an OPEN maintenance ticket', async () => {
    const ticket = await createMaintenanceTicket({
      studentId,
      hostelId: 'Eni Njoku Hall',
      roomNumber: 'B-205',
      category: 'STRUCTURAL',
      description: 'Window mesh torn.',
      photoBeforeUrl: 'https://example.com/window.jpg',
    });

    const ok = await cancelMaintenanceTicket(ticket.id, studentId);
    expect(ok).toBe(true);

    const list = await getStudentTickets(studentId);
    const updated = list.find((t) => t.id === ticket.id);
    expect(updated?.status).toBe('CANCELLED');
  });

  test('should update Zustand store state when actions are called', () => {
    const store = useMaintenanceStore.getState();
    store.setCategory('ELECTRICAL');
    store.setStatusFilter('RESOLVED');
    store.setRating(4);
    store.setStudentFeedback('Artisan arrived on time and fixed the socket.');
    store.setDescription('Wall socket sparking when plug inserted.');
    store.setPhotoUrl('https://example.com/socket.jpg');

    const updated = useMaintenanceStore.getState();
    expect(updated.activeCategory).toBe('ELECTRICAL');
    expect(updated.statusFilter).toBe('RESOLVED');
    expect(updated.rating).toBe(4);
    expect(updated.studentFeedback).toBe('Artisan arrived on time and fixed the socket.');
    expect(updated.description).toBe('Wall socket sparking when plug inserted.');
    expect(updated.photoUrl).toBe('https://example.com/socket.jpg');
  });

  test('should retrieve ticket details by ID using getTicketDetails', async () => {
    const created = await createMaintenanceTicket({
      studentId,
      hostelId: 'Biobaku Hall',
      roomNumber: 'A-105',
      category: 'MASONRY',
      description: 'Plaster peeling off wall near window.',
      photoBeforeUrl: 'https://example.com/wall-peel.jpg',
    });

    const details = await getTicketDetails(created.id);
    expect(details).not.toBeNull();
    expect(details?.id).toBe(created.id);
    expect(details?.studentId).toBe(studentId);
    expect(details?.category).toBe('MASONRY');
    expect(details?.description).toBe('Plaster peeling off wall near window.');
  });

  test('should filter student tickets by status using getStudentTicketsByStatus', async () => {
    const tkt1 = await createMaintenanceTicket({
      studentId,
      hostelId: 'King Jaja Hall',
      roomNumber: 'B-201',
      category: 'PLUMBING',
      description: 'Shower tap stuck.',
      photoBeforeUrl: 'https://example.com/tap.jpg',
    });

    const allList = await getStudentTicketsByStatus(studentId, 'ALL');
    const openList = await getStudentTicketsByStatus(studentId, 'OPEN');

    expect(allList.length).toBeGreaterThan(0);
    expect(openList.length).toBeGreaterThan(0);
    expect(openList.every((t) => t.status === 'OPEN')).toBe(true);
  });

  test('should allow student to confirm resolution of a RESOLVED ticket with rating and feedback [UAT-0054]', async () => {
    const ticket = await createMaintenanceTicket({
      studentId,
      hostelId: 'Madam Tinubu Hall',
      roomNumber: 'C-402',
      category: 'ELECTRICAL',
      description: 'Ceiling fan light socket dead.',
      photoBeforeUrl: 'https://example.com/fan-dead.jpg',
    });

    // Simulate artisan setting status to RESOLVED in Turso DB
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:unilagstay.db',
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    });

    await db.execute({
      sql: `UPDATE maintenance_tickets SET status = 'RESOLVED', photo_after_url = ? WHERE id = ?`,
      args: ['https://example.com/fan-fixed.jpg', ticket.id],
    });

    // Student confirms resolution with 5 star rating
    const success = await confirmTicketResolution({
      ticketId: ticket.id,
      studentId,
      rating: 5,
      studentFeedback: 'Great work by electrician, fan light working perfectly!',
    });

    expect(success).toBe(true);

    const updated = await getTicketDetails(ticket.id);
    expect(updated?.rating).toBe(5);
    expect(updated?.studentFeedback).toBe('Great work by electrician, fan light working perfectly!');
    expect(updated?.confirmedAt).toBeDefined();
  });

  test('should reject confirmation rating if rating is out of bounds (0 or 6)', async () => {
    await expect(
      confirmTicketResolution({
        ticketId: 'TKT-INVALID',
        studentId,
        rating: 6,
        studentFeedback: 'Too high rating',
      })
    ).rejects.toThrow('Please select a star rating between 1 and 5.');
  });
});
