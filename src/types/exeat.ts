/**
 * Type definitions and interface models for the Night Exeat Application & Warden Approval system.
 * Allows UNILAG hostel residents to request overnight leave and permissions from hall wardens,
 * specifying destination address, reason, departure date, and expected return date.
 *
 * Designed with simple, jargon-free English comments so students, hall wardens, and administrative staff
 * can easily understand how overnight exeat permission data is structured and processed.
 */

/**
 * Approval status state for an overnight exeat application.
 * - PENDING: Submitted by student, awaiting review by the Hall Warden
 * - APPROVED: Approved by Hall Warden; student is permitted to leave and enter past curfew
 * - DECLINED: Declined by Hall Warden with feedback comments
 */
export type ExeatApprovalStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

/**
 * Interface representing a single overnight exeat request record.
 */
export interface ExeatRequest {
  // Unique identification code for this exeat record
  id: string;
  // Unique student user ID submitting the exeat application
  studentId: string;
  // Full name of the student (optional, populated from user profile)
  studentName?: string;
  // Student matriculation or staff number (optional, populated from user profile)
  studentMatric?: string;
  // Name of the hostel hall where the student resides (optional)
  hostelName?: string;
  // Allocated room and bed designation (optional)
  roomNumber?: string;
  // Complete street or city address where the student will stay while away from the hostel
  destinationAddress: string;
  // Detailed explanation reason for requesting overnight permission
  reason: string;
  // Date when student intends to leave the hostel (YYYY-MM-DD format)
  departureDate: string;
  // Date when student expects to return to the hostel (YYYY-MM-DD format)
  returnDate: string;
  // Current approval state of the exeat (PENDING, APPROVED, or DECLINED)
  wardenApprovalStatus: ExeatApprovalStatus;
  // Unique staff ID of the Hall Warden who reviewed this request
  wardenId?: string;
  // Optional feedback or review notes added by the Hall Warden upon approval or decline
  wardenComment?: string;
  // Exact timestamp when the exeat application was created
  createdAt: string;
  // Timestamp when the exeat record was last updated
  updatedAt?: string;
}

/**
 * Parameters required when a student submits a new overnight exeat application.
 */
export interface ApplyExeatParams {
  // Unique student user ID
  studentId: string;
  // Address where the student will be staying
  destinationAddress: string;
  // Reason for requesting overnight leave
  reason: string;
  // Planned departure date (YYYY-MM-DD)
  departureDate: string;
  // Expected return date (YYYY-MM-DD)
  returnDate: string;
}

/**
 * Parameters required when a Hall Warden reviews and approves or declines an exeat request.
 */
export interface ReviewExeatParams {
  // Unique ID of the exeat request being reviewed
  exeatId: string;
  // Unique staff ID of the reviewing Hall Warden
  wardenId: string;
  // Approval decision status: APPROVED or DECLINED
  status: 'APPROVED' | 'DECLINED';
  // Optional feedback comment or reason provided by the warden
  comment?: string;
}

/**
 * Result structure returned when validating an exeat application form before submission.
 */
export interface ExeatValidationResult {
  // True if all form fields pass validation checks
  isValid: boolean;
  // Descriptive error message if form validation fails
  errorMessage?: string;
}
