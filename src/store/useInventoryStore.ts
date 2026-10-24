import { create } from 'zustand';
import { RoomInventoryAudit, RecordAuditParams } from '../types/inventory';
import { InventoryService } from '../api/inventoryService';

export interface InventoryState {
  audits: RoomInventoryAudit[];
  selectedAudit: RoomInventoryAudit | null;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;

  // Actions
  recordAudit: (params: RecordAuditParams) => Promise<RoomInventoryAudit | null>;
  fetchAuditsByStudent: (studentId: string) => Promise<void>;
  fetchAuditsByRoom: (roomId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  audits: [],
  selectedAudit: null,
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  recordAudit: async (params: RecordAuditParams) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const audit = await InventoryService.recordAudit(params);
      const isCheckout = audit.auditType === 'CHECK_OUT';
      const typeLabel = isCheckout ? 'check-out' : 'check-in';
      const statusNotice = isCheckout
        ? (audit.checkoutStatus === 'CLEARED'
          ? 'Clearance Status: CLEARED ✓ (Bedspace released)'
          : `Clearance Status: DAMAGES ASSESSED (Liability Fee: ₦${audit.damageFee?.toLocaleString()})`)
        : 'Audit Certificate generated';

      set((state) => ({
        audits: [audit, ...state.audits],
        selectedAudit: audit,
        isLoading: false,
        successMessage: `Room inventory ${typeLabel} inspection recorded successfully for Room ${params.roomId}. ${statusNotice}`
      }));
      return audit;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to record room inventory property audit.',
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
