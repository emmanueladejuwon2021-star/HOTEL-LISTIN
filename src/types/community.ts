/**
 * Data models and type definitions for the Hostel Noticeboard & Warden Announcement Broadcast System.
 * Aligned with UNILAG Hostel Management PRD standards and Issue #89 [COMMUNITY-04].
 */

/** Category classification for hostel announcements */
export type AnnouncementCategory =
  | 'GENERAL'
  | 'MAINTENANCE'
  | 'SECURITY'
  | 'UTILITIES'
  | 'EVENTS'
  | 'EMERGENCY';

/** Priority level of a noticeboard broadcast */
export type AnnouncementPriority = 'NORMAL' | 'HIGH' | 'URGENT';

/** Status lifecycle of an announcement */
export type AnnouncementStatus = 'ACTIVE' | 'PINNED' | 'ARCHIVED';

/**
 * Noticeboard Announcement Record stored in the database.
 */
export interface NoticeboardAnnouncement {
  /** Unique identifier for the noticeboard announcement */
  id: string;

  /** Target hostel ID where notice is broadcast, or 'ALL_HOSTELS' for campus-wide */
  hostelId: string;

  /** Name of target hostel or 'All Hostels' */
  hostelName: string;

  /** User ID of the Warden publishing the announcement */
  wardenId: string;

  /** Full name of the Warden issuing the notice */
  wardenName: string;

  /** Headline title of the announcement */
  title: string;

  /** Detailed body text content of the broadcast */
  content: string;

  /** Topic category of notice */
  category: AnnouncementCategory;

  /** Urgency priority level */
  priority: AnnouncementPriority;

  /** Indicates whether the notice is pinned to the top of the feed */
  isPinned: boolean;

  /** Current operational status of the notice */
  status: AnnouncementStatus;

  /** Optional expiration date timestamp string */
  expiresAt?: string | null;

  /** Timestamp string when announcement was posted */
  createdAt: string;

  /** Timestamp string when announcement was last updated */
  updatedAt: string;
}

/**
 * Payload interface for broadcasting a new noticeboard announcement.
 */
export interface CreateAnnouncementPayload {
  /** Target hostel ID, or 'ALL_HOSTELS' for campus-wide */
  hostelId: string;

  /** Name of target hostel or 'All Hostels' */
  hostelName: string;

  /** User ID of the Warden publishing the announcement */
  wardenId: string;

  /** Full name of the Warden issuing the notice */
  wardenName: string;

  /** Headline title of the announcement (min 3 characters) */
  title: string;

  /** Detailed body text content of the broadcast (min 10 characters) */
  content: string;

  /** Topic category of notice */
  category: AnnouncementCategory;

  /** Urgency priority level */
  priority?: AnnouncementPriority;

  /** Whether the notice should be pinned to the top of noticeboards */
  isPinned?: boolean;

  /** Optional expiration date in YYYY-MM-DD or ISO string format */
  expiresAt?: string;
}

/**
 * Query filter options for retrieving noticeboard feeds.
 */
export interface AnnouncementFilterOptions {
  /** Filter announcements for a specific hostel ID or ALL_HOSTELS */
  hostelId?: string;

  /** Filter by category */
  category?: AnnouncementCategory;

  /** Filter by pinned status */
  pinnedOnly?: boolean;

  /** Include archived posts if true */
  includeArchived?: boolean;
}
