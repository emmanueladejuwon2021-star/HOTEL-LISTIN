import { create } from 'zustand';
import { NoticeboardService } from '../api/noticeboardService';
import {
  HostelNotice,
  CreateNoticeParams,
  NoticeFilterParams,
  AnnouncementCategory
} from '../types/noticeboard';

/**
 * Interface definition for Zustand Noticeboard State Store.
 */
interface NoticeboardState {
  notices: HostelNotice[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: AnnouncementCategory | 'ALL';
  currentHostelId: string;

  // Store actions
  fetchNotices: (filter?: NoticeFilterParams) => Promise<void>;
  createNotice: (params: CreateNoticeParams) => Promise<HostelNotice>;
  togglePinNotice: (noticeId: string, isPinned: boolean) => Promise<void>;
  deleteNotice: (noticeId: string) => Promise<void>;
  setSelectedCategory: (category: AnnouncementCategory | 'ALL') => void;
  setCurrentHostelId: (hostelId: string) => void;
  clearError: () => void;
}

/**
 * Zustand store for state management of Hostel Noticeboard & Warden Announcements.
 */
export const useNoticeboardStore = create<NoticeboardState>((set, get) => ({
  notices: [],
  isLoading: false,
  error: null,
  selectedCategory: 'ALL',
  currentHostelId: 'ALL_HOSTELS',

  /**
   * Fetches noticeboard announcements based on selected filters or current store state.
   */
  fetchNotices: async (filter?: NoticeFilterParams) => {
    set({ isLoading: true, error: null });
    try {
      const hostelId = filter?.hostelId || get().currentHostelId;
      const category = filter?.category || (get().selectedCategory !== 'ALL' ? (get().selectedCategory as AnnouncementCategory) : undefined);

      const notices = await NoticeboardService.getNotices({
        hostelId,
        category,
        priority: filter?.priority,
        isPinnedOnly: filter?.isPinnedOnly
      });

      set({ notices, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to fetch hostel noticeboard announcements.',
        isLoading: false
      });
    }
  },

  /**
   * Creates and broadcasts a new notice as a Hall Warden.
   */
  createNotice: async (params: CreateNoticeParams) => {
    set({ isLoading: true, error: null });
    try {
      const newNotice = await NoticeboardService.createNotice(params);
      await get().fetchNotices();
      set({ isLoading: false });
      return newNotice;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to publish announcement broadcast.',
        isLoading: false
      });
      throw err;
    }
  },

  /**
   * Toggles the pinned highlight state of a notice broadcast.
   */
  togglePinNotice: async (noticeId: string, isPinned: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await NoticeboardService.togglePinNotice(noticeId, isPinned);
      await get().fetchNotices();
      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to update notice pinned status.',
        isLoading: false
      });
    }
  },

  /**
   * Removes an announcement broadcast from the noticeboard.
   */
  deleteNotice: async (noticeId: string) => {
    set({ isLoading: true, error: null });
    try {
      await NoticeboardService.deleteNotice(noticeId);
      await get().fetchNotices();
      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to delete notice broadcast.',
        isLoading: false
      });
    }
  },

  /**
   * Sets the category filter for filtering noticeboard announcements.
   */
  setSelectedCategory: (category: AnnouncementCategory | 'ALL') => {
    set({ selectedCategory: category });
    get().fetchNotices();
  },

  /**
   * Sets the current active hostel ID for filtering announcements.
   */
  setCurrentHostelId: (hostelId: string) => {
    set({ currentHostelId: hostelId });
    get().fetchNotices();
  },

  /**
   * Clears any active store error messages.
   */
  clearError: () => set({ error: null })
}));
