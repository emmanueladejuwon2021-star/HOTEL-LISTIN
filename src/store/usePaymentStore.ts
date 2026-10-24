import { create } from 'zustand';
import { PaymentHoldDetails, PaymentProcessResult, PaymentReceipt, HoldReleaseResult, RemitaRRRDetails, RemitaFeeBreakdown, PaymentVerificationResult, PaymentRetryResult, PendingPaymentSyncSummary } from '../types/payment';
import { PaymentService } from '../api/paymentService';

interface PaymentState {
  holdDetails: PaymentHoldDetails | null;
  paymentResult: PaymentProcessResult | null;
  paymentHistory: PaymentReceipt[];
  selectedReceipt: PaymentReceipt | null;
  rrrDetails: RemitaRRRDetails | null;
  feeBreakdown: RemitaFeeBreakdown | null;
  verificationResult: PaymentVerificationResult | null;
  syncSummary: PendingPaymentSyncSummary | null;
  retryResult: PaymentRetryResult | null;
  isLoading: boolean;
  isProcessing: boolean;
  isCancellingHold: boolean;
  isGeneratingRRR: boolean;
  isVerifyingRef: boolean;
  isSyncingPending: boolean;
  isUrgentHold: boolean;
  error: string | null;
  formattedCountdown: string;
  fetchHoldStatus: (userId: string) => Promise<PaymentHoldDetails | null>;
  payHostelFee: (userId: string, transactionReference: string) => Promise<PaymentProcessResult>;
  fetchPaymentHistory: (userId: string) => Promise<PaymentReceipt[]>;
  releaseCurrentHold: (userId: string) => Promise<HoldReleaseResult>;
  generateRRR: (userId: string) => Promise<RemitaRRRDetails>;
  verifyPaymentReference: (transactionReference: string) => Promise<PaymentVerificationResult>;
  markPaymentFailed: (paymentId: string, userId: string, failureReason?: string) => Promise<PaymentRetryResult>;
  syncPendingPayments: () => Promise<PendingPaymentSyncSummary>;
  getFeeBreakdown: (baseAmount?: number) => RemitaFeeBreakdown;
  setSelectedReceipt: (receipt: PaymentReceipt | null) => void;
  setVerificationResult: (result: PaymentVerificationResult | null) => void;
  updateCountdownTimer: () => void;
  resetPaymentState: () => void;
}

/**
 * Formats remaining seconds into HH:MM:SS string for non-technical users.
 */
