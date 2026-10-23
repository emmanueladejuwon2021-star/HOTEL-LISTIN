import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { EligibilityVerificationResult, FeeSyncParams, DisciplinaryStatus } from '../types/eligibility';
import { PriorityCategory, Campus, ClearanceStatus } from '../types/auth';

export class EligibilityService {
  /**
   * Initializes or verifies disciplinary schema additions in Turso DB if needed.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

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
   * Calculates dynamic priority category based on student level and department/faculty
   */
  public static determinePriorityCategory(level: number, specialNeeds: boolean = false, scholar: boolean = false): PriorityCategory {
    if (scholar) return 'SCHOLAR';
    if (specialNeeds) return 'SPECIAL_NEEDS';
    if (level === 100) return 'FRESHER';
    if (level >= 400) return 'FINALIST';
    return 'STALLITE';
  }

  /**
   * Checks student eligibility against Turso libSQL database.
   * Zero-Mock policy strictly enforced.
   */
  public static async verifyEligibility(userId: string): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client: Client = AuthService.getDbClient();

    // Fetch user and student profile from Turso DB
    const result = await client.execute({
      sql: `SELECT u.id, u.matric_or_staff_no, u.full_name, u.role, u.is_active,
                   sp.faculty, sp.department, sp.level, sp.campus, sp.priority_category, sp.fees_paid, sp.clearance_status
            FROM users u
            JOIN student_profiles sp ON u.id = sp.user_id
            WHERE u.id = ? AND u.is_active = 1`,
      args: [userId]
    });

    if (result.rows.length === 0) {
      throw new Error('Student record or active profile not found in Turso database.');
    }

    const row = result.rows[0];

    // Query disciplinary record
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

    // Student is eligible for balloting iff tuition fees are paid AND disciplinary status is CLEARED
    const isEligible = feesPaid && isDisciplinaryCleared;

    let statusMessage = 'Eligible for Balloting';
    if (!feesPaid && !isDisciplinaryCleared) {
      statusMessage = `School Fees Unverified & Student is ${disciplinaryStatus} (${discReason})`;
    } else if (!feesPaid) {
      statusMessage = 'School Fees Payment Unverified. Please complete fee payment to unlock balloting.';
    } else if (!isDisciplinaryCleared) {
      statusMessage = `Ineligible due to disciplinary record: ${disciplinaryStatus} (${discReason})`;
    }

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
   * Syncs fee payment status in Turso DB upon successful transaction or verification.
   */
  public static async syncFeePayment(params: FeeSyncParams): Promise<EligibilityVerificationResult> {
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    if (params.paymentStatus === 'SUCCESSFUL') {
      await client.execute({
        sql: `UPDATE student_profiles SET fees_paid = 1 WHERE user_id = ?`,
        args: [params.userId]
      });
    }

    return await EligibilityService.verifyEligibility(params.userId);
  }
}
