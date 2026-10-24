import { InventoryService } from '../api/inventoryService';
import { AuthService } from '../api/authService';

/**
 * Automated Test Suite for Room Check-In Audit & Property Inspection [INVENTORY-01].
 * Verifies joint room property check-in inspections (mattress, fan, sockets, locks condition),
 * database audit persistence, and query filters using real Turso libSQL SQLite queries without mocks.
 *
 * Includes plain-language English comments for non-technical stakeholders.
 */
describe('InventoryService - Room Check-In Audit & Property Inspection [INVENTORY-01]', () => {
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

  test('should record a room check-in inventory audit with property conditions and signatures', async () => {
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
  });

  test('should fetch recorded room audits by student ID', async () => {
    const studentAudits = await InventoryService.getAuditsByStudent(testStudentId);
    expect(studentAudits).toHaveLength(1);
    expect(studentAudits[0].roomId).toBe(testRoomId);
    expect(studentAudits[0].studentName).toBe('Inventory Test Student');
    expect(studentAudits[0].porterName).toBe('Inventory Test Porter');
  });

  test('should fetch recorded room audits by room ID [UAT-0026]', async () => {
    const roomAudits = await InventoryService.getAuditsByRoom(testRoomId);
    expect(roomAudits).toHaveLength(1);
    expect(roomAudits[0].studentId).toBe(testStudentId);
    expect(roomAudits[0].mattressCondition).toBe('GOOD');
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
