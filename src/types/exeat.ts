/**
 * Types and interfaces for the UNILAG Hostel Management System Night Exeat & Overnight Pass module.
 * Defines the structure for student exeat applications, warden approvals, status badges, cancellations,
 * return date extension requests, and request payloads.
 *
 * Implements:
 * - [EXEAT-01] Student Night Exeat Application Form
 * - [EXEAT-02] Active Approved Exeat Status & Gate Curfew Override
 * - [EXEAT-03] Warden Review Queue & Approval Workflow
 * - [EXEAT-04] Exeat Cancellation, Return Date Extension, Filtering & Auto-Expiry (Issue #64 / UAT-0064)
 */

/**
 * Indicates the current approval or lifecycle status of an overnight exeat request.
 * - PENDING: Submitted by student, awaiting Warden review.
 * - APPROVED: Approved by Warden, granting curfew gate permission.
 * - DECLINED: Rejected by Warden with explanation.
 * - CANCELLED: Withdrawn by student prior to or during travel.
 * - EXPIRED: Automatically archived after return date has passed without return.
 */
export type ExeatApprovalStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';

/**
 * Represents an individual overnight exeat leave permission request record.
 */
export interface ExeatRequest {
  id: string;
  studentId: string;
  studentName?: string;
  studentMatric?: string;
  hostelName?: string;
  roomNumber?: string;
  destinationAddress: string;
  reason: string;
  departureDate: string;
  returnDate: string;
  originalReturnDate?: string;
  extensionReason?: string;
  isExtended?: boolean;
  cancellationReason?: string;
  wardenApprovalStatus: ExeatApprovalStatus;
  wardenId?: string;
  wardenComment?: string;
  createdAt: string;
}

/**
 * Payload sent by a student when applying for a night exeat permission.
 */
export interface SubmitExeatPayload {
  studentId: string;
  destinationAddress: string;
  reason: string;
  departureDate: string;
  returnDate: string;
}

/**
 * Payload submitted by a hall warden to approve or decline a student exeat request.
 */
export interface ReviewExeatPayload {
  exeatId: string;
  wardenId: string;
  approvalStatus: 'APPROVED' | 'DECLINED';
  wardenComment?: string;
}

/**
 * Payload submitted by a student to cancel a pending or approved exeat request.
 */
export interface CancelExeatPayload {
  exeatId: string;
  studentId: string;
  cancellationReason?: string;
}

/**
 * Payload submitted by a student to request an extension on their return date for an approved exeat.
 */
export interface RequestExtensionPayload {
  exeatId: string;
  studentId: string;
  newReturnDate: string;
  extensionReason: string;
}
