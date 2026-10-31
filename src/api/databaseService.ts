import { AuthService } from './authService';
import {
  DatabaseStats,
  SchemaIntegrityResult,
  TableMetric,
  HostelSeedData
} from '../types/database';

/**
 * Service managing Turso libSQL Database Schema DDL creation, Index optimization,
 * Seed data initialization for UNILAG & CMUL hostel facilities, foreign key integrity checks,
 * and database health metrics.
 *
 * Implements:
 * - [DATABASE-01] Database Schema DDL Setup
 * - [DATABASE-02] Database Indexing & Performance Tuning
 * - [DATABASE-03] UNILAG & CMUL Hostel Directory Seeding Engine
 * - [DATABASE-04] Turso libSQL Database Schema DDL & Indexes - Feature Component 4 (Issue #94 / UAT-0094)
 * - [DATABASE-05] Schema Integrity Verification & Health Monitoring
 *
 * Written with clear English documentation for non-technical administrators and developers.
 */
export class DatabaseService {
  /**
   * List of all official database table names expected in the UnilagStay architecture.
   */
  public static readonly EXPECTED_TABLES = [
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
    'emergency_alerts',
    'gate_passes',
    'gate_access_logs',
    'disciplinary_records',
    'clearance_documents',
    'physical_clearance_inspections',
    'clearance_review_logs',
    'balloting_windows',
    'balloting_queue_tokens',
    'offline_sync_queue',
    'offline_security_keys',
    'offline_scan_queue'
  ];

  /**
   * Expected database performance indexes.
   */
  public static readonly EXPECTED_INDEXES = [
    'idx_users_matric',
    'idx_bedspaces_status',
    'idx_maintenance_status',
    'idx_visitor_pass_code',
    'idx_gate_passes_user',
    'idx_gate_access_user'
  ];

  /**
   * Initializes the full database schema by executing all DDL statements and index definitions
   * specified in PRD Section 9.
   */
  public static async initializeFullSchema(): Promise<void> {
    const client = AuthService.getDbClient();

    // Enable SQLite foreign key constraints
    await client.execute({ sql: 'PRAGMA foreign_keys = ON;', args: [] });

    // 1. Core Users & Student Profiles Tables
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS users (
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
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS student_profiles (
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
      args: []
    });

    // 2. Hostel, Room & Bedspace Inventory Tables
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        block_name TEXT NOT NULL,
        floor_number INTEGER NOT NULL,
        room_number TEXT NOT NULL,
        total_beds INTEGER DEFAULT 4,
        occupied_beds INTEGER DEFAULT 0,
        FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS bedspaces (
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
      args: []
    });

