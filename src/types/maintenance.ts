/**
 * TypeScript types and interface definitions for Facility Maintenance & Artisan Job Queue.
 * Handles photo-backed defect reporting, artisan job assignments, SLA tracking,
 * proof-of-fix photo uploads, and resolution status state machine.
 *
 * Designed with simple, clear English descriptions for non-technical stakeholders,
 * hostel porters, hall wardens, and campus maintenance artisans.
 */

/**
 * Standard university hostel defect categories:
 * - PLUMBING: Leaking taps, broken toilets, drainage blockage
 * - ELECTRICAL: Faulty sockets, burnt lighting, fan regulators, tripping breakers
 * - CARPENTRY: Broken doors, lock replacements, wardrobe handles, bed frame repairs
 * - MASONRY: Wall cracking, plastering, tile breakage
 * - JANITORIAL: Cleaning, waste management, deep disinfection
 */
export type DefectCategory = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'MASONRY' | 'JANITORIAL';

/**
 * Maintenance ticket resolution lifecycle statuses:
 * - OPEN: Ticket submitted by student/inspection and pending artisan assignment
 * - IN_PROGRESS: Artisan assigned and actively resolving the defect
 * - RESOLVED: Repair completed with verified proof-of-fix photo upload
 * - REJECTED: Ticket flagged as invalid, duplicate, or out of scope
 */
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

/**
 * Defect priority SLA levels as defined in PRD Section 8:
 * - EMERGENCY: < 2 Hours response SLA (Major water leaks, electrical sparking)
 * - HIGH: < 24 Hours response SLA (Toilet blockage, complete room power loss)
 * - MEDIUM: < 48 Hours response SLA (Faulty fan regulator, leaking tap)
 * - LOW: < 72 Hours response SLA (Minor furniture squeak, wardrobe handle)
 */
export type TicketPriority = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Interface representing a Facility Maintenance Ticket in Turso DB.
 */
export interface MaintenanceTicket {
  // Unique identification code for this maintenance ticket
  id: string;
  // Student user ID who submitted the report (or allocated resident)
  studentId: string;
  // Student full name
  studentName?: string;
  // Student matriculation or staff number
  studentMatricNo?: string;
  // Hostel identifier code (e.g., 'hostel_jaja', 'hostel_moremi')
  hostelId: string;
  // Display name of the hostel building
  hostelName?: string;
  // Room number where the defect is located (e.g. 'Room 204')
  roomNumber: string;
  // Defect category classification
  category: DefectCategory;
  // Non-technical description of the issue provided by student or inspector
  description: string;
  // URL or image path of the defect photo captured before repair
  photoBeforeUrl: string;
  // URL or image path of the completion proof photo uploaded by artisan after repair
  photoAfterUrl?: string;
  // Current lifecycle status of the repair ticket
  status: TicketStatus;
  // Priority SLA level assigned to the ticket
  priority: TicketPriority;
  // Staff ID of the maintenance artisan assigned to execute the repair
  assignedArtisanId?: string;
  // Full name of the assigned artisan
  artisanName?: string;
  // Timestamp when the ticket was created
  createdAt: string;
  // Timestamp when the repair was completed and verified
  resolvedAt?: string;
  // Additional artisan notes or resolution remarks
  notes?: string;
}

/**
 * Parameters supplied when a student or porter creates a new repair request ticket.
 */
export interface CreateTicketParams {
  studentId: string;
  hostelId: string;
  roomNumber: string;
  category: DefectCategory;
  description: string;
  photoBeforeUrl: string;
  priority?: TicketPriority;
}

/**
 * Parameters supplied when assigning an artisan to a pending repair job.
 */
export interface AssignArtisanParams {
  ticketId: string;
  artisanId: string;
}

/**
 * Parameters supplied by an artisan when uploading a proof-of-fix photo and completing a job.
 */
export interface ProofOfFixParams {
  ticketId: string;
  artisanId: string;
  photoAfterUrl: string;
  notes?: string;
}

/**
 * Filter options when querying maintenance job queue.
 */
export interface TicketFilterParams {
  artisanId?: string;
  hostelId?: string;
  category?: DefectCategory;
  status?: TicketStatus;
  priority?: TicketPriority;
}
