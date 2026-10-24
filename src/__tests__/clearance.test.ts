import { ClearanceService } from '../api/clearanceService';
import { AuthService } from '../api/authService';
import { EligibilityService } from '../api/eligibilityService';

describe('ClearanceService - Digital Document Screening & Clearance [CLEARANCE-01]', () => {
  const testStudentId = `usr_clearance_test_${Date.now()}`;
  const testWardenId = `usr_warden_test_${Date.now()}`;

  beforeAll(async () => {
    await ClearanceService.initializeSchema();
    const client = AuthService.getDbClient();

    // Register a test student user and profile in database
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Test Clearance Student', ?, 'hashed_pass_123', '08012345678', 'STUDENT', 'MALE', 1)`,
      args: [testStudentId, `MAT_${Date.now()}`, `clearance_${Date.now()}@unilag.edu.ng`]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Science', 'Computer Science', 100, 'MAIN_CAMPUS', 'FRESHER', 1, 'NOT_STARTED')`,
      args: [testStudentId]
    });
  });

  test('should initialize schema and fetch initial empty clearance package', async () => {
    const pkg = await ClearanceService.getClearancePackage(testStudentId);

    expect(pkg).toBeDefined();
    expect(pkg.userId).toBe(testStudentId);
    expect(pkg.overallStatus).toBe('NOT_STARTED');
    expect(pkg.documents).toHaveLength(0);
  });

  test('should allow uploading a Medical Certificate document', async () => {
    const doc = await ClearanceService.uploadDocument({
      userId: testStudentId,
      documentType: 'MEDICAL_CERTIFICATE',
      fileUrl: 'https://unilagstay.edu.ng/docs/med_cert.pdf',
      fileName: 'Medical_Certificate.pdf'
    });

    expect(doc).toBeDefined();
    expect(doc.userId).toBe(testStudentId);
    expect(doc.documentType).toBe('MEDICAL_CERTIFICATE');
    expect(doc.verificationStatus).toBe('PENDING');

    const pkg = await ClearanceService.getClearancePackage(testStudentId);
    expect(pkg.documents).toHaveLength(1);
    expect(pkg.documents[0].fileName).toBe('Medical_Certificate.pdf');
  });

  test('should fail submitting package if not all 3 required documents are uploaded', async () => {
    await expect(ClearanceService.submitClearancePackage(testStudentId))
      .rejects
      .toThrow('Cannot submit clearance package. Missing required document(s)');
  });

  test('should upload remaining required documents (Passport Photo and Code of Conduct)', async () => {
    await ClearanceService.uploadDocument({
      userId: testStudentId,
      documentType: 'PASSPORT_PHOTO',
      fileUrl: 'https://unilagstay.edu.ng/docs/passport.jpg',
      fileName: 'Passport_Photo.jpg'
    });

    await ClearanceService.uploadDocument({
      userId: testStudentId,
      documentType: 'CODE_OF_CONDUCT',
      fileUrl: 'https://unilagstay.edu.ng/docs/code_of_conduct.pdf',
      fileName: 'Code_of_Conduct.pdf'
    });

    const pkg = await ClearanceService.getClearancePackage(testStudentId);
    expect(pkg.documents).toHaveLength(3);
  });

  test('should successfully submit clearance package when all documents are present', async () => {
    const submittedPkg = await ClearanceService.submitClearancePackage(testStudentId);

    expect(submittedPkg.overallStatus).toBe('PENDING');
  });

  test('should allow Warden review to approve clearance package and generate certificate hash', async () => {
    const approvedPkg = await ClearanceService.reviewClearancePackage({
      userId: testStudentId,
      wardenId: testWardenId,
      status: 'APPROVED'
    });

    expect(approvedPkg.overallStatus).toBe('APPROVED');
    expect(approvedPkg.clearanceCertificateHash).toBeDefined();
    expect(approvedPkg.clearanceCertificateHash).toContain('CERT-');
  });

  test('should reflect updated clearance status in EligibilityService', async () => {
    const eligibility = await EligibilityService.verifyEligibility(testStudentId);

    expect(eligibility.clearanceStatus).toBe('APPROVED');
    expect(eligibility.clearanceCertificateHash).toBeDefined();
  });
});
