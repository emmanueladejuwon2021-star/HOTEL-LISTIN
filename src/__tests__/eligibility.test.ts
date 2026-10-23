import { AuthService } from '../api/authService';
import { EligibilityService } from '../api/eligibilityService';

describe('[ELIGIBILITY-01 / UAT-0002] Student Eligibility Verification & Fees Check Integration Tests', () => {
  const testUserId = 'usr_190407089_eligibility';
  const unpaidUserId = 'usr_200102031_unpaid';
  const flaggedUserId = 'usr_200405061_flagged';

  beforeAll(async () => {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean existing records if re-running
    await client.execute({ sql: 'DELETE FROM disciplinary_records WHERE user_id IN (?, ?, ?)', args: [testUserId, unpaidUserId, flaggedUserId] });
    await client.execute({ sql: 'DELETE FROM student_profiles WHERE user_id IN (?, ?, ?)', args: [testUserId, unpaidUserId, flaggedUserId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?, ?)', args: [testUserId, unpaidUserId, flaggedUserId] });

    // 1. Seed Eligible Student (Fees Paid = 1, Disciplinary Status = CLEARED)
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId, '190407089', 'Chinedu Okonkwo', 'chinedu@live.unilag.edu.ng', '+2348011111111', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId, 'Engineering', 'Electrical Engineering', 100, 'MAIN_CAMPUS', 'FRESHER', 1, 'APPROVED']
    });

    // 2. Seed Unpaid Fee Student (Fees Paid = 0)
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [unpaidUserId, '200102031', 'Amina Bello', 'amina@live.unilag.edu.ng', '+2348022222222', 'STUDENT', 'FEMALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [unpaidUserId, 'Arts', 'English', 200, 'MAIN_CAMPUS', 'STALLITE', 0, 'NOT_STARTED']
    });

    // 3. Seed Disciplinary Flagged Student
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [flaggedUserId, '200405061', 'Tunde Williams', 'tunde@live.unilag.edu.ng', '+2348033333333', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [flaggedUserId, 'Law', 'Jurisprudence', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'NOT_STARTED']
    });

    await client.execute({
      sql: `INSERT INTO disciplinary_records (user_id, status, reason)
            VALUES (?, ?, ?)`,
      args: [flaggedUserId, 'SUSPENDED', 'Hostel Rule Violation']
    });
  });

  describe('Priority Category Calculation Logic', () => {
    test('assigns FRESHER category to 100L student', () => {
      const cat = EligibilityService.determinePriorityCategory(100);
      expect(cat).toBe('FRESHER');
    });

    test('assigns FINALIST category to 400L+ student', () => {
      const cat = EligibilityService.determinePriorityCategory(400);
      expect(cat).toBe('FINALIST');
    });

    test('assigns STALLITE category to 200L/300L student', () => {
      const cat = EligibilityService.determinePriorityCategory(200);
      expect(cat).toBe('STALLITE');
    });

    test('overrides with SCHOLAR tag if scholar is true', () => {
      const cat = EligibilityService.determinePriorityCategory(200, false, true);
      expect(cat).toBe('SCHOLAR');
    });
  });

  describe('Live Turso DB Eligibility Verification (UAT-0002)', () => {
    test('confirms eligibility for student with paid fees and cleared disciplinary standing', async () => {
      const result = await EligibilityService.verifyEligibility(testUserId);

      expect(result.userId).toBe(testUserId);
      expect(result.isEligible).toBe(true);
      expect(result.feesPaid).toBe(true);
      expect(result.disciplinaryStatus).toBe('CLEARED');
      expect(result.priorityCategory).toBe('FRESHER');
      expect(result.statusMessage).toContain('Eligible for Balloting');
    });

    test('marks student as ineligible when tuition fees are unpaid', async () => {
      const result = await EligibilityService.verifyEligibility(unpaidUserId);

      expect(result.userId).toBe(unpaidUserId);
      expect(result.isEligible).toBe(false);
      expect(result.feesPaid).toBe(false);
      expect(result.statusMessage).toContain('School Fees Payment Unverified');
    });

    test('marks student as ineligible when disciplinary record is suspended or flagged', async () => {
      const result = await EligibilityService.verifyEligibility(flaggedUserId);

      expect(result.userId).toBe(flaggedUserId);
      expect(result.isEligible).toBe(false);
      expect(result.disciplinaryStatus).toBe('SUSPENDED');
      expect(result.statusMessage).toContain('Hostel Rule Violation');
    });

    test('syncs fee payment status in Turso DB and transitions student to eligible state', async () => {
      // Unpaid student syncs fees via Remita RRR
      const updated = await EligibilityService.syncFeePayment({
        userId: unpaidUserId,
        transactionReference: 'RRR_1234567890',
        amount: 25000,
        paymentStatus: 'SUCCESSFUL'
      });

      expect(updated.feesPaid).toBe(true);
      expect(updated.isEligible).toBe(true);
      expect(updated.statusMessage).toContain('Eligible for Balloting');
    });

    test('throws error when non-existent user ID is passed', async () => {
      await expect(
        EligibilityService.verifyEligibility('non_existent_id')
      ).rejects.toThrow('Student record or active profile not found');
    });
  });
});
