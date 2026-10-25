import { create } from 'zustand';
import { GatePassService } from '../api/gatepassService';
import { OfflineSyncService } from '../api/offlineSyncService';
import {
  ScannerStoreState,
  GatePassVerificationResult,
  ManualPinLookupResult,
  GateType,
  ShiftStatistics,
  AudioVisualFeedback,
  OfflineScanQueueItem,
  QueueSummary,
  SyncResult
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

const INITIAL_QUEUE_SUMMARY: QueueSummary = {
  total: 0,
  pending: 0,
  synced: 0,
  failed: 0
};

let autoResetTimeout: any = null;

/**
 * Zustand Store managing Porter High-Visibility Gate Scanner state.
 * Implements [SCANNER-01], [SCANNER-02], [SCANNER-03], [SCANNER-04], [SCANNER-05],
 * [OFFLINE-01], [OFFLINE-02], and [OFFLINE-03].
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

  // Offline Queue & Background Sync state ([OFFLINE-02], [OFFLINE-03], [OFFLINE-04])
  queueItems: [],
  queueSummary: INITIAL_QUEUE_SUMMARY,
  isQueueModalVisible: false,
  isSyncing: false,
  lastSyncResult: null,
  activeKeyId: 'UNILAG_GATE_OFFLINE_KEY_V1',
  queueIntegrityReport: null,

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

      // Update shift stats & queue
      await get().loadShiftStats();
      if (isOffline) {
        await get().loadQueueItems();
      }

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

      await get().loadShiftStats();

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

  executeVisitorCheckIn: async (visitorPassId: string, porterId: string): Promise<void> => {
    set({ isVerifying: true, errorMessage: null });
    try {
      await GatePassService.checkInVisitor(visitorPassId, porterId);
      const currentResult = get().pinLookupResult;
      if (currentResult) {
        set({
          pinLookupResult: {
            ...currentResult,
            actionAllowed: 'NONE',
            message: `Visitor Check-In Successful at Gate.`
          },
          audioFeedback: {
            type: 'SUCCESS_CHIME',
            timestamp: Date.now(),
            message: 'Visitor Checked In'
          }
        });
      }
      set({ isVerifying: false, manualPinModalVisible: false });
      await get().loadShiftStats();
    } catch (error: any) {
      set({ isVerifying: false, errorMessage: error.message });
    }
  },

  executeVisitorCheckOut: async (visitorPassId: string, porterId: string): Promise<void> => {
    set({ isVerifying: true, errorMessage: null });
    try {
      await GatePassService.checkOutVisitor(visitorPassId, porterId);
      const currentResult = get().pinLookupResult;
      if (currentResult) {
        set({
          pinLookupResult: {
            ...currentResult,
            actionAllowed: 'NONE',
            message: `Visitor Check-Out Successful at Gate.`
          },
          audioFeedback: {
            type: 'SUCCESS_CHIME',
            timestamp: Date.now(),
            message: 'Visitor Checked Out'
          }
        });
      }
      set({ isVerifying: false, manualPinModalVisible: false });
      await get().loadShiftStats();
    } catch (error: any) {
      set({ isVerifying: false, errorMessage: error.message });
    }
  },

  setGateMode: (mode: GateType) => {
    set({ gateMode: mode, verificationResult: null, pinLookupResult: null });
  },

  setManualPinModalVisible: (visible: boolean) => {
    set({
      manualPinModalVisible: visible,
      manualPinInput: visible ? get().manualPinInput : '',
      errorMessage: null
    });
  },

  setManualPinInput: (pin: string) => {
    set({ manualPinInput: pin });
  },

  clearScanResult: () => {
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
    OfflineSyncService.setNetworkOnline(!offline);
  },

  syncOfflineQueue: async (porterId: string) => {
    return get().triggerAutoSync(porterId);
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

  // =========================================================================
  // Offline Queue Management Actions ([OFFLINE-02])
  // =========================================================================

  loadQueueItems: async () => {
    try {
      const items = await OfflineSyncService.getAllQueueItems(50, 0);
      const summary = await OfflineSyncService.getQueueSummary();
      set({
        queueItems: items,
        queueSummary: summary,
        pendingSyncCount: summary.pending
      });
    } catch (error: any) {
      set({ errorMessage: error.message });
    }
  },

  setQueueModalVisible: (visible: boolean) => {
    set({ isQueueModalVisible: visible });
    if (visible) {
      get().loadQueueItems();
    }
  },

  retryQueueItem: async (id: string) => {
    try {
      await OfflineSyncService.retryFailedScan(id);
      await get().loadQueueItems();
    } catch (error: any) {
      set({ errorMessage: error.message });
    }
  },

  deleteQueueItem: async (id: string) => {
    try {
      await OfflineSyncService.deleteQueueItem(id);
      await get().loadQueueItems();
      await get().loadShiftStats();
    } catch (error: any) {
      set({ errorMessage: error.message });
    }
  },

  rotateKey: async (newKeyId: string, secret: string) => {
    try {
      const key = await OfflineSyncService.rotateSigningKey(newKeyId, secret);
      set({
        activeKeyId: key.keyId,
        audioFeedback: {
          type: 'SUCCESS_CHIME',
          timestamp: Date.now(),
          message: `Cryptographic Key Rotated (v${key.keyVersion})`
        }
      });
    } catch (error: any) {
      set({ errorMessage: error.message });
    }
  },

  verifyQueueIntegrity: async () => {
    try {
      const report = await OfflineSyncService.verifyQueueIntegrity();
      set({ queueIntegrityReport: report });
      await get().loadQueueItems();
      return report;
    } catch (error: any) {
      set({ errorMessage: error.message });
      return {
        isHealthy: false,
        totalItems: 0,
        corruptedCount: 0,
        repairedCount: 0,
        details: [error.message]
      };
    }
  },

  // =========================================================================
  // Background Auto-Sync Actions ([OFFLINE-03])
  // =========================================================================

  triggerAutoSync: async (porterId: string): Promise<SyncResult> => {
    set({ isSyncing: true, errorMessage: null });
    try {
      const result = await OfflineSyncService.autoSync(porterId);
      set({
        isSyncing: false,
        lastSyncResult: result,
        audioFeedback: {
          type: result.syncedCount > 0 ? 'SUCCESS_CHIME' : null,
          timestamp: Date.now(),
          message: `Synced ${result.syncedCount} offline scans`
        }
      });
      await get().loadShiftStats();
      await get().loadQueueItems();
      return result;
    } catch (error: any) {
      set({ isSyncing: false, errorMessage: error.message });
      return {
        syncedCount: 0,
        failedCount: 0,
        totalProcessed: 0,
        durationMs: 0,
        timestamp: new Date().toISOString()
      };
    }
  },

  simulateNetworkChange: async (online: boolean, porterId: string = 'porter_gate_default') => {
    const wasOffline = get().offlineMode;
    set({ offlineMode: !online });

    if (online && wasOffline) {
      set({ isSyncing: true });
      const result = await OfflineSyncService.setNetworkOnline(online, porterId);
      if (result) {
        set({
          isSyncing: false,
          lastSyncResult: result,
          audioFeedback: {
            type: result.syncedCount > 0 ? 'SUCCESS_CHIME' : null,
            timestamp: Date.now(),
            message: `Synced ${result.syncedCount} offline scans`
          }
        });
        await get().loadShiftStats();
        await get().loadQueueItems();
      } else {
        await get().triggerAutoSync(porterId);
      }
    } else {
      await OfflineSyncService.setNetworkOnline(online, porterId);
    }
  },

  resetScanner: () => {
    if (autoResetTimeout) {
      clearTimeout(autoResetTimeout);
    }
    GatePassService.setLockdown(false);
    OfflineSyncService.setNetworkOnline(true);
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
      autoResetSeconds: 0,
      queueItems: [],
      queueSummary: INITIAL_QUEUE_SUMMARY,
      isQueueModalVisible: false,
      isSyncing: false,
      lastSyncResult: null,
      activeKeyId: 'UNILAG_GATE_OFFLINE_KEY_V1',
      queueIntegrityReport: null
    });
  }
}));
