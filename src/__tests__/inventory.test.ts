import { InventoryService } from '../api/inventoryService';
import { AuthService } from '../api/authService';

/**
 * Automated Test Suite for Room Check-In & Check-Out Audit & Property Inspection [INVENTORY-01 - INVENTORY-05].
 * Verifies joint room property check-in and check-out inspections (mattress, fan, sockets, locks condition),
 * student/porter digital touchscreen signatures, auto-generated check-in/check-out defect reports,
 * check-out damage liability assessment, bedspace recycling upon clean clearance,
 * and database audit persistence using real Turso libSQL SQLite queries without mocks.
 *
 * Includes plain-language English comments for non-technical stakeholders.
 */
describe('InventoryService - Room Check-In & Check-Out Audit & Property Inspection [INVENTORY-01 - INVENTORY-05]', () => {
  const testRoomId = `rm_jaja_a_101_${Date.now()}`;
  const testStudentId = `usr_student_inv_${Date.now()}`;
  const testPorterId = `usr_porter_inv_${Date.now()}`;
  const testBedspaceId = `bed_jaja_a_101_1_${Date.now()}`;

  beforeAll(async () => {
    await InventoryService.initializeSchema();
    const client = AuthService.getDbClient();

    // Register test student and porter in database
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Inventory Test Student', ?, 'hashed_pass_123', '08011112222', 'STUDENT', 'MALE', 1)`,
      args: [testStudentId, `MAT_INV_${Date.now()}`, `inv_student_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Inventory Test Porter', ?, 'hashed_pass_123', '08033334444', 'PORTER', 'MALE', 1)`,
      args: [testPorterId, `STF_INV_${Date.now()}`, `inv_porter_${Date.now()}@unilag.edu.ng`]
    });

    // Register test hostel and room so foreign keys pass
    await client.execute({
      sql: `INSERT OR IGNORE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES ('hostel_main', 'Jaja Hall', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 1000, 1000)`,
      args: []
    });

    await client.execute({
      sql: `INSERT OR IGNORE INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES (?, 'hostel_main', 'Block A', 1, '101', 4, 1)`,
      args: [testRoomId]
    });

    // Register test confirmed bedspace allocation for the student
    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id)
            VALUES (?, ?, 'Bed A Down', 'CONFIRMED', ?)`,
      args: [testBedspaceId, testRoomId, testStudentId]
    });
  });

  test('should initialize schema and query empty initial audits', async () => {
    const audits = await InventoryService.getAuditsByStudent(testStudentId);
    expect(audits).toBeDefined();
    expect(audits).toHaveLength(0);
  });

  test('should record a room check-in inventory audit with property conditions and signatures [INVENTORY-01]', async () => {
    const audit = await InventoryService.recordAudit({
      roomId: testRoomId,
      studentId: testStudentId,
      porterId: testPorterId,
      mattressCondition: 'GOOD',
      fanCondition: 'GOOD',
      socketsCondition: 'FAIR',
      locksCondition: 'GOOD',
      studentSignatureUrl: 'https://unilagstay.edu.ng/sigs/student_sig.png',
      porterSignatureUrl: 'https://unilagstay.edu.ng/sigs/porter_sig.png',
      notes: 'Fan regulator knob slightly loose on check-in inspection.',
      auditType: 'CHECK_IN'
    });

    expect(audit).toBeDefined();
    expect(audit.id).toContain('audit_');
    expect(audit.roomId).toBe(testRoomId);
    expect(audit.studentId).toBe(testStudentId);
    expect(audit.porterId).toBe(testPorterId);
    expect(audit.mattressCondition).toBe('GOOD');
    expect(audit.socketsCondition).toBe('FAIR');
    expect(audit.auditType).toBe('CHECK_IN');
    expect(audit.notes).toContain('Fan regulator');
  });

  test('should verify joint student and porter touchscreen digital signatures [INVENTORY-02 / UAT-0027]', async () => {
    const audit = await InventoryService.recordAudit({
      roomId: testRoomId,
      studentId: testStudentId,
      porterId: testPorterId,
      mattressCondition: 'GOOD',
      fanCondition: 'GOOD',
      socketsCondition: 'GOOD',
      locksCondition: 'GOOD',
      studentSignatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      porterSignatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    });

    expect(audit.hasStudentSignature).toBe(true);
    expect(audit.hasPorterSignature).toBe(true);
    expect(audit.studentSignatureUrl).toContain('data:image/png');
    expect(audit.porterSignatureUrl).toContain('data:image/png');
  });

  test('should auto-generate maintenance defect report when check-in item is marked POOR [INVENTORY-03 / UAT-0028]', async () => {
    const audit = await InventoryService.recordAudit({
      roomId: testRoomId,
      studentId: testStudentId,
      porterId: testPorterId,
      mattressCondition: 'POOR',
      fanCondition: 'GOOD',
      socketsCondition: 'POOR',
      locksCondition: 'GOOD',
      notes: 'Broken spring in mattress and socket faceplate damaged.'
    });

    expect(audit.autoGeneratedDefects).toBeDefined();
    expect(audit.autoGeneratedDefects?.length).toBe(2);

    // Verify defect ticket was inserted into maintenance_tickets in database
    const client = AuthService.getDbClient();
    const ticketRes = await client.execute({
      sql: `SELECT id, category, description, status FROM maintenance_tickets WHERE student_id = ? AND room_number = ?`,
      args: [testStudentId, testRoomId]
    });

    expect(ticketRes.rows.length).toBeGreaterThanOrEqual(2);
    expect(String(ticketRes.rows[0].status)).toBe('OPEN');
  });

  test('should record check-out property inspection with damage assessment when items are POOR [INVENTORY-05 / UAT-0030]', async () => {
    const checkoutAudit = await InventoryService.recordAudit({
      roomId: testRoomId,
      studentId: testStudentId,
      porterId: testPorterId,
      mattressCondition: 'POOR',
      fanCondition: 'GOOD',
      socketsCondition: 'POOR',
      locksCondition: 'GOOD',
      auditType: 'CHECK_OUT',
      notes: 'Mattress ripped and wall socket burnt during session.'
    });

    expect(checkoutAudit.auditType).toBe('CHECK_OUT');
    expect(checkoutAudit.checkoutStatus).toBe('DAMAGES_ASSESSED');
    expect(checkoutAudit.damageFee).toBe(5000.0); // 2 items * 2500
    expect(checkoutAudit.autoGeneratedDefects).toHaveLength(2);
  });

  test('should issue clean check-out clearance certificate and recycle room bedspace when all items are GOOD/FAIR [INVENTORY-05 / UAT-0030]', async () => {
    const cleanCheckoutAudit = await InventoryService.recordAudit({
      roomId: testRoomId,
      studentId: testStudentId,
      porterId: testPorterId,
      mattressCondition: 'GOOD',
      fanCondition: 'GOOD',
      socketsCondition: 'FAIR',
      locksCondition: 'GOOD',
      auditType: 'CHECK_OUT',
      notes: 'All keys returned and room vacated in clean condition.'
    });

    expect(cleanCheckoutAudit.auditType).toBe('CHECK_OUT');
    expect(cleanCheckoutAudit.checkoutStatus).toBe('CLEARED');
    expect(cleanCheckoutAudit.damageFee).toBe(0);

    // Verify student bedspace status was updated back to AVAILABLE in database
    const client = AuthService.getDbClient();
    const bedRes = await client.execute({
      sql: `SELECT id, status, allocated_to_user_id FROM bedspaces WHERE id = ?`,
      args: [testBedspaceId]
    });

    expect(bedRes.rows.length).toBe(1);
    expect(String(bedRes.rows[0].status)).toBe('AVAILABLE');
    expect(bedRes.rows[0].allocated_to_user_id).toBeNull();
  });

  test('should fetch recorded room audits by student ID including check-out fields', async () => {
    const studentAudits = await InventoryService.getAuditsByStudent(testStudentId);
    expect(studentAudits.length).toBeGreaterThanOrEqual(2);
    expect(studentAudits[0].studentName).toBe('Inventory Test Student');
    expect(studentAudits[0].porterName).toBe('Inventory Test Porter');
    expect(studentAudits.some(a => a.auditType === 'CHECK_OUT')).toBe(true);
  });

  test('should fetch recorded room audits by room ID [UAT-0026]', async () => {
    const roomAudits = await InventoryService.getAuditsByRoom(testRoomId);
    expect(roomAudits.length).toBeGreaterThanOrEqual(2);
    expect(roomAudits[0].studentId).toBe(testStudentId);
  });

  test('should fail recording audit if required parameters are missing', async () => {
    await expect(InventoryService.recordAudit({
      roomId: '   ',
      studentId: testStudentId,
      porterId: testPorterId,
      mattressCondition: 'GOOD',
      fanCondition: 'GOOD',
      socketsCondition: 'GOOD',
      locksCondition: 'GOOD'
    })).rejects.toThrow('Valid room ID is required');
  });
});
