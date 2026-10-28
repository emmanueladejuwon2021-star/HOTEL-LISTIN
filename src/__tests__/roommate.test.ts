import { RoommateService } from '../api/roommateService';
import { AuthService } from '../api/authService';
import { ReservationService } from '../api/reservationService';
import { RoommateSurvey } from '../types/roommate';

describe('RoommateService - Lifestyle Survey & Mutual Bedswap [ROOMMATE-05 / UAT-0075]', () => {
  const student1Id = 'usr_student_s1_75';
  const student2Id = 'usr_student_s2_75';
  const wardenId = 'usr_warden_75';

  beforeAll(async () => {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean test tables
    await client.execute({ sql: `DELETE FROM bedswap_requests`, args: [] });
    await client.execute({ sql: `DELETE FROM roommate_surveys`, args: [] });
    await client.execute({ sql: `DELETE FROM bedspaces`, args: [] });
    await client.execute({ sql: `DELETE FROM rooms`, args: [] });
    await client.execute({ sql: `DELETE FROM hostels`, args: [] });
    await client.execute({ sql: `DELETE FROM student_profiles`, args: [] });
    await client.execute({ sql: `DELETE FROM users`, args: [] });

    // Seed test users
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, '190408075', 'Student One', 's1_75@unilag.edu.ng', '08011111175', 'STUDENT', 'FEMALE', 'hash123')`,
      args: [student1Id]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid)
            VALUES (?, 'Engineering', 'Computer Eng', 300, 'MAIN_CAMPUS', 'STALLITE', 1)`,
      args: [student1Id]
    });

    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, '190408076', 'Student Two', 's2_75@unilag.edu.ng', '08022222275', 'STUDENT', 'FEMALE', 'hash123')`,
      args: [student2Id]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid)
            VALUES (?, 'Science', 'Mathematics', 300, 'MAIN_CAMPUS', 'STALLITE', 1)`,
      args: [student2Id]
    });

    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash)
            VALUES (?, 'STF0075', 'Warden Mrs. Adebayo', 'warden_75@unilag.edu.ng', '08033333375', 'WARDEN', 'FEMALE', 'hash123')`,
      args: [wardenId]
    });

    // Seed hostel, room, and confirmed bedspaces for both students
    await client.execute({
      sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES ('hst_moremi_75', 'Moremi Hall', 'FEMALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 100, 98)`,
      args: []
    });

    await client.execute({
      sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES ('rm_101_75', 'hst_moremi_75', 'Block A', 1, 'A-101', 4, 2)`,
      args: []
    });

    await client.execute({
      sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
            VALUES ('rm_202_75', 'hst_moremi_75', 'Block B', 2, 'B-202', 4, 2)`,
      args: []
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id)
            VALUES ('bed_101a_75', 'rm_101_75', 'Bed A Down', 'CONFIRMED', ?)`,
      args: [student1Id]
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id)
            VALUES ('bed_202b_75', 'rm_202_75', 'Bed B Up', 'CONFIRMED', ?)`,
      args: [student2Id]
    });
  });

  test('should save and retrieve roommate lifestyle survey', async () => {
    const surveyData: RoommateSurvey = {
      userId: student1Id,
      sleepSchedule: 'EARLY_BIRD',
      studyHabit: 'QUIET_STUDY',
      cleanlinessLevel: 'NEAT_FREAK',
      noiseTolerance: 'SILENT',
      guestFrequency: 'NEVER',
      smokingOrAlcohol: false,
      hobbies: 'Reading, Chess'
    };

    const saved = await RoommateService.saveSurvey(surveyData);
    expect(saved.userId).toBe(student1Id);
    expect(saved.sleepSchedule).toBe('EARLY_BIRD');

    const fetched = await RoommateService.getSurvey(student1Id);
    expect(fetched).not.toBeNull();
    expect(fetched?.hobbies).toBe('Reading, Chess');
  });

  test('should calculate compatibility match score and return potential matches', async () => {
    const survey2: RoommateSurvey = {
      userId: student2Id,
      sleepSchedule: 'EARLY_BIRD',
      studyHabit: 'QUIET_STUDY',
      cleanlinessLevel: 'NEAT_FREAK',
      noiseTolerance: 'SILENT',
      guestFrequency: 'NEVER',
      smokingOrAlcohol: false,
      hobbies: 'Reading, Music'
    };
    await RoommateService.saveSurvey(survey2);

    const matches = await RoommateService.getMatches(student1Id);
    expect(matches.length).toBeGreaterThan(0);
    const match = matches.find((m) => m.userId === student2Id);
    expect(match).toBeDefined();
    expect(match?.compatibilityScore).toBe(100);
  });

  test('should create a mutual bedswap request and progress through partner & warden approvals', async () => {
    // 1. Student 1 creates swap request to Student 2
    const req = await RoommateService.createBedswapRequest(student1Id, student2Id, 'Seeking study partner room');
    expect(req.status).toBe('PENDING_PARTNER');

    // 2. Student 2 accepts swap request
    const partnerAccepted = await RoommateService.respondToBedswapRequest(req.id, student2Id, true);
    expect(partnerAccepted.status).toBe('PENDING_WARDEN');

    // 3. Warden approves request, executing atomic bed assignment swap in Turso DB
    const approved = await RoommateService.wardenReviewBedswap(req.id, wardenId, true);
    expect(approved.status).toBe('APPROVED');

    // Verify database bedspace allocations were atomically swapped
    const client = AuthService.getDbClient();
    const b1 = await client.execute({
      sql: `SELECT allocated_to_user_id FROM bedspaces WHERE id = 'bed_101a_75'`,
      args: []
    });
    const b2 = await client.execute({
      sql: `SELECT allocated_to_user_id FROM bedspaces WHERE id = 'bed_202b_75'`,
      args: []
    });

    expect(String(b1.rows[0].allocated_to_user_id)).toBe(student2Id);
    expect(String(b2.rows[0].allocated_to_user_id)).toBe(student1Id);
  });
});
