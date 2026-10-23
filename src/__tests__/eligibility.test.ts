import { AuthService } from '../api/authService';
import { EligibilityService } from '../api/eligibilityService';
import { useEligibilityStore } from '../store/useEligibilityStore';
import { validateRemitaRef } from '../utils/validation';

/**
 * Integration test suite for [ELIGIBILITY-01, ELIGIBILITY-02, ELIGIBILITY-03, ELIGIBILITY-04] / [UAT-0006, UAT-0007, UAT-0008, UAT-0009]
 * Student Eligibility Verification, Remita Fees Sync, Medical Screening, Special Needs Registration, and Digital Clearance Pass Hash.
 * Verifies live Turso DB interaction with zero mocks.
 */
describe('[ELIGIBILITY-01 to ELIGIBILITY-04] Student Eligibility & Fee Sync Integration Tests', () => {
  const testUserId = 'usr_190407089_eligibility';
  const unpaidUserId = 'usr_200102031_unpaid';
  const flaggedUserId = 'usr_200405061_flagged';

  beforeAll(async () => {
    // Initialize database tables in Turso libSQL DB
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean existing test records before running tests
    await client.execute({ sql: 'DELETE FROM payments WHERE user_id IN (?, ?, ?)', args: [testUserId, unpaidUserId, flaggedUserId] });
    await client.execute({ sql: 'DELETE FROM disciplinary_records WHERE user_id IN (?, ?, ?)', args: [testUserId, unpaidUserId, flaggedUserId] });
    await client.execute({ sql: 'DELETE FROM student_profiles WHERE user_id IN (?, ?, ?)', args: [testUserId, unpaidUserId, flaggedUserId] });
    await client.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?, ?)', args: [testUserId, unpaidUserId, flaggedUserId] });

    // 1. Seed Eligible Student Record (Fees Paid = 1, Disciplinary Status = CLEARED, Course Registered = 1, Medical Status = CLEARED)
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId, '190407089', 'Chinedu Okonkwo', 'chinedu@live.unilag.edu.ng', '+2348011111111', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, course_registered, medical_status, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testUserId, 'Engineering', 'Electrical Engineering', 100, 'MAIN_CAMPUS', 'FRESHER', 1, 1, 'CLEARED', 'NOT_STARTED']
    });

    // 2. Seed Unpaid Fee Student Record (Fees Paid = 0)
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [unpaidUserId, '200102031', 'Amina Bello', 'amina@live.unilag.edu.ng', '+2348022222222', 'STUDENT', 'FEMALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, course_registered, medical_status, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [unpaidUserId, 'Arts', 'English', 200, 'MAIN_CAMPUS', 'STALLITE', 0, 1, 'CLEARED', 'NOT_STARTED']
    });

    // 3. Seed Disciplinary Suspended Student Record
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [flaggedUserId, '200405061', 'Tunde Williams', 'tunde@live.unilag.edu.ng', '+2348033333333', 'STUDENT', 'MALE', 'hash', 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, course_registered, medical_status, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [flaggedUserId, 'Law', 'Jurisprudence', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 1, 'CLEARED', 'NOT_STARTED']
    });

    await client.execute({
      sql: `INSERT INTO disciplinary_records (user_id, status, reason)
            VALUES (?, ?, ?)`,
      args: [flaggedUserId, 'SUSPENDED', 'Hostel Rule Violation']
    });
  });

  describe('Remita Reference Validation Utility', () => {
    test('accepts valid 12-digit numeric RRR code', () => {
      const res = validateRemitaRef('123456789012');
      expect(res.isValid).toBe(true);
    });

    test('accepts valid alphanumeric transaction reference', () => {
      const res = validateRemitaRef('REM-839210-UNILAG');
      expect(res.isValid).toBe(true);
    });

    test('rejects empty or short reference code', () => {
      const res = validateRemitaRef('123');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('valid');
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

  describe('Live Turso DB Eligibility Verification (UAT-0006, UAT-0008, UAT-0009)', () => {
    test('confirms eligibility for student with paid fees, registered courses, medical clearance, and cleared disciplinary standing', async () => {
      const result = await EligibilityService.verifyEligibility(testUserId);

      expect(result.userId).toBe(testUserId);
      expect(result.isEligible).toBe(true);
      expect(result.feesPaid).toBe(true);
      expect(result.courseRegistered).toBe(true);
      expect(result.medicalStatus).toBe('CLEARED');
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

    test('syncs fee payment status in Turso DB, creates payment audit entry, and transitions student to eligible state', async () => {
      const refCode = '123456789012';
      const updated = await EligibilityService.syncFeePayment({
        userId: unpaidUserId,
        transactionReference: refCode,
        amount: 25000,
        paymentStatus: 'SUCCESSFUL',
        paymentType: 'TUITION_FEE'
      });

      expect(updated.feesPaid).toBe(true);
      expect(updated.isEligible).toBe(true);
      expect(updated.statusMessage).toContain('Eligible for Balloting');
      expect(updated.paymentHistory).toBeDefined();
      expect(updated.paymentHistory!.length).toBeGreaterThan(0);
      expect(updated.paymentHistory![0].transactionReference).toBe(refCode);
    });

    test('prevents duplicate transaction reference submission (anti-replay security rule)', async () => {
      const refCode = '123456789012';
      await expect(
        EligibilityService.syncFeePayment({
          userId: unpaidUserId,
          transactionReference: refCode,
          amount: 25000,
          paymentStatus: 'SUCCESSFUL'
        })
      ).rejects.toThrow('has already been synced');
    });

    test('registers special needs accommodation and updates priority category to SPECIAL_NEEDS (UAT-0009)', async () => {
      const updated = await EligibilityService.registerSpecialNeeds({
        userId: testUserId,
        specialNeedsDetails: 'Ground floor room required for wheelchair accessibility.'
      });

      expect(updated.specialNeedsRegistered).toBe(true);
      expect(updated.specialNeedsDetails).toContain('wheelchair accessibility');
      expect(updated.priorityCategory).toBe('SPECIAL_NEEDS');
    });

    test('generates cryptographic digital clearance pass hash when fully cleared and approved', async () => {
      // First update clearance status to APPROVED
      await EligibilityService.updateClearanceStatus(testUserId, 'APPROVED');
      const result = await EligibilityService.verifyEligibility(testUserId);

      expect(result.clearanceStatus).toBe('APPROVED');
      expect(result.clearanceCertificateHash).toBeDefined();
      expect(result.clearanceCertificateHash!).toMatch(/^CERT-[A-Z0-9]{16}$/);
    });

    test('throws error when non-existent user ID is passed', async () => {
      await expect(
        EligibilityService.verifyEligibility('non_existent_id')
      ).rejects.toThrow('Student record or active profile not found');
    });
  });

  describe('[ELIGIBILITY-02 / UAT-0007] Digital Document Clearance Status Lifecycle', () => {
    test('updates clearance status to PENDING upon student document submission', async () => {
      const result = await EligibilityService.updateClearanceStatus(testUserId, 'PENDING');

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.clearanceStatus).toBe('PENDING');
    });

    test('updates clearance status to APPROVED upon warden review', async () => {
      const result = await EligibilityService.updateClearanceStatus(testUserId, 'APPROVED');

      expect(result.clearanceStatus).toBe('APPROVED');
    });

    test('updates clearance status via Zustand store action', async () => {
      const store = useEligibilityStore.getState();
      const result = await store.updateClearance(testUserId, 'PENDING');

      expect(result.clearanceStatus).toBe('PENDING');

      const updatedStoreState = useEligibilityStore.getState();
      expect(updatedStoreState.eligibilityResult?.clearanceStatus).toBe('PENDING');
    });

    test('throws error when updating clearance for non-existent student user ID', async () => {
      await expect(
        EligibilityService.updateClearanceStatus('invalid_user_id', 'APPROVED')
      ).rejects.toThrow('Failed to update clearance status');
    });
  });
});
