import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { PaymentHoldDetails, RemitaPaymentParams, PaymentProcessResult } from '../types/payment';
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
}
