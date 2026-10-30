/**
 * Database type definitions for UnilagStay master database operations,
 * schema initializations, table row statistics, index integrity checks,
 * foreign key validation, and system database health metrics.
 */

/**
 * Statistics for an individual database table.
 */
export interface DatabaseTableStats {
  tableName: string;      // Name of the database table (e.g., 'users', 'hostels', 'bedspaces')
  rowCount: number;       // Total number of records stored in this table
  hasPrimaryKey: boolean; // Indicates if primary key constraint is verified
  columnCount: number;    // Total number of columns in the table structure
}

/**
 * Result of an index integrity verification check.
 */
export interface IndexVerificationResult {
  indexName: string;   // Name of the database index (e.g., 'idx_users_matric')
  tableName: string;   // Table on which the index is built (e.g., 'users')
  columns: string[];   // Columns included in the index definition
  isUnique: boolean;   // Whether the index enforces uniqueness
  isVerified: boolean; // Confirms the index exists and is active in Turso libSQL
}

/**
 * Foreign key integrity validation check result.
 */
export interface ForeignKeyCheckResult {
  isForeignKeysEnabled: boolean; // Indicates if PRAGMA foreign_keys = ON is active
  violationsCount: number;      // Number of foreign key constraint violations detected
  status: 'HEALTHY' | 'VIOLATIONS_FOUND'; // Overall foreign key health state
  details?: string;             // Detailed message regarding foreign key integrity
}

/**
 * Outcome summary of running the master schema DDL and index initialization.
 */
export interface SchemaInitializationResult {
  success: boolean;        // Whether the DDL initialization succeeded
  tablesCreatedCount: number; // Total number of database tables initialized
  indexesCreatedCount: number; // Total number of performance indexes created
  timestamp: string;       // ISO date-time string when schema initialization ran
  message: string;         // Human-readable summary of the operation
}

/**
 * Comprehensive health status report of the entire Turso libSQL database.
 */
export interface SystemDatabaseHealth {
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED'; // Active client connection status
  databaseUrl: string;       // Database connection string or local SQLite path
  totalTables: number;       // Total number of active tables
  totalIndexes: number;      // Total number of active performance indexes
  foreignKeyCheck: ForeignKeyCheckResult; // Foreign key integrity report
  tableStatsList: DatabaseTableStats[];   // Breakdown of individual table statistics
  indexVerificationList: IndexVerificationResult[]; // Index verification reports
  lastHealthCheckTimestamp: string; // ISO date-time string of last executed check
}
