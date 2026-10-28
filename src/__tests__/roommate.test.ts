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
});
