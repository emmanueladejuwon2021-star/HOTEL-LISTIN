/**
 * TypeScript type definitions for UnilagStay Maintenance Ticket System.
 * Matches Turso libSQL Database Schema for maintenance_tickets table.
 */

/**
 * Valid defect categories for hostel facility repairs.
 */
export type MaintenanceCategory = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'MASONRY' | 'JANITORIAL';

/**
 * Lifecycle status values for hostel maintenance tickets.
 */
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

/**
 * Maintenance Ticket database entity interface.
 */
export interface MaintenanceTicket {
  id: string;
  studentId: string;
  hostelId: string;
  roomNumber: string;
  category: MaintenanceCategory;
  description: string;
  photoBeforeUrl: string;
  photoAfterUrl?: string | null;
  status: MaintenanceStatus;
  assignedArtisanId?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  // Joined fields for rich UI displays
  studentName?: string;
  hostelName?: string;
  artisanName?: string;
}

/**
 * Input parameters required when a student creates a photo-backed repair request.
 */
export interface CreateTicketParams {
  studentId: string;
  hostelId: string;
  roomNumber: string;
  category: MaintenanceCategory;
  description: string;
  photoBeforeUrl: string;
}

/**
 * Filter parameters for querying maintenance tickets from Turso DB.
 */
export interface MaintenanceFilterParams {
  studentId?: string;
  hostelId?: string;
  status?: MaintenanceStatus;
  category?: MaintenanceCategory;
  assignedArtisanId?: string;
}
