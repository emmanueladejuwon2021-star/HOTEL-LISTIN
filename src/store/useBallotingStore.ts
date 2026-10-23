import { create } from 'zustand';
import {
  BallotingCountdownState,
  QueueToken,
  CategoryQuotaDetails,
  BallotingEligibilityStatus
} from '../types/balloting';
import { BallotingService } from '../api/ballotingService';
import { PriorityCategory } from '../types/auth';

/**
 * State definition for the real-time priority quota balloting store.
 * Manages balloting windows, countdown timers, hostel quota availability, fair queue tokens,
 * and category quota allocation enforcement.
 */
interface BallotingState {
  // Current balloting countdown state summary
  countdownState: BallotingCountdownState | null;
  // Category quota breakdown details for a selected hostel
  categoryQuota: CategoryQuotaDetails | null;
  // Eligibility status evaluating active window and category quota availability
  eligibilityStatus: BallotingEligibilityStatus | null;
  // Boolean flag indicating if countdown or queue token operation is in progress
  isLoading: boolean;
  // Error message string if an error occurs
  error: string | null;
  // Action to fetch balloting window countdown and hostel quotas
  fetchCountdown: (category: PriorityCategory, userId?: string) => Promise<BallotingCountdownState>;
  // Action to issue a fair queue ticket token for a student
  issueQueueTicket: (userId: string, category: PriorityCategory) => Promise<QueueToken>;
  // Action to fetch category quota allocation breakdown for a specific hostel
  fetchCategoryQuota: (hostelId: string, category: PriorityCategory) => Promise<CategoryQuotaDetails>;
  // Action to validate balloting window status and category quota availability
  validateBallotingAccess: (userId: string, category: PriorityCategory, hostelId: string) => Promise<BallotingEligibilityStatus>;
  // Action to decrement active countdown timer by 1 second
  tickTimer: () => void;
}

/**
 * Zustand store for real-time priority balloting, queue management, and category quota enforcement.
 */
export const useBallotingStore = create<BallotingState>((set, get) => ({
  countdownState: null,
  categoryQuota: null,
  eligibilityStatus: null,
  isLoading: false,
  error: null,

  /**
   * Fetches real-time balloting countdown window and quota summaries from Turso DB.
   *
   * @param category - Priority quota category tag
   * @param userId - Optional student user ID to attach queue token
   * @returns BallotingCountdownState summary
   */
  fetchCountdown: async (category: PriorityCategory, userId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const state = await BallotingService.getCountdownState(category, userId);
      set({ countdownState: state, isLoading: false });
      return state;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch balloting countdown.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Issues a fair queue token for a student entering the balloting window.
   *
   * @param userId - Unique student user ID
   * @param category - Priority category tag
   * @returns QueueToken object
   */
  issueQueueTicket: async (userId: string, category: PriorityCategory) => {
    set({ isLoading: true, error: null });
    try {
      const token = await BallotingService.issueQueueToken(userId, category);
      // Re-fetch countdown state with newly issued queue token attached
      const state = await BallotingService.getCountdownState(category, userId);
      set({ countdownState: state, isLoading: false });
      return token;
    } catch (err: any) {
      const msg = err.message || 'Failed to issue queue token.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Fetches priority category quota allocation details for a specific hostel.
   *
   * @param hostelId - Target hostel ID
   * @param category - Priority category tag
   * @returns CategoryQuotaDetails object
   */
  fetchCategoryQuota: async (hostelId: string, category: PriorityCategory) => {
    set({ isLoading: true, error: null });
    try {
      const quota = await BallotingService.getCategoryQuotaForHostel(hostelId, category);
      set({ categoryQuota: quota, isLoading: false });
      return quota;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch category quota.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Validates active balloting window status and category quota availability before balloting.
   *
   * @param userId - Unique student user ID
   * @param category - Priority category tag
   * @param hostelId - Target hostel ID
   * @returns BallotingEligibilityStatus object
   */
  validateBallotingAccess: async (userId: string, category: PriorityCategory, hostelId: string) => {
    set({ isLoading: true, error: null });
    try {
      const status = await BallotingService.validateBallotingEligibilityAndWindow(userId, category, hostelId);
      set({ eligibilityStatus: status, isLoading: false });
      return status;
    } catch (err: any) {
      const msg = err.message || 'Failed to validate balloting access.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Decrements active countdown timer by 1 second.
   */
  tickTimer: () => {
    const { countdownState } = get();
    if (!countdownState || countdownState.timeRemainingSeconds <= 0) return;

    const nextSeconds = countdownState.timeRemainingSeconds - 1;
    set({
      countdownState: {
        ...countdownState,
        timeRemainingSeconds: nextSeconds
      }
    });
  }
}));
