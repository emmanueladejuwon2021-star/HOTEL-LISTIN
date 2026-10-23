import { create } from 'zustand';
import { PaymentHoldDetails, PaymentProcessResult, PaymentReceipt, HoldReleaseResult } from '../types/payment';
import { PaymentService } from '../api/paymentService';

interface PaymentState {
  holdDetails: PaymentHoldDetails | null;
  paymentResult: PaymentProcessResult | null;
  paymentHistory: PaymentReceipt[];
  selectedReceipt: PaymentReceipt | null;
  isLoading: boolean;
  isProcessing: boolean;
  isCancellingHold: boolean;
  error: string | null;
  formattedCountdown: string;
  fetchHoldStatus: (userId: string) => Promise<PaymentHoldDetails | null>;
  payHostelFee: (userId: string, transactionReference: string) => Promise<PaymentProcessResult>;
  fetchPaymentHistory: (userId: string) => Promise<PaymentReceipt[]>;
  releaseCurrentHold: (userId: string) => Promise<HoldReleaseResult>;
  setSelectedReceipt: (receipt: PaymentReceipt | null) => void;
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
  isLoading: false,
  isProcessing: false,
  isCancellingHold: false,
  error: null,
  formattedCountdown: '72:00:00',

  fetchHoldStatus: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const hold = await PaymentService.getPaymentHoldStatus(userId);
      const countdown = hold ? formatSecondsToHMS(hold.remainingSeconds) : '00:00:00';
      set({ holdDetails: hold, formattedCountdown: countdown, isLoading: false });
      return hold;
    } catch (err: any) {
      const msg = err.message || 'Failed to retrieve payment hold status.';
      set({ error: msg, isLoading: false });
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
      set({ formattedCountdown: '00:00:00' });
      return;
    }

    const holdExpiresMs = new Date(holdDetails.holdExpiresAt).getTime();
    const nowMs = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((holdExpiresMs - nowMs) / 1000));
    const isExpired = remainingSeconds === 0;

    set({
      formattedCountdown: formatSecondsToHMS(remainingSeconds),
      holdDetails: {
        ...holdDetails,
        remainingSeconds,
        isExpired
      }
    });
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
      isLoading: false,
      isProcessing: false,
      isCancellingHold: false,
      error: null,
      formattedCountdown: '72:00:00'
    });
  }
}));
