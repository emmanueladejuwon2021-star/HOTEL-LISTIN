import { InventoryService } from '../api/inventoryService';
import { AuthService } from '../api/authService';

/**
 * Automated Test Suite for Room Check-In Audit & Property Inspection [INVENTORY-01, INVENTORY-02, INVENTORY-03].
 * Verifies joint room property check-in inspections (mattress, fan, sockets, locks condition),
 * student/porter digital touchscreen signatures, auto-generated check-in defect reports,
 * and database audit persistence using real Turso libSQL SQLite queries without mocks.
 *
 * Includes plain-language English comments for non-technical stakeholders.
 */
describe('InventoryService - Room Check-In Audit & Property Inspection [INVENTORY-01 - INVENTORY-03]', () => {
  const testRoomId = `rm_jaja_a_101_${Date.now()}`;
  const testStudentId = `usr_student_inv_${Date.now()}`;
  const testPorterId = `usr_porter_inv_${Date.now()}`;

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
      notes: 'Fan regulator knob slightly loose on check-in inspection.'
    });

    expect(audit).toBeDefined();
    expect(audit.id).toContain('audit_');
    expect(audit.roomId).toBe(testRoomId);
    expect(audit.studentId).toBe(testStudentId);
    expect(audit.porterId).toBe(testPorterId);
    expect(audit.mattressCondition).toBe('GOOD');
    expect(audit.socketsCondition).toBe('FAIR');
    expect(audit.notes).toContain('Fan regulator');
    expect(audit.certificateHash).toBeDefined();
    expect(audit.certificateHash).toContain('CERT-INV-');
  });

  test('should generate and verify immutable digital room check-in certificate reference hash [INVENTORY-04 / UAT-0029]', async () => {
    const audit = await InventoryService.recordAudit({
      roomId: testRoomId,
      studentId: testStudentId,
      porterId: testPorterId,
      mattressCondition: 'GOOD',
      fanCondition: 'GOOD',
      socketsCondition: 'GOOD',
      locksCondition: 'GOOD',
      notes: 'Certificate hash verification test.'
    });

    expect(audit.certificateHash).toBeDefined();
    expect(audit.certificateHash?.startsWith('CERT-INV-')).toBe(true);

    const verified = await InventoryService.getAuditByCertificateHash(audit.certificateHash!);
    expect(verified).toBeDefined();
    expect(verified?.id).toBe(audit.id);
    expect(verified?.roomId).toBe(testRoomId);
    expect(verified?.studentId).toBe(testStudentId);
    expect(verified?.certificateHash).toBe(audit.certificateHash);

    // Should return null for non-existent certificate hash code
    const invalidLookup = await InventoryService.getAuditByCertificateHash('CERT-INVALID-9999');
    expect(invalidLookup).toBeNull();
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

  test('should fetch recorded room audits by student ID', async () => {
    const studentAudits = await InventoryService.getAuditsByStudent(testStudentId);
    expect(studentAudits.length).toBeGreaterThanOrEqual(1);
    expect(studentAudits[0].roomId).toBe(testRoomId);
    expect(studentAudits[0].studentName).toBe('Inventory Test Student');
    expect(studentAudits[0].porterName).toBe('Inventory Test Porter');
  });

  test('should fetch recorded room audits by room ID [UAT-0026]', async () => {
    const roomAudits = await InventoryService.getAuditsByRoom(testRoomId);
    expect(roomAudits.length).toBeGreaterThanOrEqual(1);
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
