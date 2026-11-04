import { Client } from '@libsql/client';
import { AuthService } from './authService';
import {
  TableStat,
  SchemaVerificationResult,
  DDLResult,
  HostelSeedData,
  DatabaseSeedResult
} from '../types/database';

/**
 * Core Database Service for the UNILAG Hostel Management Ecosystem ("UnilagStay").
 * Manages centralized Turso libSQL SQLite database schema DDL initialization,
 * performance index creation, schema integrity verification, table statistics reporting,
 * and initial hostel directory seeding.
 *
 * Implements [DATABASE-01] and PRD Section 9 Database Architecture Specification.
 * Adheres strictly to zero-mock principles and foreign key constraints.
 * Written with plain English explanations for non-technical team members and university officials.
 */
export class DatabaseService {
  /**
   * Required database tables specified in PRD Section 9.
   */
  public static readonly REQUIRED_TABLES = [
    'users',
    'student_profiles',
    'hostels',
    'rooms',
    'bedspaces',
    'payments',
    'room_inventory_audits',
    'maintenance_tickets',
    'visitor_passes',
    'exeat_requests',
    'emergency_alerts'
  ];

  /**
   * Performance database indexes specified in PRD Section 9.
   */
  public static readonly REQUIRED_INDEXES = [
    'idx_users_matric',
    'idx_bedspaces_status',
    'idx_maintenance_status',
    'idx_visitor_pass_code'
  ];

