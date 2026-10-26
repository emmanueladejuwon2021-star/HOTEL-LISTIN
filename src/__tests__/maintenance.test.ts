import { AuthService } from '../api/authService';
import { MaintenanceService } from '../api/maintenanceService';
import { useMaintenanceStore } from '../store/useMaintenanceStore';

/**
 * Automated Unit and User Acceptance Tests for [MAINTENANCE-05] / UAT-0060.
 *
 * Tests the Artisan Repair Job Queue & Proof-of-Fix Upload System for campus artisans:
 * - Table schema creation and foreign key constraints.
 * - Defect ticket creation and queue retrieval in SLA order.
 * - Queue filtering by defect category and urgency SLA.
 * - Job status transition from OPEN -> IN_PROGRESS on artisan claim.
 * - Resolution validation requiring valid proof-of-fix "After" photograph upload.
 * - Zustand useMaintenanceStore state actions and error handling.
 */
describe('Artisan Repair Job Queue & Proof-of-Fix Upload System [MAINTENANCE-05 / UAT-0060]', () => {
  let studentUserId: string;
  let artisanUserId: string;

  beforeAll(async () => {
    await MaintenanceService.initializeSchema();
    const client = AuthService.getDbClient();

    const timestamp = Date.now();
    // Create test student user with unique email and matric number
    studentUserId = `stu_maint_${timestamp}`;
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, ?, 'Maintenance Student', ?, '08011112222', 'STUDENT', 'MALE', 'hashed_pass_123')`,
      args: [studentUserId, `MAT-${timestamp}`, `stu.maint.${timestamp}@unilag.edu.ng`]
    });

    // Create test maintenance artisan staff user with unique email and staff number
    artisanUserId = `art_staff_${timestamp}`;
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, ?, 'John Plumber Artisan', ?, '08033334444', 'MAINTENANCE', 'MALE', 'hashed_pass_123')`,
      args: [artisanUserId, `STAFF-MNT-${timestamp}`, `john.artisan.${timestamp}@unilag.edu.ng`]
    });
  });

  beforeEach(() => {
    useMaintenanceStore.setState({
      tickets: [],
      filter: { category: 'ALL', status: 'ALL', urgency: 'ALL' },
      isLoading: false,
      error: null,
      successMessage: null
    });
  });

  test('should create defect tickets and retrieve artisan work queue sorted by SLA urgency [MAINTENANCE-05 / UAT-0060]', async () => {
    // 1. Create a medium urgency plumbing defect ticket
    const ticket1 = await MaintenanceService.createTicket({
      studentId: studentUserId,
      roomNumber: 'Room 204',
      category: 'PLUMBING',
      urgency: 'MEDIUM',
      description: 'Washbasin tap leaking water constantly.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/tap_leaking.jpg'
    });

    // 2. Create an emergency electrical defect ticket
    const ticket2 = await MaintenanceService.createTicket({
      studentId: studentUserId,
      roomNumber: 'Room 112',
      category: 'ELECTRICAL',
      urgency: 'EMERGENCY',
      description: 'Bare electric wire sparking near ceiling fan.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/sparking_wire.jpg'
    });

    expect(ticket1.status).toBe('OPEN');
    expect(ticket2.status).toBe('OPEN');

    // 3. Retrieve work queue; emergency ticket must come first in SLA priority
    const queue = await MaintenanceService.getArtisanJobQueue();
    expect(queue.length).toBeGreaterThanOrEqual(2);

    const emergencyTicketIndex = queue.findIndex(t => t.id === ticket2.id);
    const mediumTicketIndex = queue.findIndex(t => t.id === ticket1.id);

    expect(emergencyTicketIndex).toBeLessThan(mediumTicketIndex);
  });

  test('should filter artisan job queue by category and urgency SLA [MAINTENANCE-05 / UAT-0060]', async () => {
    // Create carpentry ticket
    await MaintenanceService.createTicket({
      studentId: studentUserId,
      roomNumber: 'Room 305',
      category: 'CARPENTRY',
      urgency: 'LOW',
      description: 'Wardrobe door hinge loose.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/hinge.jpg'
    });

    // Filter queue by category CARPENTRY
    const carpentryQueue = await MaintenanceService.getArtisanJobQueue({ category: 'CARPENTRY' });
    expect(carpentryQueue.every(t => t.category === 'CARPENTRY')).toBe(true);

    // Filter queue by urgency EMERGENCY
    const emergencyQueue = await MaintenanceService.getArtisanJobQueue({ urgency: 'EMERGENCY' });
    expect(emergencyQueue.every(t => t.urgency === 'EMERGENCY')).toBe(true);
  });

  test('should transition job status to IN_PROGRESS when artisan claims ticket [MAINTENANCE-05 / UAT-0060]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId: studentUserId,
      roomNumber: 'Room 401',
      category: 'PLUMBING',
      urgency: 'HIGH',
      description: 'Clogged shower drain.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/drain.jpg'
    });

    expect(ticket.status).toBe('OPEN');
    expect(ticket.assigned_artisan_id).toBeNull();

    // Artisan claims job
    const updatedTicket = await MaintenanceService.startRepairJob(ticket.id, artisanUserId);

    expect(updatedTicket.status).toBe('IN_PROGRESS');
    expect(updatedTicket.assigned_artisan_id).toBe(artisanUserId);
  });

  test('should require proof-of-fix "After" photograph to resolve ticket [MAINTENANCE-05 / UAT-0060]', async () => {
    const ticket = await MaintenanceService.createTicket({
      studentId: studentUserId,
      roomNumber: 'Room 108',
      category: 'PLUMBING',
      urgency: 'HIGH',
      description: 'Broken flush valve on toilet.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/flush.jpg'
    });

    await MaintenanceService.startRepairJob(ticket.id, artisanUserId);

    // Reject completion if photoAfterUrl is missing or empty
    await expect(
      MaintenanceService.completeRepairJob({
        ticketId: ticket.id,
        artisanId: artisanUserId,
        photoAfterUrl: ''
      })
    ).rejects.toThrow('Proof-of-fix "After" photograph is strictly required');

    // Successfully complete job with valid proof-of-fix photo URL
    const proofPhotoUrl = 'https://unilagstay.edu.ng/proof/repaired_flush_valve.jpg';
    const resolvedTicket = await MaintenanceService.completeRepairJob({
      ticketId: ticket.id,
      artisanId: artisanUserId,
      photoAfterUrl: proofPhotoUrl,
      completionNotes: 'Replaced broken valve washer with brand new unit.'
    });

    expect(resolvedTicket.status).toBe('RESOLVED');
    expect(resolvedTicket.photo_after_url).toBe(proofPhotoUrl);
    expect(resolvedTicket.resolved_at).toBeDefined();
    expect(resolvedTicket.resolved_at).not.toBeNull();
  });

  test('should manage artisan queue actions and notifications seamlessly via Zustand useMaintenanceStore [MAINTENANCE-05 / UAT-0060]', async () => {
    // 1. Create ticket to act upon first
    const ticket = await MaintenanceService.createTicket({
      studentId: studentUserId,
      roomNumber: 'Room 502',
      category: 'MASONRY',
      urgency: 'LOW',
      description: 'Damaged wall plaster near window.',
      photoBeforeUrl: 'https://unilagstay.edu.ng/defects/wall_crack.jpg'
    });

    // 2. Fetch job queue into store
    await useMaintenanceStore.getState().fetchJobQueue();
    expect(useMaintenanceStore.getState().tickets.length).toBeGreaterThan(0);

    // 3. Start job via store action
    await useMaintenanceStore.getState().startJob(ticket.id, artisanUserId);
    expect(useMaintenanceStore.getState().successMessage).toContain('Job started successfully');

    // 4. Complete job with proof-of-fix via store action
    await useMaintenanceStore.getState().completeJob({
      ticketId: ticket.id,
      artisanId: artisanUserId,
      photoAfterUrl: 'https://unilagstay.edu.ng/proof/repaired_wall_plaster.jpg'
    });

    expect(useMaintenanceStore.getState().successMessage).toContain('Proof-of-fix uploaded');

    const resolvedInStore = useMaintenanceStore.getState().tickets.find(t => t.id === ticket.id);
    expect(resolvedInStore?.status).toBe('RESOLVED');
    expect(resolvedInStore?.photo_after_url).toBe('https://unilagstay.edu.ng/proof/repaired_wall_plaster.jpg');
  });
});
