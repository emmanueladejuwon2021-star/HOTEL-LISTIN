import { create } from 'zustand';
import { RoomInventoryAudit, RecordAuditParams } from '../types/inventory';
import { InventoryService } from '../api/inventoryService';

export interface InventoryState {
  audits: RoomInventoryAudit[];
  selectedAudit: RoomInventoryAudit | null;
  verifiedCertificate: RoomInventoryAudit | null;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  recordAudit: (params: RecordAuditParams) => Promise<RoomInventoryAudit | null>;
  fetchAuditsByStudent: (studentId: string) => Promise<void>;
  fetchAuditsByRoom: (roomId: string) => Promise<void>;
  verifyCertificate: (certificateHash: string) => Promise<RoomInventoryAudit | null>;
  clearMessages: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  audits: [],
  selectedAudit: null,
  verifiedCertificate: null,
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  recordAudit: async (params: RecordAuditParams) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const audit = await InventoryService.recordAudit(params);
      set((state) => ({
        audits: [audit, ...state.audits],
        selectedAudit: audit,
        isLoading: false,
        successMessage: `Room inventory check-in audit recorded successfully for Room ${params.roomId}.`
      }));
      return audit;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to record room inventory check-in audit.',
        isLoading: false
      });
      return null;
    }
  },

  fetchAuditsByStudent: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const audits = await InventoryService.getAuditsByStudent(studentId);
      set({ audits, isLoading: false });
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to fetch student room inventory audits.',
        isLoading: false
      });
    }
  },

  fetchAuditsByRoom: async (roomId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const audits = await InventoryService.getAuditsByRoom(roomId);
      set({ audits, isLoading: false });
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to fetch room inventory audits.',
        isLoading: false
      });
    }
  },

  verifyCertificate: async (certificateHash: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null, verifiedCertificate: null });
    try {
      const audit = await InventoryService.getAuditByCertificateHash(certificateHash);
      if (audit) {
        set({
          verifiedCertificate: audit,
          isLoading: false,
          successMessage: `Certificate code ${certificateHash.toUpperCase()} verified successfully.`
        });
      } else {
        set({
          verifiedCertificate: null,
          isLoading: false,
          errorMessage: `No valid check-in audit certificate found for code ${certificateHash}.`
        });
      }
      return audit;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to verify room audit certificate code.',
        isLoading: false,
        verifiedCertificate: null
      });
      return null;
    }
  },

  clearMessages: () => set({ errorMessage: null, successMessage: null })
}));
