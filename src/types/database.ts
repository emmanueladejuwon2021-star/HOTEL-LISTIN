/**
 * UNILAG Hostel Management Mobile Application ("UnilagStay")
 * Database Schema & DDL Management Type Definitions
 *
 * This file contains TypeScript interfaces and types for database table definitions,
 * index metadata, schema initialization results, and system health checks.
 * All comments are written in clear, plain English for all developers.
 */

/**
 * Represents metadata about a database table in the system.
 */
export interface TableInfo {
  /** The unique name of the table in the database */
  name: string;
  /** The SQL statement used to create the table */
  sql: string;
  /** The number of columns defined in the table */
  columnCount: number;
}

/**
 * Represents metadata about a database index used for fast searching.
 */
export interface IndexInfo {
  /** The name of the database index */
  name: string;
  /** The name of the table that this index belongs to */
  tableName: string;
  /** The SQL statement used to create the index */
  sql: string;
}

/**
 * Represents the summary report after running full database schema initialization.
 */
export interface SchemaInitializationResult {
  /** Indicates whether the entire database setup completed without errors */
  success: boolean;
  /** Total number of database tables created or confirmed existing */
  tablesCreated: number;
  /** Total number of database indexes created or confirmed existing */
  indexesCreated: number;
  /** List of any error messages encountered during setup */
  errors: string[];
  /** ISO timestamp showing when the database setup was executed */
  initializedAt: string;
}

/**
 * Represents the health status of the database connection and schema structure.
 */
export interface DatabaseHealthStatus {
  /** Whether the database client connection is active and responding */
  isConnected: boolean;
  /** Whether foreign key safety checks are active to prevent broken data relationships */
  foreignKeysEnabled: boolean;
  /** Total number of tables currently present in the database */
  tableCount: number;
  /** Total number of search indexes currently present in the database */
  indexCount: number;
  /** Whether sample initial data (like hostel directory) has been loaded into the database */
  isSeeded: boolean;
}
