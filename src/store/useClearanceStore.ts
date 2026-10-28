import { create } from 'zustand';
import {
  DigitalClearancePackage,
  ClearanceDocument,
  DocumentType,
  ClearanceCertificateVerification,
  ClearanceReviewHistoryEntry
} from '../types/clearance';
import { ClearanceService } from '../api/clearanceService';

/**
 * Interface defining the Zustand clearance store state variables and async action triggers.
 * Provides intuitive, clear property names and functions so developers and non-technical
 * code reviewers can understand how application state updates.
 */
export interface ClearanceState {
  // Current student clearance package details containing status and uploaded documents
  clearancePackage: DigitalClearancePackage | null;
  // Queue of student clearance package submissions for Warden review
  pendingQueue: any[];
  // Loading indicator flag active while fetching database data
  isLoading: boolean;
  // Uploading indicator flag active during document file uploads or updates
  isUploading: boolean;
  // Error alert message string displayed to student when an action fails
  errorMessage: string | null;
  // Success notification message string displayed when an operation succeeds
  successMessage: string | null;
  // Latest certificate verification lookup result
  certificateVerification: ClearanceCertificateVerification | null;
  // Clearance package review audit history
  reviewHistory: ClearanceReviewHistoryEntry[];

  // Actions
  // Fetches latest clearance documents and status for a student from Turso DB
  fetchClearancePackage: (userId: string) => Promise<void>;
  // Fetches pending clearance submissions queue for Warden portal review
  fetchPendingQueue: (filterStatus?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') => Promise<void>;
  // Reviews a student clearance package (Approve/Reject) with optional feedback
  reviewClearancePackage: (userId: string, wardenId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => Promise<boolean>;
  // Uploads or updates a clearance document file with optional student notes
  uploadDocument: (userId: string, documentType: DocumentType, fileUrl: string, fileName: string, notes?: string) => Promise<ClearanceDocument | null>;
  // Removes/deletes an uploaded document record from student clearance package
  deleteDocument: (userId: string, documentId: string) => Promise<boolean>;
  // Submits all 3 required clearance documents to hall warden for review
  submitClearancePackage: (userId: string) => Promise<boolean>;
  // Verifies official clearance certificate hash code
  verifyCertificate: (certificateHash: string) => Promise<ClearanceCertificateVerification>;
  // Records physical document screening inspection conducted by porter/warden
  recordPhysicalInspection: (
    userId: string,
    officerId: string,
    inspectionStatus: 'INSPECTED_PASSED' | 'INSPECTED_FAILED',
    verifiedOriginals?: string[],
    checklist?: { jajaMedicalStampVerified: boolean; redBackgroundPassportVerified: boolean; signedCodeOfConductVerified: boolean },
    notes?: string
  ) => Promise<boolean>;
  // Fetches clearance review audit logs for a student
  fetchReviewHistory: (userId: string) => Promise<void>;
  // Clears active error and success alert message banners
  clearMessages: () => void;
}

/**
 * Zustand state management store for student digital clearance document screening.
 * Ensures reactive UI updates across screens with zero mock data.
 */
export const useClearanceStore = create<ClearanceState>((set, get) => ({
  clearancePackage: null,
  pendingQueue: [],
  isLoading: false,
  isUploading: false,
  errorMessage: null,
  successMessage: null,
  certificateVerification: null,
  reviewHistory: [],

  fetchClearancePackage: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const pkg = await ClearanceService.getClearancePackage(userId);
      set({ clearancePackage: pkg, isLoading: false });
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to load clearance document package.',
        isLoading: false
      });
    }
  },

