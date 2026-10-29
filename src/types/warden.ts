import { ClearanceStatus } from './auth';

/**
 * Interface representing live hostel occupancy statistics for Hall Wardens and administrators.
 * Tracks total capacity, occupied bedspaces, and calculated percentage filled.
 */
export interface HostelOccupancyMetrics {
  /** Unique ID of the hostel hall */
  hostelId: string;
  /** Display name of the UNILAG or CMUL hostel (e.g., 'King Jaja Hall', 'Moremi Hall') */
  hostelName: string;
  /** Total number of bedspaces existing in the hostel */
  totalBedspaces: number;
  /** Number of bedspaces currently occupied by verified students */
  occupiedBedspaces: number;
  /** Number of remaining unallocated or empty bedspaces */
  availableBedspaces: number;
  /** Calculated percentage of filled bedspaces (0 - 100%) */
  occupancyPercentage: number;
}

/**
 * Action Queue Badge Summary counts displayed at the top of the Warden Executive Dashboard.
 * Gives wardens instant situational awareness of items awaiting attention.
 */
export interface WardenQueueSummary {
  /** Number of student digital clearance document packages waiting for warden inspection */
  pendingClearancesCount: number;
  /** Number of overnight departure exeat permission requests awaiting single-tap approval */
  pendingExeatsCount: number;
  /** Number of active emergency SOS panic alerts triggered by students */
  openSosAlertsCount: number;
  /** Number of unresolved facility maintenance repair tickets in the hall */
  openRepairsCount: number;
}

/**
 * Interface representing a student's pending clearance document package awaiting Warden review.
 */
export interface PendingClearanceItem {
  /** Unique ID of the student user */
  userId: string;
  /** Full legal name of the student */
  fullName: string;
  /** UNILAG Matriculation or Application Number */
  matricNo: string;
  /** Allocated hostel hall name */
  hostelName: string;
  /** Room and bedspace label (e.g. 'Room B204') */
  roomNumber: string;
  /** Academic department */
  department: string;
  /** Current academic level (e.g. 100, 200, 300) */
  level: number;
  /** Number of verified documents uploaded in package (target: 3) */
  documentCount: number;
  /** Current clearance status ('NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED') */
  clearanceStatus: ClearanceStatus;
  /** Timestamp when clearance package was submitted */
  uploadedAt: string;
}

/**
 * Interface representing an overnight departure exeat request submitted by a student.
 */
export interface PendingExeatItem {
  /** Unique ID of the exeat request record */
  exeatId: string;
  /** Unique ID of the student requesting exeat */
  studentId: string;
  /** Full name of the student */
  studentName: string;
  /** Student matriculation number */
  matricNo: string;
  /** Hostel hall and room designation */
  roomNumber: string;
  /** Destination address where the student will stay while away */
  destinationAddress: string;
  /** Reason given for requesting overnight exeat */
  reason: string;
  /** Expected departure date */
  departureDate: string;
  /** Expected return date */
  returnDate: string;
  /** Approval status ('PENDING' | 'APPROVED' | 'DECLINED') */
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  /** Date/time request was filed */
  createdAt: string;
}

/**
 * Interface representing an emergency SOS panic trigger alert for Warden view.
 */
export interface SosAlertItem {
  /** Unique ID of the panic SOS alert */
  alertId: string;
  /** Unique ID of student triggering SOS */
  studentId: string;
  /** Student full name */
  studentName: string;
  /** Student matriculation number */
  matricNo: string;
  /** Student hostel hall name */
  hostelName: string;
  /** Student room number */
  roomNumber: string;
  /** Nature of emergency (e.g. 'MEDICAL_EMERGENCY', 'SECURITY_THREAT', 'FIRE') */
  alertType: string;
  /** Alert status ('ACTIVE' | 'RESOLVED' | 'DISMISSED') */
  status: string;
  /** Timestamp when SOS was triggered */
  timestamp: string;
}

/**
 * Standardized response interface for Warden actions (e.g. clearance reviews, exeat approvals).
 */
export interface WardenActionResponse {
  /** True if the operation succeeded, false otherwise */
  success: boolean;
  /** Plain-language message explaining result for non-technical users */
  message: string;
  /** Optional updated status string */
  updatedStatus?: string;
}
