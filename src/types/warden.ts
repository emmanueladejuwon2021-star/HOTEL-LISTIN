/**
 * UNILAG Hostel Management Mobile Application ("UnilagStay")
 * Types and interfaces for Hall Warden Executive Dashboard operations.
 */

/**
 * Interface representing occupancy statistics for a hostel.
 */
export interface HostelOccupancyMetrics {
  /** Unique ID of the hostel */
  hostelId: string;
  /** Name of the hostel (e.g., Mariere Hall, Moremi Hall) */
  hostelName: string;
  /** Total number of bedspaces in the hostel */
  totalBeds: number;
  /** Number of bedspaces currently occupied by students */
  occupiedBeds: number;
  /** Percentage of total bedspaces currently occupied (0 - 100%) */
  percentageOccupied: number;
  /** Number of bedspaces allocated to confirmed students */
  allocatedBeds: number;
  /** Number of bedspaces remaining vacant and available for balloting */
  vacantBeds: number;
}

/**
 * Interface summarizing actionable queue badge counts for the Warden Executive Dashboard.
 */
export interface ActionQueueSummary {
  /** Total count of student digital clearance packages pending Warden review */
  pendingClearancesCount: number;
  /** Total count of student overnight exeat permission requests pending Warden review */
  pendingExeatCount: number;
  /** Total count of active emergency SOS panic alerts raised in the hostel */
  activeSosAlertsCount: number;
}

/**
 * Interface representing a student digital clearance package awaiting Warden review.
 */
export interface PendingClearanceItem {
  /** Student user ID */
  userId: string;
  /** Full name of the student */
  studentName: string;
  /** UNILAG Matriculation or UTME number */
  matricNumber: string;
  /** Student faculty */
  faculty: string;
  /** Student department */
  department: string;
  /** Student level (e.g., 100, 200, 300, 400, 500) */
  level: number;
  /** URL or file path of passport photograph */
  passportPhotoUrl?: string;
  /** URL or file path of Jaja Clinic medical clearance certificate */
  medicalCertUrl?: string;
  /** URL or file path of signed hostel code of conduct form */
  codeOfConductUrl?: string;
  /** Date and time when student submitted package for review */
  submissionDate: string;
}

/**
 * Interface representing a student overnight exeat application awaiting Warden review.
 */
export interface PendingExeatItem {
  /** Unique ID of the exeat request */
  exeatId: string;
  /** Student user ID */
  studentId: string;
  /** Full name of the student */
  studentName: string;
  /** UNILAG Matriculation or UTME number */
  matricNumber: string;
  /** Room and bed number assigned to student */
  roomNumber: string;
  /** Destination address where student intends to stay */
  destinationAddress: string;
  /** Reason for overnight exeat request */
  reason: string;
  /** Intended departure date and time */
  departureDate: string;
  /** Expected return date and time */
  returnDate: string;
  /** Current Warden approval status ('PENDING', 'APPROVED', 'DECLINED') */
  approvalStatus: 'PENDING' | 'APPROVED' | 'DECLINED';
}

/**
 * Interface representing an entry in the Warden recent activity log feed.
 */
export interface ActivityLogItem {
  /** Unique activity log ID */
  id: string;
  /** Category of action performed */
  type: 'CLEARANCE' | 'EXEAT' | 'DISCIPLINARY' | 'INVENTORY';
  /** Title summarizing the action */
  title: string;
  /** Description or student details */
  description: string;
  /** Date and time when action was recorded */
  timestamp: string;
  /** Outcome status badge text */
  status: string;
}

/**
 * Parameter payload when a Hall Warden reviews a student clearance package.
 */
export interface ReviewClearanceParams {
  /** Student user ID whose clearance is being reviewed */
  userId: string;
  /** Staff ID of the Hall Warden performing review */
  wardenId: string;
  /** Review decision ('APPROVED' or 'REJECTED') */
  status: 'APPROVED' | 'REJECTED';
  /** Optional notes or rejection reason explaining Warden decision */
  notes?: string;
}

/**
 * Parameter payload when a Hall Warden reviews an overnight exeat request.
 */
export interface ReviewExeatParams {
  /** Exeat request ID being reviewed */
  exeatId: string;
  /** Staff ID of the Hall Warden performing review */
  wardenId: string;
  /** Review decision ('APPROVED' or 'DECLINED') */
  status: 'APPROVED' | 'DECLINED';
  /** Optional remarks explaining decision */
  notes?: string;
}
