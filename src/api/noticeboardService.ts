import { AuthService } from './authService';
import {
  NoticeboardAnnouncement,
  CreateAnnouncementParams,
  AnnouncementPriority,
  AnnouncementTargetAudience
} from '../types/noticeboard';

/**
 * Service class that manages all database interactions for the Hostel Noticeboard Broadcast System.
 * Enables Hall Wardens to post, view, pin, and delete official hostel announcements for students.
 */
export class NoticeboardService {
  /**
   * Initializes noticeboard announcements table schema if it does not already exist in the database.
   */
  public static async initializeSchema(): Promise<void> {
    const client = AuthService.getDbClient();
    await client.execute(`
      CREATE TABLE IF NOT EXISTS noticeboard_announcements (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        warden_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT CHECK(priority IN ('NORMAL', 'HIGH', 'URGENT')) DEFAULT 'NORMAL',
        target_audience TEXT CHECK(target_audience IN ('ALL_STUDENTS', 'FRESHERS_ONLY', 'FINALISTS_ONLY')) DEFAULT 'ALL_STUDENTS',
        is_pinned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Posts a new official announcement to the hostel noticeboard.
   * Validates title and body content before executing a SQL insert.
   *
   * @param params - Parameters required to broadcast an announcement.
   * @returns Newly created NoticeboardAnnouncement record.
   */
  public static async createAnnouncement(params: CreateAnnouncementParams): Promise<NoticeboardAnnouncement> {
    await NoticeboardService.initializeSchema();

    // Input validations for non-technical wardens
    if (!params.title || params.title.trim().length === 0) {
      throw new Error('Announcement title cannot be empty. Please enter a descriptive headline.');
    }

    if (!params.content || params.content.trim().length === 0) {
      throw new Error('Announcement body text cannot be empty. Please enter the full notice details.');
    }

    if (!params.hostelId || params.hostelId.trim().length === 0) {
      throw new Error('Hostel selection is required to broadcast an announcement.');
    }

    if (!params.wardenId || params.wardenId.trim().length === 0) {
      throw new Error('Warden authentication identity is required.');
    }

    const client = AuthService.getDbClient();
    const id = `announcement_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const priority: AnnouncementPriority = params.priority || 'NORMAL';
    const targetAudience: AnnouncementTargetAudience = params.targetAudience || 'ALL_STUDENTS';
    const isPinnedInt = params.isPinned ? 1 : 0;
    const createdAt = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO noticeboard_announcements (id, hostel_id, warden_id, title, content, priority, target_audience, is_pinned, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        params.hostelId,
        params.wardenId,
        params.title.trim(),
        params.content.trim(),
        priority,
        targetAudience,
        isPinnedInt,
        createdAt
      ]
    });

    // Fetch warden name and hostel name if available
    let wardenName = 'Hall Warden';
    let hostelName = 'Hostel Noticeboard';

    const userRes = await client.execute({
      sql: `SELECT full_name FROM users WHERE id = ?`,
      args: [params.wardenId]
    });
    if (userRes.rows.length > 0 && userRes.rows[0].full_name) {
      wardenName = String(userRes.rows[0].full_name);
    }

    const hostelRes = await client.execute({
      sql: `SELECT name FROM hostels WHERE id = ?`,
      args: [params.hostelId]
    });
    if (hostelRes.rows.length > 0 && hostelRes.rows[0].name) {
      hostelName = String(hostelRes.rows[0].name);
    }

    return {
      id,
      hostelId: params.hostelId,
      hostelName,
      wardenId: params.wardenId,
      wardenName,
      title: params.title.trim(),
      content: params.content.trim(),
      priority,
      targetAudience,
      isPinned: Boolean(params.isPinned),
      createdAt
    };
  }

  /**
   * Retrieves all announcements for a given hostel or warden, sorted by pinned state and creation date.
   *
   * @param hostelId - Optional hostel filter ID.
   * @param wardenId - Optional warden author filter ID.
   * @returns Array of NoticeboardAnnouncement objects.
   */
  public static async getAnnouncements(hostelId?: string, wardenId?: string): Promise<NoticeboardAnnouncement[]> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    let sql = `
      SELECT n.id, n.hostel_id, n.warden_id, n.title, n.content, n.priority, n.target_audience, n.is_pinned, n.created_at,
             u.full_name AS warden_name, h.name AS hostel_name
      FROM noticeboard_announcements n
      LEFT JOIN users u ON n.warden_id = u.id
      LEFT JOIN hostels h ON n.hostel_id = h.id
    `;
    const whereConditions: string[] = [];
    const args: any[] = [];

    if (hostelId) {
      whereConditions.push(`n.hostel_id = ?`);
      args.push(hostelId);
    }

    if (wardenId) {
      whereConditions.push(`n.warden_id = ?`);
      args.push(wardenId);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(' AND ');
    }

    sql += ` ORDER BY n.is_pinned DESC, n.created_at DESC`;

    const result = await client.execute({ sql, args });

    return result.rows.map((row) => ({
      id: String(row.id),
      hostelId: String(row.hostel_id),
      hostelName: row.hostel_name ? String(row.hostel_name) : 'General Hostel',
      wardenId: String(row.warden_id),
      wardenName: row.warden_name ? String(row.warden_name) : 'Hall Warden',
      title: String(row.title),
      content: String(row.content),
      priority: String(row.priority) as AnnouncementPriority,
      targetAudience: String(row.target_audience) as AnnouncementTargetAudience,
      isPinned: Boolean(row.is_pinned),
      createdAt: String(row.created_at)
    }));
  }

  /**
   * Toggles the pinned status of an announcement to keep important notices at the top of the feed.
   *
   * @param announcementId - Unique ID of notice.
   * @param isPinned - Boolean desired pin state.
   * @returns True if successful.
   */
  public static async togglePinAnnouncement(announcementId: string, isPinned: boolean): Promise<boolean> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `UPDATE noticeboard_announcements SET is_pinned = ? WHERE id = ?`,
      args: [isPinned ? 1 : 0, announcementId]
    });

    return result.rowsAffected > 0;
  }

  /**
   * Deletes an announcement from the hostel noticeboard database.
   *
   * @param announcementId - Unique ID of notice to remove.
   * @returns True if deleted successfully.
   */
  public static async deleteAnnouncement(announcementId: string): Promise<boolean> {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `DELETE FROM noticeboard_announcements WHERE id = ?`,
      args: [announcementId]
    });

    return result.rowsAffected > 0;
  }
}
