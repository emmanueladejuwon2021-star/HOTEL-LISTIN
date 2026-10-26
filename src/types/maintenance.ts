/**
 * Types and interface definitions for Facility Maintenance & Artisan Dispatch Engine.
 * Handles hostel repair ticket queues, job status transitions (OPEN, IN_PROGRESS, RESOLVED, REJECTED),
 * artisan assignments, photo-backed proof-of-fix uploads, and audit timestamps.
 *
 * Designed with simple, clear English descriptions for non-technical stakeholders and university artisans.
 */

/**
 * Standard categories of maintenance issues reported in university hostels.
 */
export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'CARPENTRY'
  | 'MASONRY'
  | 'JANITORIAL';

/**
 * Lifecycle status of a maintenance repair ticket.
 * - OPEN: Ticket created by student/inventory audit, pending artisan assignment or work start.
 * - IN_PROGRESS: Artisan has claimed or started work on the repair job.
 * - RESOLVED: Repair completed with proof-of-fix photo uploaded and verified.
 * - REJECTED: Ticket deemed invalid or duplicate by maintenance administration.
 */
export type MaintenanceTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

/**
 * Interface representing a full maintenance repair ticket record in Turso DB.
 */
export interface MaintenanceTicket {
  // Unique identification code for the maintenance ticket
  id: string;
  // Unique ID of student who reported the defect or whose room has the defect
  studentId: string;
  // Full name of the student (joined from users table)
  studentName?: string;
  // Student matriculation or staff number
  studentMatricNo?: string;
  // Unique ID of hostel building where defect is located
  hostelId: string;
  // Display name of hostel (e.g., "King Jaja Hall", "Moremi Hall")
  hostelName?: string;
  // Room number where defect is located (e.g. "Room 204")
  roomNumber: string;
  // Trade category for repair dispatch
  category: MaintenanceCategory;
  // Detailed English description of the defect or broken fixture
  description: string;
  // URL or base64 photo showing broken fixture before repair
  photoBeforeUrl: string;
  // URL or base64 photo showing repaired fixture after completion
  photoAfterUrl?: string | null;
  // Current status of repair job
  status: MaintenanceTicketStatus;
  // Unique ID of assigned maintenance artisan user
  assignedArtisanId?: string | null;
  // Full name of assigned artisan user
  assignedArtisanName?: string | null;
  // Timestamp when defect ticket was created
  createdAt: string;
  // Timestamp when repair job was marked resolved
  resolvedAt?: string | null;
}

/**
 * Parameters provided when updating job status or claiming a ticket in the artisan queue.
 */
export interface UpdateTicketStatusParams {
  // Unique ticket ID to update
  ticketId: string;
  // New ticket status (IN_PROGRESS, RESOLVED, REJECTED)
  status: MaintenanceTicketStatus;
  // ID of artisan performing or taking ownership of job
  artisanId?: string;
}

/**
 * Parameters provided when uploading a proof-of-fix photo and resolving a repair ticket.
 */
export interface ProofOfFixParams {
  // Unique ticket ID being resolved
  ticketId: string;
  // ID of artisan uploading proof and resolving job
  artisanId: string;
  // URL or base64 image data showing completed repair
  photoAfterUrl: string;
  // Optional artisan completion notes or remarks
  resolutionNotes?: string;
}

/**
 * Result object returned upon successfully updating or resolving a maintenance ticket.
 */
export interface MaintenanceOperationResult {
  ticketId: string;
  status: MaintenanceTicketStatus;
  assignedArtisanId?: string;
  photoAfterUrl?: string;
  resolvedAt?: string;
  message: string;
}
