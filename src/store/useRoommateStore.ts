import { create } from 'zustand';
import { RoommateService } from '../api/roommateService';
import { RoommateSurvey, RoommateMatch, BedswapRequest } from '../types/roommate';

interface RoommateState {
  survey: RoommateSurvey | null;
  matches: RoommateMatch[];
  bedswapRequests: BedswapRequest[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSurvey: (userId: string) => Promise<void>;
  saveSurvey: (survey: RoommateSurvey) => Promise<void>;
  fetchMatches: (userId: string) => Promise<void>;
  fetchBedswapRequests: (userId: string) => Promise<void>;
  createBedswapRequest: (requesterId: string, targetStudentId: string, reason: string) => Promise<void>;
  respondToBedswapRequest: (requestId: string, partnerId: string, accept: boolean) => Promise<void>;
  clearError: () => void;
}

export const useRoommateStore = create<RoommateState>((set, get) => ({
  survey: null,
  matches: [],
  bedswapRequests: [],
  isLoading: false,
  error: null,

  fetchSurvey: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const survey = await RoommateService.getSurvey(userId);
      set({ survey, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch roommate survey.', isLoading: false });
    }
  },

  saveSurvey: async (surveyData: RoommateSurvey) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await RoommateService.saveSurvey(surveyData);
      set({ survey: updated, isLoading: false });
      // Refresh matches after updating survey
      await get().fetchMatches(surveyData.userId);
    } catch (err: any) {
      set({ error: err.message || 'Failed to save roommate survey.', isLoading: false });
    }
  },

  fetchMatches: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const matches = await RoommateService.getMatches(userId);
      set({ matches, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch roommate matches.', isLoading: false });
    }
  },

  fetchBedswapRequests: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const bedswapRequests = await RoommateService.getUserBedswapRequests(userId);
      set({ bedswapRequests, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch bedswap requests.', isLoading: false });
    }
  },

  createBedswapRequest: async (requesterId: string, targetStudentId: string, reason: string) => {
    set({ isLoading: true, error: null });
    try {
      await RoommateService.createBedswapRequest(requesterId, targetStudentId, reason);
      await get().fetchBedswapRequests(requesterId);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to create bedswap request.', isLoading: false });
    }
  },

  respondToBedswapRequest: async (requestId: string, partnerId: string, accept: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await RoommateService.respondToBedswapRequest(requestId, partnerId, accept);
      await get().fetchBedswapRequests(partnerId);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to respond to bedswap request.', isLoading: false });
    }
  },

  clearError: () => set({ error: null })
}));
