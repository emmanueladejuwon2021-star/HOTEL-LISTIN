import { create } from 'zustand';
import { DigitalClearancePackage, ClearanceDocument, DocumentType } from '../types/clearance';
import { ClearanceService } from '../api/clearanceService';

/**
 * Interface defining the Zustand clearance store state and async action triggers.
 */
export interface ClearanceState {
  clearancePackage: DigitalClearancePackage | null;
  isLoading: boolean;
  isUploading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  fetchClearancePackage: (userId: string) => Promise<void>;
  uploadDocument: (userId: string, documentType: DocumentType, fileUrl: string, fileName: string) => Promise<ClearanceDocument | null>;
  submitClearancePackage: (userId: string) => Promise<boolean>;
  clearMessages: () => void;
}

/**
 * Zustand state management store for student digital clearance document screening.
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

  uploadDocument: async (userId: string, documentType: DocumentType, fileUrl: string, fileName: string) => {
    set({ isUploading: true, errorMessage: null, successMessage: null });
    try {
      const doc = await ClearanceService.uploadDocument({
        userId,
        documentType,
        fileUrl,
        fileName
      });

      // Refresh package state
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