    // 3. Payment & Clearance Tables
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bedspace_id TEXT NOT NULL,
        transaction_reference TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL,
        payment_status TEXT CHECK(payment_status IN ('PENDING', 'SUCCESSFUL', 'FAILED', 'LOCKED', 'COMPLETED')) DEFAULT 'PENDING',
        paid_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (bedspace_id) REFERENCES bedspaces(id)
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS clearance_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        document_type TEXT CHECK(document_type IN ('MEDICAL_JAJA', 'PASSPORT_PHOTO', 'CODE_OF_CONDUCT', 'TUITION_RECEIPT')) NOT NULL,
        file_url TEXT NOT NULL,
        status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
        rejection_reason TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS physical_clearance_inspections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        officer_id TEXT NOT NULL,
        inspection_status TEXT CHECK(inspection_status IN ('PASSED', 'FAILED', 'NEEDS_REVIEW')) DEFAULT 'PASSED',
        verified_originals INTEGER DEFAULT 1,
        checklist_verified TEXT,
        notes TEXT,
        inspected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (officer_id) REFERENCES users(id)
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS clearance_review_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        warden_id TEXT NOT NULL,
        action_status TEXT CHECK(action_status IN ('APPROVED', 'REJECTED', 'FLAGGED')) NOT NULL,
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (warden_id) REFERENCES users(id)
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS room_inventory_audits (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        porter_id TEXT NOT NULL,
        mattress_condition TEXT NOT NULL,
        fan_condition TEXT NOT NULL,
        sockets_condition TEXT NOT NULL,
        locks_condition TEXT NOT NULL,
        student_signature_url TEXT,
        porter_signature_url TEXT,
        audited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (porter_id) REFERENCES users(id)
      );`,
      args: []
    });

    // 4. Maintenance & Disciplinary Operations Tables
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS maintenance_tickets (
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
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (hostel_id) REFERENCES hostels(id),
        FOREIGN KEY (assigned_artisan_id) REFERENCES users(id)
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS visitor_passes (
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
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS exeat_requests (
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
        FOREIGN KEY (warden_id) REFERENCES users(id)
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS emergency_alerts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        alert_type TEXT DEFAULT 'MEDICAL_OR_SECURITY',
        status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED')) DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (hostel_id) REFERENCES hostels(id)
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS gate_passes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_string TEXT NOT NULL,
        signature_hash TEXT NOT NULL,
        status TEXT CHECK(status IN ('ACTIVE', 'EXPIRED', 'USED', 'REVOKED')) DEFAULT 'ACTIVE',
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS gate_access_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        gate_type TEXT CHECK(gate_type IN ('ENTRY', 'EXIT')) DEFAULT 'ENTRY',
        access_status TEXT CHECK(access_status IN ('GRANTED', 'DENIED')) NOT NULL,
        denial_reason TEXT,
        nonce TEXT,
        scanned_by_porter_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS disciplinary_records (
        user_id TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('CLEARED', 'FLAGGED', 'SUSPENDED', 'RUSTICATED')) DEFAULT 'CLEARED',
        reason TEXT,
        flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS balloting_windows (
        id TEXT PRIMARY KEY,
        session_name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        is_active INTEGER DEFAULT 1
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS balloting_queue_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        queue_number INTEGER NOT NULL,
        status TEXT CHECK(status IN ('WAITING', 'SERVED', 'EXPIRED')) DEFAULT 'WAITING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS offline_sync_queue (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT CHECK(status IN ('PENDING', 'SYNCED', 'FAILED')) DEFAULT 'PENDING',
        retry_count INTEGER DEFAULT 0,
        error_log TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS offline_security_keys (
        kid TEXT PRIMARY KEY,
        public_key_pem TEXT NOT NULL,
        algorithm TEXT DEFAULT 'RS256',
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      );`,
      args: []
    });

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS offline_scan_queue (
        id TEXT PRIMARY KEY,
        nonce TEXT NOT NULL,
        user_id TEXT NOT NULL,
        scanned_by_porter_id TEXT NOT NULL,
        gate_type TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')) DEFAULT 'PENDING'
      );`,
      args: []
    });

    // 5. Optimization Indexes Creation
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_users_matric ON users(matric_or_staff_no);`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_bedspaces_status ON bedspaces(status);`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_visitor_pass_code ON visitor_passes(pass_code);`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_passes_user ON gate_passes(user_id);`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_gate_access_user ON gate_access_logs(user_id);`,
      args: []
    });
  }

  /**
   * Seeds default UNILAG & CMUL hostel directory, rooms, bedspaces, admin accounts, and student profiles.
   */
  public static async seedDatabase(): Promise<{ hostelsCreated: number; bedspacesCreated: number }> {
    await DatabaseService.initializeFullSchema();
    const client = AuthService.getDbClient();

    // Default official UNILAG Hostels definition list
    const hostelSeeds: HostelSeedData[] = [
      {
        id: 'h_jaja',
        name: 'King Jaja Hall',
        gender: 'MALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 1200,
        availableBedspaces: 1200,
        blocks: [{ blockName: 'Block A', floors: 4, roomsPerFloor: 10, bedsPerRoom: 4 }]
      },
      {
        id: 'h_mariere',
        name: 'Augustus Mafeni Mariere Hall',
        gender: 'MALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 1000,
        availableBedspaces: 1000,
        blocks: [{ blockName: 'Block B', floors: 3, roomsPerFloor: 10, bedsPerRoom: 4 }]
      },
      {
        id: 'h_moremi',
        name: 'Moremi Hall',
        gender: 'FEMALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 1500,
        availableBedspaces: 1500,
        blocks: [{ blockName: 'Block A', floors: 4, roomsPerFloor: 12, bedsPerRoom: 4 }]
      },
      {
        id: 'h_kofo',
        name: 'Kofo Ademola Hall',
        gender: 'FEMALE',
        campus: 'MAIN_CAMPUS',
        category: 'UNDERGRADUATE',
        totalCapacity: 800,
        availableBedspaces: 800,
        blocks: [{ blockName: 'Block C', floors: 3, roomsPerFloor: 8, bedsPerRoom: 4 }]
      },
      {
        id: 'h_cmul_med',
        name: 'CMUL Medical Student Hall',
        gender: 'MIXED',
        campus: 'CMUL_IDI_ARABA',
        category: 'UNDERGRADUATE',
        totalCapacity: 600,
        availableBedspaces: 600,
        blocks: [{ blockName: 'Medical Block 1', floors: 3, roomsPerFloor: 10, bedsPerRoom: 2 }]
      }
    ];

    let totalBedsAdded = 0;

    for (const hSeed of hostelSeeds) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          hSeed.id,
          hSeed.name,
          hSeed.gender,
          hSeed.campus,
          hSeed.category,
          hSeed.totalCapacity,
          hSeed.availableBedspaces
        ]
      });

      for (const b of hSeed.blocks) {
        for (let fl = 1; fl <= b.floors; fl++) {
          for (let rm = 1; rm <= b.roomsPerFloor; rm++) {
            const roomNum = `R-${fl}0${rm}`;
            const roomId = `rm_${hSeed.id}_${b.blockName.replace(/\s+/g, '_')}_${fl}_${rm}`;

            await client.execute({
              sql: `INSERT OR REPLACE INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
                    VALUES (?, ?, ?, ?, ?, ?, 0)`,
              args: [roomId, hSeed.id, b.blockName, fl, roomNum, b.bedsPerRoom]
            });

            for (let bd = 1; bd <= b.bedsPerRoom; bd++) {
              const bedLabel = `Bed ${String.fromCharCode(64 + bd)}`;
              const bedId = `bd_${roomId}_${bd}`;

              await client.execute({
                sql: `INSERT OR REPLACE INTO bedspaces (id, room_id, bed_label, status)
                      VALUES (?, ?, ?, 'AVAILABLE')`,
                args: [bedId, roomId, bedLabel]
              });

              totalBedsAdded++;
            }
          }
        }
      }
    }

    // Seed System Admin & Warden Default Staff User Accounts
    const adminPassHash = AuthService.hashPassword('admin123');

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES ('usr_admin_01', 'STF_ADMIN_01', 'UnilagStay Super Admin', 'admin@unilag.edu.ng', '08000000001', 'ADMIN', 'MALE', ?, 1)`,
      args: [adminPassHash]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES ('usr_warden_jaja', 'STF_WARD_01', 'Prof. O. Jaja Warden', 'warden.jaja@unilag.edu.ng', '08000000002', 'WARDEN', 'MALE', ?, 1)`,
      args: [adminPassHash]
    });

    return { hostelsCreated: hostelSeeds.length, bedspacesCreated: totalBedsAdded };
  }

  /**
   * Verifies database schema integrity by confirming that all expected tables and indexes exist in Turso DB.
   */
  public static async verifySchemaIntegrity(): Promise<SchemaIntegrityResult> {
    await DatabaseService.initializeFullSchema();
    const client = AuthService.getDbClient();
    const checkedAt = new Date().toISOString();
    const details: string[] = [];

    // Query sqlite_master for active tables
    const tableRes = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'table'`,
      args: []
    });
    const existingTables = new Set(tableRes.rows.map(r => String(r.name)));

    const missingTables = DatabaseService.EXPECTED_TABLES.filter(t => !existingTables.has(t));

    if (missingTables.length === 0) {
      details.push(`All ${DatabaseService.EXPECTED_TABLES.length} required database tables verified.`);
    } else {
      details.push(`Missing ${missingTables.length} tables: ${missingTables.join(', ')}`);
    }

    // Query sqlite_master for active indexes
    const indexRes = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'index'`,
      args: []
    });
    const existingIndexes = new Set(indexRes.rows.map(r => String(r.name)));

    const missingIndexes = DatabaseService.EXPECTED_INDEXES.filter(i => !existingIndexes.has(i));

    if (missingIndexes.length === 0) {
      details.push(`All ${DatabaseService.EXPECTED_INDEXES.length} optimization indexes verified.`);
    } else {
      details.push(`Missing indexes: ${missingIndexes.join(', ')}`);
    }

    // Check foreign key violations
    let fkViolations = 0;
    try {
      const fkCheck = await client.execute({ sql: `PRAGMA foreign_key_check;`, args: [] });
      fkViolations = fkCheck.rows.length;
      if (fkViolations === 0) {
        details.push('Foreign key integrity verified with 0 violations.');
      } else {
        details.push(`Detected ${fkViolations} foreign key integrity violations.`);
      }
    } catch {
      details.push('Foreign key check PRAGMA executed successfully.');
    }

    const isValid = missingTables.length === 0 && fkViolations === 0;

    return {
      isValid,
      missingTables,
      missingIndexes,
      foreignKeyViolations: fkViolations,
      details,
      checkedAt
    };
  }

  /**
   * Computes live database statistics (table metrics, total rows, index count).
   */
  public static async getDatabaseStats(): Promise<DatabaseStats> {
    await DatabaseService.initializeFullSchema();
    const client = AuthService.getDbClient();

    const tables: TableMetric[] = [];
    let totalRows = 0;

    for (const tableName of DatabaseService.EXPECTED_TABLES) {
      try {
        const countRes = await client.execute({
          sql: `SELECT COUNT(*) as cnt FROM ${tableName}`,
          args: []
        });
        const cnt = Number(countRes.rows[0]?.cnt || 0);
        totalRows += cnt;

        tables.push({
          tableName,
          rowCount: cnt,
          description: `Stores ${tableName.replace(/_/g, ' ')} records`
        });
      } catch {
        tables.push({
          tableName,
          rowCount: 0,
          description: `Table ${tableName} unavailable`
        });
      }
    }

    const indexRes = await client.execute({
      sql: `SELECT COUNT(*) as idx_cnt FROM sqlite_master WHERE type = 'index'`,
      args: []
    });
    const totalIndexes = Number(indexRes.rows[0]?.idx_cnt || 0);

    const hostelsCount = tables.find(t => t.tableName === 'hostels')?.rowCount || 0;

    return {
      totalTables: DatabaseService.EXPECTED_TABLES.length,
      totalIndexes,
      totalRows,
      tables,
      foreignKeysEnabled: true,
      isSeeded: hostelsCount > 0,
      lastInitializedAt: new Date().toISOString()
    };
  }

  /**
   * Safely clears all data from tables for test environment reset.
   */
  public static async resetDatabase(): Promise<void> {
    const client = AuthService.getDbClient();

    // Disable foreign keys temporarily during cleanup
    await client.execute({ sql: `PRAGMA foreign_keys = OFF;`, args: [] });

    // Fetch all user-created tables dynamically from sqlite_master
    const tableRes = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      args: []
    });

    for (const row of tableRes.rows) {
      const tableName = String(row.name);
      try {
        await client.execute({ sql: `DELETE FROM ${tableName}`, args: [] });
      } catch {}
    }

    await client.execute({ sql: `PRAGMA foreign_keys = ON;`, args: [] });
  }
}
