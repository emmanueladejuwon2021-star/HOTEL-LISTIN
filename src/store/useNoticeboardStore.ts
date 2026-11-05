import { create } from 'zustand';
import {
  NoticeboardAnnouncement,
  CreateAnnouncementPayload,
  AnnouncementFilterOptions,
  AnnouncementCategory,
} from '../types/community';
import { CommunityService } from '../api/communityService';

/**
 * Interface defining Zustand noticeboard state variables and async actions.
 */
export interface NoticeboardState {
  /** Array of noticeboard announcements retrieved from DB */
  announcements: NoticeboardAnnouncement[];

  /** Loading indicator flag for async operations */
  isLoading: boolean;

  /** Submitting indicator flag during announcement creation */
  isSubmitting: boolean;

  /** Error alert message string displayed when an action fails */
  errorMessage: string | null;

  /** Success notification message string displayed when an action succeeds */
  successMessage: string | null;

  /** Currently selected category filter */
  selectedCategory: AnnouncementCategory | 'ALL';

  /**
   * Fetches announcements for a hostel or all hostels.
   */
  fetchAnnouncements: (options?: AnnouncementFilterOptions) => Promise<void>;

  /**
   * Broadcasts a new noticeboard announcement created by a Warden.
   */
  createAnnouncement: (payload: CreateAnnouncementPayload) => Promise<boolean>;

  /**
   * Toggles the pin status of an announcement.
   */
  togglePin: (announcementId: string, isPinned: boolean) => Promise<void>;

  /**
   * Archives an announcement so it no longer appears in feeds.
   */
  archiveAnnouncement: (announcementId: string) => Promise<void>;

  /**
   * Sets the category filter for filtering announcements.
   */
  setSelectedCategory: (category: AnnouncementCategory | 'ALL') => void;

  /**
   * Clears error and success notification message banners.
   */
  clearMessages: () => void;
}

/**
 * Zustand state management store for the Hostel Noticeboard & Announcement Broadcast System.
 */
export const useNoticeboardStore = create<NoticeboardState>((set, get) => ({
  announcements: [],
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,
  successMessage: null,
  selectedCategory: 'ALL',

  fetchAnnouncements: async (options: AnnouncementFilterOptions = {}) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const activeCategory = get().selectedCategory;
      const categoryFilter = activeCategory === 'ALL' ? undefined : activeCategory;

      const data = await CommunityService.getAnnouncements({
        ...options,
        category: options.category || categoryFilter,
      });

      set({ announcements: data, isLoading: false });
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to load hostel noticeboard announcements.',
        isLoading: false,
      });
    }
  },

  createAnnouncement: async (payload: CreateAnnouncementPayload) => {
    set({ isSubmitting: true, errorMessage: null, successMessage: null });
    try {
      const newNotice = await CommunityService.createAnnouncement(payload);

      // Re-fetch announcements feed to update list reactively
      await get().fetchAnnouncements({ hostelId: payload.hostelId });

      set({
        isSubmitting: false,
        successMessage: `Broadcast "${newNotice.title}" published successfully to hostel noticeboard!`,
      });
      return true;
    } catch (error: any) {
      set({
        errorMessage: error.message || 'Failed to publish noticeboard broadcast.',
        isSubmitting: false,
      });
      return false;
    }
  },

  togglePin: async (announcementId: string, isPinned: boolean) => {
    try {
      await CommunityService.togglePinStatus(announcementId, isPinned);
      // Refresh feed
      await get().fetchAnnouncements();
      set({
        successMessage: isPinned ? 'Notice pinned to top of noticeboard.' : 'Notice unpinned.',
      });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to update pin status.' });
    }
  },

  archiveAnnouncement: async (announcementId: string) => {
    try {
      await CommunityService.archiveAnnouncement(announcementId);
      // Refresh feed
      await get().fetchAnnouncements();
      set({ successMessage: 'Noticeboard announcement archived successfully.' });
    } catch (error: any) {
      set({ errorMessage: error.message || 'Failed to archive announcement.' });
    }
  },

  setSelectedCategory: (category) => {
    set({ selectedCategory: category });
    get().fetchAnnouncements();
  },

  clearMessages: () => set({ errorMessage: null, successMessage: null }),
}));
