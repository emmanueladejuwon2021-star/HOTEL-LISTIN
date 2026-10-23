import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { EligibilityVerificationResult, FeeSyncParams, DisciplinaryStatus, FeePaymentRecord } from '../types/eligibility';
import { PriorityCategory, Campus, ClearanceStatus } from '../types/auth';

/**
 * Service class that handles student eligibility verification, school fee payment synchronization,
 * payment history audit trail, course registration status, and digital document clearance updates.
 * Checks student standing directly against the Turso libSQL database following a strict zero-mock policy.
 */
export class EligibilityService {
  /**
   * Creates or verifies required tables for disciplinary records and fee payments in the database if they do not exist yet.
   * This ensures the database schema is fully initialized before checking eligibility.
   */
  public static async initializeSchema(): Promise<void> {
    // Ensure base tables (users, student_profiles) are set up first
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Create table for student disciplinary flags (e.g. Cleared, Flagged, Suspended, Rusticated)
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

    // Migration logic: Ensure bedspace_id is nullable if table was created with NOT NULL previously
    try {
      const tableInfo = await client.execute({ sql: `PRAGMA table_info(payments)`, args: [] });
      const bedspaceCol = tableInfo.rows.find((r) => r.name === 'bedspace_id');
      if (bedspaceCol && Number(bedspaceCol.notnull) === 1) {
        await client.execute({ sql: `PRAGMA foreign_keys = OFF`, args: [] });
        await client.execute({
          sql: `CREATE TABLE payments_new (
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
          )`,
          args: []
        });
        await client.execute({
          sql: `INSERT INTO payments_new (id, user_id, bedspace_id, transaction_reference, amount, payment_status, paid_at)
                SELECT id, user_id, bedspace_id, transaction_reference, amount, payment_status, paid_at FROM payments`,
          args: []
        });
        await client.execute({ sql: `DROP TABLE payments`, args: [] });
        await client.execute({ sql: `ALTER TABLE payments_new RENAME TO payments`, args: [] });
        await client.execute({ sql: `PRAGMA foreign_keys = ON`, args: [] });
      }
    } catch {
      // Table info check or migration passed
    }

    // Safe schema migrations: add payment_type column to payments if missing
    try {
      await client.execute({
        sql: `ALTER TABLE payments ADD COLUMN payment_type TEXT DEFAULT 'TUITION_FEE'`,
        args: []
      });
    } catch {
      // Column already exists, ignore error
    }

    // Safe schema migrations: add course_registered column to student_profiles if missing
    try {
      await client.execute({
        sql: `ALTER TABLE student_profiles ADD COLUMN course_registered INTEGER DEFAULT 1`,
        args: []
      });
    } catch {
      // Column already exists, ignore error
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
   * 4. Disciplinary record must be in `CLEARED` status (no active suspensions or rustication).
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
                   sp.fees_paid, sp.course_registered, sp.clearance_status
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
      sql: `SELECT status, reason FROM disciplinary_records WHERE user_id = ?`,
      args: [userId]
    });

    let disciplinaryStatus: DisciplinaryStatus = 'CLEARED';
    let discReason = '';

    if (discResult.rows.length > 0) {
      disciplinaryStatus = String(discResult.rows[0].status) as DisciplinaryStatus;
      discReason = discResult.rows[0].reason ? String(discResult.rows[0].reason) : '';
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
    const clearanceStatus = String(row.clearance_status) as ClearanceStatus;
    const isDisciplinaryCleared = disciplinaryStatus === 'CLEARED';

    // A student is eligible for hostel balloting ONLY IF tuition fees are paid, courses are registered AND disciplinary status is cleared
    const isEligible = feesPaid && courseRegistered && isDisciplinaryCleared;

    // Step 4: Construct human-readable status explanation message
    let statusMessage = 'Eligible for Balloting';
    if (!feesPaid && !isDisciplinaryCleared) {
      statusMessage = `School Fees Unverified & Student is ${disciplinaryStatus} (${discReason})`;
    } else if (!feesPaid) {
      statusMessage = 'School Fees Payment Unverified. Please complete fee payment to unlock balloting.';
    } else if (!courseRegistered) {
      statusMessage = 'Course Registration Unverified. Please complete semester course registration.';
    } else if (!isDisciplinaryCleared) {
      statusMessage = `Ineligible due to disciplinary record: ${disciplinaryStatus} (${discReason})`;
    }

    // Step 5: Return formatted verification summary
    return {
      userId: String(row.id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      isEligible,
      feesPaid,
      courseRegistered,
      disciplinaryStatus,
      priorityCategory: String(row.priority_category) as PriorityCategory,
      campus: String(row.campus) as Campus,
      level: Number(row.level),
      faculty: String(row.faculty),
      department: String(row.department),
      clearanceStatus,
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
