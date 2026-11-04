/**
 * Data structures and TypeScript interfaces for the Turso libSQL Database Management System.
 * These types define database statistics, schema verification metrics, query execution results,
 * and initial seeding configurations for UNILAG and CMUL hostel accommodation facilities.
 */

/**
 * Statistics and row counts for a specific database table.
 * Used by university administrators to monitor database storage and record counts.
 */
export interface TableStat {
  tableName: string;      // The name of the table in the database (e.g. 'hostels', 'users')
  rowCount: number;       // The total number of records currently stored in this table
  hasIndexes: boolean;    // Indicates whether performance search indexes are configured for this table
}

/**
 * Detailed report checking whether all required tables and indexes exist in the database.
 * Used during application startup to confirm database readiness.
 */
export interface SchemaVerificationResult {
  isComplete: boolean;           // True if all 11 core tables and performance indexes exist
  existingTables: string[];      // List of tables currently present in the database
  missingTables: string[];       // List of tables that are missing and need creation
  existingIndexes: string[];     // List of database search indexes currently active
  missingIndexes: string[];     // List of missing search indexes
  verifiedAt: string;            // ISO timestamp when the schema check was performed
}

/**
 * Result metadata returned after running database schema creation DDL commands.
 */
export interface DDLResult {
  success: boolean;              // True if all database tables and indexes were created without errors
  tablesCreatedCount: number;    // Total number of tables created or verified
  indexesCreatedCount: number;   // Total number of search indexes created or verified
  executedAt: string;            // ISO timestamp when the database schema setup was completed
  message: string;               // Plain English summary explaining the database setup result
}

/**
 * Configuration structure for initial database seeding of UNILAG and CMUL hostels.
 */
export interface HostelSeedData {
  id: string;                    // Unique ID for the hostel (e.g. 'jaja_hall')
  name: string;                  // Official name of the hall (e.g. 'King Jaja Hall')
  gender: 'MALE' | 'FEMALE' | 'MIXED'; // Gender designation for resident allocation
  campus: 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA'; // Campus location
  category: 'UNDERGRADUATE' | 'POSTGRADUATE'; // Student study level category
  totalCapacity: number;         // Maximum bed capacity for the hostel
  availableBedspaces: number;    // Number of unallocated bedspaces available for balloting
}

/**
 * Result returned after seeding initial hostel and room data into the database.
 */
export interface DatabaseSeedResult {
  hostelsSeededCount: number;    // Number of hostels added to the database
  roomsSeededCount: number;      // Number of student rooms created
  bedspacesSeededCount: number;  // Number of individual bedspace positions created
  seededAt: string;              // Timestamp when seeding completed
  message: string;               // Plain English description of the seeding outcome
}
