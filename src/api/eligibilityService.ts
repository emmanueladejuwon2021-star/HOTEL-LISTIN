import { Client } from '@libsql/client';
import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import { ReservationService } from './reservationService';
import { EligibilityVerificationResult, FeeSyncParams, DisciplinaryStatus, MedicalStatus, FeePaymentRecord, SpecialNeedsParams, DisciplinaryStandingHistory, ClearanceReviewParams } from '../types/eligibility';
import { PriorityCategory, Campus, ClearanceStatus } from '../types/auth';

/**
 * Service class that handles student eligibility verification, school fee payment synchronization,
 * Jaja Clinic medical screening status, special needs quota registration, digital clearance certificates,
 * warden clearance reviews with feedback reasons, and payment history audit trails.
 * Checks student standing directly against the Turso libSQL database following a strict zero-mock policy.
 */
export class EligibilityService {
  /**
   * Creates or verifies required tables for disciplinary records and fee payments in the database if they do not exist yet.
   * This ensures the database schema is fully initialized before checking eligibility.
   */
  public static async initializeSchema(): Promise<void> {
    // Ensure base tables (users, student_profiles, bedspaces) are set up first
    await AuthService.initializeSchema();
    await ReservationService.initializeSchema();
    const client = AuthService.getDbClient();

    // Create table for student disciplinary flags and clearance documents
    await client.batch([
      `CREATE TABLE IF NOT EXISTS disciplinary_records (
        user_id TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED')) DEFAULT 'CLEARED',
        reason TEXT,
        flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bedspace_id TEXT,
        transaction_reference TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL,
        payment_type TEXT DEFAULT 'TUITION_FEE',
        payment_status TEXT CHECK(payment_status IN ('SUCCESSFUL', 'FAILED', 'PENDING')) DEFAULT 'SUCCESSFUL',
        paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bedspace_id) REFERENCES bedspaces(id) ON DELETE SET NULL
      );`
    ], 'write');

    // Safe schema migrations
    const migrationColumns = [
      `ALTER TABLE student_profiles ADD COLUMN course_registered INTEGER DEFAULT 1`,
      `ALTER TABLE student_profiles ADD COLUMN medical_status TEXT DEFAULT 'CLEARED'`,
      `ALTER TABLE student_profiles ADD COLUMN special_needs_registered INTEGER DEFAULT 0`,
      `ALTER TABLE student_profiles ADD COLUMN special_needs_details TEXT`,
      `ALTER TABLE student_profiles ADD COLUMN clearance_certificate_hash TEXT`,
      `ALTER TABLE student_profiles ADD COLUMN clearance_rejection_reason TEXT`
    ];

    for (const stmt of migrationColumns) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, ignore error
      }
    }
  }

  /**
   * Determines a student's priority quota category based on their level and special status.
   * Priority categories dictate balloting windows during hostel allocation.
   *
   * @param level - Academic level (e.g., 100L for freshers, 400L/500L for finalists)
   * @param specialNeeds - True if student has registered special accommodation needs
   * @param scholar - True if student holds an academic scholarship
   * @returns PriorityCategory string ('FRESHER', 'FINALIST', 'SCHOLAR', 'SPECIAL_NEEDS', or 'STALLITE')
   */
  public static determinePriorityCategory(level: number, specialNeeds: boolean = false, scholar: boolean = false): PriorityCategory {
    if (scholar) return 'SCHOLAR';
    if (specialNeeds) return 'SPECIAL_NEEDS';
    if (level === 100) return 'FRESHER';
    if (level >= 400) return 'FINALIST';
    return 'STALLITE';
  }

  /**
   * Verifies whether a student is eligible to participate in hostel balloting.
   *
   * Rules for Eligibility:
   * 1. Student must exist in the database and have an active account.
   * 2. School/Tuition fees must be verified as paid (`fees_paid = 1`).
   * 3. Course registration must be verified (`course_registered = 1`).
   * 4. Medical screening standing must be verified as CLEARED (`medical_status = 'CLEARED'`).
   * 5. Disciplinary record must be in `CLEARED` status (no active suspensions or rustication).
   *
   * @param userId - The unique identifier of the student
   * @returns Detailed EligibilityVerificationResult object containing status, checklist items, and message
   */
  public static async verifyEligibility(userId: string): Promise<EligibilityVerificationResult> {
    // Ensure database schema is ready
    await EligibilityService.initializeSchema();
    const client: Client = AuthService.getDbClient();

    // Step 1: Query user account and student profile from Turso DB
    const result = await client.execute({
      sql: `SELECT u.id, u.matric_or_staff_no, u.full_name, u.role, u.is_active,
                   sp.faculty, sp.department, sp.level, sp.campus, sp.priority_category,
                   sp.fees_paid, sp.course_registered, sp.medical_status,
                   sp.special_needs_registered, sp.special_needs_details,
                   sp.clearance_status, sp.clearance_rejection_reason, sp.clearance_certificate_hash
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            WHERE u.id = ? AND u.is_active = 1`,
      args: [userId]
    });

    // Throw error if user record is missing or inactive
    if (result.rows.length === 0) {
      throw new Error('Student record or active profile not found in Turso database.');
    }

    const row = result.rows[0];

    // Step 2: Query disciplinary standing from disciplinary_records table
    const discResult = await client.execute({
      sql: `SELECT status, reason, flagged_at FROM disciplinary_records WHERE user_id = ? ORDER BY flagged_at DESC`,
      args: [userId]
    });

    let disciplinaryStatus: DisciplinaryStatus = 'CLEARED';
    let discReason = '';
    const disciplinaryHistory: DisciplinaryStandingHistory[] = [];

    if (discResult.rows.length > 0) {
      disciplinaryStatus = String(discResult.rows[0].status) as DisciplinaryStatus;
      discReason = discResult.rows[0].reason ? String(discResult.rows[0].reason) : '';

      discResult.rows.forEach((d) => {
        disciplinaryHistory.push({
          userId,
          status: String(d.status) as DisciplinaryStatus,
          reason: d.reason ? String(d.reason) : 'N/A',
          flaggedAt: String(d.flagged_at || new Date().toISOString())
        });
      });
    }

    // Step 3: Fetch verified payment history from payments table
    const paymentsResult = await client.execute({
      sql: `SELECT id, user_id, transaction_reference, amount, payment_type, payment_status, paid_at
            FROM payments WHERE user_id = ? ORDER BY paid_at DESC`,
      args: [userId]
    });

    const paymentHistory: FeePaymentRecord[] = paymentsResult.rows.map((p) => ({
      id: String(p.id),
      userId: String(p.user_id),
      transactionReference: String(p.transaction_reference),
      amount: Number(p.amount),
      paymentType: String(p.payment_type || 'TUITION_FEE'),
      paymentStatus: String(p.payment_status || 'SUCCESSFUL') as 'SUCCESSFUL' | 'FAILED' | 'PENDING',
      paidAt: String(p.paid_at || new Date().toISOString())
    }));

    const feesPaid = Boolean(row.fees_paid);
    const courseRegistered = row.course_registered !== null && row.course_registered !== undefined ? Boolean(row.course_registered) : true;
    const medicalStatus = (row.medical_status ? String(row.medical_status) : 'CLEARED') as MedicalStatus;
    const specialNeedsRegistered = Boolean(row.special_needs_registered);
    const specialNeedsDetails = row.special_needs_details ? String(row.special_needs_details) : undefined;
    const clearanceStatus = String(row.clearance_status) as ClearanceStatus;
    const clearanceRejectionReason = row.clearance_rejection_reason ? String(row.clearance_rejection_reason) : undefined;
    const isDisciplinaryCleared = disciplinaryStatus === 'CLEARED';

    // A student is eligible for hostel balloting ONLY IF tuition fees are paid, courses are registered, medical status is cleared AND disciplinary status is cleared
    const isEligible = feesPaid && courseRegistered && medicalStatus === 'CLEARED' && isDisciplinaryCleared;

    // Step 4: Generate or retrieve SHA-256 cryptographic clearance certificate hash if student is 100% cleared
    let clearanceCertificateHash = row.clearance_certificate_hash ? String(row.clearance_certificate_hash) : undefined;

    if (isEligible && clearanceStatus === 'APPROVED' && !clearanceCertificateHash) {
      const rawPayload = `UNILAG_CLEARANCE:${userId}:${row.matric_or_staff_no}:${Date.now()}`;
      clearanceCertificateHash = `CERT-${CryptoJS.SHA256(rawPayload).toString().substring(0, 16).toUpperCase()}`;

      // Persist certificate hash in DB
      await client.execute({
        sql: `UPDATE student_profiles SET clearance_certificate_hash = ? WHERE user_id = ?`,
        args: [clearanceCertificateHash, userId]
      });
    }

    // Step 5: Construct human-readable status explanation message
    let statusMessage = 'Eligible for Balloting';
    if (!feesPaid && !isDisciplinaryCleared) {
      statusMessage = `School Fees Unverified & Student is ${disciplinaryStatus} (${discReason})`;
    } else if (!feesPaid) {
      statusMessage = 'School Fees Payment Unverified. Please complete fee payment to unlock balloting.';
    } else if (!courseRegistered) {
      statusMessage = 'Course Registration Unverified. Please complete semester course registration.';
    } else if (medicalStatus !== 'CLEARED') {
      statusMessage = `Medical Screening Incomplete (${medicalStatus}). Please complete screening at UNILAG Medical Center (Jaja Clinic).`;
    } else if (!isDisciplinaryCleared) {
      statusMessage = `Ineligible due to disciplinary record: ${disciplinaryStatus} (${discReason})`;
    }

    // Step 6: Return formatted verification summary
    return {
      userId: String(row.id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      isEligible,
      feesPaid,
      courseRegistered,
      medicalStatus,
      specialNeedsRegistered,
      specialNeedsDetails,
      disciplinaryStatus,
      disciplinaryHistory,
      priorityCategory: String(row.priority_category) as PriorityCategory,
      campus: String(row.campus) as Campus,
      level: Number(row.level),
      faculty: String(row.faculty),
      department: String(row.department),
      clearanceStatus,
      clearanceRejectionReason,
      clearanceCertificateHash,
      statusMessage,
      verifiedAt: new Date().toISOString(),
      paymentHistory
    };
  }

  /**
   * Synchronizes school tuition fee payment status in the database.
   * Called when a student submits a valid Remita payment reference or completes payment.
   * Prevents duplicate transaction reference re-use and records audit entry in `payments` table.
   *
   * @param params - Object containing userId, transaction reference, amount, and payment status
   * @returns Updated EligibilityVerificationResult reflecting newly synced fee status
   */
  public static async syncFeePayment(params: FeeSyncParams): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    const cleanRef = params.transactionReference.trim().toUpperCase();

    // Check if transaction reference has already been used (anti-replay security check)
    const existingRefResult = await client.execute({
      sql: `SELECT id, user_id FROM payments WHERE transaction_reference = ?`,
      args: [cleanRef]
    });

    if (existingRefResult.rows.length > 0) {
      const existingUserId = String(existingRefResult.rows[0].user_id);
      if (existingUserId === params.userId) {
        throw new Error(`Transaction reference ${cleanRef} has already been synced for your account.`);
      } else {
        throw new Error(`Transaction reference ${cleanRef} is invalid or has already been used by another account.`);
      }
    }

    // Insert payment record into payments audit table
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentType = params.paymentType || 'TUITION_FEE';

    await client.execute({
      sql: `INSERT INTO payments (id, user_id, bedspace_id, transaction_reference, amount, payment_type, payment_status, paid_at)
            VALUES (?, ?, NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [paymentId, params.userId, cleanRef, params.amount, paymentType, params.paymentStatus]
    });

    // If payment is successful, update student_profiles table set fees_paid = 1
    if (params.paymentStatus === 'SUCCESSFUL') {
      await client.execute({
        sql: `UPDATE student_profiles SET fees_paid = 1 WHERE user_id = ?`,
        args: [params.userId]
      });
    }

    // Re-verify and return fresh eligibility state
    return await EligibilityService.verifyEligibility(params.userId);
  }

  /**
   * Updates a student's medical screening standing from UNILAG Medical Center (Jaja Clinic).
   *
   * @param userId - Unique student user ID
   * @param medicalStatus - Target medical status ('CLEARED', 'PENDING', 'FAILED', 'NOT_STARTED')
   * @returns Updated EligibilityVerificationResult
   */
  public static async updateMedicalStatus(userId: string, medicalStatus: MedicalStatus): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `UPDATE student_profiles SET medical_status = ? WHERE user_id = ?`,
      args: [medicalStatus, userId]
    });

    return await EligibilityService.verifyEligibility(userId);
  }

  /**
   * Allows a Hall Warden or Admin to approve or reject a student's digital document clearance request with reason feedback.
   *
   * @param params - Object containing userId, clearanceStatus, and optional rejectionReason
   * @returns Updated EligibilityVerificationResult
   */
  public static async reviewClearanceDocument(params: ClearanceReviewParams): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    const rejectionReason = params.clearanceStatus === 'REJECTED' ? (params.rejectionReason || 'Uploaded clearance documents are invalid or unreadable.') : null;

    await client.execute({
      sql: `UPDATE student_profiles
            SET clearance_status = ?,
                clearance_rejection_reason = ?
            WHERE user_id = ?`,
      args: [params.clearanceStatus, rejectionReason, params.userId]
    });

    return await EligibilityService.verifyEligibility(params.userId);
  }

  /**
   * Registers special accommodation needs for a student (e.g., physical disability, chronic condition).
   * Automatically updates student priority quota category to `SPECIAL_NEEDS`.
   *
   * @param params - Object containing userId and specialNeedsDetails
   * @returns Updated EligibilityVerificationResult
   */
  public static async registerSpecialNeeds(params: SpecialNeedsParams): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.specialNeedsDetails.trim()) {
      throw new Error('Please provide specific details regarding your special accommodation needs.');
    }

    await client.execute({
      sql: `UPDATE student_profiles
            SET special_needs_registered = 1,
                special_needs_details = ?,
                priority_category = 'SPECIAL_NEEDS'
            WHERE user_id = ?`,
      args: [params.specialNeedsDetails.trim(), params.userId]
    });

    return await EligibilityService.verifyEligibility(params.userId);
  }

  /**
   * Updates a student's course registration status in Turso DB.
   *
   * @param userId - Unique student user ID
   * @param registered - Boolean indicating course registration status
   * @returns Updated EligibilityVerificationResult
   */
  public static async updateCourseRegistrationStatus(userId: string, registered: boolean): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `UPDATE student_profiles SET course_registered = ? WHERE user_id = ?`,
      args: [registered ? 1 : 0, userId]
    });

    return await EligibilityService.verifyEligibility(userId);
  }

  /**
   * Updates a student's digital document clearance status in the database.
   * Enables students to submit clearance requests and wardens/porters to review and update status.
   *
   * @param userId - Unique student user ID
   * @param clearanceStatus - New clearance status ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED')
   * @returns Updated EligibilityVerificationResult
   */
  public static async updateClearanceStatus(userId: string, clearanceStatus: ClearanceStatus): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    // Execute update query against student_profiles table in Turso DB
    const updateResult = await client.execute({
      sql: `UPDATE student_profiles SET clearance_status = ? WHERE user_id = ?`,
      args: [clearanceStatus, userId]
    });

    if (updateResult.rowsAffected === 0) {
      throw new Error('Failed to update clearance status. Student profile record not found.');
    }

    // Re-verify and return updated eligibility result
    return await EligibilityService.verifyEligibility(userId);
  }
}
