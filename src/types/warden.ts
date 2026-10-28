/**
 * Data structures and types for Hall Warden Executive Dashboard operations.
 * Covers hostel occupancy metrics, pending student clearance and exeat approval queues,
 * emergency SOS alert tracking, and warden audit logs.
 */

/**
 * Real-time hall occupancy metrics calculated across allocated bedspaces.
 */
export interface WardenOccupancyMetrics {
  hostelId: string;
  hostelName: string;
  totalBeds: number;
  allocatedBeds: number;
  reservedBeds: number;
  vacantBeds: number;
  occupancyPercentage: number;
  lastCalculatedAt: string;
}

/**
 * Category of item requiring warden review or approval.
 */
export type ApprovalCategory = 'CLEARANCE' | 'EXEAT' | 'EMERGENCY_SOS';

/**
 * Status of an approval queue item.
 */
export type WardenQueueStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Represents an item in the Warden Executive Dashboard action queue.
 */
export interface WardenQueueItem {
  id: string;
  category: ApprovalCategory;
  studentId: string;
  studentName: string;
  studentMatricNo: string;
  hostelName: string;
  roomNumber?: string;
  requestedAt: string;
  details: string;
  status: WardenQueueStatus;
  notes?: string;
}

/**
 * Parameters submitted when a warden performs an approval or rejection action.
 */
export interface WardenActionParams {
  itemId: string;
  category: ApprovalCategory;
  action: 'APPROVE' | 'REJECT';
  wardenId: string;
  notes?: string;
}

/**
 * Result returned after a warden approval or rejection action completes.
 */
export interface WardenActionResult {
  success: boolean;
  itemId: string;
  category: ApprovalCategory;
  updatedStatus: WardenQueueStatus;
  processedAt: string;
  message: string;
}
