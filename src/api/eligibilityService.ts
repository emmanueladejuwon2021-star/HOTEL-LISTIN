import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { EligibilityVerificationResult, FeeSyncParams, DisciplinaryStatus } from '../types/eligibility';
import { PriorityCategory, Campus, ClearanceStatus } from '../types/auth';

/**
 * Service class that handles student eligibility verification and school fee payment synchronization.
 * Checks student standing directly against the Turso libSQL database following a strict zero-mock policy.
 */
export class EligibilityService {
  /**
   * Creates or verifies required tables for disciplinary records in the database if they do not exist yet.
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
      );`
    ], 'write');
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
   * 3. Disciplinary record must be in `CLEARED` status (no active suspensions or rustication).
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
                   sp.faculty, sp.department, sp.level, sp.campus, sp.priority_category, sp.fees_paid, sp.clearance_status
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

    const feesPaid = Boolean(row.fees_paid);
    const clearanceStatus = String(row.clearance_status) as ClearanceStatus;
    const isDisciplinaryCleared = disciplinaryStatus === 'CLEARED';

    // A student is eligible for hostel balloting ONLY IF tuition fees are paid AND disciplinary status is cleared
    const isEligible = feesPaid && isDisciplinaryCleared;

    // Step 3: Construct human-readable status explanation message
    let statusMessage = 'Eligible for Balloting';
    if (!feesPaid && !isDisciplinaryCleared) {
      statusMessage = `School Fees Unverified & Student is ${disciplinaryStatus} (${discReason})`;
    } else if (!feesPaid) {
      statusMessage = 'School Fees Payment Unverified. Please complete fee payment to unlock balloting.';
    } else if (!isDisciplinaryCleared) {
      statusMessage = `Ineligible due to disciplinary record: ${disciplinaryStatus} (${discReason})`;
    }

    // Step 4: Return formatted verification summary
    return {
      userId: String(row.id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      isEligible,
      feesPaid,
      disciplinaryStatus,
      priorityCategory: String(row.priority_category) as PriorityCategory,
      campus: String(row.campus) as Campus,
      level: Number(row.level),
      faculty: String(row.faculty),
      department: String(row.department),
      clearanceStatus,
      statusMessage,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Synchronizes school tuition fee payment status in the database.
   * Called when a student submits a valid Remita payment reference or completes payment.
   *
   * @param params - Object containing userId, transaction reference, amount, and payment status
   * @returns Updated EligibilityVerificationResult reflecting newly synced fee status
   */
  public static async syncFeePayment(params: FeeSyncParams): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

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
}
