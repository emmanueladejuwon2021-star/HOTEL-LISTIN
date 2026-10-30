import { DatabaseService } from '../api/databaseService';
import { AuthService } from '../api/authService';
import { useDatabaseStore } from '../store/useDatabaseStore';

describe('DatabaseService & Turso libSQL Schema DDL & Indexes [DATABASE-01, DATABASE-02, DATABASE-03]', () => {
  beforeEach(async () => {
    // Reset Zustand store state before each test
    useDatabaseStore.setState({
      healthStats: null,
      initResult: null,
      indexVerificationList: [],
      foreignKeyCheck: null,
      isLoading: false,
      errorMessage: null,
      successMessage: null
    });

    // Ensure database client schema is initialized
    await DatabaseService.initializeSchema();
  });

  describe('[DATABASE-03 / UAT-0093] Turso Schema DDL, Indexes & Foreign Key Verification', () => {
    test('executes master schema DDL creating all 11 PRD Section 9 tables', async () => {
      const initResult = await DatabaseService.initializeSchema();

      expect(initResult).toBeDefined();
      expect(initResult.success).toBe(true);
      expect(initResult.tablesCreatedCount).toBe(11);
      expect(initResult.indexesCreatedCount).toBe(4);
      expect(initResult.message).toContain('successfully initialized');
    });

    test('verifies performance indexes idx_users_matric, idx_bedspaces_status, idx_maintenance_status, idx_visitor_pass_code', async () => {
      const indexResults = await DatabaseService.verifyDatabaseIndexes();

      expect(indexResults).toBeDefined();
      expect(indexResults.length).toBe(4);

      const matricIndex = indexResults.find((i) => i.indexName === 'idx_users_matric');
      expect(matricIndex).toBeDefined();
      expect(matricIndex?.tableName).toBe('users');
      expect(matricIndex?.isVerified).toBe(true);

      const bedspaceIndex = indexResults.find((i) => i.indexName === 'idx_bedspaces_status');
      expect(bedspaceIndex).toBeDefined();
      expect(bedspaceIndex?.tableName).toBe('bedspaces');
      expect(bedspaceIndex?.isVerified).toBe(true);

      const maintenanceIndex = indexResults.find((i) => i.indexName === 'idx_maintenance_status');
      expect(maintenanceIndex).toBeDefined();
      expect(maintenanceIndex?.tableName).toBe('maintenance_tickets');
      expect(maintenanceIndex?.isVerified).toBe(true);

      const visitorIndex = indexResults.find((i) => i.indexName === 'idx_visitor_pass_code');
      expect(visitorIndex).toBeDefined();
      expect(visitorIndex?.tableName).toBe('visitor_passes');
      expect(visitorIndex?.isVerified).toBe(true);
    });

    test('checks foreign key enforcement and reports zero violations on clean database', async () => {
      const fkResult = await DatabaseService.checkForeignKeyIntegrity();

      expect(fkResult).toBeDefined();
      expect(fkResult.isForeignKeysEnabled).toBe(true);
      expect(fkResult.violationsCount).toBe(0);
      expect(fkResult.status).toBe('HEALTHY');
    });

    test('retrieves comprehensive database health report and table statistics', async () => {
      const health = await DatabaseService.getDatabaseHealthAndTableStats();

      expect(health).toBeDefined();
      expect(health.connectionStatus).toBe('ONLINE');
      expect(health.totalTables).toBe(11);
      expect(health.tableStatsList.length).toBe(11);

      const usersTableStat = health.tableStatsList.find((t) => t.tableName === 'users');
      expect(usersTableStat).toBeDefined();
      expect(usersTableStat?.hasPrimaryKey).toBe(true);
      expect(usersTableStat?.columnCount).toBeGreaterThanOrEqual(10);
    });

    test('seeds master default hostels directory when database is empty', async () => {
      const client = AuthService.getDbClient();
      await client.execute({ sql: 'DELETE FROM hostels', args: [] });

      const seededCount = await DatabaseService.seedMasterDatabaseDefaults();
      expect(seededCount).toBe(5);

      const reseedCount = await DatabaseService.seedMasterDatabaseDefaults();
      expect(reseedCount).toBe(0); // Should skip if already seeded
    });

    test('executes database updates with foreign key integrity checks', async () => {
      const client = AuthService.getDbClient();
      const testUserId = `usr_test_db_${Date.now()}`;

      const inserted = await DatabaseService.executeRecordTransactionWithFKCheck(
        `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
         VALUES (?, ?, 'Test DB Admin', ?, '08011112222', 'ADMIN', 'MALE', 'hash123')`,
        [testUserId, `STAFF/DB/${Date.now()}`, `dbadmin_${Date.now()}@unilag.edu.ng`]
      );

      expect(inserted).toBe(true);

      const userRow = await client.execute({
        sql: 'SELECT full_name FROM users WHERE id = ?',
        args: [testUserId]
      });

      expect(userRow.rows.length).toBe(1);
      expect(String(userRow.rows[0].full_name)).toBe('Test DB Admin');
    });

    test('executes Zustand store actions for schema initialization, health check, and index verification', async () => {
      const store = useDatabaseStore.getState();

      const res = await store.initializeSchema();
      expect(res).toBeDefined();
      expect(res?.success).toBe(true);

      const health = await store.fetchHealthStats();
      expect(health).toBeDefined();
      expect(useDatabaseStore.getState().healthStats).toBeDefined();

      const indexes = await store.verifyIndexes();
      expect(indexes.length).toBe(4);

      const fkCheck = await store.checkForeignKeys();
      expect(fkCheck?.status).toBe('HEALTHY');

      expect(useDatabaseStore.getState().successMessage).toBeDefined();
    });
  });
});
