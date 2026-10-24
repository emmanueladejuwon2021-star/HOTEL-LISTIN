import { ClearanceService } from '../api/clearanceService';
import { AuthService } from '../api/authService';
import { EligibilityService } from '../api/eligibilityService';
import { validateDocumentFile } from '../utils/validation';

/**
 * Automated Test Suite for Digital Clearance Document Screening [CLEARANCE-01 & CLEARANCE-02].
 * Verifies document uploads, format validations, document deletions, clearance submissions,
 * and warden approvals using real Turso libSQL SQLite queries without mocks.
 *
 * Includes plain-language English comments for non-technical stakeholders.
 */
describe('ClearanceService - Digital Document Screening & Clearance [CLEARANCE-01 & CLEARANCE-02]', () => {
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

  test('should validate document file URLs and formats using validateDocumentFile', () => {
    // Valid passport photo image
    const photoRes = validateDocumentFile('https://unilagstay.edu.ng/docs/passport.jpg', 'PASSPORT_PHOTO');
    expect(photoRes.isValid).toBe(true);
    expect(photoRes.detectedMimeType).toBe('image/jpeg');

    // Invalid passport photo format (e.g. text file instead of image)
    const invalidPhotoRes = validateDocumentFile('https://unilagstay.edu.ng/docs/passport.txt', 'PASSPORT_PHOTO');
    expect(invalidPhotoRes.isValid).toBe(false);
    expect(invalidPhotoRes.errorMessage).toContain('must be an image file');

    // Valid medical certificate PDF
    const medRes = validateDocumentFile('https://unilagstay.edu.ng/docs/med_cert.pdf', 'MEDICAL_CERTIFICATE');
    expect(medRes.isValid).toBe(true);
    expect(medRes.detectedMimeType).toBe('application/pdf');

    // Empty URL
    const emptyRes = validateDocumentFile('   ', 'MEDICAL_CERTIFICATE');
    expect(emptyRes.isValid).toBe(false);
  });

  test('should allow uploading a Medical Certificate document with metadata and notes', async () => {
    const doc = await ClearanceService.uploadDocument({
      userId: testStudentId,
      documentType: 'MEDICAL_CERTIFICATE',
      fileUrl: 'https://unilagstay.edu.ng/docs/med_cert.pdf',
      fileName: 'Medical_Certificate.pdf',
      fileSizeBytes: 512000,
      mimeType: 'application/pdf',
      notes: 'Issued at Jaja Clinic Ref #1024'
    });

    expect(doc).toBeDefined();
    expect(doc.userId).toBe(testStudentId);
    expect(doc.documentType).toBe('MEDICAL_CERTIFICATE');
    expect(doc.verificationStatus).toBe('PENDING');
    expect(doc.fileSizeBytes).toBe(512000);
    expect(doc.notes).toBe('Issued at Jaja Clinic Ref #1024');

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
      fileName: 'Passport_Photo.jpg',
      fileSizeBytes: 204800,
      notes: 'Red background confirmed'
    });

    await ClearanceService.uploadDocument({
      userId: testStudentId,
      documentType: 'CODE_OF_CONDUCT',
      fileUrl: 'https://unilagstay.edu.ng/docs/code_of_conduct.pdf',
      fileName: 'Code_of_Conduct.pdf',
      fileSizeBytes: 300000,
      notes: 'Signed by student'
    });

    const pkg = await ClearanceService.getClearancePackage(testStudentId);
    expect(pkg.documents).toHaveLength(3);
  });

  test('should allow deleting an uploaded document and reset clearance status', async () => {
    const pkgBefore = await ClearanceService.getClearancePackage(testStudentId);
    const docToDelete = pkgBefore.documents.find(d => d.documentType === 'CODE_OF_CONDUCT');
    expect(docToDelete).toBeDefined();

    // Delete Code of Conduct document
    const pkgAfter = await ClearanceService.deleteDocument(testStudentId, docToDelete!.id);

    expect(pkgAfter.documents).toHaveLength(2);
    expect(pkgAfter.documents.find(d => d.documentType === 'CODE_OF_CONDUCT')).toBeUndefined();
    expect(pkgAfter.overallStatus).toBe('NOT_STARTED');
  });

  test('should re-upload deleted document and successfully submit clearance package', async () => {
    // Re-upload Code of Conduct
    await ClearanceService.uploadDocument({
      userId: testStudentId,
      documentType: 'CODE_OF_CONDUCT',
      fileUrl: 'https://unilagstay.edu.ng/docs/code_of_conduct_updated.pdf',
      fileName: 'Code_of_Conduct_Updated.pdf',
      fileSizeBytes: 310000
    });

    const submittedPkg = await ClearanceService.submitClearancePackage(testStudentId);
    expect(submittedPkg.overallStatus).toBe('PENDING');
    expect(submittedPkg.documents).toHaveLength(3);
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

  test('should verify valid clearance certificate hash using verifyClearanceCertificate [CLEARANCE-03]', async () => {
    const pkg = await ClearanceService.getClearancePackage(testStudentId);
    expect(pkg.clearanceCertificateHash).toBeDefined();

    const verification = await ClearanceService.verifyClearanceCertificate(pkg.clearanceCertificateHash!);

    expect(verification.isValid).toBe(true);
    expect(verification.userId).toBe(testStudentId);
    expect(verification.fullName).toBe('Test Clearance Student');
    expect(verification.clearanceStatus).toBe('APPROVED');
    expect(verification.message).toContain('holds an officially approved UNILAG hostel clearance certificate');
  });

  test('should reject invalid or fake clearance certificate hashes [CLEARANCE-03]', async () => {
    const fakeVerification = await ClearanceService.verifyClearanceCertificate('CERT-FAKE12345678');

    expect(fakeVerification.isValid).toBe(false);
    expect(fakeVerification.message).toContain('Verification Failed');

    const emptyVerification = await ClearanceService.verifyClearanceCertificate('   ');
    expect(emptyVerification.isValid).toBe(false);
  });

  test('should record and retrieve clearance review history logs [CLEARANCE-03 / UAT-0023]', async () => {
    const logs = await ClearanceService.getClearanceReviewHistory(testStudentId);

    expect(logs).toBeDefined();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].userId).toBe(testStudentId);
    expect(logs[0].wardenId).toBe(testWardenId);
    expect(logs[0].actionStatus).toBe('APPROVED');
  });

  test('should record physical document inspection at porter desk and update clearance package [CLEARANCE-04 / UAT-0024]', async () => {
    const officerId = `porter_officer_${Date.now()}`;
    const verifiedDocs = ['Medical Certificate', 'Passport Photo', 'Code of Conduct Form'];
    const notes = 'Original documents inspected and stamped at King Jaja Hall porter desk.';

    const updatedPkg = await ClearanceService.recordPhysicalInspection({
      userId: testStudentId,
      officerId,
      inspectionStatus: 'INSPECTED_PASSED',
      verifiedOriginals: verifiedDocs,
      notes
    });

    expect(updatedPkg).toBeDefined();
    expect(updatedPkg.physicalInspectionStatus).toBe('INSPECTED_PASSED');
    expect(updatedPkg.physicalInspectionDetails).toBeDefined();
    expect(updatedPkg.physicalInspectionDetails?.officerId).toBe(officerId);
    expect(updatedPkg.physicalInspectionDetails?.verifiedOriginals).toContain('Medical Certificate');
    expect(updatedPkg.physicalInspectionDetails?.notes).toBe(notes);
  });
});
