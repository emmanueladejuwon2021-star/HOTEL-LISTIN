import { NoticeboardService } from '../api/noticeboardService';
import { AuthService } from '../api/authService';
import { useNoticeboardStore } from '../store/useNoticeboardStore';

describe('Hostel Noticeboard Broadcast System - [COMMUNITY-01 to COMMUNITY-05 / UAT-0086 to UAT-0090]', () => {
  const testWardenId = `WARDEN-TEST-${Date.now()}`;

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await NoticeboardService.initializeSchema();

    const client = AuthService.getDbClient();
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, 'STAFF-WARDEN-001', 'Dr. Folake Warden', 'folake.warden@unilag.edu.ng', '08012345678', 'WARDEN', 'FEMALE', 'HASH123')`,
      args: [testWardenId],
    });
  });

  afterAll(async () => {
    const client = AuthService.getDbClient();
    await client.execute({
      sql: `DELETE FROM noticeboard_announcements WHERE author_id = ?`,
      args: [testWardenId],
    });
    await client.execute({
      sql: `DELETE FROM users WHERE id = ?`,
      args: [testWardenId],
    });
  });

  describe('[COMMUNITY-01 / UAT-0086] Broadcast Announcement Creation', () => {
    it('should create and broadcast an announcement successfully in Turso DB', async () => {
      const notice = await NoticeboardService.createAnnouncement({
        title: 'Water Maintenance Notice',
        content: 'Water supply will be restored by 5:00 PM today.',
        category: 'MAINTENANCE',
        priority: 'HIGH',
        authorId: testWardenId,
        authorName: 'Dr. Folake Warden',
        authorRole: 'WARDEN',
        isPinned: true,
      });

      expect(notice).toBeDefined();
      expect(notice.id).toContain('NOTICE-');
      expect(notice.title).toBe('Water Maintenance Notice');
      expect(notice.category).toBe('MAINTENANCE');
      expect(notice.priority).toBe('HIGH');
      expect(notice.isPinned).toBe(true);
    });

    it('should throw error when title or content is empty', async () => {
      await expect(
        NoticeboardService.createAnnouncement({
          title: '',
          content: 'Some content',
          category: 'GENERAL',
          priority: 'NORMAL',
          authorId: testWardenId,
          authorName: 'Dr. Folake Warden',
          authorRole: 'WARDEN',
        })
      ).rejects.toThrow('Announcement title is required');

      await expect(
        NoticeboardService.createAnnouncement({
          title: 'Valid Title',
          content: '   ',
          category: 'GENERAL',
          priority: 'NORMAL',
          authorId: testWardenId,
          authorName: 'Dr. Folake Warden',
          authorRole: 'WARDEN',
        })
      ).rejects.toThrow('Announcement content is required');
    });
  });

  describe('[COMMUNITY-02 / UAT-0087] Announcement Retrieval & Priority Sorting', () => {
    it('should retrieve announcements with pinned notices appearing first', async () => {
      // Create unpinned notice
      await NoticeboardService.createAnnouncement({
        title: 'Regular Event Notice',
        content: 'Hostel dinner party on Friday.',
        category: 'EVENT',
        priority: 'LOW',
        authorId: testWardenId,
        authorName: 'Dr. Folake Warden',
        authorRole: 'WARDEN',
        isPinned: false,
      });

      const announcements = await NoticeboardService.getAnnouncements();
      expect(announcements.length).toBeGreaterThanOrEqual(2);
      expect(announcements[0].isPinned).toBe(true);
    });
  });

  describe('[COMMUNITY-03 / UAT-0088] Filtering Announcements by Category and Priority', () => {
    it('should filter announcements by category', async () => {
      const maintenanceNotices = await NoticeboardService.getAnnouncements({
        category: 'MAINTENANCE',
      });

      expect(maintenanceNotices.every((n) => n.category === 'MAINTENANCE')).toBe(true);
    });

    it('should filter announcements by search query keyword', async () => {
      const searchResults = await NoticeboardService.getAnnouncements({
        searchQuery: 'dinner party',
      });

      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults[0].content).toContain('dinner party');
    });
  });

  describe('[COMMUNITY-04 / UAT-0089] Pinning & Deleting Announcements', () => {
    it('should toggle pinned status of an announcement', async () => {
      const notices = await NoticeboardService.getAnnouncements();
      const targetNotice = notices[0];

      const success = await NoticeboardService.togglePinAnnouncement(
        targetNotice.id,
        !targetNotice.isPinned
      );
      expect(success).toBe(true);
    });

    it('should delete an announcement permanently from database', async () => {
      const created = await NoticeboardService.createAnnouncement({
        title: 'Temporary Notice To Delete',
        content: 'This will be deleted.',
        category: 'GENERAL',
        priority: 'LOW',
        authorId: testWardenId,
        authorName: 'Dr. Folake Warden',
        authorRole: 'WARDEN',
      });

      const deleteSuccess = await NoticeboardService.deleteAnnouncement(created.id);
      expect(deleteSuccess).toBe(true);

      const allNotices = await NoticeboardService.getAnnouncements();
      expect(allNotices.some((n) => n.id === created.id)).toBe(false);
    });
  });

  describe('[COMMUNITY-05 / UAT-0090] Zustand Store Operations', () => {
    it('should execute fetchAnnouncements and createAnnouncement via Zustand store', async () => {
      const store = useNoticeboardStore.getState();

      await store.fetchAnnouncements();
      const initialCount = useNoticeboardStore.getState().announcements.length;

      await store.createAnnouncement({
        title: 'Zustand Store Test Notice',
        content: 'Testing store integration.',
        category: 'SECURITY',
        priority: 'URGENT',
        authorId: testWardenId,
        authorName: 'Dr. Folake Warden',
        authorRole: 'WARDEN',
      });

      const updatedCount = useNoticeboardStore.getState().announcements.length;
      expect(updatedCount).toBe(initialCount + 1);
    });
  });
});
