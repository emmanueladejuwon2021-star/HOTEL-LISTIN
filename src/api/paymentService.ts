import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { PaymentHoldDetails, RemitaPaymentParams, PaymentProcessResult, PaymentReceipt, HoldReleaseResult, RemitaRRRDetails, RemitaFeeBreakdown, PaymentVerificationResult, PaymentRetryResult, PendingPaymentSyncSummary } from '../types/payment';
import { validateRemitaRef } from '../utils/validation';

/**
 * Service class handling 72-hour payment locks, countdown calculations,
 * Remita payment gateway interactions, and automatic recycling of expired bedspace holds.
 * Operates directly against Turso libSQL edge database following strict zero-mock policy.
 */
export class PaymentService {
  /**
   * Initializes hostels, rooms, bedspaces, and payments tables in Turso DB.
   * Ensures foreign key integrity across table creation.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.batch([
      `CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        block_name TEXT NOT NULL,
        floor_number INTEGER NOT NULL,
        room_number TEXT NOT NULL,
        total_beds INTEGER DEFAULT 4,
        occupied_beds INTEGER DEFAULT 0,
        FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS bedspaces (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        bed_label TEXT NOT NULL,
        status TEXT CHECK(status IN ('AVAILABLE', 'LOCKED_HOLD', 'CONFIRMED', 'MAINTENANCE_BLOCKED')) DEFAULT 'AVAILABLE',
        allocated_to_user_id TEXT,
        hold_expires_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (allocated_to_user_id) REFERENCES users(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bedspace_id TEXT,
        transaction_reference TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL,
        payment_type TEXT DEFAULT 'HOSTEL_FEE',
        payment_status TEXT CHECK(payment_status IN ('PENDING', 'SUCCESSFUL', 'FAILED')) DEFAULT 'PENDING',
        paid_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bedspace_id) REFERENCES bedspaces(id) ON DELETE SET NULL
      );`
    ], 'write');
  }

  /**
   * Recycles all expired bedspace holds back to AVAILABLE status in Turso DB.
   * Auto-recycles holds whose 72-hour timer has passed.
   *
   * @returns Number of bedspaces recycled
   */
  public static async recycleExpiredHolds(): Promise<number> {
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query all bedspaces with LOCKED_HOLD status where hold_expires_at <= current time
    const expiredRes = await client.execute({
      sql: `SELECT id, room_id, allocated_to_user_id
            FROM bedspaces
            WHERE status = 'LOCKED_HOLD' AND DATETIME(hold_expires_at) <= DATETIME('now')`,
      args: []
    });

    if (expiredRes.rows.length === 0) {
      return 0;
    }

    const expiredBedIds = expiredRes.rows.map(r => String(r.id));

    for (const bedId of expiredBedIds) {
      // Fetch hostel ID to increment available count
      const roomRes = await client.execute({
        sql: `SELECT hostel_id FROM rooms WHERE id = (SELECT room_id FROM bedspaces WHERE id = ?)`,
        args: [bedId]
      });

      const hostelId = roomRes.rows.length > 0 ? String(roomRes.rows[0].hostel_id) : null;

      await client.batch([
        {
          sql: `UPDATE bedspaces
                SET status = 'AVAILABLE',
                    allocated_to_user_id = NULL,
                    hold_expires_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [bedId]
        },
        ...(hostelId ? [{
          sql: `UPDATE hostels SET available_bedspaces = available_bedspaces + 1 WHERE id = ?`,
          args: [hostelId]
        }] : [])
      ], 'write');
    }

    return expiredBedIds.length;
  }

  /**
   * Fetches the active 72-hour bedspace hold status for a student.
   * Automatically recycles hold if expired.
   *
   * @param userId - Student's user ID
   * @returns PaymentHoldDetails or null if student has no hold or confirmed reservation
   */
  public static async getPaymentHoldStatus(userId: string): Promise<PaymentHoldDetails | null> {
    await PaymentService.initializeSchema();
    // Run auto-recycling check before returning hold status
    await PaymentService.recycleExpiredHolds();

    const client = AuthService.getDbClient();

    // Query active hold or confirmed bedspace
    const res = await client.execute({
      sql: `SELECT b.id as bedspace_id, b.bed_label, b.status as bedspace_status, b.hold_expires_at,
                   r.room_number, r.block_name, h.name as hostel_name,
                   p.id as payment_id, p.transaction_reference, p.amount, p.payment_status
            FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            JOIN hostels h ON r.hostel_id = h.id
            LEFT JOIN payments p ON p.bedspace_id = b.id AND p.user_id = b.allocated_to_user_id
            WHERE b.allocated_to_user_id = ? AND b.status IN ('LOCKED_HOLD', 'CONFIRMED')
            ORDER BY p.paid_at DESC LIMIT 1`,
      args: [userId]
    });

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const holdExpiresAtStr = row.hold_expires_at ? String(row.hold_expires_at) : new Date().toISOString();
    const holdExpiresMs = new Date(holdExpiresAtStr).getTime();
    const nowMs = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((holdExpiresMs - nowMs) / 1000));
    const isExpired = remainingSeconds === 0 && String(row.bedspace_status) === 'LOCKED_HOLD';

    return {
      paymentId: row.payment_id ? String(row.payment_id) : '',
      userId,
      bedspaceId: String(row.bedspace_id),
      bedLabel: String(row.bed_label),
      roomNumber: String(row.room_number),
      blockName: String(row.block_name),
      hostelName: String(row.hostel_name),
      amount: row.amount ? Number(row.amount) : 25000.00,
      transactionReference: row.transaction_reference ? String(row.transaction_reference) : '',
      paymentStatus: (row.payment_status ? String(row.payment_status) : 'PENDING') as 'PENDING' | 'SUCCESSFUL' | 'FAILED',
      holdExpiresAt: holdExpiresAtStr,
      isExpired,
      remainingSeconds
    };
  }

  /**
   * Processes a Remita hostel fee payment transaction.
   * Validates transaction reference format, checks active hold status,
   * updates bedspace status from LOCKED_HOLD to CONFIRMED, and records payment status.
   *
   * @param params - RemitaPaymentParams containing userId, paymentId, transactionReference
   * @returns PaymentProcessResult
   */
  public static async processRemitaPayment(params: RemitaPaymentParams): Promise<PaymentProcessResult> {
    await PaymentService.initializeSchema();

    // Step 1: Validate Remita transaction reference format using utility
    const val = validateRemitaRef(params.transactionReference);
    if (!val.isValid) {
      throw new Error(val.error || 'Invalid Remita transaction reference.');
    }

    const cleanRef = params.transactionReference.trim().toUpperCase();
    const client = AuthService.getDbClient();

    // Check anti-replay: transaction reference cannot be reused by another payment
    const existingRefRes = await client.execute({
      sql: `SELECT id, user_id FROM payments WHERE transaction_reference = ? AND user_id != ?`,
      args: [cleanRef, params.userId]
    });

    if (existingRefRes.rows.length > 0) {
      throw new Error(`Remita transaction reference ${cleanRef} has already been used.`);
    }

    // Step 2: Fetch student's current hold
    const holdStatus = await PaymentService.getPaymentHoldStatus(params.userId);
    if (!holdStatus) {
      throw new Error('No active bedspace hold found. Please select and lock a bedspace first.');
    }

    if (holdStatus.isExpired) {
      throw new Error('Your 72-hour bedspace hold has expired. Bedspace has been recycled.');
    }

    if (holdStatus.paymentStatus === 'SUCCESSFUL') {
      throw new Error('Payment for this bedspace has already been confirmed.');
    }

    const paidAt = new Date().toISOString();

    // Step 3: Execute atomic database batch transaction
    await client.batch([
      // Update bedspace status from LOCKED_HOLD to CONFIRMED
      {
        sql: `UPDATE bedspaces
              SET status = 'CONFIRMED',
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND allocated_to_user_id = ?`,
        args: [holdStatus.bedspaceId, params.userId]
      },
      // Update payment record status to SUCCESSFUL and set transaction reference
      {
        sql: `UPDATE payments
              SET transaction_reference = ?,
                  payment_status = 'SUCCESSFUL',
                  paid_at = CURRENT_TIMESTAMP
              WHERE id = ? OR (user_id = ? AND bedspace_id = ?)`,
        args: [cleanRef, params.paymentId || holdStatus.paymentId, params.userId, holdStatus.bedspaceId]
      },
      // Update room occupied beds count
      {
        sql: `UPDATE rooms
              SET occupied_beds = occupied_beds + 1
              WHERE id = (SELECT room_id FROM bedspaces WHERE id = ?)`,
        args: [holdStatus.bedspaceId]
      }
    ], 'write');

    return {
      success: true,
      paymentId: params.paymentId || holdStatus.paymentId,
      bedspaceId: holdStatus.bedspaceId,
      transactionReference: cleanRef,
      amount: holdStatus.amount,
      paymentStatus: 'SUCCESSFUL',
      bedspaceStatus: 'CONFIRMED',
      paidAt,
      message: 'Hostel fee payment confirmed! Your accommodation is officially reserved.'
    };
  }

  /**
   * Cancels and releases a student's active provisional bedspace hold voluntarily before payment.
   * Atomically reverts the bedspace status to AVAILABLE, increments the hostel available space count,
   * and updates any pending payment record in Turso DB.
   *
   * @param userId - Student's unique user ID
   * @param targetBedspaceId - Optional specific bedspace ID to release
   * @returns HoldReleaseResult containing confirmation details
   */
  public static async cancelBedspaceHold(userId: string, targetBedspaceId?: string): Promise<HoldReleaseResult> {
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query active hold for the student
    const holdRes = await client.execute({
      sql: `SELECT b.id as bedspace_id, b.room_id, r.hostel_id
            FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.allocated_to_user_id = ? AND b.status = 'LOCKED_HOLD'
            ${targetBedspaceId ? 'AND b.id = ?' : ''}
            LIMIT 1`,
      args: targetBedspaceId ? [userId, targetBedspaceId] : [userId]
    });

    if (holdRes.rows.length === 0) {
      throw new Error('No active provisional bedspace hold found to release.');
    }

    const bedId = String(holdRes.rows[0].bedspace_id);
    const hostelId = String(holdRes.rows[0].hostel_id);
    const recycledAt = new Date().toISOString();

    // Execute atomic batch transaction to release bedspace and increment hostel capacity
    await client.batch([
      {
        sql: `UPDATE bedspaces
              SET status = 'AVAILABLE',
                  allocated_to_user_id = NULL,
                  hold_expires_at = NULL,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND allocated_to_user_id = ? AND status = 'LOCKED_HOLD'`,
        args: [bedId, userId]
      },
      {
        sql: `UPDATE hostels
              SET available_bedspaces = available_bedspaces + 1
              WHERE id = ?`,
        args: [hostelId]
      },
      {
        sql: `UPDATE payments
              SET payment_status = 'FAILED'
              WHERE user_id = ? AND bedspace_id = ? AND payment_status = 'PENDING'`,
        args: [userId, bedId]
      }
    ], 'write');

    return {
      success: true,
      bedspaceId: bedId,
      message: 'Your provisional bedspace hold has been cancelled and returned to the available room pool.',
      recycledAt
    };
  }

  /**
   * Calculates an itemized breakdown of hostel fees and processing charges.
   * Provides students with clear financial transparency before initiating payment.
   *
   * @param baseAmount - Optional base hostel fee amount (defaults to ₦25,000.00)
   * @returns RemitaFeeBreakdown object containing itemized charges
   */
  public static calculateFeeBreakdown(baseAmount: number = 25000.00): RemitaFeeBreakdown {
    const remitaServiceFee = 300.00;
    const ictProcessingFee = 500.00;
    const totalAmount = baseAmount + remitaServiceFee + ictProcessingFee;

    return {
      baseHostelFee: baseAmount,
      remitaServiceFee,
      ictProcessingFee,
      totalAmount,
      currency: 'NGN'
    };
  }

  /**
   * Generates a unique 12-digit Remita Retrieval Reference (RRR) for a student's active hold.
   * Binds the generated RRR directly to the student's pending payment record in Turso DB.
   *
   * @param userId - Student's unique user ID
   * @returns RemitaRRRDetails object containing the generated RRR and payment info
   */
  public static async generateRemitaRRR(userId: string): Promise<RemitaRRRDetails> {
    await PaymentService.initializeSchema();

    // Verify active hold status first
    const holdStatus = await PaymentService.getPaymentHoldStatus(userId);
    if (!holdStatus) {
      throw new Error('No active bedspace hold found. Please select and lock a bedspace first.');
    }

    if (holdStatus.isExpired) {
      throw new Error('Your provisional bedspace hold has expired. Please reserve an available room again.');
    }

    const client = AuthService.getDbClient();

    // Generate a unique 12-digit RRR code starting with '23'
    const timestampDigits = String(Date.now()).slice(-8);
    const randomDigits = String(Math.floor(10 + Math.random() * 90));
    const generatedRRR = `23${timestampDigits}${randomDigits}`;

    const feeBreakdown = PaymentService.calculateFeeBreakdown(holdStatus.amount);
    const generatedAt = new Date().toISOString();

    // Update transaction reference in Turso DB payments table
    if (holdStatus.paymentId) {
      await client.execute({
        sql: `UPDATE payments SET transaction_reference = ? WHERE id = ?`,
        args: [generatedRRR, holdStatus.paymentId]
      });
    } else {
      const newPaymentId = `pay_${Date.now()}`;
      await client.execute({
        sql: `INSERT INTO payments (id, user_id, bedspace_id, transaction_reference, amount, payment_type, payment_status)
              VALUES (?, ?, ?, ?, ?, 'HOSTEL_FEE', 'PENDING')`,
        args: [newPaymentId, userId, holdStatus.bedspaceId, generatedRRR, feeBreakdown.totalAmount]
      });
    }

    return {
      rrr: generatedRRR,
      paymentId: holdStatus.paymentId || `pay_${Date.now()}`,
      userId,
      bedspaceId: holdStatus.bedspaceId,
      generatedAt,
      expiresAt: holdStatus.holdExpiresAt,
      amountPayable: feeBreakdown.totalAmount
    };
  }

  /**
   * Verifies the status of a Remita payment transaction reference in Turso DB.
   * Checks whether payment is successful, pending, or failed, returning full room & student details.
   *
   * @param transactionReference - 12-digit Remita RRR or transaction reference string
   * @returns PaymentVerificationResult object containing verification details
   */
  public static async verifyRemitaPaymentStatus(transactionReference: string): Promise<PaymentVerificationResult> {
    await PaymentService.initializeSchema();

    const val = validateRemitaRef(transactionReference);
    if (!val.isValid) {
      throw new Error(val.error || 'Invalid Remita transaction reference format.');
    }

    const cleanRef = transactionReference.trim().toUpperCase();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT p.id, p.transaction_reference, p.amount, p.payment_status, p.paid_at,
                   u.full_name, u.matric_or_staff_no,
                   b.bed_label, r.room_number, r.block_name, h.name as hostel_name
            FROM payments p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN bedspaces b ON p.bedspace_id = b.id
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN hostels h ON r.hostel_id = h.id
            WHERE p.transaction_reference = ?
            ORDER BY COALESCE(p.paid_at, CURRENT_TIMESTAMP) DESC LIMIT 1`,
      args: [cleanRef]
    });

    if (res.rows.length === 0) {
      return {
        transactionReference: cleanRef,
        status: 'NOT_FOUND',
        amount: 25800.00,
        message: `No payment record found for Remita reference ${cleanRef}. You may use this reference to make a payment.`
      };
    }

    const row = res.rows[0];
    const status = String(row.payment_status) as 'PENDING' | 'SUCCESSFUL' | 'FAILED';

    let message = 'Payment is pending processing at Remita.';
    if (status === 'SUCCESSFUL') {
      message = 'Payment verified successfully. Accommodation confirmed.';
    } else if (status === 'FAILED') {
      message = 'Payment attempt failed or was declined.';
    }

    return {
      transactionReference: cleanRef,
      status,
      amount: Number(row.amount || 25800.00),
      paidAt: row.paid_at ? String(row.paid_at) : undefined,
      payerName: String(row.full_name),
      hostelName: row.hostel_name ? String(row.hostel_name) : undefined,
      roomDetails: row.room_number ? `Block ${row.block_name} Room ${row.room_number} (${row.bed_label})` : undefined,
      message
    };
  }

  /**
   * Retrieves the full payment history and digital clearance receipts for a student.
   * Queries Turso DB for all past and active accommodation fee transactions.
   *
   * @param userId - Student's unique user ID
   * @returns Array of PaymentReceipt objects
   */
  /**
   * Marks a pending payment transaction as FAILED (e.g. declined or cancelled at gateway)
   * while keeping the active bedspace hold intact for retries if hold has not expired.
   *
   * @param paymentId - Payment record ID or transaction reference
   * @param userId - Student user ID
   * @param failureReason - Optional reason text for failure
   * @returns PaymentRetryResult indicating if student can retry payment
   */
  public static async markPaymentFailed(paymentId: string, userId: string, failureReason?: string): Promise<PaymentRetryResult> {
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    // Verify hold status to check if hold is still valid for retries
    const holdStatus = await PaymentService.getPaymentHoldStatus(userId);
    const canRetry = !!holdStatus && !holdStatus.isExpired;

    await client.execute({
      sql: `UPDATE payments
            SET payment_status = 'FAILED'
            WHERE (id = ? OR transaction_reference = ?) AND user_id = ? AND payment_status = 'PENDING'`,
      args: [paymentId, paymentId, userId]
    });

    const reasonMsg = failureReason ? `: ${failureReason}` : '.';
    const retryMsg = canRetry
      ? `Payment attempt marked as failed${reasonMsg} Your bedspace hold remains valid. You may retry payment before the timer expires.`
      : `Payment attempt failed${reasonMsg} Your bedspace hold has expired or is no longer active.`;

    return {
      success: true,
      paymentId,
      message: retryMsg,
      canRetry
    };
  }

  /**
   * Automatically scans and reconciles all PENDING payment records in the database.
   * Checks for expired holds, re-verifies valid transactions, and cleans up stale pending payments.
   *
   * @returns PendingPaymentSyncSummary
   */
  public static async syncPendingPayments(): Promise<PendingPaymentSyncSummary> {
    await PaymentService.initializeSchema();
    // Auto-recycle any expired holds first
    const recycledHoldCount = await PaymentService.recycleExpiredHolds();

    const client = AuthService.getDbClient();
    const pendingRes = await client.execute({
      sql: `SELECT p.id, p.user_id, p.transaction_reference, p.bedspace_id, b.status as bedspace_status, b.hold_expires_at
            FROM payments p
            LEFT JOIN bedspaces b ON p.bedspace_id = b.id
            WHERE p.payment_status = 'PENDING'`,
      args: []
    });

    let confirmedCount = 0;
    let failedCount = 0;

    for (const row of pendingRes.rows) {
      const paymentId = String(row.id);
      const bedspaceStatus = row.bedspace_status ? String(row.bedspace_status) : null;
      const holdExpiresAt = row.hold_expires_at ? new Date(String(row.hold_expires_at)).getTime() : 0;
      const isExpired = holdExpiresAt > 0 && holdExpiresAt <= Date.now();

      if (bedspaceStatus === 'CONFIRMED') {
        // If bedspace is already confirmed, update payment record to SUCCESSFUL
        await client.execute({
          sql: `UPDATE payments SET payment_status = 'SUCCESSFUL', paid_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [paymentId]
        });
        confirmedCount++;
      } else if (isExpired || bedspaceStatus === 'AVAILABLE' || !bedspaceStatus) {
        // If hold expired or bedspace returned to available, mark payment as FAILED
        await client.execute({
          sql: `UPDATE payments SET payment_status = 'FAILED' WHERE id = ?`,
          args: [paymentId]
        });
        failedCount++;
      }
    }

    return {
      totalPending: pendingRes.rows.length,
      confirmedCount,
      failedCount,
      recycledHoldCount,
      syncedAt: new Date().toISOString()
    };
  }

  public static async getPaymentHistory(userId: string): Promise<PaymentReceipt[]> {
    await PaymentService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT p.id as payment_id, p.transaction_reference, p.amount, p.payment_type, p.payment_status, p.paid_at,
                   b.id as bedspace_id, b.bed_label,
                   r.room_number, r.block_name,
                   h.name as hostel_name, h.campus,
                   u.matric_or_staff_no, u.full_name
            FROM payments p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN bedspaces b ON p.bedspace_id = b.id
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN hostels h ON r.hostel_id = h.id
            WHERE p.user_id = ?
            ORDER BY COALESCE(p.paid_at, CURRENT_TIMESTAMP) DESC`,
      args: [userId]
    });

    return res.rows.map(row => ({
      paymentId: String(row.payment_id),
      transactionReference: String(row.transaction_reference || 'N/A'),
      amount: Number(row.amount || 25000.00),
      paymentType: String(row.payment_type || 'HOSTEL_FEE'),
      paymentStatus: (row.payment_status ? String(row.payment_status) : 'PENDING') as 'PENDING' | 'SUCCESSFUL' | 'FAILED',
      paidAt: row.paid_at ? String(row.paid_at) : new Date().toISOString(),
      bedspaceId: row.bedspace_id ? String(row.bedspace_id) : 'N/A',
      bedLabel: row.bed_label ? String(row.bed_label) : 'N/A',
      roomNumber: row.room_number ? String(row.room_number) : 'N/A',
      blockName: row.block_name ? String(row.block_name) : 'N/A',
      hostelName: row.hostel_name ? String(row.hostel_name) : 'UNILAG Hostel',
      campus: row.campus ? String(row.campus) : 'MAIN_CAMPUS',
      studentMatricNo: String(row.matric_or_staff_no),
      studentFullName: String(row.full_name)
    }));
  }
}
