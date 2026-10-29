/**
 * Type definitions for Hall Warden Executive Dashboard, Occupancy Metrics,
 * Document Clearance Approval Queue, and Night Exeat Processing.
 * All fields are documented with clear English descriptions for developers and non-technical stakeholders.
 */

/**
 * Detailed hostel occupancy metrics used on the Warden Executive Dashboard.
 */
export interface WardenOccupancyMetrics {
  hostelId: string;
  hostelName: string;
  totalCapacity: number;
  occupiedBeds: number;
  pendingAllocations: number;
  availableBeds: number;
  occupancyRatePercentage: number;
  gender: 'MALE' | 'FEMALE' | 'MIXED';
}

/**
 * A pending student clearance submission package awaiting Warden inspection.
 */
export interface ClearanceApprovalItem {
  id: string; // Unique submission or document ID
  studentId: string;
  studentName: string;
  matricNo: string;
  hostelName: string;
  roomNumber: string;
  level: number;
  faculty: string;
  clearanceStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  medicalCertUrl?: string;
  attestationUrl?: string;
  receiptUrl?: string;
  notes?: string;
}

/**
 * A pending or processed night exeat permission request awaiting Warden approval.
 */
export interface ExeatApprovalItem {
  id: string;
  studentId: string;
  studentName: string;
  matricNo: string;
  hostelName: string;
  roomNumber: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt?: string;
  reviewedByWardenId?: string;
  wardenComments?: string;
}

/**
 * Real-time summary counts for action badge indicators on the Warden Dashboard.
 */
export interface ActionQueueSummary {
  pendingClearanceCount: number;
  pendingExeatCount: number;
  openEmergencySosCount: number;
  openRepairTicketCount: number;
}

/**
 * Operational audit log entry for actions performed by Hall Wardens or Porters.
 */
export interface WardenActivityLog {
  id: string;
  actionType: 'CLEARANCE_APPROVED' | 'CLEARANCE_REJECTED' | 'EXEAT_APPROVED' | 'EXEAT_REJECTED' | 'DISCIPLINARY_FLAG';
  actorId: string;
  actorName: string;
  targetStudentId: string;
  targetStudentName: string;
  details: string;
  timestamp: string;
}

/**
 * Response payload returned after approving or rejecting an item in the queue.
 */
export interface WardenActionResponse {
  success: boolean;
  message: string;
  itemId: string;
  updatedStatus: 'APPROVED' | 'REJECTED';
  timestamp: string;
}
