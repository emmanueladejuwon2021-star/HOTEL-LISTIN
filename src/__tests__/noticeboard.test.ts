import { NoticeboardService } from '../api/noticeboardService';
import { AuthService } from '../api/authService';

/**
 * Integration Test Suite for Hostel Noticeboard & Official Announcement Broadcast System [COMMUNITY-01].
 * Enforces Zero-Mock policy by executing live SQL operations against Turso libSQL SQLite database.
 */
describe('NoticeboardService - Official Hostel Noticeboard Engine [COMMUNITY-01]', () => {
  let wardenUserId: string;

  beforeAll(async () => {
    await NoticeboardService.initializeSchema();
    const client = AuthService.getDbClient();

    wardenUserId = `warden_test_${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, 'STAFF_WARDEN_01', 'Dr. A. O. Balogun', 'warden.balogun@unilag.edu.ng', '08012345678', 'WARDEN', 'MALE', 'hash')`,
      args: [wardenUserId]
    });
  });

  it('should create and retrieve a new warden notice broadcast', async () => {
    const notice = await NoticeboardService.createNotice({
      hostelId: 'hostel_jaja',
      authorWardenId: wardenUserId,
      title: 'Water Supply Maintenance Notice',
      content: 'Please be informed that water supply will be temporarily shut off tomorrow between 8am and 12pm.',
      priority: 'URGENT',
      category: 'MAINTENANCE',
      isPinned: true
    });

    expect(notice).toBeDefined();
    expect(notice.id).toContain('notice_');
    expect(notice.title).toBe('Water Supply Maintenance Notice');
    expect(notice.priority).toBe('URGENT');
    expect(notice.category).toBe('MAINTENANCE');
    expect(notice.isPinned).toBe(true);
    expect(notice.authorName).toBe('Dr. A. O. Balogun');
  });

  it('should filter notices by hostel ID and category', async () => {
    await NoticeboardService.createNotice({
      hostelId: 'hostel_moremi',
      authorWardenId: wardenUserId,
      title: 'Security Gate Curfew Hours',
      content: 'All residents must return to the hostel hall before 10:00 PM.',
      priority: 'IMPORTANT',
      category: 'SECURITY',
      isPinned: false
    });

    const hajaNotices = await NoticeboardService.getNotices({ hostelId: 'hostel_jaja' });
    expect(hajaNotices.some(n => n.title === 'Water Supply Maintenance Notice')).toBe(true);

    const securityNotices = await NoticeboardService.getNotices({ category: 'SECURITY' });
    expect(securityNotices.some(n => n.title === 'Security Gate Curfew Hours')).toBe(true);
  });

  it('should toggle pinned status of a notice broadcast', async () => {
    const notice = await NoticeboardService.createNotice({
      hostelId: 'ALL_HOSTELS',
      authorWardenId: wardenUserId,
      title: 'Hall Warden General Assembly',
      content: 'All hostel executive committee members are requested to attend a brief briefing in the warden room.',
      priority: 'GENERAL',
      category: 'EVENT',
      isPinned: false
    });

    expect(notice.isPinned).toBe(false);

    const updated = await NoticeboardService.togglePinNotice(notice.id, true);
    expect(updated.isPinned).toBe(true);
  });

  it('should delete a notice broadcast permanently', async () => {
    const notice = await NoticeboardService.createNotice({
      hostelId: 'ALL_HOSTELS',
      authorWardenId: wardenUserId,
      title: 'Outdated Announcement',
      content: 'This announcement is no longer relevant.',
      priority: 'GENERAL',
      category: 'GENERAL'
    });

    const deleted = await NoticeboardService.deleteNotice(notice.id);
    expect(deleted).toBe(true);

    await expect(NoticeboardService.getNoticeById(notice.id)).rejects.toThrow();
  });
});
