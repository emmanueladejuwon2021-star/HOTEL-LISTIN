import { AuthService } from '../api/authService';
import { DatabaseService } from '../api/databaseService';

describe('DatabaseService - Turso libSQL DDL Schema, Indexes & Seed [DATABASE-01 / UAT-0091]', () => {
  afterAll(async () => {
    // Restore full database schema so subsequent test suites operate on initialized schema
    await DatabaseService.initializeFullSchema();
  });

  beforeEach(async () => {
    const client = AuthService.getDbClient();
    // Drop test tables in reverse foreign key order to start fresh
    const tablesToDrop = [
      'emergency_alerts',
      'exeat_requests',
      'visitor_passes',
      'maintenance_tickets',
      'room_inventory_audits',
      'payments',
      'bedspaces',
      'rooms',
      'hostels',
      'student_profiles',
      'users'
    ];

    for (const table of tablesToDrop) {
      try {
        await client.execute(`DROP TABLE IF EXISTS ${table};`);
      } catch {
        // Safe to ignore drop errors during test reset
      }
    }
  });

  it('should initialize full database schema with all 11 core tables and performance indexes', async () => {
    const ddlResult = await DatabaseService.initializeFullSchema();

    expect(ddlResult.success).toBe(true);
    expect(ddlResult.tablesCreatedCount).toBe(11);
    expect(ddlResult.indexesCreatedCount).toBe(4);
    expect(ddlResult.message).toContain('initialized successfully');

    const schemaVerification = await DatabaseService.verifySchemaIntegrity();
    expect(schemaVerification.isComplete).toBe(true);
    expect(schemaVerification.missingTables.length).toBe(0);
    expect(schemaVerification.missingIndexes.length).toBe(0);

    for (const table of DatabaseService.REQUIRED_TABLES) {
      expect(schemaVerification.existingTables).toContain(table);
    }

    for (const index of DatabaseService.REQUIRED_INDEXES) {
      expect(schemaVerification.existingIndexes).toContain(index);
    }
  });

  it('should verify schema integrity and identify missing tables if dropped', async () => {
    await DatabaseService.initializeFullSchema();

    const client = AuthService.getDbClient();
    await client.execute('DROP TABLE IF EXISTS emergency_alerts;');

    const verification = await DatabaseService.verifySchemaIntegrity();
    expect(verification.isComplete).toBe(false);
    expect(verification.missingTables).toContain('emergency_alerts');
  });

  it('should retrieve table row counts and index stats via getTableStats', async () => {
    await DatabaseService.initializeFullSchema();

    const stats = await DatabaseService.getTableStats();
    expect(stats.length).toBeGreaterThanOrEqual(11);

    const userStat = stats.find(s => s.tableName === 'users');
    expect(userStat).toBeDefined();
    expect(userStat?.rowCount).toBe(0);
    expect(userStat?.hasIndexes).toBe(true);
  });

  it('should seed initial UNILAG and CMUL hostel directory data successfully', async () => {
    const seedResult = await DatabaseService.seedInitialHostelData();

    expect(seedResult.hostelsSeededCount).toBe(5);
    expect(seedResult.roomsSeededCount).toBe(10);
    expect(seedResult.bedspacesSeededCount).toBe(40);
    expect(seedResult.message).toContain('Successfully seeded');

    // Verify seeded hostels exist in database
    const client = AuthService.getDbClient();
    const hostelsRes = await client.execute('SELECT * FROM hostels;');
    expect(hostelsRes.rows.length).toBe(5);

    const jajaHall = hostelsRes.rows.find(h => String(h.name) === 'King Jaja Hall');
    expect(jajaHall).toBeDefined();
    expect(String(jajaHall?.campus)).toBe('MAIN_CAMPUS');

    const cmulHall = hostelsRes.rows.find(h => String(h.name) === 'CMUL Medical Student Hall');
    expect(cmulHall).toBeDefined();
    expect(String(cmulHall?.campus)).toBe('CMUL_IDI_ARABA');

    // Re-running seed should safely skip if data already exists
    const secondSeed = await DatabaseService.seedInitialHostelData();
    expect(secondSeed.hostelsSeededCount).toBe(0);
    expect(secondSeed.message).toContain('already populated');
  });

  it('should enforce foreign key constraint integrity across schema tables', async () => {
    await DatabaseService.initializeFullSchema();
    const client = AuthService.getDbClient();

    // Attempting to insert a student profile for a non-existent user should fail due to foreign key constraint
    await expect(client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES ('non_existent_user', 'Sciences', 'Computer Science', 100, 'MAIN_CAMPUS', 'FRESHER', 1, 'APPROVED')`,
      args: []
    })).rejects.toThrow();
  });
});
