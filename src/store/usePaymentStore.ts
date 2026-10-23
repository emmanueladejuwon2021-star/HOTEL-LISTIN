import { create } from 'zustand';
import { PaymentHoldDetails, PaymentProcessResult } from '../types/payment';
import { PaymentService } from '../api/paymentService';

interface PaymentState {
  holdDetails: PaymentHoldDetails | null;
  paymentResult: PaymentProcessResult | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  formattedCountdown: string;
  fetchHoldStatus: (userId: string) => Promise<PaymentHoldDetails | null>;
  payHostelFee: (userId: string, transactionReference: string) => Promise<PaymentProcessResult>;
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
  isLoading: false,
  isProcessing: false,
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

  resetPaymentState: () => {
    set({
      holdDetails: null,
      paymentResult: null,
      isLoading: false,
      isProcessing: false,
      error: null,
      formattedCountdown: '72:00:00'
    });
  }
}));
