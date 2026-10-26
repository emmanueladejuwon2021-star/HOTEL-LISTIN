/**
 * Maintenance Ticket Data Types & Interface Definitions.
 * Supports the UNILAG Photo-Backed Repair Request Creator workflow for students and maintenance artisans.
 * Handles ticket categorization (PLUMBING, ELECTRICAL, CARPENTRY, MASONRY, JANITORIAL),
 * repair status transitions (OPEN, IN_PROGRESS, RESOLVED, REJECTED), mandatory defect photos,
 * and artisan assignment tracking in compliance with UNILAG Hostel Management PRD specifications.
 *
 * Designed with simple, clear English comments for non-technical stakeholders and hostel administrators.
 */

/**
 * Standard categories for university hostel maintenance and repair requests.
 * - PLUMBING: Water leaks, clogged sinks, faulty faucets, broken showers, or toilet flush failures
 * - ELECTRICAL: Faulty power sockets, blown ceiling fans, broken switches, or burnt light fixtures
 * - CARPENTRY: Damaged wardrobe doors, broken study desks, loose bed frames, or door lock issues
 * - MASONRY: Wall plaster cracks, floor tile damage, or concrete repairs
 * - JANITORIAL: Special deep cleaning requests, waste disposal hazards, or sanitation issues
 */
export type TicketCategory = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'MASONRY' | 'JANITORIAL';

/**
 * Lifecycle status stages for a maintenance repair ticket.
 * - OPEN: Ticket submitted by student and pending review or artisan assignment
 * - IN_PROGRESS: Maintenance artisan assigned and repair work currently underway
 * - RESOLVED: Repair completed with proof-of-fix photo uploaded by maintenance team
 * - REJECTED: Ticket reviewed and declined by hall warden or maintenance head with feedback
 */
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

/**
 * Core interface representing a photo-backed hostel repair ticket in the Turso database.
 */
export interface MaintenanceTicket {
  /** Unique identification code for the maintenance ticket */
  id: string;
  /** Unique user ID of the student submitting the repair request */
  studentId: string;
  /** Full name of the student who created the repair request */
  studentName?: string;
  /** Unique ID of the hostel where the defect is located (e.g., King Jaja Hall) */
  hostelId: string;
  /** Room designation or number where the repair is needed (e.g., Room A-204) */
  roomNumber: string;
  /** Maintenance specialization category */
  category: TicketCategory;
  /** Detailed written description of the facility defect or broken item */
  description: string;
  /** Required image URL or base64 photo showing the defect before repair work begins */
  photoBeforeUrl: string;
  /** Optional image URL or base64 photo showing the repaired item after artisan completion */
  photoAfterUrl?: string;
  /** Current progress status of the repair ticket */
  status: TicketStatus;
  /** User ID of the maintenance artisan assigned to handle this repair */
  assignedArtisanId?: string;
  /** Full name of the assigned maintenance artisan */
  assignedArtisanName?: string;
  /** Timestamp when the repair request was submitted by the student */
  createdAt: string;
  /** Timestamp when the repair job was marked resolved by the artisan */
  resolvedAt?: string;
}

/**
 * Input parameters required when a student creates a new photo-backed repair request.
 */
export interface CreateTicketParams {
  studentId: string;
  hostelId: string;
  roomNumber: string;
  category: TicketCategory;
  description: string;
  photoBeforeUrl: string;
}

/**
 * Input parameters used by maintenance artisans or wardens to update ticket status.
 */
export interface UpdateTicketStatusParams {
  ticketId: string;
  status: TicketStatus;
  photoAfterUrl?: string;
  assignedArtisanId?: string;
}
