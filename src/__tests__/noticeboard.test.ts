import { NoticeboardService } from '../api/noticeboardService';
import { AuthService } from '../api/authService';

describe('NoticeboardService - Hostel Noticeboard Broadcast System [COMMUNITY-03 / UAT-0088]', () => {
  const testWardenId = 'warden_test_0088';
  const testHostelId = 'hostel_test_0088';

  beforeAll(async () => {
    const client = AuthService.getDbClient();
    await AuthService.initializeSchema();
    await NoticeboardService.initializeSchema();

    // Create test warden user record
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, 'STAFF_0088', 'Warden Dr. Mrs. Adeleke', 'warden0088@unilag.edu.ng', '08012345678', 'WARDEN', 'FEMALE', 'hash')`,
      args: [testWardenId]
    });

    // Create test hostel record
    await client.execute({
      sql: `INSERT OR REPLACE INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, 'Moremi Hall', 'FEMALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 500, 500)`,
      args: [testHostelId]
    });
  });

  afterEach(async () => {
    const client = AuthService.getDbClient();
    await client.execute({
      sql: `DELETE FROM noticeboard_announcements WHERE hostel_id = ?`,
      args: [testHostelId]
    });
  });

  test('[UAT-0088] should create and post a noticeboard announcement successfully', async () => {
    const notice = await NoticeboardService.createAnnouncement({
      hostelId: testHostelId,
      wardenId: testWardenId,
      title: 'Water Supply Maintenance Notice',
      content: 'Pipelined water restoration scheduled between 08:00 and 12:00.',
      priority: 'HIGH',
      targetAudience: 'ALL_STUDENTS',
      isPinned: true
    });

    expect(notice).toBeDefined();
    expect(notice.id).toContain('announcement_');
    expect(notice.title).toBe('Water Supply Maintenance Notice');
    expect(notice.priority).toBe('HIGH');
    expect(notice.isPinned).toBe(true);
    expect(notice.wardenName).toBe('Warden Dr. Mrs. Adeleke');
    expect(notice.hostelName).toBe('Moremi Hall');
  });

  test('should throw error when title or content is empty', async () => {
    await expect(
      NoticeboardService.createAnnouncement({
        hostelId: testHostelId,
        wardenId: testWardenId,
        title: '',
        content: 'Valid content body'
      })
    ).rejects.toThrow('Announcement title cannot be empty');

    await expect(
      NoticeboardService.createAnnouncement({
        hostelId: testHostelId,
        wardenId: testWardenId,
        title: 'Valid Title',
        content: ''
      })
    ).rejects.toThrow('Announcement body text cannot be empty');
  });

  test('should fetch posted announcements ordered by pinned state and date', async () => {
    await NoticeboardService.createAnnouncement({
      hostelId: testHostelId,
      wardenId: testWardenId,
      title: 'Normal Regular Announcement',
      content: 'Regular updates regarding hall activities.',
      priority: 'NORMAL',
      isPinned: false
    });

    await NoticeboardService.createAnnouncement({
      hostelId: testHostelId,
      wardenId: testWardenId,
      title: 'Pinned Urgent Announcement',
      content: 'Critical notice regarding security regulations.',
      priority: 'URGENT',
      isPinned: true
    });

    const list = await NoticeboardService.getAnnouncements(testHostelId);
    expect(list.length).toBe(2);
    expect(list[0].title).toBe('Pinned Urgent Announcement');
    expect(list[0].isPinned).toBe(true);
    expect(list[1].title).toBe('Normal Regular Announcement');
    expect(list[1].isPinned).toBe(false);
  });

  test('should toggle announcement pin status and delete announcement', async () => {
    const notice = await NoticeboardService.createAnnouncement({
      hostelId: testHostelId,
      wardenId: testWardenId,
      title: 'Temporary Notice',
      content: 'Will be deleted soon.',
      isPinned: false
    });

    const pinUpdated = await NoticeboardService.togglePinAnnouncement(notice.id, true);
    expect(pinUpdated).toBe(true);

    let list = await NoticeboardService.getAnnouncements(testHostelId);
    expect(list[0].isPinned).toBe(true);

    const deleted = await NoticeboardService.deleteAnnouncement(notice.id);
    expect(deleted).toBe(true);

    list = await NoticeboardService.getAnnouncements(testHostelId);
    expect(list.length).toBe(0);
  });
});
