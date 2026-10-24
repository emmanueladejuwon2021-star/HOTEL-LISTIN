/**
 * Types and interface definitions for Digital Document Screening and Clearance.
 * Handles student document uploads (Medical Certificate, Passport Photo, Code of Conduct Form)
 * and clearance status tracking for UNILAG hostel residents.
 *
 * Designed with simple, clear English descriptions so non-technical team members and hostel managers
 * can easily understand how student clearance document data is structured and processed.
 */

import { ClearanceStatus } from './auth';

/**
 * Standard document type categories required for UNILAG hostel clearance.
 * - MEDICAL_CERTIFICATE: Medical health check document from Jaja Clinic / UNILAG Medical Center
 * - PASSPORT_PHOTO: Formal passport photo with red background
 * - CODE_OF_CONDUCT: Signed UNILAG hostel rules agreement form
 */
export type DocumentType = 'MEDICAL_CERTIFICATE' | 'PASSPORT_PHOTO' | 'CODE_OF_CONDUCT';

/**
 * Interface representing a single uploaded clearance document record.
 */
export interface ClearanceDocument {
  // Unique identification code for this specific document record
  id: string;
  // Unique student user ID who uploaded this document
  userId: string;
  // Category of document (e.g. Medical Certificate, Passport Photo, or Code of Conduct)
  documentType: DocumentType;
  // Web address or file storage location where the uploaded document file is saved
  fileUrl: string;
  // Human-readable filename of the uploaded document file (e.g. "My_Medical_Certificate.pdf")
  fileName: string;
  // Exact date and time when the student uploaded or updated this file
  uploadedAt: string;
  // Approval state of this document: PENDING (awaiting check), APPROVED (accepted), or REJECTED (declined)
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  // Optional note explaining why a document was rejected by the hostel warden
  rejectionReason?: string;
  // File size in bytes (e.g. 524288 bytes = 0.5 MB)
  fileSizeBytes?: number;
  // File format extension type (e.g. "application/pdf" or "image/jpeg")
  mimeType?: string;
  // Additional notes or comments added by the student when submitting the file
  notes?: string;
}

/**
 * Interface representing the complete digital clearance package for a student.
 */
export interface DigitalClearancePackage {
  // Unique student user ID
  userId: string;
  // Overall clearance status for the student: NOT_STARTED, PENDING, APPROVED, or REJECTED
  overallStatus: ClearanceStatus;
  // Array list of all clearance documents uploaded by the student
  documents: ClearanceDocument[];
  // Physical document inspection screening status: PENDING_INSPECTION, INSPECTED_PASSED, or INSPECTED_FAILED
  physicalInspectionStatus?: 'PENDING_INSPECTION' | 'INSPECTED_PASSED' | 'INSPECTED_FAILED';
  // Physical inspection audit details record
  physicalInspectionDetails?: PhysicalInspectionRecord;
  // Date and time when the student submitted all required documents for review
  submittedAt?: string;
  // Date and time when the hall warden completed reviewing the clearance package
  reviewedAt?: string;
  // Staff ID of the hall warden who reviewed and approved or rejected the clearance
  reviewedByWardenId?: string;
  // Explanation message if the overall clearance package was rejected
  rejectionReason?: string;
  // Security verification hash code generated when clearance is officially approved
  clearanceCertificateHash?: string;
}

/**
 * Interface representing a physical document screening inspection record conducted by a porter or warden.
 */
/**
 * Checklist items verified during physical document screening at the porter desk.
 */
export interface PhysicalChecklistItems {
  // Verified physical Jaja Clinic medical fitness stamp/signature
  jajaMedicalStampVerified: boolean;
  // Verified passport photograph has required red background and matches student face
  redBackgroundPassportVerified: boolean;
  // Verified Code of Conduct form is signed by student and parent/guardian
  signedCodeOfConductVerified: boolean;
}

export interface PhysicalInspectionRecord {
  id: string;
  userId: string;
  officerId: string;
  inspectionStatus: 'INSPECTED_PASSED' | 'INSPECTED_FAILED';
  verifiedOriginals: string;
  checklistVerified?: PhysicalChecklistItems;
  notes?: string;
  inspectedAt: string;
}

/**
 * Parameters supplied by a porter or warden performing physical document screening at the hostel desk.
 */
export interface PhysicalInspectionParams {
  userId: string;
  officerId: string;
  inspectionStatus: 'INSPECTED_PASSED' | 'INSPECTED_FAILED';
  verifiedOriginals?: string[];
  checklist?: PhysicalChecklistItems;
  notes?: string;
}

/**
 * Parameters provided by the student when uploading or replacing a clearance document.
 */
export interface DocumentUploadParams {
  // Unique student ID uploading the document
  userId: string;
  // Specific clearance document type being uploaded
  documentType: DocumentType;
  // File web URL or storage path
  fileUrl: string;
  // Readable file name
  fileName: string;
  // File size in bytes (optional)
  fileSizeBytes?: number;
  // File MIME format type (optional)
  mimeType?: string;
  // Student comments or notes (optional)
  notes?: string;
}

/**
 * Parameters required when a student requests to remove/delete an uploaded clearance document.
 */
export interface DeleteDocumentParams {
  // Unique student user ID requesting deletion
  userId: string;
  // Unique document record ID to be deleted
  documentId: string;
}

/**
 * Result structure returned when validating a clearance document file before upload.
 */
export interface DocumentValidationResult {
  // True if the file URL and extension pass all safety and format checks
  isValid: boolean;
  // Clear human-readable error message explaining why the document was rejected if invalid
  errorMessage?: string;
  // Standard MIME type detected from the file name or extension
  detectedMimeType?: string;
}

/**
 * Parameters when submitting the complete clearance package for warden review.
 */
export interface SubmitClearancePackageParams {
  userId: string;
}

/**
 * Parameters when a warden reviews and updates a student's clearance status.
 */
export interface ReviewClearanceParams {
  userId: string;
  wardenId: string;
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

/**
 * Result structure returned when verifying an official clearance certificate hash.
 */
export interface ClearanceCertificateVerification {
  // True if the certificate hash exists in the database and belongs to an approved student clearance
  isValid: boolean;
  // Student user ID associated with the certificate
  userId?: string;
  // Student full name
  fullName?: string;
  // Student matriculation or staff number
  matricNo?: string;
  // Clearance status (e.g., APPROVED)
  clearanceStatus?: ClearanceStatus;
  // Unique certificate verification code hash string
  certificateHash?: string;
  // Descriptive summary message for non-technical stakeholders and porters
  message: string;
}

/**
 * Entry record tracking clearance package review history and decision logs.
 */
export interface ClearanceReviewHistoryEntry {
  id: string;
  userId: string;
  wardenId: string;
  actionStatus: 'APPROVED' | 'REJECTED';
  notes?: string;
  timestamp: string;
}
