/**
 * Maintenance Ticket Categories based on hostel trade dispatch.
 */
export type TicketCategory = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'MASONRY' | 'JANITORIAL';

/**
 * Maintenance Ticket Operational Lifecycle Statuses.
 */
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

/**
 * Priority Response SLAs for hostel repair defects.
 */
export type UrgencyLevel = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Structure of a Hostel Maintenance Defect Ticket stored in Turso libSQL SQLite database.
 */
export interface MaintenanceTicket {
  id: string;
  studentId: string;
  studentName?: string;
  hostelId: string;
  hostelName?: string;
  roomNumber: string;
  category: TicketCategory;
  urgency: UrgencyLevel;
  description: string;
  photoBeforeUrl: string;
  photoAfterUrl?: string;
  status: TicketStatus;
  assignedArtisanId?: string;
  artisanName?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * Parameters for creating a new photo-backed maintenance repair request.
 */
export interface CreateTicketParams {
  studentId: string;
  hostelId: string;
  roomNumber: string;
  category: TicketCategory;
  urgency?: UrgencyLevel;
  description: string;
  photoBeforeUrl: string;
}

/**
 * Parameters for updating a ticket status (e.g., starting a job or uploading proof of fix).
 */
export interface UpdateTicketStatusParams {
  ticketId: string;
  artisanId: string;
  status: TicketStatus;
  photoAfterUrl?: string;
}

/**
 * Filter options for querying the artisan work queue.
 */
export interface ArtisanQueueFilter {
  category?: TicketCategory;
  urgency?: UrgencyLevel;
  status?: TicketStatus;
  hostelId?: string;
}
