import { create } from 'zustand';
import {
  NoticeboardItem,
  CreateNoticeParams,
  NoticeFilterParams,
  NoticeCategory,
  NoticePriority,
} from '../types/noticeboard';
import { NoticeboardService } from '../api/noticeboardService';

interface NoticeboardState {
  announcements: NoticeboardItem[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  activeFilter: NoticeFilterParams;

  // Actions
  fetchAnnouncements: (filter?: NoticeFilterParams) => Promise<void>;
  createAnnouncement: (params: CreateNoticeParams) => Promise<NoticeboardItem>;
  togglePinAnnouncement: (id: string, isPinned: boolean) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  setFilter: (filter: NoticeFilterParams) => void;
  clearError: () => void;
}

export const useNoticeboardStore = create<NoticeboardState>((set, get) => ({
  announcements: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  activeFilter: {
    category: 'ALL',
    priority: 'ALL',
    searchQuery: '',
  },

  fetchAnnouncements: async (filter?: NoticeFilterParams) => {
    const currentFilter = filter || get().activeFilter;
    set({ isLoading: true, error: null, activeFilter: currentFilter });
    try {
      const announcements = await NoticeboardService.getAnnouncements(currentFilter);
      set({ announcements, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch announcements.', isLoading: false });
    }
  },

  createAnnouncement: async (params: CreateNoticeParams) => {
    set({ isSubmitting: true, error: null });
    try {
      const newNotice = await NoticeboardService.createAnnouncement(params);
      set({ isSubmitting: false });
      // Refresh announcements list after creation
      await get().fetchAnnouncements();
      return newNotice;
    } catch (err: any) {
      set({ error: err.message || 'Failed to broadcast announcement.', isSubmitting: false });
      throw err;
    }
  },

  togglePinAnnouncement: async (id: string, isPinned: boolean) => {
    set({ error: null });
    try {
      await NoticeboardService.togglePinAnnouncement(id, isPinned);
      await get().fetchAnnouncements();
    } catch (err: any) {
      set({ error: err.message || 'Failed to update pinned status.' });
    }
  },

  deleteAnnouncement: async (id: string) => {
    set({ error: null });
    try {
      await NoticeboardService.deleteAnnouncement(id);
      await get().fetchAnnouncements();
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete announcement.' });
    }
  },

  setFilter: (filter: NoticeFilterParams) => {
    const updatedFilter = { ...get().activeFilter, ...filter };
    set({ activeFilter: updatedFilter });
    get().fetchAnnouncements(updatedFilter);
  },

  clearError: () => set({ error: null }),
}));
