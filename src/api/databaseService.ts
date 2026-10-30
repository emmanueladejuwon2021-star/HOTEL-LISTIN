/**
 * UNILAG Hostel Management Mobile Application ("UnilagStay")
 * Database Schema DDL & Index Management Service
 *
 * This service executes DDL statements to create and verify all core database tables,
 * foreign key integrity constraints, and search indexes in Turso libSQL SQLite.
 * All comments are written in plain, jargon-free English for non-technical readability.
 */

import { Client } from '@libsql/client';
import { AuthService } from './authService';
import {
  TableInfo,
  IndexInfo,
  SchemaInitializationResult,
  DatabaseHealthStatus,
} from '../types/database';

export class DatabaseService {
  /**
   * Retrieves the singleton database client from AuthService.
   * Ensures consistent database operations across the entire application.
   */
  private static getDb(): Client {
    return AuthService.getDbClient();
  }

  /**
   * Enables foreign key checks in SQLite to ensure data relationships remain valid.
   */
  public static async enableForeignKeys(): Promise<void> {
    const client = this.getDb();
    await client.execute('PRAGMA foreign_keys = ON;');
  }

  /**
   * Executes the full DDL setup script for all database tables and indexes specified in PRD.md.
   * Performs idempotent creation so running this multiple times will not cause errors or data loss.
   */
  public static async initializeSchema(): Promise<SchemaInitializationResult> {
    const client = this.getDb();
    const errors: string[] = [];
    let tablesCreated = 0;
    let indexesCreated = 0;

    try {
      // 1. Enable foreign key integrity checks
      await client.execute('PRAGMA foreign_keys = ON;');

      // 2. Define and create all core system tables
      const tableDDLs = [
        {
          name: 'users',
          sql: `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            matric_or_staff_no TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone_number TEXT NOT NULL,
            role TEXT CHECK(role IN ('STUDENT', 'PORTER', 'WARDEN', 'MAINTENANCE', 'ADMIN', 'SYSTEM')) NOT NULL,
            gender TEXT CHECK(gender IN ('MALE', 'FEMALE')) NOT NULL,
            profile_photo_url TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
        },
        {
          name: 'student_profiles',
          sql: `CREATE TABLE IF NOT EXISTS student_profiles (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            faculty TEXT NOT NULL,
            department TEXT NOT NULL,
            level INTEGER NOT NULL,
            campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
            priority_category TEXT CHECK(priority_category IN ('FRESHER', 'FINALIST', 'SCHOLAR', 'SPECIAL_NEEDS', 'STALLITE')) NOT NULL,
            fees_paid INTEGER DEFAULT 0,
            clearance_status TEXT CHECK(clearance_status IN ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'NOT_STARTED'
          );`,
        },
        {
          name: 'hostels',
          sql: `CREATE TABLE IF NOT EXISTS hostels (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
            campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
            category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
            total_capacity INTEGER NOT NULL,
            available_bedspaces INTEGER NOT NULL
          );`,
        },
        {
          name: 'rooms',
          sql: `CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            hostel_id TEXT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
            block_name TEXT NOT NULL,
            floor_number INTEGER NOT NULL,
            room_number TEXT NOT NULL,
            total_beds INTEGER DEFAULT 4,
            occupied_beds INTEGER DEFAULT 0
          );`,
        },
        {
          name: 'bedspaces',
          sql: `CREATE TABLE IF NOT EXISTS bedspaces (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
            bed_label TEXT NOT NULL,
            status TEXT CHECK(status IN ('AVAILABLE', 'LOCKED_HOLD', 'CONFIRMED', 'MAINTENANCE_BLOCKED')) DEFAULT 'AVAILABLE',
            allocated_to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            hold_expires_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
        },
        {
          name: 'payments',
          sql: `CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            bedspace_id TEXT NOT NULL REFERENCES bedspaces(id),
            transaction_reference TEXT UNIQUE NOT NULL,
            amount REAL NOT NULL,
            payment_status TEXT CHECK(payment_status IN ('PENDING', 'SUCCESSFUL', 'FAILED')) DEFAULT 'PENDING',
            paid_at DATETIME
          );`,
        },
        {
          name: 'room_inventory_audits',
          sql: `CREATE TABLE IF NOT EXISTS room_inventory_audits (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL REFERENCES rooms(id),
            student_id TEXT NOT NULL REFERENCES users(id),
            porter_id TEXT NOT NULL REFERENCES users(id),
            mattress_condition TEXT NOT NULL,
            fan_condition TEXT NOT NULL,
            sockets_condition TEXT NOT NULL,
            locks_condition TEXT NOT NULL,
            student_signature_url TEXT,
            porter_signature_url TEXT,
            audited_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
        },
        {
          name: 'maintenance_tickets',
          sql: `CREATE TABLE IF NOT EXISTS maintenance_tickets (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id),
            hostel_id TEXT NOT NULL REFERENCES hostels(id),
            room_number TEXT NOT NULL,
            category TEXT CHECK(category IN ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL')) NOT NULL,
            description TEXT NOT NULL,
            photo_before_url TEXT NOT NULL,
            photo_after_url TEXT,
            status TEXT CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
            assigned_artisan_id TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME
          );`,
        },
        {
          name: 'visitor_passes',
          sql: `CREATE TABLE IF NOT EXISTS visitor_passes (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id),
            visitor_name TEXT NOT NULL,
            visitor_phone TEXT NOT NULL,
            pass_code TEXT NOT NULL,
            visit_date DATE NOT NULL,
            check_in_time DATETIME,
            check_out_time DATETIME,
            status TEXT CHECK(status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED')) DEFAULT 'EXPECTED'
          );`,
        },
        {
          name: 'exeat_requests',
          sql: `CREATE TABLE IF NOT EXISTS exeat_requests (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id),
            destination_address TEXT NOT NULL,
            reason TEXT NOT NULL,
            departure_date DATE NOT NULL,
            return_date DATE NOT NULL,
            warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED')) DEFAULT 'PENDING',
            warden_id TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
        },
        {
          name: 'emergency_alerts',
          sql: `CREATE TABLE IF NOT EXISTS emergency_alerts (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id),
            hostel_id TEXT NOT NULL REFERENCES hostels(id),
            room_number TEXT NOT NULL,
            alert_type TEXT DEFAULT 'MEDICAL_OR_SECURITY',
            status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED')) DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
        },
      ];

      for (const t of tableDDLs) {
        try {
          await client.execute(t.sql);
          tablesCreated++;
        } catch (err: any) {
          errors.push(`Table '${t.name}' creation error: ${err.message || String(err)}`);
        }
      }

      // 3. Define and create all system search indexes for performance
      const indexDDLs = [
        {
          name: 'idx_users_matric',
          sql: `CREATE INDEX IF NOT EXISTS idx_users_matric ON users(matric_or_staff_no);`,
        },
        {
          name: 'idx_bedspaces_status',
          sql: `CREATE INDEX IF NOT EXISTS idx_bedspaces_status ON bedspaces(status);`,
        },
        {
          name: 'idx_maintenance_status',
          sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);`,
        },
        {
          name: 'idx_visitor_pass_code',
          sql: `CREATE INDEX IF NOT EXISTS idx_visitor_pass_code ON visitor_passes(pass_code);`,
        },
      ];

      for (const idx of indexDDLs) {
        try {
          await client.execute(idx.sql);
          indexesCreated++;
        } catch (err: any) {
          errors.push(`Index '${idx.name}' creation error: ${err.message || String(err)}`);
        }
      }

      return {
        success: errors.length === 0,
        tablesCreated,
        indexesCreated,
        errors,
        initializedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        tablesCreated,
        indexesCreated,
        errors: [...errors, `Fatal schema initialization failure: ${err.message || String(err)}`],
        initializedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieves a list of all custom user-defined tables present in the database.
   */
  public static async listTables(): Promise<TableInfo[]> {
    const client = this.getDb();
    const result = await client.execute(
      `SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`
    );

    const tables: TableInfo[] = [];
    for (const row of result.rows) {
      const name = String(row.name);
      const sql = String(row.sql || '');

      // Calculate approximate column count by counting commas/keywords in SQL definition
      let columnCount = 0;
      if (sql) {
        const colDefMatch = sql.match(/\((.*)\)/s);
        if (colDefMatch && colDefMatch[1]) {
          columnCount = colDefMatch[1].split(',').length;
        }
      }

      tables.push({ name, sql, columnCount });
    }

    return tables;
  }

  /**
   * Retrieves a list of all custom user-defined indexes present in the database.
   */
  public static async listIndexes(): Promise<IndexInfo[]> {
    const client = this.getDb();
    const result = await client.execute(
      `SELECT name, tbl_name as tableName, sql FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%';`
    );

    const indexes: IndexInfo[] = [];
    for (const row of result.rows) {
      indexes.push({
        name: String(row.name),
        tableName: String(row.tableName),
        sql: String(row.sql || ''),
      });
    }

    return indexes;
  }

  /**
   * Checks the comprehensive health status of the database schema and data connection.
   */
  public static async checkHealthStatus(): Promise<DatabaseHealthStatus> {
    try {
      const client = this.getDb();

      // Check client responsiveness
      const pingResult = await client.execute('SELECT 1 as ping;');
      const isConnected = pingResult.rows.length > 0;

      // Check foreign keys status
      const fkResult = await client.execute('PRAGMA foreign_keys;');
      const foreignKeysEnabled = Number(fkResult.rows[0]?.foreign_keys) === 1;

      // Get table count
      const tables = await this.listTables();
      const tableCount = tables.length;

      // Get index count
      const indexes = await this.listIndexes();
      const indexCount = indexes.length;

      // Check if hostels table has records loaded
      let isSeeded = false;
      try {
        const hostelsCountResult = await client.execute('SELECT COUNT(*) as count FROM hostels;');
        isSeeded = Number(hostelsCountResult.rows[0]?.count) > 0;
      } catch {
        isSeeded = false;
      }

      return {
        isConnected,
        foreignKeysEnabled,
        tableCount,
        indexCount,
        isSeeded,
      };
    } catch {
      return {
        isConnected: false,
        foreignKeysEnabled: false,
        tableCount: 0,
        indexCount: 0,
        isSeeded: false,
      };
    }
  }
}
