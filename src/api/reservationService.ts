import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { Bedspace, RoomDetails, LockBedspaceResult } from '../types/reservation';

export class ReservationService {
  /**
   * Initializes reservation and payment tables in Turso DB if not present.
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
        bedspace_id TEXT NOT NULL,
        transaction_reference TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL,
        payment_status TEXT CHECK(payment_status IN ('PENDING', 'SUCCESSFUL', 'FAILED')) DEFAULT 'PENDING',
        paid_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (bedspace_id) REFERENCES bedspaces(id)
      );`
    ], 'write');
  }

  /**
   * Queries room details and associated bedspaces for a specific room.
   */
  public static async getRoomDetails(roomId: string): Promise<RoomDetails | null> {
    await ReservationService.initializeSchema();
    const client = AuthService.getDbClient();

    const roomRes = await client.execute({
      sql: `SELECT r.id, r.hostel_id, h.name as hostel_name, r.block_name, r.floor_number, r.room_number, r.total_beds, r.occupied_beds
            FROM rooms r
            JOIN hostels h ON r.hostel_id = h.id
            WHERE r.id = ?`,
      args: [roomId]
    });

    if (roomRes.rows.length === 0) return null;

    const rRow = roomRes.rows[0];

    const bedsRes = await client.execute({
      sql: `SELECT id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at, updated_at
            FROM bedspaces WHERE room_id = ? ORDER BY bed_label ASC`,
      args: [roomId]
    });

    const bedspaces: Bedspace[] = bedsRes.rows.map((bRow) => ({
      id: String(bRow.id),
      roomId: String(bRow.room_id),
      bedLabel: String(bRow.bed_label),
      status: String(bRow.status) as Bedspace['status'],
      allocatedToUserId: bRow.allocated_to_user_id ? String(bRow.allocated_to_user_id) : undefined,
      holdExpiresAt: bRow.hold_expires_at ? String(bRow.hold_expires_at) : undefined,
      updatedAt: String(bRow.updated_at)
    }));

    return {
      id: String(rRow.id),
      hostelId: String(rRow.hostel_id),
      hostelName: String(rRow.hostel_name),
      blockName: String(rRow.block_name),
      floorNumber: Number(rRow.floor_number),
      roomNumber: String(rRow.room_number),
      totalBeds: Number(rRow.total_beds),
      occupiedBeds: Number(rRow.occupied_beds),
      bedspaces
    };
  }

  /**
   * Executes atomic bedspace reservation algorithm (PRD 5.2).
   * Strictly prevents double-allocation and locks bedspace for 72 hours.
   */
  public static async lockBedspaceAtomically(userId: string, bedspaceId: string): Promise<LockBedspaceResult> {
    await ReservationService.initializeSchema();
    const client = AuthService.getDbClient();

    // Check if student already has an active lock or confirmed bedspace
    const existingRes = await client.execute({
      sql: `SELECT id, bed_label, status FROM bedspaces WHERE allocated_to_user_id = ? AND status IN ('LOCKED_HOLD', 'CONFIRMED')`,
      args: [userId]
    });

    if (existingRes.rows.length > 0) {
      throw new Error('You already have an active bedspace hold or confirmed accommodation.');
    }

    // Fetch target bedspace & room information
    const targetRes = await client.execute({
      sql: `SELECT b.id, b.room_id, b.bed_label, b.status, r.room_number, r.hostel_id, h.name as hostel_name
            FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            JOIN hostels h ON r.hostel_id = h.id
            WHERE b.id = ?`,
      args: [bedspaceId]
    });

    if (targetRes.rows.length === 0) {
      throw new Error('Selected bedspace was not found.');
    }

    const bRow = targetRes.rows[0];
    if (String(bRow.status) !== 'AVAILABLE') {
      throw new Error('Bedspace already locked by another student. Please select an available bed.');
    }

    const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const txRef = `UNILAG_REMITA_${Date.now()}`;
    const holdExpiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    // Execute atomic batch transaction
    await client.batch([
      {
        sql: `UPDATE bedspaces
              SET status = 'LOCKED_HOLD',
                  allocated_to_user_id = ?,
                  hold_expires_at = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND status = 'AVAILABLE'`,
        args: [userId, holdExpiresAt, bedspaceId]
      },
      {
        sql: `INSERT INTO payments (id, user_id, bedspace_id, transaction_reference, amount, payment_status)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [paymentId, userId, bedspaceId, txRef, 25000.00, 'PENDING']
      },
      {
        sql: `UPDATE hostels SET available_bedspaces = available_bedspaces - 1 WHERE id = ?`,
        args: [String(bRow.hostel_id)]
      }
    ], 'write');

    return {
      success: true,
      paymentId,
      bedspaceId,
      bedLabel: String(bRow.bed_label),
      roomNumber: String(bRow.room_number),
      hostelName: String(bRow.hostel_name),
      amount: 25000.00,
      holdExpiresAt,
      message: 'Bedspace locked successfully! Hold valid for 72 Hours.'
    };
  }
}
