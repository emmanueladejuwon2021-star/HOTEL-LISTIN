import {
  initMaintenanceTables,
  createMaintenanceTicket,
  getStudentTickets,
  cancelMaintenanceTicket,
} from '../api/maintenanceService';
import { useMaintenanceStore } from '../store/useMaintenanceStore';

describe('Maintenance Ticket System [MAINTENANCE-03 / UAT-0053]', () => {
  const studentId = 'std-test-53';

  beforeEach(() => {
    useMaintenanceStore.getState().resetForm();
    useMaintenanceStore.setState({ tickets: [] });
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
    store.setDescription('Wall socket sparking when plug inserted.');
    store.setPhotoUrl('https://example.com/socket.jpg');

    const updated = useMaintenanceStore.getState();
    expect(updated.activeCategory).toBe('ELECTRICAL');
    expect(updated.description).toBe('Wall socket sparking when plug inserted.');
    expect(updated.photoUrl).toBe('https://example.com/socket.jpg');
  });
});