  fetchPendingQueue: async (filterStatus: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL') => {
    set({ isLoading: true, errorMessage: null });
    try {
      const queue = await ClearanceService.getPendingClearanceQueue(filterStatus);
      set({ pendingQueue: queue, isLoading: false });
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to load clearance queue for Warden review.',
        isLoading: false
      });
    }
  },

  reviewClearancePackage: async (userId: string, wardenId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      await ClearanceService.reviewClearancePackage({
        userId,
        wardenId,
        status,
        rejectionReason
      });

      // Refresh queue after decision
      const updatedQueue = await ClearanceService.getPendingClearanceQueue();
      set({
        pendingQueue: updatedQueue,
        isLoading: false,
        successMessage: `Student clearance package ${status === 'APPROVED' ? 'approved and certificate issued' : 'rejected with feedback'}.`
      });
      return true;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to submit clearance review decision.',
        isLoading: false
      });
      return false;
    }
  },

  uploadDocument: async (userId: string, documentType: DocumentType, fileUrl: string, fileName: string, notes?: string) => {
    set({ isUploading: true, errorMessage: null, successMessage: null });
    try {
      const doc = await ClearanceService.uploadDocument({
        userId,
        documentType,
        fileUrl,
        fileName,
        notes
      });

      // Refresh package state to update document lists and progress
      const updatedPkg = await ClearanceService.getClearancePackage(userId);
      set({
        clearancePackage: updatedPkg,
        isUploading: false,
        successMessage: `Document '${fileName}' uploaded successfully.`
      });

      return doc;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to upload clearance document.',
        isUploading: false
      });
      return null;
    }
  },

  deleteDocument: async (userId: string, documentId: string) => {
    set({ isUploading: true, errorMessage: null, successMessage: null });
    try {
      const updatedPkg = await ClearanceService.deleteDocument(userId, documentId);
      set({
        clearancePackage: updatedPkg,
        isUploading: false,
        successMessage: 'Clearance document removed successfully.'
      });
      return true;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to delete clearance document.',
        isUploading: false
      });
      return false;
    }
  },

  submitClearancePackage: async (userId: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const updatedPkg = await ClearanceService.submitClearancePackage(userId);
      set({
        clearancePackage: updatedPkg,
        isLoading: false,
        successMessage: 'Clearance package submitted successfully for Warden review!'
      });
      return true;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to submit clearance package.',
        isLoading: false
      });
      return false;
    }
  },

  verifyCertificate: async (certificateHash: string) => {
    set({ isLoading: true, errorMessage: null, certificateVerification: null });
    try {
      const result = await ClearanceService.verifyClearanceCertificate(certificateHash);
      set({
        certificateVerification: result,
        isLoading: false,
        successMessage: result.isValid ? result.message : null,
        errorMessage: !result.isValid ? result.message : null
      });
      return result;
    } catch (error: any) {
      const failRes: ClearanceCertificateVerification = {
        isValid: false,
        message: error.message || 'Failed to verify clearance certificate hash.'
      };
      set({
        certificateVerification: failRes,
        errorMessage: failRes.message,
        isLoading: false
      });
      return failRes;
    }
  },

  recordPhysicalInspection: async (
    userId: string,
    officerId: string,
    inspectionStatus: 'INSPECTED_PASSED' | 'INSPECTED_FAILED',
    verifiedOriginals?: string[],
    checklist?: { jajaMedicalStampVerified: boolean; redBackgroundPassportVerified: boolean; signedCodeOfConductVerified: boolean },
    notes?: string
  ) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const updatedPkg = await ClearanceService.recordPhysicalInspection({
        userId,
        officerId,
        inspectionStatus,
        verifiedOriginals,
        checklist,
        notes
      });

      set({
        clearancePackage: updatedPkg,
        isLoading: false,
        successMessage: `Physical document inspection ${inspectionStatus === 'INSPECTED_PASSED' ? 'passed and recorded' : 'marked failed'}.`
      });
      return true;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to record physical inspection.',
        isLoading: false
      });
      return false;
    }
  },

  fetchReviewHistory: async (userId: string) => {
    try {
      const history = await ClearanceService.getClearanceReviewHistory(userId);
      set({ reviewHistory: history });
    } catch (error: any) {
      // Non-blocking history load
    }
  },

  clearMessages: () => set({ errorMessage: null, successMessage: null, certificateVerification: null })
}));
