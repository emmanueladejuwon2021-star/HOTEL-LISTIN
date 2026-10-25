import { create } from 'zustand';
import { GatePassService } from '../api/gatepassService';
import { OfflineSyncService } from '../api/offlineSyncService';
import {
  ScannerStoreState,
  GatePassVerificationResult,
  ManualPinLookupResult,
  GateType,
  ShiftStatistics,
  AudioVisualFeedback
} from '../types/gatepass';

const INITIAL_STATS: ShiftStatistics = {
  totalEntries: 0,
  totalExits: 0,
  activeVisitors: 0,
  pendingOfflineSyncs: 0,
  lastUpdated: new Date().toISOString()
};

const INITIAL_AUDIO: AudioVisualFeedback = {
  type: null,
  timestamp: 0
};

let autoResetTimeout: any = null;

/**
 * Zustand Store managing Porter High-Visibility Gate Scanner state.
 * Implements [SCANNER-01], [SCANNER-02], [SCANNER-03], [SCANNER-04], [SCANNER-05], and [OFFLINE-01].
 */
export const useScannerStore = create<ScannerStoreState>((set, get) => ({
  isScanning: true,
  isVerifying: false,
  lastScannedToken: null,
  verificationResult: null,
  pinLookupResult: null,
  scanLatencyMs: null,
  manualPinModalVisible: false,
  manualPinInput: '',
  gateMode: 'ENTRY',
  recentScans: [],
  errorMessage: null,

  isLockdownActive: false,
  offlineMode: false,
  shiftStats: INITIAL_STATS,
  audioFeedback: INITIAL_AUDIO,
  pendingSyncCount: 0,
  autoResetSeconds: 0,

  scanQrCode: async (tokenString: string, porterId: string): Promise<GatePassVerificationResult> => {
    if (autoResetTimeout) {
      clearTimeout(autoResetTimeout);
    }

    set({ isVerifying: true, lastScannedToken: tokenString, errorMessage: null });
    try {
      const mode = get().gateMode;
      const isOffline = get().offlineMode;
      const result = await GatePassService.fastVerifyGatePass(tokenString, porterId, mode, isOffline);

      // Determine audio feedback chime/buzz ([SCANNER-04])
      const feedbackType = result.accessGranted ? 'SUCCESS_CHIME' : 'REJECTION_BUZZ';
      const audio: AudioVisualFeedback = {
        type: feedbackType,
        timestamp: Date.now(),
        message: result.message
      };

      set({
        verificationResult: result,
        scanLatencyMs: result.latencyMs ?? null,
        isVerifying: false,
        pinLookupResult: null,
        audioFeedback: audio,
        autoResetSeconds: 3
      });

      // Update shift stats
      get().loadShiftStats();

      // Auto-reset back to Ready state after 3 seconds for continuous rush-hour scanning ([SCANNER-04])
      autoResetTimeout = setTimeout(() => {
        const currentResult = get().verificationResult;
        if (currentResult && currentResult.accessGranted) {
          get().clearScanResult();
        }
      }, 3000);

      return result;
    } catch (error: any) {
      const failedResult: GatePassVerificationResult = {
        isValid: false,
        accessGranted: false,
        accessStatus: 'DENIED',
        message: error.message || 'Verification Error',
        reason: error.message || 'Failed to verify QR pass'
      };
      set({
        verificationResult: failedResult,
        isVerifying: false,
        errorMessage: error.message,
        audioFeedback: {
          type: 'REJECTION_BUZZ',
          timestamp: Date.now(),
          message: error.message
        }
      });
      return failedResult;
    }
  },

  lookupManualPin: async (pinOrMatric: string, porterId: string): Promise<ManualPinLookupResult> => {
    set({ isVerifying: true, errorMessage: null });
    try {
      const mode = get().gateMode;
      const result = await GatePassService.verifyManualPin(pinOrMatric, porterId, mode);

      const feedbackType = result.isValid && result.actionAllowed !== 'NONE' ? 'SUCCESS_CHIME' : 'REJECTION_BUZZ';

      set({
        pinLookupResult: result,
        scanLatencyMs: result.latencyMs ?? null,
        isVerifying: false,
        verificationResult: null,
        audioFeedback: {
          type: feedbackType,
          timestamp: Date.now(),
          message: result.message
        }
      });

      get().loadShiftStats();

      return result;
    } catch (error: any) {
      const failedResult: ManualPinLookupResult = {
        isValid: false,
        message: error.message || 'Manual PIN lookup failed',
        passType: 'VISITOR',
        actionAllowed: 'NONE'
      };
      set({
        pinLookupResult: failedResult,
        isVerifying: false,
        errorMessage: error.message,
        audioFeedback: {
          type: 'REJECTION_BUZZ',
          timestamp: Date.now(),
          message: error.message
        }
      });
      return failedResult;
    }
  },

  executeVisitorCheckIn: async (visitorPassId: string, porterId: string) => {
    set({ isVerifying: true });
    try {
      const updatedPass = await GatePassService.checkInVisitor(visitorPassId, porterId);
      const prevResult = get().pinLookupResult;
      set({
        isVerifying: false,
        pinLookupResult: prevResult
          ? {
              ...prevResult,
              visitor: updatedPass,
              actionAllowed: 'CHECK_OUT',
              message: `VISITOR CHECKED IN: ${updatedPass.visitorName} entry granted.`
            }
          : null,
        audioFeedback: {
          type: 'SUCCESS_CHIME',
          timestamp: Date.now(),
          message: `Visitor Checked In: ${updatedPass.visitorName}`
        }
      });
      get().loadShiftStats();
    } catch (error: any) {
      set({ isVerifying: false, errorMessage: error.message });
    }
  },

  executeVisitorCheckOut: async (visitorPassId: string, porterId: string) => {
    set({ isVerifying: true });
    try {
      const updatedPass = await GatePassService.checkOutVisitor(visitorPassId, porterId);
      const prevResult = get().pinLookupResult;
      set({
        isVerifying: false,
        pinLookupResult: prevResult
          ? {
              ...prevResult,
              visitor: updatedPass,
              actionAllowed: 'NONE',
              message: `VISITOR CHECKED OUT: ${updatedPass.visitorName} departed hostel.`
            }
          : null,
        audioFeedback: {
          type: 'SUCCESS_CHIME',
          timestamp: Date.now(),
          message: `Visitor Checked Out: ${updatedPass.visitorName}`
        }
      });
      get().loadShiftStats();
    } catch (error: any) {
      set({ isVerifying: false, errorMessage: error.message });
    }
  },

  setGateMode: (mode: GateType) => {
    set({ gateMode: mode });
  },

  setManualPinModalVisible: (visible: boolean) => {
    set({ manualPinModalVisible: visible });
  },

  setManualPinInput: (pin: string) => {
    set({ manualPinInput: pin });
  },

  clearScanResult: () => {
    if (autoResetTimeout) {
      clearTimeout(autoResetTimeout);
    }
    set({
      verificationResult: null,
      pinLookupResult: null,
      scanLatencyMs: null,
      lastScannedToken: null,
      errorMessage: null,
      autoResetSeconds: 0
    });
  },

  toggleLockdown: (): boolean => {
    const nextState = !get().isLockdownActive;
    GatePassService.setLockdown(nextState);
    set({
      isLockdownActive: nextState,
      verificationResult: null,
      pinLookupResult: null
    });
    return nextState;
  },

  setOfflineMode: (offline: boolean) => {
    set({ offlineMode: offline });
  },

  syncOfflineQueue: async (porterId: string) => {
    const res = await OfflineSyncService.syncOfflineQueue(porterId);
    await get().loadShiftStats();
    return res;
  },

  loadShiftStats: async () => {
    try {
      const stats = await GatePassService.getShiftStatistics();
      set({
        shiftStats: stats,
        pendingSyncCount: stats.pendingOfflineSyncs
      });
    } catch {}
  },

  reportDisciplinaryIncident: async (studentId: string, porterId: string, reason: string) => {
    try {
      await GatePassService.reportDisciplinaryIncident(studentId, porterId, reason);
      const current = get().verificationResult;
      if (current) {
        set({
          verificationResult: {
            ...current,
            message: `${current.message} | Incident Flagged to Hall Warden.`
          }
        });
      }
    } catch (error: any) {
      set({ errorMessage: error.message });
    }
  },

  resetScanner: () => {
    if (autoResetTimeout) {
      clearTimeout(autoResetTimeout);
    }
    GatePassService.setLockdown(false);
    set({
      isScanning: true,
      isVerifying: false,
      lastScannedToken: null,
      verificationResult: null,
      pinLookupResult: null,
      scanLatencyMs: null,
      manualPinModalVisible: false,
      manualPinInput: '',
      gateMode: 'ENTRY',
      recentScans: [],
      errorMessage: null,
      isLockdownActive: false,
      offlineMode: false,
      shiftStats: INITIAL_STATS,
      audioFeedback: INITIAL_AUDIO,
      pendingSyncCount: 0,
      autoResetSeconds: 0
    });
  }
}));
