import { create } from 'zustand';
import { BallotingCountdownState, HostelQuotaSummary, BallotingRoomSummary, QueueToken } from '../types/balloting';
import { BallotingService } from '../api/ballotingService';
import { PriorityCategory, Gender, Campus } from '../types/auth';

/**
 * Interface defining state properties and interactive store actions for balloting countdown,
 * fair queue tokens, hostel filtering by gender and campus, room layout selection, and bedspace pickers.
 */
interface BallotingState {
  countdownState: BallotingCountdownState | null;
  filteredHostels: HostelQuotaSummary[];
  selectedHostelId: string | null;
  selectedBlock: string | null;
  roomsList: BallotingRoomSummary[];
  selectedRoomId: string | null;
  selectedBedspaceId: string | null;
  isLoading: boolean;
  isLocking: boolean;
  error: string | null;

  // Actions
  fetchCountdown: (category: PriorityCategory, userId?: string) => Promise<BallotingCountdownState>;
  issueQueueTicket: (userId: string, category: PriorityCategory) => Promise<QueueToken>;
  tickTimer: () => void;
  fetchFilteredHostels: (gender?: Gender, campus?: Campus) => Promise<HostelQuotaSummary[]>;
  setSelectedHostel: (hostelId: string | null) => void;
  setSelectedBlock: (blockName: string | null) => void;
  fetchRoomsForHostel: (hostelId: string, blockName?: string) => Promise<BallotingRoomSummary[]>;
  setSelectedRoom: (roomId: string | null) => void;
  setSelectedBedspace: (bedspaceId: string | null) => void;
  clearSelection: () => void;
}

/**
 * Zustand global store for managing balloting countdown timers, fair queue tokens,
 * hostel selection filters, room browsing lists, and bedspace selection states.
 */
export const useBallotingStore = create<BallotingState>((set, get) => ({
  countdownState: null,
  filteredHostels: [],
  selectedHostelId: null,
  selectedBlock: null,
  roomsList: [],
  selectedRoomId: null,
  selectedBedspaceId: null,
  isLoading: false,
  isLocking: false,
  error: null,

  /**
   * Fetches real-time balloting countdown window, queue tokens, and quota summaries from Turso DB.
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
  },

  /**
   * Fetches available hostels matching student gender and campus location.
   */
  fetchFilteredHostels: async (gender?: Gender, campus?: Campus) => {
    set({ isLoading: true, error: null });
    try {
      const hostels = await BallotingService.getFilteredHostels(gender, campus);
      set({ filteredHostels: hostels, isLoading: false });

      // Automatically select first hostel if available and none selected yet
      if (hostels.length > 0 && !get().selectedHostelId) {
        set({ selectedHostelId: hostels[0].hostelId });
      }

      return hostels;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch hostels for selected filter.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Sets the currently selected hostel ID.
   */
  setSelectedHostel: (hostelId: string | null) => {
    set({
      selectedHostelId: hostelId,
      selectedBlock: null,
      selectedRoomId: null,
      selectedBedspaceId: null,
      roomsList: []
    });
  },

  /**
   * Sets the selected block filter (e.g. Block A, Block B).
   */
  setSelectedBlock: (blockName: string | null) => {
    set({ selectedBlock: blockName, selectedRoomId: null, selectedBedspaceId: null });
  },

  /**
   * Fetches room list and bedspace allocations for a selected hostel.
   */
  fetchRoomsForHostel: async (hostelId: string, blockName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await BallotingService.getRoomsForHostel(hostelId, blockName);
      set({ roomsList: rooms, isLoading: false });

      // Automatically select first room if available and none selected
      if (rooms.length > 0 && !get().selectedRoomId) {
        set({ selectedRoomId: rooms[0].id });
      }

      return rooms;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch room list for hostel.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Sets the currently selected room ID.
   */
  setSelectedRoom: (roomId: string | null) => {
    set({ selectedRoomId: roomId, selectedBedspaceId: null });
  },

  /**
   * Sets the currently selected bedspace ID.
   */
  setSelectedBedspace: (bedspaceId: string | null) => {
    set({ selectedBedspaceId: bedspaceId });
  },

  /**
   * Clears all active selection states.
   */
  clearSelection: () => {
    set({
      selectedHostelId: null,
      selectedBlock: null,
      selectedRoomId: null,
      selectedBedspaceId: null,
      roomsList: []
    });
  }
}));
