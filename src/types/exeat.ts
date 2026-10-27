/**
 * Types and interfaces for the UNILAG Hostel Management System Night Exeat & Overnight Pass module.
 * Defines the structure for student exeat applications, warden approvals, status badges, and request payloads.
 */

export type ExeatApprovalStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

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
