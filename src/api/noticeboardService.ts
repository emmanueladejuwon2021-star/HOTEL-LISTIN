import { AuthService } from './authService';
import {
  HostelNotice,
  CreateNoticeParams,
  NoticeFilterParams,
  PriorityLevel,
  AnnouncementCategory
} from '../types/noticeboard';

/**
 * Service class for managing the Hostel Noticeboard & Official Announcement Broadcast System.
 * Handles database creation, notice publishing by Wardens, notice retrieval by students/staff,
 * pinning important notices, and deleting outdated announcements.
 *
 * Adheres strictly to Zero-Mock principles by executing live SQL operations against Turso libSQL.
 * Written with detailed, jargon-free English comments for non-technical team members.
 */
export class NoticeboardService {
  /**
   * Initializes database table schema and indexes for hostel noticeboard broadcasts.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Create hostel_notices table for official warden announcements
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS hostel_notices (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        author_warden_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT CHECK(priority IN ('GENERAL', 'IMPORTANT', 'URGENT', 'EMERGENCY')) DEFAULT 'GENERAL',
        category TEXT CHECK(category IN ('GENERAL', 'MAINTENANCE', 'SECURITY', 'HEALTH', 'EVENT')) DEFAULT 'GENERAL',
        is_pinned INTEGER DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_warden_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Indexes for high-speed queries by hostel, priority, category, and pin status
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_notices_hostel ON hostel_notices(hostel_id)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_notices_pinned ON hostel_notices(is_pinned)`,
      args: []
    });

    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_notices_created ON hostel_notices(created_at)`,
      args: []
    });
  }

  /**
   * Helper method to convert raw Turso DB row objects into strongly-typed HostelNotice models.
   */
  private static mapRowToNotice(row: any): HostelNotice {
    return {
      id: String(row.id),
      hostelId: String(row.hostel_id),
      authorWardenId: String(row.author_warden_id),
      authorName: row.author_name ? String(row.author_name) : undefined,
      title: String(row.title),
      content: String(row.content),
      priority: (row.priority ? String(row.priority) : 'GENERAL') as PriorityLevel,
      category: (row.category ? String(row.category) : 'GENERAL') as AnnouncementCategory,
      isPinned: Boolean(row.is_pinned),
      expiresAt: row.expires_at ? String(row.expires_at) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined
    };
  }

  /**
   * Publishes a new official notice broadcast from a Hall Warden to the hostel noticeboard.
   *
   * @param params Details of the notice to publish
   * @returns Newly created HostelNotice object
   */
  public static async createNotice(params: CreateNoticeParams): Promise<HostelNotice> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.title || !params.title.trim()) {
      throw new Error('Notice headline title is required.');
    }
    if (!params.content || !params.content.trim()) {
      throw new Error('Notice content body cannot be empty.');
    }
    if (!params.authorWardenId || !params.authorWardenId.trim()) {
      throw new Error('Author warden user ID is required.');
    }

    const noticeId = `notice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hostelId = params.hostelId?.trim() || 'ALL_HOSTELS';
    const priority = params.priority || 'GENERAL';
    const category = params.category || 'GENERAL';
    const isPinned = params.isPinned ? 1 : 0;
    const expiresAt = params.expiresAt?.trim() || null;
    const nowIso = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO hostel_notices (
        id, hostel_id, author_warden_id, title, content, priority, category, is_pinned, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        noticeId,
        hostelId,
        params.authorWardenId.trim(),
        params.title.trim(),
        params.content.trim(),
        priority,
        category,
        isPinned,
        expiresAt
      ]
    });

    return await NoticeboardService.getNoticeById(noticeId);
  }

  /**
   * Retrieves a single notice broadcast by its unique ID.
   *
   * @param noticeId Unique notice ID
   * @returns HostelNotice model
   */
  public static async getNoticeById(noticeId: string): Promise<HostelNotice> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT hn.*, u.full_name as author_name
            FROM hostel_notices hn
            LEFT JOIN users u ON hn.author_warden_id = u.id
            WHERE hn.id = ?`,
      args: [noticeId.trim()]
    });

    if (result.rows.length === 0) {
      throw new Error(`Hostel notice record not found for ID: ${noticeId}`);
    }

    return NoticeboardService.mapRowToNotice(result.rows[0]);
  }

  /**
   * Fetches noticeboard broadcasts filtered by hostel ID and optional category/priority criteria.
   * Pinned notices are sorted to appear first, followed by newest published announcements.
   *
   * @param filter Filter criteria (hostelId, category, priority, etc.)
   * @returns List of active HostelNotice broadcasts
   */
  public static async getNotices(filter: NoticeFilterParams = {}): Promise<HostelNotice[]> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `SELECT hn.*, u.full_name as author_name
               FROM hostel_notices hn
               LEFT JOIN users u ON hn.author_warden_id = u.id
               WHERE 1=1`;
    const args: any[] = [];

    if (filter.hostelId && filter.hostelId !== 'ALL_HOSTELS') {
      sql += ` AND (hn.hostel_id = ? OR hn.hostel_id = 'ALL_HOSTELS')`;
      args.push(filter.hostelId.trim());
    }

    if (filter.category) {
      sql += ` AND hn.category = ?`;
      args.push(filter.category);
    }

    if (filter.priority) {
      sql += ` AND hn.priority = ?`;
      args.push(filter.priority);
    }

    if (filter.isPinnedOnly) {
      sql += ` AND hn.is_pinned = 1`;
    }

    // Always sort pinned notices to the top, then newest first
    sql += ` ORDER BY hn.is_pinned DESC, hn.created_at DESC`;

    const result = await client.execute({ sql, args });
    return result.rows.map(row => NoticeboardService.mapRowToNotice(row));
  }

  /**
   * Toggles the pinned highlight status of a notice broadcast.
   *
   * @param noticeId Notice ID
   * @param isPinned True to pin notice to top, false to unpin
   * @returns Updated HostelNotice
   */
  public static async togglePinNotice(noticeId: string, isPinned: boolean): Promise<HostelNotice> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `UPDATE hostel_notices
            SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [isPinned ? 1 : 0, noticeId.trim()]
    });

    if (result.rowsAffected === 0) {
      throw new Error(`Unable to update pin status. Notice ID '${noticeId}' not found.`);
    }

    return await NoticeboardService.getNoticeById(noticeId);
  }

  /**
   * Permanently deletes an announcement broadcast from the noticeboard.
   *
   * @param noticeId Notice ID to delete
   * @returns True if successfully removed
   */
  public static async deleteNotice(noticeId: string): Promise<boolean> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `DELETE FROM hostel_notices WHERE id = ?`,
      args: [noticeId.trim()]
    });

    return result.rowsAffected > 0;
  }
}
