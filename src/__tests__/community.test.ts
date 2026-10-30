import { CommunityService } from '../api/communityService';
import { useNoticeboardStore } from '../store/useNoticeboardStore';

import { AuthService } from '../api/authService';

describe('Hostel Noticeboard Broadcast System - [COMMUNITY-04 / UAT-0089]', () => {
  const testWardenId = `usr_warden_comm_${Date.now()}`;

  beforeAll(async () => {
    const client = AuthService.getDbClient();
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Dr. O. A. Adebayo', ?, 'hashed_pass_123', '08012345678', 'WARDEN', 'MALE', 1)`,
      args: [testWardenId, `STAFF_${Date.now()}`, `warden_comm_${Date.now()}@unilag.edu.ng`],
    });
  });

  beforeEach(async () => {
    // Reset Zustand store state before each test run
    useNoticeboardStore.setState({
      announcements: [],
      isLoading: false,
      isSubmitting: false,
      errorMessage: null,
      successMessage: null,
      selectedCategory: 'ALL',
    });

    // Initialize database tables
    await CommunityService.initializeTables();
  });

  describe('CommunityService Database Layer', () => {
    it('should create an announcement broadcast record in Turso DB', async () => {
      const payload = {
        hostelId: 'JAJA_HALL',
        hostelName: 'King Jaja Hall',
        wardenId: testWardenId,
        wardenName: 'Dr. O. A. Adebayo',
        title: 'Water Supply Maintenance Notice',
        content: 'Please note that water pump maintenance will occur tomorrow between 8:00 AM and 12:00 PM.',
        category: 'UTILITIES' as const,
        priority: 'HIGH' as const,
        isPinned: true,
      };

      const announcement = await CommunityService.createAnnouncement(payload);

      expect(announcement.id).toBeDefined();
      expect(announcement.title).toBe(payload.title);
      expect(announcement.hostelId).toBe('JAJA_HALL');
      expect(announcement.category).toBe('UTILITIES');
      expect(announcement.priority).toBe('HIGH');
      expect(announcement.isPinned).toBe(true);
      expect(announcement.status).toBe('PINNED');
    });

    it('should reject announcement creation if title is too short', async () => {
      await expect(
        CommunityService.createAnnouncement({
          hostelId: 'ALL_HOSTELS',
          hostelName: 'All Hostels',
          wardenId: testWardenId,
          wardenName: 'Hall Warden',
          title: 'Hi',
          content: 'Valid content body text long enough.',
          category: 'GENERAL',
        })
      ).rejects.toThrow('Announcement title must be at least 3 characters long.');
    });

    it('should reject announcement creation if content is too short', async () => {
      await expect(
        CommunityService.createAnnouncement({
          hostelId: 'ALL_HOSTELS',
          hostelName: 'All Hostels',
          wardenId: testWardenId,
          wardenName: 'Hall Warden',
          title: 'Valid Notice Title',
          content: 'Short',
          category: 'GENERAL',
        })
      ).rejects.toThrow('Announcement content must be at least 10 characters long.');
    });

    it('should fetch announcements with pinned items first', async () => {
      // Create regular notice
      await CommunityService.createAnnouncement({
        hostelId: 'JAJA_HALL',
        hostelName: 'King Jaja Hall',
        wardenId: testWardenId,
        wardenName: 'Hall Warden',
        title: 'Regular Notice 1',
        content: 'This is a standard unpinned announcement text.',
        category: 'GENERAL',
        isPinned: false,
      });

      // Create pinned notice
      await CommunityService.createAnnouncement({
        hostelId: 'JAJA_HALL',
        hostelName: 'King Jaja Hall',
        wardenId: testWardenId,
        wardenName: 'Hall Warden',
        title: 'Pinned Urgent Notice',
        content: 'This is an urgent pinned notice for all residents.',
        category: 'EMERGENCY',
        priority: 'URGENT',
        isPinned: true,
      });

      const list = await CommunityService.getAnnouncements({ hostelId: 'JAJA_HALL' });

      expect(list.length).toBeGreaterThanOrEqual(2);
      // Pinned notice must be first
      expect(list[0].isPinned).toBe(true);
      expect(list[0].title).toBe('Pinned Urgent Notice');
    });

    it('should toggle announcement pin status', async () => {
      const newNotice = await CommunityService.createAnnouncement({
        hostelId: 'MOREMI_HALL',
        hostelName: 'Moremi Hall',
        wardenId: testWardenId,
        wardenName: 'Prof. Mrs. Ogunleye',
        title: 'Curfew Timing Reminder',
        content: 'Students are reminded that main gates lock at 22:30 daily.',
        category: 'SECURITY',
        isPinned: false,
      });

      await CommunityService.togglePinStatus(newNotice.id, true);

      const updatedFeed = await CommunityService.getAnnouncements({ hostelId: 'MOREMI_HALL' });
      const found = updatedFeed.find((a) => a.id === newNotice.id);

      expect(found).toBeDefined();
      expect(found?.isPinned).toBe(true);
      expect(found?.status).toBe('PINNED');
    });

    it('should archive announcement and remove it from active feed', async () => {
      const notice = await CommunityService.createAnnouncement({
        hostelId: 'JAJA_HALL',
        hostelName: 'King Jaja Hall',
        wardenId: testWardenId,
        wardenName: 'Hall Warden',
        title: 'Old Event Notice',
        content: 'This event has passed and needs archiving.',
        category: 'EVENTS',
      });

      await CommunityService.archiveAnnouncement(notice.id);

      const activeFeed = await CommunityService.getAnnouncements({ hostelId: 'JAJA_HALL' });
      const inActive = activeFeed.find((a) => a.id === notice.id);
      expect(inActive).toBeUndefined();

      const archivedFeed = await CommunityService.getAnnouncements({
        hostelId: 'JAJA_HALL',
        includeArchived: true,
      });
      const inArchived = archivedFeed.find((a) => a.id === notice.id);
      expect(inArchived).toBeDefined();
      expect(inArchived?.status).toBe('ARCHIVED');
    });
  });

  describe('Zustand Store & UAT-0089 Verification', () => {
    it('UAT-0089: should execute Warden announcement broadcast and reactively update noticeboard feed', async () => {
      const store = useNoticeboardStore.getState();

      const payload = {
        hostelId: 'ALL_HOSTELS',
        hostelName: 'All Hostels (Campus-Wide)',
        wardenId: testWardenId,
        wardenName: 'Chief Warden',
        title: 'Campus-Wide Security Inspection',
        content: 'A routine security inspection will take place across all hostel blocks tonight.',
        category: 'SECURITY' as const,
        priority: 'HIGH' as const,
        isPinned: true,
      };

      const success = await store.createAnnouncement(payload);

      expect(success).toBe(true);
      expect(useNoticeboardStore.getState().successMessage).toContain('published successfully');

      const items = useNoticeboardStore.getState().announcements;
      expect(items.length).toBeGreaterThan(0);
      const createdItem = items.find((i) => i.title === payload.title);
      expect(createdItem).toBeDefined();
      expect(createdItem?.category).toBe('SECURITY');
      expect(createdItem?.priority).toBe('HIGH');
    });
  });
});
