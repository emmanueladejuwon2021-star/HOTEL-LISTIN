/**
 * Types and interfaces for the Hostel Noticeboard & Broadcast System.
 * Defines the models for announcements, creation requests, filter parameters,
 * priority levels, and category classifications.
 */

export type NoticePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NoticeCategory = 'GENERAL' | 'MAINTENANCE' | 'SECURITY' | 'EVENT' | 'ACADEMIC' | 'EMERGENCY';

export interface NoticeboardItem {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  priority: NoticePriority;
  targetHostelId?: string | null; // Null or empty string means broadcast to all hostels
  authorId: string;
  authorName: string;
  authorRole: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoticeParams {
  title: string;
  content: string;
  category: NoticeCategory;
  priority: NoticePriority;
  targetHostelId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  isPinned?: boolean;
}

export interface NoticeFilterParams {
  category?: NoticeCategory | 'ALL';
  priority?: NoticePriority | 'ALL';
  targetHostelId?: string | null;
  searchQuery?: string;
}
