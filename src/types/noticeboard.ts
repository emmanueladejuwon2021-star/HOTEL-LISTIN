/**
 * Defines TypeScript interfaces for Hostel Noticeboard Broadcast System.
 * Supports Wardens posting announcements to students across hostels.
 */

export type AnnouncementPriority = 'NORMAL' | 'HIGH' | 'URGENT';
export type AnnouncementTargetAudience = 'ALL_STUDENTS' | 'FRESHERS_ONLY' | 'FINALISTS_ONLY';

export interface NoticeboardAnnouncement {
  id: string;
  hostelId: string;
  hostelName?: string;
  wardenId: string;
  wardenName?: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementTargetAudience;
  isPinned: boolean;
  createdAt: string;
}

export interface CreateAnnouncementParams {
  hostelId: string;
  wardenId: string;
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  targetAudience?: AnnouncementTargetAudience;
  isPinned?: boolean;
}
