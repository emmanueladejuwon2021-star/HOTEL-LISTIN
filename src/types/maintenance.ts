/**
 * UNILAG Hostel Management Mobile Application ("UnilagStay")
 * Maintenance & Artisan Job Queue Type Definitions
 *
 * This file defines all TypeScript data models, status types, and payload interfaces
 * used for hostel defect reporting, artisan repair job dispatching, and proof-of-fix uploads.
 */

/**
 * Categories of hostel physical property defects reported by students or porters.
 */
export type TicketCategory =
  | 'PLUMBING'    // Pipe leaks, faulty taps, clogged drainage, shower fixtures
  | 'ELECTRICAL'  // Short circuits, socket failures, fan regulators, light bulbs
  | 'CARPENTRY'   // Broken doors, wardrobe hinges, bed frames, window louvers
  | 'MASONRY'     // Wall cracks, tile damage, ceiling plaster leaks
  | 'JANITORIAL';  // Waste management, deep sanitization, pest control requests

/**
 * Current status of a maintenance repair ticket in the workflow lifecycle.
 */
export type TicketStatus =
  | 'OPEN'        // Ticket submitted by student, awaiting artisan assignment
  | 'IN_PROGRESS' // Artisan has started repair work on site
  | 'RESOLVED'    // Artisan completed repair work and uploaded proof-of-fix photo
  | 'REJECTED';   // Ticket declined due to invalid report or duplicate issue

/**
 * Response urgency levels determining Service Level Agreement (SLA) response times.
 */
export type TicketUrgency =
  | 'EMERGENCY'   // Major hazard (bare live wires, flooded room) - SLA < 2 Hours
  | 'HIGH'        // Significant disruption (total power loss, unusable toilet) - SLA < 24 Hours
  | 'MEDIUM'      // Moderate inconvenience (leaking tap, faulty fan regulator) - SLA < 48 Hours
  | 'LOW';        // Minor cosmetic issue (squeaky door, wardrobe handle) - SLA < 72 Hours

/**
 * Complete record representation of a hostel maintenance ticket stored in Turso DB.
 */
export interface MaintenanceTicket {
  /** Unique ticket identifier UUID string */
  id: string;
  /** Student user ID who logged the original defect ticket */
  student_id: string;
  /** Name or ID of student who logged the issue (optional joined field) */
  student_name?: string;
  /** Hostel unique ID where the broken fixture is located */
  hostel_id: string;
  /** Human-readable hostel name (e.g., "King Jaja Hall") */
  hostel_name?: string;
  /** Room designation string (e.g., "Room 204") */
  room_number: string;
  /** Category of the broken fixture or defect */
  category: TicketCategory;
  /** Priority level determining artisan dispatch SLA */
  urgency: TicketUrgency;
  /** Detailed plain text explanation of the broken item provided by the student */
  description: string;
  /** Live photo capture URL showing defect before repair work */
  photo_before_url: string;
  /** Live proof-of-fix photo URL uploaded by artisan upon job completion */
  photo_after_url?: string | null;
  /** Current state of the repair ticket */
  status: TicketStatus;
  /** User ID of the artisan assigned to perform the repair work */
  assigned_artisan_id?: string | null;
  /** Full name of the assigned artisan for UI display */
  assigned_artisan_name?: string | null;
  /** Timestamp ISO string when defect ticket was created */
  created_at: string;
  /** Timestamp ISO string when artisan uploaded proof-of-fix and resolved ticket */
  resolved_at?: string | null;
}

/**
 * Filter options for filtering the artisan work queue on mobile screens.
 */
export interface ArtisanJobQueueFilter {
  /** Filter by specific defect category or ALL categories */
  category?: TicketCategory | 'ALL';
  /** Filter by status or ALL statuses */
  status?: TicketStatus | 'ALL';
  /** Filter by urgency SLA level or ALL urgencies */
  urgency?: TicketUrgency | 'ALL';
}

/**
 * Payload interface required when an artisan submits proof of completed repair work.
 */
export interface ProofOfFixPayload {
  /** Unique ID of the maintenance ticket being completed */
  ticketId: string;
  /** User ID of the maintenance artisan executing the fix */
  artisanId: string;
  /** Photo URL demonstrating completed repair work ("After" photograph) */
  photoAfterUrl: string;
  /** Optional completion notes or remarks from the artisan */
  completionNotes?: string;
}