function formatSecondsToHMS(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  holdDetails: null,
  paymentResult: null,
  paymentHistory: [],
  selectedReceipt: null,
  rrrDetails: null,
  feeBreakdown: null,
  verificationResult: null,
  syncSummary: null,
  retryResult: null,
  isLoading: false,
  isProcessing: false,
  isCancellingHold: false,
  isGeneratingRRR: false,
  isVerifyingRef: false,
  isSyncingPending: false,
  isUrgentHold: false,
  error: null,
  formattedCountdown: '72:00:00',

  fetchHoldStatus: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const hold = await PaymentService.getPaymentHoldStatus(userId);
      const countdown = hold ? formatSecondsToHMS(hold.remainingSeconds) : '00:00:00';
      const isUrgent = !!hold && !hold.isExpired && hold.remainingSeconds < 43200 && hold.remainingSeconds > 0;
      const fees = hold ? PaymentService.calculateFeeBreakdown(hold.amount) : null;
      set({ holdDetails: hold, formattedCountdown: countdown, isUrgentHold: isUrgent, feeBreakdown: fees, isLoading: false });
      return hold;
    } catch (err: any) {
      const msg = err.message || 'Failed to retrieve payment hold status.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  markPaymentFailed: async (paymentId: string, userId: string, failureReason?: string) => {
    set({ isProcessing: true, error: null });
    try {
      const res = await PaymentService.markPaymentFailed(paymentId, userId, failureReason);
      set({ retryResult: res, isProcessing: false });
      await get().fetchHoldStatus(userId);
      return res;
    } catch (err: any) {
      const msg = err.message || 'Failed to update payment status.';
      set({ error: msg, isProcessing: false });
      throw err;
    }
  },

  syncPendingPayments: async () => {
    set({ isSyncingPending: true, error: null });
    try {
      const summary = await PaymentService.syncPendingPayments();
      set({ syncSummary: summary, isSyncingPending: false });
      return summary;
    } catch (err: any) {
      const msg = err.message || 'Failed to sync pending payments.';
      set({ error: msg, isSyncingPending: false });
      throw err;
    }
  },

  payHostelFee: async (userId: string, transactionReference: string) => {
    const { holdDetails } = get();
    const paymentId = holdDetails?.paymentId || '';

    set({ isProcessing: true, error: null });
    try {
      const result = await PaymentService.processRemitaPayment({
        userId,
        paymentId,
        transactionReference
      });
      set({ paymentResult: result, isProcessing: false });
      // Refresh hold status
      await get().fetchHoldStatus(userId);
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to process hostel fee payment.';
      set({ error: msg, isProcessing: false });
      throw err;
    }
  },

  updateCountdownTimer: () => {
    const { holdDetails } = get();
    if (!holdDetails || holdDetails.isExpired) {
      set({ formattedCountdown: '00:00:00', isUrgentHold: false });
      return;
    }

    const holdExpiresMs = new Date(holdDetails.holdExpiresAt).getTime();
    const nowMs = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((holdExpiresMs - nowMs) / 1000));
    const isExpired = remainingSeconds === 0;
    const isUrgent = !isExpired && remainingSeconds < 43200; // Less than 12 hours remaining

    set({
      formattedCountdown: formatSecondsToHMS(remainingSeconds),
      isUrgentHold: isUrgent,
      holdDetails: {
        ...holdDetails,
        remainingSeconds,
        isExpired
      }
    });
  },

  generateRRR: async (userId: string) => {
    set({ isGeneratingRRR: true, error: null });
    try {
      const details = await PaymentService.generateRemitaRRR(userId);
      set({ rrrDetails: details, isGeneratingRRR: false });
      return details;
    } catch (err: any) {
      const msg = err.message || 'Failed to generate Remita Retrieval Reference.';
      set({ error: msg, isGeneratingRRR: false });
      throw err;
    }
  },

  verifyPaymentReference: async (transactionReference: string) => {
    set({ isVerifyingRef: true, error: null });
    try {
      const res = await PaymentService.verifyRemitaPaymentStatus(transactionReference);
      set({ verificationResult: res, isVerifyingRef: false });
      return res;
    } catch (err: any) {
      const msg = err.message || 'Failed to verify transaction reference.';
      set({ error: msg, isVerifyingRef: false });
      throw err;
    }
  },

  getFeeBreakdown: (baseAmount?: number) => {
    const fees = PaymentService.calculateFeeBreakdown(baseAmount);
    set({ feeBreakdown: fees });
    return fees;
  },

  setVerificationResult: (result: PaymentVerificationResult | null) => {
    set({ verificationResult: result });
  },

  fetchPaymentHistory: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const history = await PaymentService.getPaymentHistory(userId);
      set({ paymentHistory: history, isLoading: false });
      return history;
    } catch (err: any) {
      const msg = err.message || 'Failed to retrieve payment history.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  releaseCurrentHold: async (userId: string) => {
    set({ isCancellingHold: true, error: null });
    try {
      const result = await PaymentService.cancelBedspaceHold(userId);
      set({ isCancellingHold: false });
      // Refresh hold status and payment history
      await get().fetchHoldStatus(userId);
      await get().fetchPaymentHistory(userId);
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to release provisional hold.';
      set({ error: msg, isCancellingHold: false });
      throw err;
    }
  },

  setSelectedReceipt: (receipt: PaymentReceipt | null) => {
    set({ selectedReceipt: receipt });
  },

  resetPaymentState: () => {
    set({
      holdDetails: null,
      paymentResult: null,
      paymentHistory: [],
      selectedReceipt: null,
      rrrDetails: null,
      feeBreakdown: null,
      verificationResult: null,
      syncSummary: null,
      retryResult: null,
      isLoading: false,
      isProcessing: false,
      isCancellingHold: false,
      isGeneratingRRR: false,
      isVerifyingRef: false,
      isSyncingPending: false,
      isUrgentHold: false,
      error: null,
      formattedCountdown: '72:00:00'
    });
  }
}));
