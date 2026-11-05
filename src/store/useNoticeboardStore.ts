import { create } from 'zustand';
import { NoticeboardService } from '../api/noticeboardService';
import {
  NoticeboardAnnouncement,
  CreateAnnouncementParams
} from '../types/noticeboard';

/**
 * Interface defining Zustand store state and actions for Hostel Noticeboard Broadcast.
 */
interface NoticeboardState {
  announcements: NoticeboardAnnouncement[];
  isLoading: boolean;
  error: string | null;
  noticeMessage: string | null;

  fetchAnnouncements: (hostelId?: string, wardenId?: string) => Promise<void>;
  postAnnouncement: (params: CreateAnnouncementParams) => Promise<boolean>;
  togglePin: (announcementId: string, currentPinned: boolean, hostelId?: string, wardenId?: string) => Promise<boolean>;
  deleteAnnouncement: (announcementId: string, hostelId?: string, wardenId?: string) => Promise<boolean>;
  clearNoticeMessage: () => void;
  clearError: () => void;
}

/**
 * Zustand global store managing state and asynchronous operations for Hostel Noticeboard.
 */
export const useNoticeboardStore = create<NoticeboardState>((set, get) => ({
  announcements: [],
  isLoading: false,
  error: null,
  noticeMessage: null,

  fetchAnnouncements: async (hostelId?: string, wardenId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await NoticeboardService.getAnnouncements(hostelId, wardenId);
      set({ announcements: data, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Unable to fetch noticeboard announcements.',
        isLoading: false
      });
    }
  },

  postAnnouncement: async (params: CreateAnnouncementParams) => {
    set({ isLoading: true, error: null, noticeMessage: null });
    try {
      const newNotice = await NoticeboardService.createAnnouncement(params);
      set((state) => ({
        announcements: [newNotice, ...state.announcements],
        isLoading: false,
        noticeMessage: 'Announcement broadcasted successfully to student noticeboard!'
      }));
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to post announcement.',
        isLoading: false
      });
      return false;
    }
  },

  togglePin: async (announcementId: string, currentPinned: boolean, hostelId?: string, wardenId?: string) => {
    set({ isLoading: true, error: null, noticeMessage: null });
    try {
      await NoticeboardService.togglePinAnnouncement(announcementId, !currentPinned);
      await get().fetchAnnouncements(hostelId, wardenId);
      set({
        isLoading: false,
        noticeMessage: !currentPinned ? 'Announcement pinned to top of noticeboard.' : 'Announcement unpinned.'
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to update announcement pin status.',
        isLoading: false
      });
      return false;
    }
  },

  deleteAnnouncement: async (announcementId: string, hostelId?: string, wardenId?: string) => {
    set({ isLoading: true, error: null, noticeMessage: null });
    try {
      await NoticeboardService.deleteAnnouncement(announcementId);
      await get().fetchAnnouncements(hostelId, wardenId);
      set({
        isLoading: false,
        noticeMessage: 'Announcement deleted successfully from noticeboard.'
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to delete announcement.',
        isLoading: false
      });
      return false;
    }
  },

  clearNoticeMessage: () => set({ noticeMessage: null }),
  clearError: () => set({ error: null })
}));
