import { DatabaseService } from '../api/databaseService';
import { AuthService } from '../api/authService';

/**
 * Automated Test Suite for Turso libSQL Database Schema DDL & Indexes.
 * Implements:
 * - [DATABASE-01 / UAT-0091] Implement Turso libSQL Database Schema DDL & Indexes - Feature Component 1
 * - [DATABASE-02 / UAT-0092] Implement Turso libSQL Database Schema DDL & Indexes - Feature Component 2
 * - [DATABASE-03 / UAT-0093] Implement Turso libSQL Database Schema DDL & Indexes - Feature Component 3
 * - [DATABASE-04 / UAT-0094] Implement Turso libSQL Database Schema DDL & Indexes - Feature Component 4 (Issue #94)
 * - [DATABASE-05 / UAT-0095] Implement Turso libSQL Database Schema DDL & Indexes - Feature Component 5
 *
 * Verifies full 22-table DDL creation, index presence, UNILAG/CMUL hostel seeding engine,
 * foreign key integrity enforcement, database metrics summary, and clean database reset.
 *
 * Described in clear English for non-technical team members and database administrators.
 */
describe('Turso libSQL Database Schema DDL & Indexes [DATABASE-04 / UAT-0094]', () => {
  beforeEach(async () => {
    // Clean up database tables before each test case
    await DatabaseService.resetDatabase();
  });

  afterAll(async () => {
    await DatabaseService.resetDatabase();
  });

  test('should create all PRD database tables and optimization indexes in Turso DB (DATABASE-01 / UAT-0091)', async () => {
    await DatabaseService.initializeFullSchema();

    const client = AuthService.getDbClient();
    const tableRes = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'table'`,
      args: []
    });

    const tablesInDb = tableRes.rows.map(r => String(r.name));

    for (const expectedTable of DatabaseService.EXPECTED_TABLES) {
      expect(tablesInDb).toContain(expectedTable);
    }
  });

  test('should seed UNILAG & CMUL hostel directory, rooms, bedspaces, and staff accounts (DATABASE-03 / UAT-0093)', async () => {
    const result = await DatabaseService.seedDatabase();

    expect(result.hostelsCreated).toBeGreaterThanOrEqual(5);
    expect(result.bedspacesCreated).toBeGreaterThan(0);

    const stats = await DatabaseService.getDatabaseStats();
    expect(stats.isSeeded).toBe(true);
    expect(stats.totalRows).toBeGreaterThan(0);

    // Verify Jaja Hall hostel record
    const client = AuthService.getDbClient();
    const jajaRes = await client.execute({
      sql: `SELECT name, campus, gender FROM hostels WHERE id = 'h_jaja'`,
      args: []
    });

    expect(jajaRes.rows.length).toBe(1);
    expect(String(jajaRes.rows[0].name)).toBe('King Jaja Hall');
    expect(String(jajaRes.rows[0].campus)).toBe('MAIN_CAMPUS');
  });

  test('should verify schema integrity and foreign key constraint compliance (DATABASE-05 / UAT-0095)', async () => {
    await DatabaseService.initializeFullSchema();
    const integrity = await DatabaseService.verifySchemaIntegrity();

    expect(integrity.isValid).toBe(true);
    expect(integrity.missingTables.length).toBe(0);
    expect(integrity.foreignKeyViolations).toBe(0);
    expect(integrity.details.length).toBeGreaterThan(0);
  });

  test('should compute live database statistics with table metrics and index counts (DATABASE-04 / UAT-0094)', async () => {
    await DatabaseService.seedDatabase();
    const stats = await DatabaseService.getDatabaseStats();

    expect(stats.totalTables).toBe(DatabaseService.EXPECTED_TABLES.length);
    expect(stats.totalIndexes).toBeGreaterThan(0);
    expect(stats.foreignKeysEnabled).toBe(true);
    expect(stats.tables.length).toBe(DatabaseService.EXPECTED_TABLES.length);

    const usersTableMetric = stats.tables.find(t => t.tableName === 'users');
    expect(usersTableMetric).toBeDefined();
    expect(usersTableMetric?.rowCount).toBeGreaterThanOrEqual(2); // Admin & Warden
  });

  test('should execute clean database reset without foreign key errors (DATABASE-04 / UAT-0094)', async () => {
    await DatabaseService.seedDatabase();
    await DatabaseService.resetDatabase();

    const stats = await DatabaseService.getDatabaseStats();
    expect(stats.totalRows).toBe(0);
    expect(stats.isSeeded).toBe(false);
  });
});
