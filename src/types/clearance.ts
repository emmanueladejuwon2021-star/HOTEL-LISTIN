/**
 * Types and interface definitions for Digital Document Screening and Clearance.
 * Handles student document uploads (Medical Certificate, Passport Photo, Code of Conduct Form)
 * and clearance status tracking for UNILAG hostel residents.
 */

import { ClearanceStatus } from './auth';

/**
 * Standard document type categories required for hostel clearance.
 */
export type DocumentType = 'MEDICAL_CERTIFICATE' | 'PASSPORT_PHOTO' | 'CODE_OF_CONDUCT';

/**
 * Interface representing a single uploaded clearance document record.
 */
export interface ClearanceDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

/**
 * Interface representing the complete digital clearance package for a student.
 */
export interface DigitalClearancePackage {
  userId: string;
  overallStatus: ClearanceStatus;
  documents: ClearanceDocument[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedByWardenId?: string;
  rejectionReason?: string;
  clearanceCertificateHash?: string;
}

/**
 * Request parameters when uploading a document.
 */
export interface DocumentUploadParams {
  userId: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName: string;
}

/**
 * Request parameters when submitting the complete clearance package for warden review.
 */
export interface SubmitClearancePackageParams {
  userId: string;
}

/**
 * Request parameters when a warden reviews and updates a student's clearance status.
 */
export interface ReviewClearanceParams {
  userId: string;
  wardenId: string;
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}
