import { create } from 'zustand';
import { DigitalClearancePackage, ClearanceDocument, DocumentType } from '../types/clearance';
import { ClearanceService } from '../api/clearanceService';

/**
 * Interface defining the Zustand clearance store state variables and async action triggers.
 * Provides intuitive, clear property names and functions so developers and non-technical
 * code reviewers can understand how application state updates.
 */
export interface ClearanceState {
  // Current student clearance package details containing status and uploaded documents
  clearancePackage: DigitalClearancePackage | null;
  // Loading indicator flag active while fetching database data
  isLoading: boolean;
  // Uploading indicator flag active during document file uploads or updates
  isUploading: boolean;
  // Error alert message string displayed to student when an action fails
  errorMessage: string | null;
  // Success notification message string displayed when an operation succeeds
  successMessage: string | null;

  // Actions
  // Fetches latest clearance documents and status for a student from Turso DB
  fetchClearancePackage: (userId: string) => Promise<void>;
  // Uploads or updates a clearance document file with optional student notes
  uploadDocument: (userId: string, documentType: DocumentType, fileUrl: string, fileName: string, notes?: string) => Promise<ClearanceDocument | null>;
  // Removes/deletes an uploaded document record from student clearance package
  deleteDocument: (userId: string, documentId: string) => Promise<boolean>;
  // Submits all 3 required clearance documents to hall warden for review
  submitClearancePackage: (userId: string) => Promise<boolean>;
  // Clears active error and success alert message banners
  clearMessages: () => void;
}

/**
 * Zustand state management store for student digital clearance document screening.
 * Ensures reactive UI updates across screens with zero mock data.
 */
export const useClearanceStore = create<ClearanceState>((set, get) => ({
  clearancePackage: null,
  isLoading: false,
  isUploading: false,
  errorMessage: null,
  successMessage: null,

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

  clearMessages: () => set({ errorMessage: null, successMessage: null })
}));
