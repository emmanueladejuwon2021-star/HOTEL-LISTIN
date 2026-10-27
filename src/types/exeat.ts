/**
 * Type definitions for Night Exeat Application & Warden Approval System [EXEAT-01 - EXEAT-05].
 * Supports student exeat requests for overnight stays outside UNILAG hostels,
 * emergency contact numbers, date range validation, warden approval tracking, and curfew gatepass integration.
 */

export type ExeatApprovalStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';

/**
 * Represents an individual night exeat request record.
 */
export interface ExeatRequest {
  /** Unique database ID of the exeat request */
  id: string;
  /** Unique user ID of the applying student */
  studentId: string;
  /** Full name of the applying student (optional, joined from users table) */
  studentName?: string;
  /** Matriculation number of student (optional) */
  studentMatric?: string;
  /** Allocated hostel name (optional) */
  hostelName?: string;
  /** Allocated room number (optional) */
  roomNumber?: string;
  /** Destination address where student will stay during exeat */
  destinationAddress: string;
  /** Reason for overnight absence (e.g. Family emergency, Academic conference) */
  reason: string;
  /** Date departure begins (YYYY-MM-DD) */
  departureDate: string;
  /** Expected return date (YYYY-MM-DD) */
  returnDate: string;
  /** Emergency contact phone number for parents or guardians */
  emergencyContactPhone: string;
  /** Current warden review status */
  wardenApprovalStatus: ExeatApprovalStatus;
  /** User ID of reviewing Warden (if reviewed) */
  wardenId?: string;
  /** Warden's review comments or feedback (if provided) */
  wardenComments?: string;
  /** Timestamp when request was submitted */
  createdAt: string;
  /** Timestamp when warden approved or declined request */
  reviewedAt?: string;
}

/**
 * Payload required to submit a new night exeat application.
 */
export interface CreateExeatParams {
  studentId: string;
  destinationAddress: string;
  reason: string;
  departureDate: string;
  returnDate: string;
  emergencyContactPhone: string;
}

/**
 * Payload required for a Warden to review (approve or decline) an exeat application.
 */
export interface ReviewExeatParams {
  exeatId: string;
  wardenId: string;
  status: 'APPROVED' | 'DECLINED';
  comments?: string;
}
