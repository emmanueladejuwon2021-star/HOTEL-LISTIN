/**
 * TypeScript interface definitions for the Hostel Noticeboard & Official Announcement Broadcast System.
 * Supports warden notice broadcasts, urgency priority tagging, category filtering,
 * pinned notice highlight controls, and student feed views.
 *
 * Written with plain, non-technical English comments for clarity.
 */

/**
 * Urgency priority levels for official hostel announcements:
 * - GENERAL: Standard information or routine update
 * - IMPORTANT: Notable news requiring attention
 * - URGENT: High-priority notice (e.g. water outage, curfew change)
 * - EMERGENCY: Critical immediate security/safety alert
 */
export type PriorityLevel = 'GENERAL' | 'IMPORTANT' | 'URGENT' | 'EMERGENCY';

/**
 * Functional category classification for hostel broadcasts:
 * - GENERAL: Basic hostel updates and community news
 * - MAINTENANCE: Utility schedules (water, electricity, repairs)
 * - SECURITY: Safety warnings, gate hours, curfew rules
 * - HEALTH: Sanitation, medical clearance, hygiene guidelines
 * - EVENT: Hall activities, sport competitions, warden meetings
 */
export type AnnouncementCategory = 'GENERAL' | 'MAINTENANCE' | 'SECURITY' | 'HEALTH' | 'EVENT';

/**
 * Interface representing an official hostel notice broadcast record.
 */
export interface HostelNotice {
  // Unique notice identification string
  id: string;
  // Specific hostel/hall ID this announcement applies to (or 'ALL_HOSTELS')
  hostelId: string;
  // User ID of the hall warden who authored and broadcasted the notice
  authorWardenId: string;
  // Full name of the publishing warden (e.g., "Dr. A. O. Balogun")
  authorName?: string;
  // Headline title of the announcement
  title: string;
  // Complete detailed body content of the announcement
  content: string;
  // Urgency classification priority tag
  priority: PriorityLevel;
  // Functional category classification tag
  category: AnnouncementCategory;
  // Flag indicating whether the notice is pinned to the top of the feed
  isPinned: boolean;
  // Optional expiry date string after which the notice is archived
  expiresAt?: string;
  // Exact timestamp when the notice was published
  createdAt: string;
  // Timestamp when the notice was last modified
  updatedAt?: string;
}

/**
 * Parameters submitted when a hall warden creates a new official announcement.
 */
export interface CreateNoticeParams {
  hostelId: string;
  authorWardenId: string;
  title: string;
  content: string;
  priority?: PriorityLevel;
  category?: AnnouncementCategory;
  isPinned?: boolean;
  expiresAt?: string;
}

/**
 * Filter parameters for querying noticeboard broadcasts.
 */
export interface NoticeFilterParams {
  hostelId?: string;
  category?: AnnouncementCategory;
  priority?: PriorityLevel;
  isPinnedOnly?: boolean;
}
