import { create } from 'zustand';
import { BallotingCountdownState } from '../types/balloting';
import { BallotingService } from '../api/ballotingService';
import { PriorityCategory } from '../types/auth';

interface BallotingState {
  countdownState: BallotingCountdownState | null;
  isLoading: boolean;
  error: string | null;
  fetchCountdown: (category: PriorityCategory) => Promise<BallotingCountdownState>;
  tickTimer: () => void;
}

export const useBallotingStore = create<BallotingState>((set, get) => ({
  countdownState: null,
  isLoading: false,
  error: null,

  fetchCountdown: async (category: PriorityCategory) => {
    set({ isLoading: true, error: null });
    try {
      const state = await BallotingService.getCountdownState(category);
      set({ countdownState: state, isLoading: false });
      return state;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch balloting countdown.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

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
