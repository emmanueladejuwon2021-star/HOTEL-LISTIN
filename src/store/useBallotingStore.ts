import { create } from 'zustand';
import {
  BallotingCountdownState,
  QueueToken,
  FilteredHostelSummary,
  BallotingRoomDetails,
  HostelFilterParams
} from '../types/balloting';
import { LockBedspaceResult } from '../types/reservation';
import { BallotingService } from '../api/ballotingService';
import { PriorityCategory, Gender, Campus } from '../types/auth';

/**
 * State definition for the real-time priority quota balloting store.
 * Manages balloting windows, countdown timers, hostel quota availability, fair queue tokens,
 * filtered hostel lists, and interactive room/bed selections.
 */
interface BallotingState {
  // Current balloting countdown state summary
  countdownState: BallotingCountdownState | null;
  // Filtered hostels matching student criteria
  filteredHostels: FilteredHostelSummary[];
  // Currently selected hostel ID in room selector
  selectedHostelId: string | null;
  // List of rooms and bedspace statuses for selected hostel
  hostelRooms: BallotingRoomDetails[];
  // Currently selected room ID
  selectedRoomId: string | null;
  // Currently selected bedspace ID
  selectedBedId: string | null;
  // Active reservation result if bedspace is locked successfully
  activeReservation: LockBedspaceResult | null;
  // Active filter settings
  genderFilter?: Gender;
  campusFilter?: Campus;
  // Boolean flag indicating if countdown or queue token operation is in progress
  isLoading: boolean;
  // Error message string if an error occurs
  error: string | null;

  // Action to lock bedspace with balloting window and priority checks
  ballotBedspace: (userId: string, bedspaceId: string, category: PriorityCategory) => Promise<LockBedspaceResult>;
  // Action to fetch balloting window countdown and hostel quotas
  fetchCountdown: (category: PriorityCategory, userId?: string) => Promise<BallotingCountdownState>;
  // Action to issue a fair queue ticket token for a student
  issueQueueTicket: (userId: string, category: PriorityCategory) => Promise<QueueToken>;
  // Action to decrement active countdown timer by 1 second
  tickTimer: () => void;
  // Action to fetch hostels filtered by gender or campus
  fetchFilteredHostels: (params?: HostelFilterParams) => Promise<FilteredHostelSummary[]>;
  // Action to fetch rooms and bedspaces for a specific hostel
  fetchHostelRooms: (hostelId: string, blockName?: string, floorNumber?: number) => Promise<BallotingRoomDetails[]>;
  // Action to set selected hostel ID
  setSelectedHostel: (hostelId: string | null) => void;
  // Action to select room and bedspace
  setSelectedRoomAndBed: (roomId: string | null, bedId: string | null) => void;
  // Action to set filter options
  setFilterParams: (gender?: Gender, campus?: Campus) => void;
}

/**
 * Zustand store for real-time priority balloting and queue management.
 */
export const useBallotingStore = create<BallotingState>((set, get) => ({
  countdownState: null,
  filteredHostels: [],
  selectedHostelId: null,
  hostelRooms: [],
  selectedRoomId: null,
  selectedBedId: null,
  activeReservation: null,
  genderFilter: undefined,
  campusFilter: undefined,
  isLoading: false,
  error: null,

  /**
   * Executes atomic bedspace balloting reservation with active window, priority category,
   * eligibility verification, and double-allocation guards.
   *
   * @param userId - Unique student user ID
   * @param bedspaceId - Selected target bedspace ID
   * @param category - Priority category tag
   * @returns LockBedspaceResult object
   */
  ballotBedspace: async (userId: string, bedspaceId: string, category: PriorityCategory) => {
    set({ isLoading: true, error: null });
    try {
      const result = await BallotingService.lockBedspaceWithBallotingValidation(userId, bedspaceId, category);
      const { selectedHostelId } = get();

      if (selectedHostelId) {
        await get().fetchHostelRooms(selectedHostelId);
      }

      set({
        activeReservation: result,
        selectedBedId: bedspaceId,
        isLoading: false
      });
      return result;
    } catch (err: any) {
      const msg = err.message || 'Failed to lock selected bedspace.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

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
   * Fetches hostels filtered by student gender or campus from Turso DB.
   *
   * @param params - Optional filter options (gender, campus)
   * @returns Array of FilteredHostelSummary objects
   */
  fetchFilteredHostels: async (params?: HostelFilterParams) => {
    set({ isLoading: true, error: null });
    try {
      const hostels = await BallotingService.getFilteredHostels(params);
      set({
        filteredHostels: hostels,
        genderFilter: params?.gender,
        campusFilter: params?.campus,
        isLoading: false
      });
      return hostels;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch filtered hostels.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Fetches rooms and bedspaces for a specific hostel from Turso DB.
   *
   * @param hostelId - Unique hostel ID
   * @param blockName - Optional block name filter
   * @param floorNumber - Optional floor number filter
   * @returns Array of BallotingRoomDetails objects
   */
  fetchHostelRooms: async (hostelId: string, blockName?: string, floorNumber?: number) => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await BallotingService.getRoomsForHostel(hostelId, blockName, floorNumber);
      set({
        hostelRooms: rooms,
        selectedHostelId: hostelId,
        isLoading: false
      });
      return rooms;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch hostel rooms.';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  /**
   * Sets currently selected hostel ID.
   */
  setSelectedHostel: (hostelId: string | null) => {
    set({ selectedHostelId: hostelId, selectedRoomId: null, selectedBedId: null, error: null });
  },

  /**
   * Sets selected room and bedspace IDs.
   */
  setSelectedRoomAndBed: (roomId: string | null, bedId: string | null) => {
    set({ selectedRoomId: roomId, selectedBedId: bedId, error: null });
  },

  /**
   * Sets filter params for gender and campus.
   */
  setFilterParams: (gender?: Gender, campus?: Campus) => {
    set({ genderFilter: gender, campusFilter: campus });
  }
}));
