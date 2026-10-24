import { create } from 'zustand';
import { RoomInventoryAudit, RecordAuditParams, CheckInActivationResult } from '../types/inventory';
import { InventoryService } from '../api/inventoryService';

/**
 * State and action definitions for Room Inventory Check-In Audits & Key Handover.
 * Supports [INVENTORY-01 to INVENTORY-05].
 */
export interface InventoryState {
  audits: RoomInventoryAudit[];
  selectedAudit: RoomInventoryAudit | null;
  verifiedAudit: RoomInventoryAudit | null;
  activationResult: CheckInActivationResult | null;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  recordAudit: (params: RecordAuditParams) => Promise<RoomInventoryAudit | null>;
  issueRoomKey: (auditId: string, keyTagNumber: string) => Promise<RoomInventoryAudit | null>;
  completeCheckIn: (auditId: string) => Promise<CheckInActivationResult | null>;
  verifyCertificate: (certificateHash: string) => Promise<RoomInventoryAudit | null>;
  fetchAuditsByStudent: (studentId: string) => Promise<void>;
  fetchAuditsByRoom: (roomId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  audits: [],
  selectedAudit: null,
  verifiedAudit: null,
  activationResult: null,
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
        successMessage: `Room check-in audit certificate generated successfully for Room ${params.roomId}. Hash: ${audit.certificateHash}`
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

  issueRoomKey: async (auditId: string, keyTagNumber: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const updatedAudit = await InventoryService.issueRoomKey(auditId, keyTagNumber);
      set((state) => ({
        audits: state.audits.map((a) => (a.id === auditId ? updatedAudit : a)),
        selectedAudit: state.selectedAudit?.id === auditId ? updatedAudit : state.selectedAudit,
        isLoading: false,
        successMessage: `Official room key ${keyTagNumber.toUpperCase()} issued successfully.`
      }));
      return updatedAudit;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to record room key issuance.',
        isLoading: false
      });
      return null;
    }
  },

  completeCheckIn: async (auditId: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const result = await InventoryService.completeCheckInAndActivateResident(auditId);
      set({
        activationResult: result,
        isLoading: false,
        successMessage: result.message
      });
      return result;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to activate residency.',
        isLoading: false
      });
      return null;
    }
  },

  verifyCertificate: async (certificateHash: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const verified = await InventoryService.verifyAuditCertificate(certificateHash);
      set({
        verifiedAudit: verified,
        isLoading: false,
        successMessage: `Certificate verified authentic for Room ${verified.roomId} (Student: ${verified.studentName || verified.studentId}).`
      });
      return verified;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Audit certificate verification failed.',
        verifiedAudit: null,
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

  clearMessages: () => set({ errorMessage: null, successMessage: null })
}));
