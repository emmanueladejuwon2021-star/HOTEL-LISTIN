import { AuthService } from '../api/authService';
import { ReservationService } from '../api/reservationService';
import { RoommateService } from '../api/roommateService';
import { useRoommateStore } from '../store/useRoommateStore';
import { SleepSchedule, CleanlinessLevel, StudyHabits, GuestPreference, SmokingTolerance } from '../types/roommate';

describe('RoommateService & RoommateStore Integration Suite [ROOMMATE-01 / UAT-0071]', () => {
  const studentA = {
    id: `usr_roommate_a_${Date.now()}`,
    matricNo: `2009050${Math.floor(Math.random() * 899 + 100)}`,
    fullName: 'Adewale Johnson',
    email: `adewale_${Date.now()}@live.unilag.edu.ng`,
    phone: '+2348023456781',
    role: 'STUDENT',
    gender: 'MALE',
    passwordHash: AuthService.hashPassword('Password123!'),
    isActive: 1
  };

  const studentB = {
    id: `usr_roommate_b_${Date.now()}`,
    matricNo: `2009050${Math.floor(Math.random() * 899 + 100)}`,
    fullName: 'Chidi Okafor',
    email: `chidi_${Date.now()}@live.unilag.edu.ng`,
    phone: '+2348023456782',
    role: 'STUDENT',
    gender: 'MALE',
    passwordHash: AuthService.hashPassword('Password123!'),
    isActive: 1
  };

  beforeAll(async () => {
    await AuthService.initializeSchema();
    await ReservationService.initializeSchema();
    await RoommateService.initializeSchema();

    const client = AuthService.getDbClient();

    // Seed student A
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [studentA.id, studentA.matricNo, studentA.fullName, studentA.email, studentA.phone, studentA.role, studentA.gender, studentA.passwordHash, studentA.isActive]
    });
    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Engineering', 'Electrical Engineering', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED')`,
      args: [studentA.id]
    });

    // Seed student B
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [studentB.id, studentB.matricNo, studentB.fullName, studentB.email, studentB.phone, studentB.role, studentB.gender, studentB.passwordHash, studentB.isActive]
    });
    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, 'Engineering', 'Computer Engineering', 300, 'MAIN_CAMPUS', 'STALLITE', 1, 'APPROVED')`,
      args: [studentB.id]
    });
  });

  afterEach(() => {
    useRoommateStore.getState().resetStore();
  });

  test('should submit student roommate lifestyle survey successfully and retrieve survey from DB', async () => {
    const surveyData = {
      userId: studentA.id,
      sleepSchedule: 'EARLY_BIRD' as SleepSchedule,
      cleanlinessLevel: 'VERY_NEAT' as CleanlinessLevel,
      studyHabits: 'QUIET_ROOM' as StudyHabits,
      guestPreference: 'WEEKENDS_ONLY' as GuestPreference,
      smokingTolerance: 'STRICTLY_NO' as SmokingTolerance,
      bioNotes: 'Quiet engineering student who prefers early morning study sessions.'
    };

    const created = await RoommateService.submitSurvey(surveyData);
    expect(created).toBeDefined();
    expect(created.userId).toBe(studentA.id);
    expect(created.sleepSchedule).toBe('EARLY_BIRD');

    const retrieved = await RoommateService.getSurvey(studentA.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.bioNotes).toContain('Quiet engineering student');
  });

  test('should calculate 100% compatibility score for students with identical lifestyle surveys', async () => {
    const surveyA = {
      userId: studentA.id,
      sleepSchedule: 'EARLY_BIRD' as SleepSchedule,
      cleanlinessLevel: 'VERY_NEAT' as CleanlinessLevel,
      studyHabits: 'QUIET_ROOM' as StudyHabits,
      guestPreference: 'WEEKENDS_ONLY' as GuestPreference,
      smokingTolerance: 'STRICTLY_NO' as SmokingTolerance
    };

    const surveyB = {
      userId: studentB.id,
      sleepSchedule: 'EARLY_BIRD' as SleepSchedule,
      cleanlinessLevel: 'VERY_NEAT' as CleanlinessLevel,
      studyHabits: 'QUIET_ROOM' as StudyHabits,
      guestPreference: 'WEEKENDS_ONLY' as GuestPreference,
      smokingTolerance: 'STRICTLY_NO' as SmokingTolerance
    };

    await RoommateService.submitSurvey(surveyA);
    await RoommateService.submitSurvey(surveyB);

    const matches = await RoommateService.calculateCompatibilityMatches(studentA.id);
    expect(matches.length).toBeGreaterThan(0);

    const matchB = matches.find((m) => m.studentId === studentB.id);
    expect(matchB).toBeDefined();
    expect(matchB?.matchScorePercentage).toBe(100);
  });

  test('should filter compatibility matches by minimum match score percentage threshold and lifestyle habits [ROOMMATE-03 / UAT-0073]', async () => {
    // 1. Fetch matches with minimum score filter set to 90%
    const highMatches = await RoommateService.calculateCompatibilityMatches(studentA.id, 10, { minScore: 90 });
    expect(highMatches.every((m) => m.matchScorePercentage >= 90)).toBe(true);

    // 2. Fetch matches with impossible minimum score filter set to 101%
    const emptyMatches = await RoommateService.calculateCompatibilityMatches(studentA.id, 10, { minScore: 101 });
    expect(emptyMatches.length).toBe(0);

    // 3. Fetch matches with sleep schedule filter
    const sleepMatches = await RoommateService.calculateCompatibilityMatches(studentA.id, 10, { sleepSchedule: 'EARLY_BIRD' });
    expect(sleepMatches.every((m) => m.survey.sleepSchedule === 'EARLY_BIRD')).toBe(true);
  });

  test('should manage Zustand store actions for survey submission and compatibility match loading', async () => {
    const store = useRoommateStore.getState();

    await store.submitSurvey({
      userId: studentA.id,
      sleepSchedule: 'NIGHT_OWL' as SleepSchedule,
      cleanlinessLevel: 'MODERATE' as CleanlinessLevel,
      studyHabits: 'GROUP_STUDY' as StudyHabits,
      guestPreference: 'ANYTIME' as GuestPreference,
      smokingTolerance: 'STRICTLY_NO' as SmokingTolerance
    });

    expect(useRoommateStore.getState().survey).not.toBeNull();
    expect(useRoommateStore.getState().survey?.sleepSchedule).toBe('NIGHT_OWL');

    await store.fetchCompatibilityMatches(studentA.id);
    expect(useRoommateStore.getState().matches.length).toBeGreaterThan(0);
  });

  describe('Mutual Bedspace Swap Lifecycle [ROOMMATE-02 / UAT-0072]', () => {
    let bedspaceAId: string;
    let bedspaceBId: string;

    beforeAll(async () => {
      const client = AuthService.getDbClient();
      const hostelId = `hst_swap_${Date.now()}`;
      const roomId = `rm_swap_${Date.now()}`;
      bedspaceAId = `bed_swap_a_${Date.now()}`;
      bedspaceBId = `bed_swap_b_${Date.now()}`;

      const hostelName = `King Jaja Swap Hall ${Date.now()}`;
      await client.execute({
        sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
              VALUES (?, ?, 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 10, 8)`,
        args: [hostelId, hostelName]
      });

      await client.execute({
        sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
              VALUES (?, ?, 'Block A', 1, '101', 4, 2)`,
        args: [roomId, hostelId]
      });

      // Assign bedspace A to student A
      await client.execute({
        sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id)
              VALUES (?, ?, 'Bed A Down', 'CONFIRMED', ?)`,
        args: [bedspaceAId, roomId, studentA.id]
      });

      // Assign bedspace B to student B
      await client.execute({
        sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id)
              VALUES (?, ?, 'Bed B Up', 'CONFIRMED', ?)`,
        args: [bedspaceBId, roomId, studentB.id]
      });
    });

    test('should reject bedswap request if student does not have confirmed allocation', async () => {
      const unassignedStudentId = `usr_unassigned_${Date.now()}`;

      await expect(
        RoommateService.createBedswapRequest({
          applicantUserId: unassignedStudentId,
          targetUserId: studentB.id,
          reason: 'Looking for a room swap'
        })
      ).rejects.toThrow('must have a confirmed hostel bedspace allocation');
    });

    test('should create, retrieve with status filter, accept, and perform atomic database bedspace swap', async () => {
      // 1. Create bedswap request
      const swapReq = await RoommateService.createBedswapRequest({
        applicantUserId: studentA.id,
        targetUserId: studentB.id,
        reason: 'Matching study schedules and faculty proximity'
      });

      expect(swapReq.id).toBeDefined();
      expect(swapReq.status).toBe('PENDING');
      expect(swapReq.applicantUserId).toBe(studentA.id);
      expect(swapReq.targetUserId).toBe(studentB.id);

      // 2. Retrieve pending requests with status filter
      const pendingReqs = await RoommateService.getBedswapRequests(studentA.id, 'PENDING');
      expect(pendingReqs.length).toBeGreaterThan(0);
      expect(pendingReqs[0].status).toBe('PENDING');

      // 3. Target student accepts request (status transitions to ACCEPTED pending Warden approval)
      const accepted = await RoommateService.respondToBedswapRequest(swapReq.id, studentB.id, 'ACCEPTED');
      expect(accepted.status).toBe('ACCEPTED');

      // 4. Warden reviews and approves request
      const wardenId = `warden_reviewer_${Date.now()}`;
      const approved = await RoommateService.reviewBedswapByWarden(swapReq.id, wardenId, true);
      expect(approved.status).toBe('APPROVED_BY_WARDEN');

      // 5. Verify atomic bedspace user allocation swap in database upon Warden approval
      const client = AuthService.getDbClient();
      const bedAQuery = await client.execute({ sql: `SELECT allocated_to_user_id FROM bedspaces WHERE id = ?`, args: [bedspaceAId] });
      const bedBQuery = await client.execute({ sql: `SELECT allocated_to_user_id FROM bedspaces WHERE id = ?`, args: [bedspaceBId] });

      expect(String(bedAQuery.rows[0].allocated_to_user_id)).toBe(studentB.id);
      expect(String(bedBQuery.rows[0].allocated_to_user_id)).toBe(studentA.id);
    });

    test('should support warden review actions and filtering in Zustand store [ROOMMATE-04 / UAT-0074]', async () => {
      const store = useRoommateStore.getState();

      const newReq = await RoommateService.createBedswapRequest({
        applicantUserId: studentA.id,
        targetUserId: studentB.id,
        reason: 'Final review testing'
      });

      await store.fetchBedswapRequests(studentA.id, 'PENDING');
      expect(useRoommateStore.getState().bedswapRequests.length).toBeGreaterThan(0);

      const wardenId = `warden_swap_${Date.now()}`;
      await store.reviewBedswapByWarden(newReq.id, wardenId, true);

      await store.fetchBedswapRequests(studentA.id, 'APPROVED_BY_WARDEN');
      expect(useRoommateStore.getState().bedswapRequests.length).toBeGreaterThan(0);
    });

    test('should allow Hall Warden to review and decline bedswap request [ROOMMATE-04 / UAT-0074]', async () => {
      const newReq = await RoommateService.createBedswapRequest({
        applicantUserId: studentA.id,
        targetUserId: studentB.id,
        reason: 'Decline test for warden check'
      });

      expect(newReq.status).toBe('PENDING');

      const wardenId = `warden_decliner_${Date.now()}`;
      const declined = await RoommateService.reviewBedswapByWarden(newReq.id, wardenId, false);

      expect(declined.status).toBe('DECLINED');
    });
  });
});
