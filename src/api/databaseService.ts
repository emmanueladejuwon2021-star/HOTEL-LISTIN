import { AuthService } from './authService';
import {
  DatabaseTableStats,
  IndexVerificationResult,
  ForeignKeyCheckResult,
  SchemaInitializationResult,
  SystemDatabaseHealth
} from '../types/database';

/**
 * Master Database Service class for managing Turso libSQL SQLite database schemas,
 * table DDL execution, performance indexing, foreign key integrity enforcement,
 * system health reporting, and master directory seeding.
 */
export class DatabaseService {
  /**
   * Initializes all system tables and performance indexes specified in PRD Section 9.
   * Enables foreign key checks (`PRAGMA foreign_keys = ON;`) to guarantee database integrity.
   *
   * @returns Detailed summary result of schema creation
   */
  public static async initializeSchema(): Promise<SchemaInitializationResult> {
    const client = AuthService.getDbClient();

    // Enable Foreign Keys in SQLite / Turso
    await client.execute({ sql: 'PRAGMA foreign_keys = ON;', args: [] });

    // Table DDL Statements for all 11 core system entities
    const tableDdlStatements = [
      // 1. Users Table
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

      // 2. Student Profiles Table
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

      // 3. Hostels Table
      `CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      );`,

      // 4. Rooms Table
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

      // 5. Bedspaces Table
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

      // 6. Payments Table
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
      );`,

      // 7. Room Inventory Audits Table
      `CREATE TABLE IF NOT EXISTS room_inventory_audits (
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

      // 8. Maintenance Tickets Table
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
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (hostel_id) REFERENCES hostels(id),
        FOREIGN KEY (assigned_artisan_id) REFERENCES users(id)
      );`,

      // 9. Visitor Passes Table
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
        FOREIGN KEY (student_id) REFERENCES users(id)
      );`,

      // 10. Exeat Requests Table
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
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (warden_id) REFERENCES users(id)
      );`,

      // 11. Emergency Alerts Table
      `CREATE TABLE IF NOT EXISTS emergency_alerts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        hostel_id TEXT NOT NULL,
        room_number TEXT NOT NULL,
        alert_type TEXT DEFAULT 'MEDICAL_OR_SECURITY',
        status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED')) DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (hostel_id) REFERENCES hostels(id)
      );`
    ];

    // Execute table DDL statements
    await client.batch(tableDdlStatements, 'write');

    // Index DDL Statements specified in PRD Section 9
    const indexDdlStatements = [
      'CREATE INDEX IF NOT EXISTS idx_users_matric ON users(matric_or_staff_no);',
      'CREATE INDEX IF NOT EXISTS idx_bedspaces_status ON bedspaces(status);',
      'CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);',
      'CREATE INDEX IF NOT EXISTS idx_visitor_pass_code ON visitor_passes(pass_code);'
    ];

    // Execute index creation
    await client.batch(indexDdlStatements, 'write');

    return {
      success: true,
      tablesCreatedCount: tableDdlStatements.length,
      indexesCreatedCount: indexDdlStatements.length,
      timestamp: new Date().toISOString(),
      message: 'Master Turso libSQL schema DDL and performance indexes successfully initialized.'
    };
  }

  /**
   * Verifies that all required performance indexes exist and are active in Turso libSQL.
   *
   * @returns Array of IndexVerificationResult objects
   */
  public static async verifyDatabaseIndexes(): Promise<IndexVerificationResult[]> {
    const client = AuthService.getDbClient();
    const expectedIndexes = [
      { name: 'idx_users_matric', table: 'users', columns: ['matric_or_staff_no'] },
      { name: 'idx_bedspaces_status', table: 'bedspaces', columns: ['status'] },
      { name: 'idx_maintenance_status', table: 'maintenance_tickets', columns: ['status'] },
      { name: 'idx_visitor_pass_code', table: 'visitor_passes', columns: ['pass_code'] }
    ];

    const results: IndexVerificationResult[] = [];

    for (const exp of expectedIndexes) {
      const res = await client.execute({
        sql: `SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`,
        args: [exp.name]
      });

      const exists = res.rows.length > 0;
      results.push({
        indexName: exp.name,
        tableName: exp.table,
        columns: exp.columns,
        isUnique: false,
        isVerified: exists
      });
    }

    return results;
  }

  /**
   * Checks foreign key integrity in the SQLite database using `PRAGMA foreign_key_check`.
   *
   * @returns ForeignKeyCheckResult detailing foreign key integrity state
   */
  public static async checkForeignKeyIntegrity(): Promise<ForeignKeyCheckResult> {
    const client = AuthService.getDbClient();

    // Check if foreign keys PRAGMA is enabled
    const fkPragmaRes = await client.execute({ sql: 'PRAGMA foreign_keys;', args: [] });
    const isEnabled = Boolean(fkPragmaRes.rows[0]?.[0] ?? fkPragmaRes.rows[0]?.foreign_keys ?? 1);

    // Run PRAGMA foreign_key_check
    const checkRes = await client.execute({ sql: 'PRAGMA foreign_key_check;', args: [] });
    const violationsCount = checkRes.rows.length;

    return {
      isForeignKeysEnabled: isEnabled,
      violationsCount,
      status: violationsCount === 0 ? 'HEALTHY' : 'VIOLATIONS_FOUND',
      details: violationsCount === 0
        ? 'Foreign key integrity is healthy with zero orphan records.'
        : `Detected ${violationsCount} foreign key constraint violations in the database.`
    };
  }

  /**
   * Generates a complete system health and table statistics report across all Turso database tables.
   *
   * @returns SystemDatabaseHealth object with table row counts and connection metrics
   */
  public static async getDatabaseHealthAndTableStats(): Promise<SystemDatabaseHealth> {
    await DatabaseService.initializeSchema();
    const client = AuthService.getDbClient();

    const tables = [
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

    const tableStatsList: DatabaseTableStats[] = [];

    for (const tableName of tables) {
      try {
        const countRes = await client.execute({
          sql: `SELECT COUNT(*) as cnt FROM ${tableName}`,
          args: []
        });
        const rowCount = Number(countRes.rows[0]?.cnt ?? 0);

        const infoRes = await client.execute({
          sql: `PRAGMA table_info(${tableName});`,
          args: []
        });

        const columnCount = infoRes.rows.length;
        const hasPrimaryKey = infoRes.rows.some((row) => Boolean(row.pk));

        tableStatsList.push({
          tableName,
          rowCount,
          hasPrimaryKey,
          columnCount
        });
      } catch (e) {
        tableStatsList.push({
          tableName,
          rowCount: 0,
          hasPrimaryKey: false,
          columnCount: 0
        });
      }
    }

    const indexVerificationList = await DatabaseService.verifyDatabaseIndexes();
    const foreignKeyCheck = await DatabaseService.checkForeignKeyIntegrity();

    return {
      connectionStatus: 'ONLINE',
      databaseUrl: process.env.TURSO_DATABASE_URL || 'file:unilagstay_local.db',
      totalTables: tables.length,
      totalIndexes: indexVerificationList.filter((i) => i.isVerified).length,
      foreignKeyCheck,
      tableStatsList,
      indexVerificationList,
      lastHealthCheckTimestamp: new Date().toISOString()
    };
  }

  /**
   * Seeds default hostel directory records and initial system administrator accounts if hostels table is empty.
   *
   * @returns Promise resolving to the number of hostels seeded
   */
  public static async seedMasterDatabaseDefaults(): Promise<number> {
    await DatabaseService.initializeSchema();
    const client = AuthService.getDbClient();

    const checkHostels = await client.execute({ sql: 'SELECT COUNT(*) as cnt FROM hostels', args: [] });
    if (Number(checkHostels.rows[0]?.cnt ?? 0) > 0) {
      return 0; // Already seeded
    }

    const defaultHostels = [
      { id: 'h_jaja', name: 'King Jaja Hall', gender: 'MALE', campus: 'MAIN_CAMPUS', category: 'UNDERGRADUATE', total: 1200, avail: 1200 },
      { id: 'h_mariere', name: 'Mariere Hall', gender: 'MALE', campus: 'MAIN_CAMPUS', category: 'UNDERGRADUATE', total: 1000, avail: 1000 },
      { id: 'h_moremi', name: 'Moremi Hall', gender: 'FEMALE', campus: 'MAIN_CAMPUS', category: 'UNDERGRADUATE', total: 1400, avail: 1400 },
      { id: 'h_kofo', name: 'Kofo Ademola Hall', gender: 'FEMALE', campus: 'MAIN_CAMPUS', category: 'UNDERGRADUATE', total: 900, avail: 900 },
      { id: 'h_cmul_med', name: 'CMUL Medical Student Hall', gender: 'MIXED', campus: 'CMUL_IDI_ARABA', category: 'UNDERGRADUATE', total: 800, avail: 800 }
    ];

    for (const h of defaultHostels) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [h.id, h.name, h.gender, h.campus, h.category, h.total, h.avail]
      });
    }

    return defaultHostels.length;
  }

  /**
   * Executes a database record status update with foreign key integrity verification.
   * Useful for administrative database actions (e.g. exeat approvals, status updates).
   *
   * @param query - SQL string to execute
   * @param args - Array of positional arguments
   * @returns Promise resolving to boolean indicating success
   */
  public static async executeRecordTransactionWithFKCheck(query: string, args: any[] = []): Promise<boolean> {
    await DatabaseService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({ sql: 'PRAGMA foreign_keys = ON;', args: [] });
    await client.execute({ sql: query, args });

    const fkResult = await DatabaseService.checkForeignKeyIntegrity();
    if (fkResult.status !== 'HEALTHY') {
      throw new Error(`Transaction violates foreign key integrity: ${fkResult.details}`);
    }

    return true;
  }
}