  /**
   * Initializes the full database schema by executing DDL statements for all 11 core tables
   * and 4 performance search indexes. Enforces foreign key constraints and safety constraints.
   *
   * @returns DDLResult containing execution status and table creation counts.
   */
  public static async initializeFullSchema(): Promise<DDLResult> {
    const client = AuthService.getDbClient();

    // Enable SQLite foreign key enforcement
    await client.execute('PRAGMA foreign_keys = ON;');

    // Execute table DDL batch transaction
    await client.batch([
      // 1. Users table storing account credentials, roles, and profiles for all user types
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        matric_or_staff_no TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT NOT NULL,
        role TEXT CHECK(role IN ('STUDENT', 'PORTER', 'WARDEN', 'MAINTENANCE', 'ADMIN')) NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE')) NOT NULL,
        password_hash TEXT NOT NULL,
        profile_photo_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 2. Student profiles table storing academic faculty, department, level, campus, and fees payment standing
      `CREATE TABLE IF NOT EXISTS student_profiles (
        user_id TEXT PRIMARY KEY,
        faculty TEXT NOT NULL,
        department TEXT NOT NULL,
        level INTEGER NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        priority_category TEXT CHECK(priority_category IN ('FRESHER', 'FINALIST', 'SCHOLAR', 'SPECIAL_NEEDS', 'STALLITE')) NOT NULL,
        fees_paid INTEGER DEFAULT 0,
        clearance_status TEXT CHECK(clearance_status IN ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'NOT_STARTED',
        residency_status TEXT DEFAULT 'PENDING_CHECKIN',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      // 3. Hostels table holding directory information for all 19 UNILAG and CMUL halls of residence
      `CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      );`,

      // 4. Rooms table storing individual hostel room block designations, floor levels, and bed capacities
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

      // 5. Bedspaces table storing atomic bed positions, allocation locks, 72-hour payment holds, and occupant references
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

      // 6. Payments table tracking Remita/card fee payment transaction references, amounts, and statuses
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
      );`,

      // 7. Room inventory audits table storing move-in/check-out property inspection checklists and signatures
      `CREATE TABLE IF NOT EXISTS room_inventory_audits (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        porter_id TEXT NOT NULL,
        mattress_condition TEXT CHECK(mattress_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        fan_condition TEXT CHECK(fan_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        sockets_condition TEXT CHECK(sockets_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        locks_condition TEXT CHECK(locks_condition IN ('GOOD', 'FAIR', 'POOR')) NOT NULL,
        lights_condition TEXT DEFAULT 'GOOD',
        windows_condition TEXT DEFAULT 'GOOD',
        certificate_hash TEXT,
        key_issued INTEGER DEFAULT 0,
        key_tag_number TEXT,
        key_issued_at DATETIME,
        audit_type TEXT DEFAULT 'CHECK_IN',
        student_signature_url TEXT,
        porter_signature_url TEXT,
        notes TEXT,
        audited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (porter_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      // 8. Maintenance tickets table storing room repair requests with problem photos and artisan fix proof
      `CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        category TEXT CHECK(category IN ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL')) NOT NULL,
        description TEXT NOT NULL,
        photo_before_url TEXT NOT NULL,
        photo_after_url TEXT,
        status TEXT CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
        assigned_artisan_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_artisan_id) REFERENCES users(id) ON DELETE SET NULL
      );`,

      // 9. Visitor passes table managing guest PINs, temporary entry QR passes, and gatekeeper check-in logs
      `CREATE TABLE IF NOT EXISTS visitor_passes (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        visitor_name TEXT NOT NULL,
        visitor_phone TEXT NOT NULL,
        pass_code TEXT NOT NULL,
        visit_date DATE NOT NULL,
        check_in_time DATETIME,
        check_out_time DATETIME,
        status TEXT CHECK(status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED')) DEFAULT 'EXPECTED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      // 10. Exeat requests table storing overnight permission applications, travel destinations, and Warden approvals
      `CREATE TABLE IF NOT EXISTS exeat_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        reason TEXT NOT NULL,
        departure_date DATE NOT NULL,
        return_date DATE NOT NULL,
        warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED')) DEFAULT 'PENDING',
        warden_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (warden_id) REFERENCES users(id) ON DELETE SET NULL
      );`,

      // 11. Emergency alerts table storing 3-second red SOS panic button triggers and porter gate alarm logs
      `CREATE TABLE IF NOT EXISTS emergency_alerts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        alert_type TEXT DEFAULT 'MEDICAL_OR_SECURITY',
        status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED')) DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
      );`
    ], 'write');

    // Migration checks for existing database instances to ensure safe schema upgrades
    const safeMigrations = [
      `ALTER TABLE student_profiles ADD COLUMN residency_status TEXT DEFAULT 'PENDING_CHECKIN'`,
      `ALTER TABLE payments ADD COLUMN payment_type TEXT DEFAULT 'HOSTEL_FEE'`,
      `ALTER TABLE visitor_passes ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
    ];

    for (const stmt of safeMigrations) {
      try {
        await client.execute({ sql: stmt, args: [] });
      } catch {
        // Column already exists, safe to ignore
      }
    }

    // Create performance search indexes
    await client.batch([
      `CREATE INDEX IF NOT EXISTS idx_users_matric ON users(matric_or_staff_no);`,
      `CREATE INDEX IF NOT EXISTS idx_bedspaces_status ON bedspaces(status);`,
      `CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);`,
      `CREATE INDEX IF NOT EXISTS idx_visitor_pass_code ON visitor_passes(pass_code);`
    ], 'write');

    return {
      success: true,
      tablesCreatedCount: DatabaseService.REQUIRED_TABLES.length,
      indexesCreatedCount: DatabaseService.REQUIRED_INDEXES.length,
      executedAt: new Date().toISOString(),
      message: 'All 11 core database tables and 4 search indexes initialized successfully in Turso libSQL SQLite.'
    };
  }

  /**
   * Verifies that all required tables and indexes exist in the SQLite database system metadata (`sqlite_master`).
   *
   * @returns SchemaVerificationResult containing completeness status and missing items if any.
   */
  public static async verifySchemaIntegrity(): Promise<SchemaVerificationResult> {
    const client = AuthService.getDbClient();

    // Query existing table names from sqlite_master
    const tableResult = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      args: []
    });

    const existingTables = tableResult.rows.map(row => String(row.name));
    const missingTables = DatabaseService.REQUIRED_TABLES.filter(tbl => !existingTables.includes(tbl));

    // Query existing index names from sqlite_master
    const indexResult = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'`,
      args: []
    });

    const existingIndexes = indexResult.rows.map(row => String(row.name));
    const missingIndexes = DatabaseService.REQUIRED_INDEXES.filter(idx => !existingIndexes.includes(idx));

    const isComplete = missingTables.length === 0 && missingIndexes.length === 0;

    return {
      isComplete,
      existingTables,
      missingTables,
      existingIndexes,
      missingIndexes,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves table statistics (row count and index status) for all active tables in the database.
   *
   * @returns Array of TableStat objects.
   */
  public static async getTableStats(): Promise<TableStat[]> {
    const client = AuthService.getDbClient();
    const stats: TableStat[] = [];

    const schemaCheck = await DatabaseService.verifySchemaIntegrity();

    for (const tableName of schemaCheck.existingTables) {
      const countResult = await client.execute({
        sql: `SELECT COUNT(*) as total FROM ${tableName}`,
        args: []
      });

      const rowCount = Number(countResult.rows[0]?.total || 0);

      // Check if table has an associated index
      const indexCheck = await client.execute({
        sql: `SELECT COUNT(*) as idx_count FROM sqlite_master WHERE type = 'index' AND tbl_name = ?`,
        args: [tableName]
      });

      const hasIndexes = Number(indexCheck.rows[0]?.idx_count || 0) > 0;

      stats.push({
        tableName,
        rowCount,
        hasIndexes
      });
    }

    return stats;
  }

  /**
   * Seeds initial hostel, room, and bedspace directory data into the database if empty.
   * Includes representative hostels for UNILAG Main Campus and CMUL Idi-Araba.
   *
   * @returns DatabaseSeedResult containing summary count of seeded records.
   */
  public static async seedInitialHostelData(): Promise<DatabaseSeedResult> {
    await DatabaseService.initializeFullSchema();
    const client = AuthService.getDbClient();

    // Check if hostels table already contains records
    const checkResult = await client.execute('SELECT COUNT(*) as count FROM hostels;');
    const currentCount = Number(checkResult.rows[0]?.count || 0);

    if (currentCount > 0) {
      return {
        hostelsSeededCount: 0,
        roomsSeededCount: 0,
        bedspacesSeededCount: 0,
        seededAt: new Date().toISOString(),
        message: 'Hostel directory database already populated. Seeding skipped.'
      };
    }

    const defaultHostels: HostelSeedData[] = [
      {
        id: 'hostel_jaja',
        name: 'King Jaja Hall',
        gender: 'MALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 1200,
        availableBedspaces: 1200
      },
      {
        id: 'hostel_mariere',
        name: 'Augustus Mafeni Mariere Hall',
        gender: 'MALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 1000,
        availableBedspaces: 1000
      },
      {
        id: 'hostel_moremi',
        name: 'Moremi Hall',
        gender: 'FEMALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 1400,
        availableBedspaces: 1400
      },
      {
        id: 'hostel_kofo',
        name: 'Kofo Ademola Hall',
        gender: 'FEMALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 900,
        availableBedspaces: 900
      },
      {
        id: 'hostel_cmul_med',
        name: 'CMUL Medical Student Hall',
        gender: 'MIXED',
        campus: 'CMUL_IDI_ARABA',
        category: 'UNDERGRADUATE',
        totalCapacity: 800,
        availableBedspaces: 800
      }
    ];

    let hostelsCount = 0;
    let roomsCount = 0;
    let bedspacesCount = 0;

    for (const h of defaultHostels) {
      await client.execute({
        sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [h.id, h.name, h.gender, h.campus, h.category, h.totalCapacity, h.availableBedspaces]
      });
      hostelsCount++;

      // Create 2 sample rooms per hostel
      for (let r = 101; r <= 102; r++) {
        const roomId = `room_${h.id}_${r}`;
        const roomNum = `Room ${r}`;
        await client.execute({
          sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
                VALUES (?, ?, 'Block A', 1, ?, 4, 0)`,
          args: [roomId, h.id, roomNum]
        });
        roomsCount++;

        // Create 4 bedspaces per room (A-Down, A-Up, B-Down, B-Up)
        const bedLabels = ['Bed A (Down)', 'Bed A (Up)', 'Bed B (Down)', 'Bed B (Up)'];
        for (let b = 0; b < bedLabels.length; b++) {
          const bedspaceId = `bed_${roomId}_${b + 1}`;
          await client.execute({
            sql: `INSERT INTO bedspaces (id, room_id, bed_label, status)
                  VALUES (?, ?, ?, 'AVAILABLE')`,
            args: [bedspaceId, roomId, bedLabels[b]]
          });
          bedspacesCount++;
        }
      }
    }

    return {
      hostelsSeededCount: hostelsCount,
      roomsSeededCount: roomsCount,
      bedspacesSeededCount: bedspacesCount,
      seededAt: new Date().toISOString(),
      message: `Successfully seeded ${hostelsCount} hostels, ${roomsCount} rooms, and ${bedspacesCount} bedspaces.`
    };
  }
}
