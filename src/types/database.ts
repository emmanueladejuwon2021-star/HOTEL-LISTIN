/**
 * Database Schema and Seeding Types for UnilagStay Hostel Management System.
 *
 * Provides data structures for managing Turso libSQL SQLite Edge database tables,
 * indexes, initial university hostel seeds, system integrity validation checks,
 * and real-time database health statistics.
 *
 * Explained in plain English for developers and non-technical system administrators.
 */

/**
 * Summary metrics of a database table, including row count and description.
 */
export interface TableMetric {
  tableName: string;
  rowCount: number;
  description: string;
}

/**
 * Overall Database Health and Statistics summary report.
 */
export interface DatabaseStats {
  totalTables: number;
  totalIndexes: number;
  totalRows: number;
  tables: TableMetric[];
  foreignKeysEnabled: boolean;
  isSeeded: boolean;
  lastInitializedAt: string;
}

/**
 * Result of a database schema integrity check.
 */
export interface SchemaIntegrityResult {
  isValid: boolean;
  missingTables: string[];
  missingIndexes: string[];
  foreignKeyViolations: number;
  details: string[];
  checkedAt: string;
}

/**
 * Configuration item for seeding UNILAG & CMUL hostel directory records.
 */
export interface HostelSeedData {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'MIXED';
  campus: 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA';
  category: 'UNDERGRADUATE' | 'POSTGRADUATE';
  totalCapacity: number;
  availableBedspaces: number;
  blocks: {
    blockName: string;
    floors: number;
    roomsPerFloor: number;
    bedsPerRoom: number;
  }[];
}

/**
 * Representation of a database table column definition for schema inspection.
 */
export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}
