import { create } from 'zustand';
import { RoommateService } from '../api/roommateService';
import {
  RoommateSurvey,
  RoommateMatch,
  BedswapRequest,
  SubmitSurveyParams,
  CreateBedswapParams,
  BedswapRequestStatus
} from '../types/roommate';

/**
 * Interface defining the Zustand state and actions for managing student roommate surveys,
 * compatibility matches, and mutual bedspace swap requests.
 */
export interface RoommateStoreState {
  /** The current user's submitted survey profile, if any */
  survey: RoommateSurvey | null;
  /** List of top compatibility matches calculated for the student */
  matches: RoommateMatch[];
  /** List of incoming or outgoing bedswap requests involving the student */
  bedswapRequests: BedswapRequest[];
  /** True when fetching or submitting roommate data */
  isLoading: boolean;
  /** Error message string if an action fails */
  errorMessage: string | null;

  /** Fetches existing lifestyle survey for student */
  fetchSurvey: (userId: string) => Promise<void>;
  /** Submits or updates lifestyle survey answers */
  submitSurvey: (params: SubmitSurveyParams) => Promise<void>;
  /** Calculates and loads top roommate matches */
  fetchCompatibilityMatches: (userId: string) => Promise<void>;
  /** Creates a new mutual bedswap request */
  createBedswapRequest: (params: CreateBedswapParams) => Promise<void>;
  /** Fetches all bedswap requests for student */
  fetchBedswapRequests: (userId: string) => Promise<void>;
  /** Responds to a bedswap request (accept/decline/cancel) */
  respondToBedswapRequest: (requestId: string, targetUserId: string, actionStatus: BedswapRequestStatus) => Promise<void>;
  /** Clears active store state (e.g. on logout) */
  resetStore: () => void;
}

/**
 * Zustand hook for global state management of roommate survey and bedswap operations.
 */
export const useRoommateStore = create<RoommateStoreState>((set) => ({
  survey: null,
  matches: [],
  bedswapRequests: [],
  isLoading: false,
  errorMessage: null,

  fetchSurvey: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const survey = await RoommateService.getSurvey(userId);
      set({ survey, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to fetch roommate survey.', isLoading: false });
    }
  },

  submitSurvey: async (params: SubmitSurveyParams) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const survey = await RoommateService.submitSurvey(params);
      set({ survey, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to submit roommate survey.', isLoading: false });
      throw error;
    }
  },

  fetchCompatibilityMatches: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const matches = await RoommateService.calculateCompatibilityMatches(userId);
      set({ matches, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to calculate compatibility matches.', isLoading: false });
    }
  },

  createBedswapRequest: async (params: CreateBedswapParams) => {
    set({ isLoading: true, errorMessage: null });
    try {
      await RoommateService.createBedswapRequest(params);
      const requests = await RoommateService.getBedswapRequests(params.applicantUserId);
      set({ bedswapRequests: requests, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to submit bedswap request.', isLoading: false });
      throw error;
    }
  },

  fetchBedswapRequests: async (userId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const bedswapRequests = await RoommateService.getBedswapRequests(userId);
      set({ bedswapRequests, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to fetch bedswap requests.', isLoading: false });
    }
  },

  respondToBedswapRequest: async (requestId: string, targetUserId: string, actionStatus: BedswapRequestStatus) => {
    set({ isLoading: true, errorMessage: null });
    try {
      await RoommateService.respondToBedswapRequest(requestId, targetUserId, actionStatus);
      const requests = await RoommateService.getBedswapRequests(targetUserId);
      set({ bedswapRequests: requests, isLoading: false });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to update bedswap request.', isLoading: false });
      throw error;
    }
  },

  resetStore: () => {
    set({ survey: null, matches: [], bedswapRequests: [], isLoading: false, errorMessage: null });
  }
}));
