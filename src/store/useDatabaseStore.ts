import { create } from 'zustand';
import { DatabaseService } from '../api/databaseService';
import {
  SystemDatabaseHealth,
  SchemaInitializationResult,
  IndexVerificationResult,
  ForeignKeyCheckResult
} from '../types/database';

/**
 * Interface defining the Zustand store state and actions for master database system operations.
 */
export interface DatabaseState {
  healthStats: SystemDatabaseHealth | null;
  initResult: SchemaInitializationResult | null;
  indexVerificationList: IndexVerificationResult[];
  foreignKeyCheck: ForeignKeyCheckResult | null;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  initializeSchema: () => Promise<SchemaInitializationResult | null>;
  fetchHealthStats: () => Promise<SystemDatabaseHealth | null>;
  verifyIndexes: () => Promise<IndexVerificationResult[]>;
  checkForeignKeys: () => Promise<ForeignKeyCheckResult | null>;
  seedDefaults: () => Promise<number>;
  clearMessages: () => void;
}

/**
 * Zustand store hook for managing system database health, schema DDL initialization,
 * index verification status, foreign key check results, and directory seed actions.
 */
export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  healthStats: null,
  initResult: null,
  indexVerificationList: [],
  foreignKeyCheck: null,
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  /**
   * Initializes master Turso libSQL schema DDL and performance indexes.
   */
  initializeSchema: async () => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const res = await DatabaseService.initializeSchema();
      set({
        initResult: res,
        isLoading: false,
        successMessage: `Database initialized with ${res.tablesCreatedCount} tables and ${res.indexesCreatedCount} indexes.`
      });
      // Automatically refresh health stats after schema initialization
      await get().fetchHealthStats();
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Failed to initialize database schema DDL.';
      set({ isLoading: false, errorMessage: msg });
      return null;
    }
  },

  /**
   * Queries full system database health report, table stats, and connection status.
   */
  fetchHealthStats: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const health = await DatabaseService.getDatabaseHealthAndTableStats();
      set({
        healthStats: health,
        indexVerificationList: health.indexVerificationList,
        foreignKeyCheck: health.foreignKeyCheck,
        isLoading: false
      });
      return health;
    } catch (err: any) {
      const msg = err?.message || 'Failed to retrieve database health stats.';
      set({ isLoading: false, errorMessage: msg });
      return null;
    }
  },

  /**
   * Verifies existing database indexes against expected PRD indexes.
   */
  verifyIndexes: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const indexes = await DatabaseService.verifyDatabaseIndexes();
      set({
        indexVerificationList: indexes,
        isLoading: false,
        successMessage: `Verified ${indexes.filter((i) => i.isVerified).length} active database performance indexes.`
      });
      return indexes;
    } catch (err: any) {
      const msg = err?.message || 'Failed to verify database performance indexes.';
      set({ isLoading: false, errorMessage: msg });
      return [];
    }
  },

  /**
   * Conducts PRAGMA foreign_key_check to ensure zero orphaned foreign key records exist.
   */
  checkForeignKeys: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const result = await DatabaseService.checkForeignKeyIntegrity();
      set({
        foreignKeyCheck: result,
        isLoading: false,
        successMessage: result.status === 'HEALTHY'
          ? 'Foreign key integrity check passed with zero violations.'
          : `Alert: Found ${result.violationsCount} foreign key violations.`
      });
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Failed to execute foreign key check.';
      set({ isLoading: false, errorMessage: msg });
      return null;
    }
  },

  /**
   * Seeds default hostel directory records into the database.
   */
  seedDefaults: async () => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const count = await DatabaseService.seedMasterDatabaseDefaults();
      set({
        isLoading: false,
        successMessage: count > 0
          ? `Successfully seeded ${count} default hostel directory records.`
          : 'Database hostels directory is already seeded.'
      });
      await get().fetchHealthStats();
      return count;
    } catch (err: any) {
      const msg = err?.message || 'Failed to seed master database defaults.';
      set({ isLoading: false, errorMessage: msg });
      return 0;
    }
  },

  /**
   * Clears error and success status banner messages.
   */
  clearMessages: () => {
    set({ errorMessage: null, successMessage: null });
  }
}));
