/**
 * UNILAG Hostel Management Mobile Application ("UnilagStay")
 * Database Schema DDL & Index Unit & Integration Tests
 *
 * Issue #92: [DATABASE-02] Implement Turso libSQL Database Schema DDL & Indexes
 * Scenario / UAT: UAT-0092
 *
 * Tests verify database schema creation, table listing, search indexes,
 * foreign key checks, health status, and Zustand store actions.
 */

import { DatabaseService } from '../api/databaseService';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { AuthService } from '../api/authService';

describe('DatabaseService & Database Schema DDL Engine [DATABASE-02 / UAT-0092]', () => {
  beforeEach(async () => {
    // Reset Zustand store state before each test
    useDatabaseStore.setState({
      isLoading: false,
      message: null,
      lastInitResult: null,
      tables: [],
      indexes: [],
      healthStatus: null,
    });

    // Ensure database client is active and foreign keys are enabled
    await DatabaseService.enableForeignKeys();
  });

  test('should execute full database schema DDL setup and create all core tables and indexes', async () => {
    const result = await DatabaseService.initializeSchema();

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.tablesCreated).toBeGreaterThanOrEqual(11);
    expect(result.indexesCreated).toBeGreaterThanOrEqual(4);
    expect(result.errors.length).toEqual(0);
    expect(result.initializedAt).toBeDefined();
  });

  test('should idempotently re-initialize database schema without crashing or duplicating tables', async () => {
    // Run first initialization
    await DatabaseService.initializeSchema();

    // Run second initialization (idempotency check)
    const secondResult = await DatabaseService.initializeSchema();

    expect(secondResult.success).toBe(true);
    expect(secondResult.errors.length).toEqual(0);
  });

  test('should list all custom user-defined database tables with column count metadata', async () => {
    await DatabaseService.initializeSchema();
    const tables = await DatabaseService.listTables();

    expect(tables).toBeDefined();
    expect(Array.isArray(tables)).toBe(true);

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('student_profiles');
    expect(tableNames).toContain('hostels');
    expect(tableNames).toContain('rooms');
    expect(tableNames).toContain('bedspaces');
    expect(tableNames).toContain('payments');
    expect(tableNames).toContain('room_inventory_audits');
    expect(tableNames).toContain('maintenance_tickets');
    expect(tableNames).toContain('visitor_passes');
    expect(tableNames).toContain('exeat_requests');
    expect(tableNames).toContain('emergency_alerts');
  });

  test('should list all custom search indexes created on database tables', async () => {
    await DatabaseService.initializeSchema();
    const indexes = await DatabaseService.listIndexes();

    expect(indexes).toBeDefined();
    expect(Array.isArray(indexes)).toBe(true);

    const indexNames = indexes.map((idx) => idx.name);
    expect(indexNames).toContain('idx_users_matric');
    expect(indexNames).toContain('idx_bedspaces_status');
    expect(indexNames).toContain('idx_maintenance_status');
    expect(indexNames).toContain('idx_visitor_pass_code');
  });

  test('should verify database health status including connection ping and foreign key enforcement', async () => {
    await DatabaseService.initializeSchema();
    const health = await DatabaseService.checkHealthStatus();

    expect(health).toBeDefined();
    expect(health.isConnected).toBe(true);
    expect(health.foreignKeysEnabled).toBe(true);
    expect(health.tableCount).toBeGreaterThanOrEqual(11);
    expect(health.indexCount).toBeGreaterThanOrEqual(4);
  });

  test('Zustand useDatabaseStore should execute initializeSchema and update state seamlessly', async () => {
    const store = useDatabaseStore.getState();

    const result = await store.initializeSchema();

    expect(result.success).toBe(true);

    const updatedState = useDatabaseStore.getState();
    expect(updatedState.isLoading).toBe(false);
    expect(updatedState.tables.length).toBeGreaterThanOrEqual(11);
    expect(updatedState.indexes.length).toBeGreaterThanOrEqual(4);
    expect(updatedState.healthStatus?.isConnected).toBe(true);
    expect(updatedState.message).toContain('Database schema successfully initialized!');
  });
});
