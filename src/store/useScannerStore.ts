import { create } from 'zustand';
import { GatePassService } from '../api/gatepassService';
import {
  ScannerStoreState,
  GatePassVerificationResult,
  ManualPinLookupResult,
  GateType
} from '../types/gatepass';

/**
 * Zustand Store managing Porter High-Visibility Gate Scanner state.
 * Implements [SCANNER-01], [SCANNER-02], and [SCANNER-03] adhering to PRD Spec P-01.
 *
 * Handles camera scanning simulation, sub-500ms verification execution,
 * 6-digit manual PIN visitor check-ins/check-outs, and gate mode (ENTRY / EXIT) state.
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

  scanQrCode: async (tokenString: string, porterId: string): Promise<GatePassVerificationResult> => {
    set({ isVerifying: true, lastScannedToken: tokenString, errorMessage: null });
    try {
      const mode = get().gateMode;
      const result = await GatePassService.fastVerifyGatePass(tokenString, porterId, mode);

      set({
        verificationResult: result,
        scanLatencyMs: result.latencyMs ?? null,
        isVerifying: false,
        pinLookupResult: null
      });

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
        errorMessage: error.message
      });
      return failedResult;
    }
  },

  lookupManualPin: async (pinOrMatric: string, porterId: string): Promise<ManualPinLookupResult> => {
    set({ isVerifying: true, errorMessage: null });
    try {
      const mode = get().gateMode;
      const result = await GatePassService.verifyManualPin(pinOrMatric, porterId, mode);

      set({
        pinLookupResult: result,
        scanLatencyMs: result.latencyMs ?? null,
        isVerifying: false,
        verificationResult: null
      });

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
        errorMessage: error.message
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
          : null
      });
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
          : null
      });
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
    set({
      verificationResult: null,
      pinLookupResult: null,
      scanLatencyMs: null,
      lastScannedToken: null,
      errorMessage: null
    });
  },

  resetScanner: () => {
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
      errorMessage: null
    });
  }
}));
