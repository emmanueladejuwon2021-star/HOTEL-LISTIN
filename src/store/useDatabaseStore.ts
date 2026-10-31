/**
 * UNILAG Hostel Management Mobile Application ("UnilagStay")
 * Database Operations State Management Store (Zustand)
 *
 * This store handles UI state and async actions for database schema initialization,
 * table and index listing, health status monitoring, and error handling.
 * All comments are written in plain, jargon-free English for developers and stakeholders.
 */

import { create } from 'zustand';
import { DatabaseService } from '../api/databaseService';
import {
  TableInfo,
  IndexInfo,
  SchemaInitializationResult,
  DatabaseHealthStatus,
} from '../types/database';

interface DatabaseState {
  /** Whether a database operation (like initializing schema or checking status) is in progress */
  isLoading: boolean;
  /** Status or error message from the last executed database operation */
  message: string | null;
  /** Details from the last schema initialization run */
  lastInitResult: SchemaInitializationResult | null;
  /** List of database tables currently created in Turso */
  tables: TableInfo[];
  /** List of database search indexes currently created in Turso */
  indexes: IndexInfo[];
  /** Current health metrics and connectivity status of the database */
  healthStatus: DatabaseHealthStatus | null;

  /** Action: Triggers full DDL schema and index creation in Turso libSQL */
  initializeSchema: () => Promise<SchemaInitializationResult>;
  /** Action: Fetches and updates the list of tables created in the database */
  fetchTables: () => Promise<void>;
  /** Action: Fetches and updates the list of search indexes created in the database */
  fetchIndexes: () => Promise<void>;
  /** Action: Fetches comprehensive database health and connection metrics */
  checkHealth: () => Promise<void>;
  /** Action: Resets error messages and operation status */
  clearMessage: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  isLoading: false,
  message: null,
  lastInitResult: null,
  tables: [],
  indexes: [],
  healthStatus: null,

  initializeSchema: async () => {
    set({ isLoading: true, message: 'Initializing database schema and indexes...' });
    try {
      const result = await DatabaseService.initializeSchema();

      // Refresh table/index lists and health check after initialization
      await get().fetchTables();
      await get().fetchIndexes();
      await get().checkHealth();

      const successMessage = result.success
        ? `Database schema successfully initialized! ${result.tablesCreated} tables and ${result.indexesCreated} indexes verified.`
        : `Database schema initialization completed with warnings: ${result.errors.join('; ')}`;

      set({
        isLoading: false,
        lastInitResult: result,
        message: successMessage,
      });

      return result;
    } catch (err: any) {
      const errorMessage = `Failed to initialize database schema: ${err.message || String(err)}`;
      set({
        isLoading: false,
        message: errorMessage,
      });
      return {
        success: false,
        tablesCreated: 0,
        indexesCreated: 0,
        errors: [errorMessage],
        initializedAt: new Date().toISOString(),
      };
    }
  },

  fetchTables: async () => {
    try {
      const tables = await DatabaseService.listTables();
      set({ tables });
    } catch (err: any) {
      set({ message: `Error listing database tables: ${err.message || String(err)}` });
    }
  },

  fetchIndexes: async () => {
    try {
      const indexes = await DatabaseService.listIndexes();
      set({ indexes });
    } catch (err: any) {
      set({ message: `Error listing database indexes: ${err.message || String(err)}` });
    }
  },

  checkHealth: async () => {
    try {
      const healthStatus = await DatabaseService.checkHealthStatus();
      set({ healthStatus });
    } catch (err: any) {
      set({ message: `Error checking database health: ${err.message || String(err)}` });
    }
  },

  clearMessage: () => set({ message: null }),
}));
