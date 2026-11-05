import { Client } from '@libsql/client';
import { AuthService } from './authService';
import {
  NoticeboardAnnouncement,
  CreateAnnouncementPayload,
  AnnouncementFilterOptions,
} from '../types/community';

/**
 * Service class managing Hostel Noticeboard Broadcasts & Warden Announcements.
 * Interfaces with Turso libSQL SQLite database following the static client singleton pattern.
 * Fulfills requirements for Issue #89 [COMMUNITY-04] and UAT-0089.
 */
export class CommunityService {
  /**
   * Helper method to get the active Turso libSQL database client instance from AuthService.
   */
  private static getClient(): Client {
    return AuthService.getDbClient();
  }

  /**
   * Ensures necessary database tables and indexes exist in Turso libSQL DB.
   */
  public static async initializeTables(): Promise<void> {
    const client = this.getClient();

    // Create hostel_announcements table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS hostel_announcements (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        hostel_name TEXT NOT NULL,
        warden_id TEXT NOT NULL REFERENCES users(id),
        warden_name TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT CHECK(category IN ('GENERAL', 'MAINTENANCE', 'SECURITY', 'UTILITIES', 'EVENTS', 'EMERGENCY')) NOT NULL DEFAULT 'GENERAL',
        priority TEXT CHECK(priority IN ('NORMAL', 'HIGH', 'URGENT')) NOT NULL DEFAULT 'NORMAL',
        is_pinned INTEGER DEFAULT 0,
        status TEXT CHECK(status IN ('ACTIVE', 'PINNED', 'ARCHIVED')) DEFAULT 'ACTIVE',
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    });

    // Create indexes for fast feed filtering by hostel, category, and pin status
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_announcements_hostel ON hostel_announcements(hostel_id);`,
      args: [],
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_announcements_category ON hostel_announcements(category);`,
      args: [],
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_announcements_status ON hostel_announcements(status);`,
      args: [],
    });
  }

  /**
   * Broadcasts a new official noticeboard announcement created by a Hall Warden.
   *
   * @param payload Noticeboard creation details including hostel, title, content, and category
   * @returns Newly created NoticeboardAnnouncement database record
   */
  public static async createAnnouncement(
    payload: CreateAnnouncementPayload
  ): Promise<NoticeboardAnnouncement> {
    await this.initializeTables();
    const client = this.getClient();

    // Input Validation Checks
    if (!payload.title || payload.title.trim().length < 3) {
      throw new Error('Announcement title must be at least 3 characters long.');
    }

    if (!payload.content || payload.content.trim().length < 10) {
      throw new Error('Announcement content must be at least 10 characters long.');
    }

    if (!payload.wardenId) {
      throw new Error('Warden ID is required to broadcast an announcement.');
    }

    if (!payload.hostelId) {
      throw new Error('Target hostel ID or ALL_HOSTELS is required.');
    }

    const id = `ANN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const priority = payload.priority || 'NORMAL';
    const isPinned = payload.isPinned ? 1 : 0;
    const status = payload.isPinned ? 'PINNED' : 'ACTIVE';
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    await client.execute({
      sql: `INSERT INTO hostel_announcements (
        id, hostel_id, hostel_name, warden_id, warden_name,
        title, content, category, priority, is_pinned,
        status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        payload.hostelId,
        payload.hostelName || 'All Hostels',
        payload.wardenId,
        payload.wardenName || 'Hall Warden',
        payload.title.trim(),
        payload.content.trim(),
        payload.category || 'GENERAL',
        priority,
        isPinned,
        status,
        payload.expiresAt || null,
        createdAt,
        updatedAt,
      ],
    });

    return {
      id,
      hostelId: payload.hostelId,
      hostelName: payload.hostelName || 'All Hostels',
      wardenId: payload.wardenId,
      wardenName: payload.wardenName || 'Hall Warden',
      title: payload.title.trim(),
      content: payload.content.trim(),
      category: payload.category || 'GENERAL',
      priority,
      isPinned: isPinned === 1,
      status,
      expiresAt: payload.expiresAt || null,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Retrieves the noticeboard feed for a given hostel or all hostels with optional filtering.
   * Pinned announcements appear first, followed by newest broadcasts.
   *
   * @param options Query filters like hostelId, category, and pinned status
   * @returns Array of NoticeboardAnnouncement records
   */
  public static async getAnnouncements(
    options: AnnouncementFilterOptions = {}
  ): Promise<NoticeboardAnnouncement[]> {
    await this.initializeTables();
    const client = this.getClient();

    let sql = `SELECT * FROM hostel_announcements WHERE 1=1`;
    const args: (string | number)[] = [];

    if (!options.includeArchived) {
      sql += ` AND status != 'ARCHIVED'`;
    }

    if (options.hostelId) {
      sql += ` AND (hostel_id = ? OR hostel_id = 'ALL_HOSTELS')`;
      args.push(options.hostelId);
    }

    if (options.category) {
      sql += ` AND category = ?`;
      args.push(options.category);
    }

    if (options.pinnedOnly) {
      sql += ` AND is_pinned = 1`;
    }

    // Order by pinned status descending, then created_at descending
    sql += ` ORDER BY is_pinned DESC, created_at DESC`;

    const result = await client.execute({ sql, args });

    return result.rows.map((row) => ({
      id: String(row.id),
      hostelId: String(row.hostel_id),
      hostelName: String(row.hostel_name),
      wardenId: String(row.warden_id),
      wardenName: String(row.warden_name),
      title: String(row.title),
      content: String(row.content),
      category: row.category as any,
      priority: row.priority as any,
      isPinned: Number(row.is_pinned) === 1,
      status: row.status as any,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  /**
   * Toggles the pinned status of a noticeboard announcement.
   *
   * @param announcementId Unique ID of the announcement
   * @param isPinned True to pin announcement to top, false to unpin
   */
  public static async togglePinStatus(
    announcementId: string,
    isPinned: boolean
  ): Promise<void> {
    await this.initializeTables();
    const client = this.getClient();

    const newStatus = isPinned ? 'PINNED' : 'ACTIVE';
    const updatedAt = new Date().toISOString();

    await client.execute({
      sql: `UPDATE hostel_announcements
            SET is_pinned = ?, status = ?, updated_at = ?
            WHERE id = ?`,
      args: [isPinned ? 1 : 0, newStatus, updatedAt, announcementId],
    });
  }

  /**
   * Archives an announcement so it no longer appears in active student noticeboards.
   *
   * @param announcementId Unique ID of the announcement to archive
   */
  public static async archiveAnnouncement(announcementId: string): Promise<void> {
    await this.initializeTables();
    const client = this.getClient();

    const updatedAt = new Date().toISOString();

    await client.execute({
      sql: `UPDATE hostel_announcements
            SET status = 'ARCHIVED', is_pinned = 0, updated_at = ?
            WHERE id = ?`,
      args: [updatedAt, announcementId],
    });
  }
}
