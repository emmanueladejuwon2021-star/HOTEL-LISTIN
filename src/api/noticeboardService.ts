import { Client } from '@libsql/client';
import { AuthService } from './authService';
import {
  NoticeboardItem,
  CreateNoticeParams,
  NoticeFilterParams,
} from '../types/noticeboard';

/**
 * Database and business logic service for the Hostel Noticeboard Broadcast System.
 * Connects directly to the Turso libSQL Edge SQLite database.
 * Enforces zero-mock operations and guarantees foreign key integrity and strict query execution.
 */
export class NoticeboardService {
  private static db: Client | null = null;

  /**
   * Retrieves or initializes the database client using AuthService static client.
   *
   * @returns Active libSQL client ready for database queries
   */
  public static getDbClient(): Client {
    if (!NoticeboardService.db) {
      NoticeboardService.db = AuthService.getDbClient();
    }
    return NoticeboardService.db;
  }

  /**
   * Initializes the noticeboard_announcements database table schema with indexes if not present.
   */
  public static async initializeSchema(): Promise<void> {
    const client = NoticeboardService.getDbClient();

    await client.batch([
      `CREATE TABLE IF NOT EXISTS noticeboard_announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT CHECK(category IN ('GENERAL', 'MAINTENANCE', 'SECURITY', 'EVENT', 'ACADEMIC', 'EMERGENCY')) NOT NULL DEFAULT 'GENERAL',
        priority TEXT CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')) NOT NULL DEFAULT 'NORMAL',
        target_hostel_id TEXT,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT NOT NULL DEFAULT 'WARDEN',
        is_pinned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS idx_noticeboard_pinned ON noticeboard_announcements(is_pinned DESC, created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_noticeboard_target ON noticeboard_announcements(target_hostel_id);`
    ], 'write');
  }

  /**
   * Creates and broadcasts a new hostel announcement card.
   *
   * @param params Details of the announcement being published by Warden or Administrator
   * @returns Newly created NoticeboardItem object from Turso DB
   */
  public static async createAnnouncement(params: CreateNoticeParams): Promise<NoticeboardItem> {
    await NoticeboardService.initializeSchema();
    const client = NoticeboardService.getDbClient();

    if (!params.title || params.title.trim().length === 0) {
      throw new Error('Announcement title is required and cannot be empty.');
    }

    if (!params.content || params.content.trim().length === 0) {
      throw new Error('Announcement content is required and cannot be empty.');
    }

    if (!params.authorId) {
      throw new Error('Author ID is required to broadcast an announcement.');
    }

    const id = `NOTICE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const isPinnedInt = params.isPinned ? 1 : 0;
    const targetHostel = params.targetHostelId || null;
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO noticeboard_announcements (
              id, title, content, category, priority, target_hostel_id, author_id, author_name, author_role, is_pinned, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        params.title.trim(),
        params.content.trim(),
        params.category,
        params.priority,
        targetHostel,
        params.authorId,
        params.authorName,
        params.authorRole,
        isPinnedInt,
        now,
        now,
      ],
    });

    return {
      id,
      title: params.title.trim(),
      content: params.content.trim(),
      category: params.category,
      priority: params.priority,
      targetHostelId: targetHostel,
      authorId: params.authorId,
      authorName: params.authorName,
      authorRole: params.authorRole,
      isPinned: !!params.isPinned,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Fetches published announcements feed from Turso DB based on filtering criteria.
   * Pinned announcements always appear first, followed by newest created announcements.
   *
   * @param filter Filter criteria for categories, priority, hostel target, or search keywords
   * @returns List of NoticeboardItem objects
   */
  public static async getAnnouncements(filter?: NoticeFilterParams): Promise<NoticeboardItem[]> {
    await NoticeboardService.initializeSchema();
    const client = NoticeboardService.getDbClient();

    let sql = `SELECT id, title, content, category, priority, target_hostel_id, author_id, author_name, author_role, is_pinned, created_at, updated_at
               FROM noticeboard_announcements WHERE 1=1`;
    const args: any[] = [];

    if (filter) {
      if (filter.category && filter.category !== 'ALL') {
        sql += ` AND category = ?`;
        args.push(filter.category);
      }

      if (filter.priority && filter.priority !== 'ALL') {
        sql += ` AND priority = ?`;
        args.push(filter.priority);
      }

      if (filter.targetHostelId !== undefined) {
        if (filter.targetHostelId === null || filter.targetHostelId === '') {
          sql += ` AND (target_hostel_id IS NULL OR target_hostel_id = '')`;
        } else {
          sql += ` AND (target_hostel_id IS NULL OR target_hostel_id = '' OR target_hostel_id = ?)`;
          args.push(filter.targetHostelId);
        }
      }

      if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
        sql += ` AND (title LIKE ? OR content LIKE ? OR author_name LIKE ?)`;
        const term = `%${filter.searchQuery.trim()}%`;
        args.push(term, term, term);
      }
    }

    sql += ` ORDER BY is_pinned DESC, created_at DESC`;

    const result = await client.execute({ sql, args });

    return result.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      content: String(row.content),
      category: row.category as any,
      priority: row.priority as any,
      targetHostelId: row.target_hostel_id ? String(row.target_hostel_id) : null,
      authorId: String(row.author_id),
      authorName: String(row.author_name),
      authorRole: String(row.author_role),
      isPinned: Number(row.is_pinned) === 1,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  /**
   * Toggles the pinned status of an announcement (pins or unpins it).
   *
   * @param id ID of the announcement
   * @param isPinned True to pin announcement to top, false to unpin
   * @returns Updated NoticeboardItem
   */
  public static async togglePinAnnouncement(id: string, isPinned: boolean): Promise<boolean> {
    await NoticeboardService.initializeSchema();
    const client = NoticeboardService.getDbClient();
    const now = new Date().toISOString();

    const result = await client.execute({
      sql: `UPDATE noticeboard_announcements SET is_pinned = ?, updated_at = ? WHERE id = ?`,
      args: [isPinned ? 1 : 0, now, id],
    });

    return result.rowsAffected > 0;
  }

  /**
   * Deletes an announcement permanently from Turso DB.
   *
   * @param id ID of the announcement to delete
   * @returns True if deletion succeeded, false otherwise
   */
  public static async deleteAnnouncement(id: string): Promise<boolean> {
    await NoticeboardService.initializeSchema();
    const client = NoticeboardService.getDbClient();

    const result = await client.execute({
      sql: `DELETE FROM noticeboard_announcements WHERE id = ?`,
      args: [id],
    });

    return result.rowsAffected > 0;
  }
}
