import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { ReservationService } from './reservationService';
import { RoommateSurvey, RoommateMatch, BedswapRequest, BedswapStatus } from '../types/roommate';

/**
 * RoommateService handles roommate lifestyle questionnaire surveys, compatibility score matching calculations,
 * and mutual room/bedswap requests with warden approval and atomic bedspace transactions in Turso libSQL SQLite DB.
 */
export class RoommateService {
  /**
   * Initializes database schema for roommate surveys and mutual bedswap requests if not already created.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await ReservationService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.batch([
      `CREATE TABLE IF NOT EXISTS roommate_surveys (
        user_id TEXT PRIMARY KEY,
        sleep_schedule TEXT CHECK(sleep_schedule IN ('EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE')) NOT NULL,
        study_habit TEXT CHECK(study_habit IN ('QUIET_STUDY', 'GROUP_STUDY', 'BACKGROUND_MUSIC', 'LIBRARY_ONLY')) NOT NULL,
        cleanliness_level TEXT CHECK(cleanliness_level IN ('NEAT_FREAK', 'MODERATELY_CLEAN', 'CASUAL')) NOT NULL,
        noise_tolerance TEXT CHECK(noise_tolerance IN ('SILENT', 'MODERATE', 'LOUD_OK')) NOT NULL,
        guest_frequency TEXT CHECK(guest_frequency IN ('NEVER', 'OCCASIONAL', 'FREQUENT')) NOT NULL,
        smoking_or_alcohol INTEGER DEFAULT 0,
        hobbies TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS bedswap_requests (
        id TEXT PRIMARY KEY,
        requester_id TEXT NOT NULL,
        target_student_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT CHECK(status IN ('PENDING_PARTNER', 'PENDING_WARDEN', 'APPROVED', 'DECLINED', 'CANCELLED')) DEFAULT 'PENDING_PARTNER',
        partner_decision_at DATETIME,
        warden_id TEXT,
        warden_decision_at DATETIME,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (warden_id) REFERENCES users(id) ON DELETE SET NULL
      );`
    ], 'write');
  }

  /**
   * Saves or updates a student's roommate lifestyle questionnaire survey.
   *
   * @param survey - Roommate survey preferences
   */
  public static async saveSurvey(survey: RoommateSurvey): Promise<RoommateSurvey> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `INSERT INTO roommate_surveys (
              user_id, sleep_schedule, study_habit, cleanliness_level,
              noise_tolerance, guest_frequency, smoking_or_alcohol, hobbies, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
              sleep_schedule = excluded.sleep_schedule,
              study_habit = excluded.study_habit,
              cleanliness_level = excluded.cleanliness_level,
              noise_tolerance = excluded.noise_tolerance,
              guest_frequency = excluded.guest_frequency,
              smoking_or_alcohol = excluded.smoking_or_alcohol,
              hobbies = excluded.hobbies,
              updated_at = CURRENT_TIMESTAMP`,
      args: [
        survey.userId,
        survey.sleepSchedule,
        survey.studyHabit,
        survey.cleanlinessLevel,
        survey.noiseTolerance,
        survey.guestFrequency,
        survey.smokingOrAlcohol ? 1 : 0,
        survey.hobbies || ''
      ]
    });

    return await RoommateService.getSurvey(survey.userId) as RoommateSurvey;
  }

  /**
   * Retrieves a student's roommate lifestyle survey.
   *
   * @param userId - Student user ID
   */
  public static async getSurvey(userId: string): Promise<RoommateSurvey | null> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const res = await client.execute({
      sql: `SELECT user_id, sleep_schedule, study_habit, cleanliness_level,
                   noise_tolerance, guest_frequency, smoking_or_alcohol, hobbies, updated_at
            FROM roommate_surveys WHERE user_id = ?`,
      args: [userId]
    });

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      userId: String(row.user_id),
      sleepSchedule: String(row.sleep_schedule) as any,
      studyHabit: String(row.study_habit) as any,
      cleanlinessLevel: String(row.cleanliness_level) as any,
      noiseTolerance: String(row.noise_tolerance) as any,
      guestFrequency: String(row.guest_frequency) as any,
      smokingOrAlcohol: Boolean(row.smoking_or_alcohol),
      hobbies: String(row.hobbies || ''),
      updatedAt: String(row.updated_at || new Date().toISOString())
    };
  }

  /**
   * Calculates compatibility score percentage (0-100%) between two student surveys.
   */
  public static calculateCompatibilityScore(s1: RoommateSurvey, s2: RoommateSurvey): number {
    let points = 0;
    const maxPoints = 5;

    if (s1.sleepSchedule === s2.sleepSchedule) points += 1;
    else if (s1.sleepSchedule === 'FLEXIBLE' || s2.sleepSchedule === 'FLEXIBLE') points += 0.5;

    if (s1.studyHabit === s2.studyHabit) points += 1;

    if (s1.cleanlinessLevel === s2.cleanlinessLevel) points += 1;
    else if (
      (s1.cleanlinessLevel === 'NEAT_FREAK' && s2.cleanlinessLevel === 'MODERATELY_CLEAN') ||
      (s2.cleanlinessLevel === 'NEAT_FREAK' && s1.cleanlinessLevel === 'MODERATELY_CLEAN') ||
      (s1.cleanlinessLevel === 'CASUAL' && s2.cleanlinessLevel === 'MODERATELY_CLEAN') ||
      (s2.cleanlinessLevel === 'CASUAL' && s1.cleanlinessLevel === 'MODERATELY_CLEAN')
    ) {
      points += 0.5;
    }

    if (s1.noiseTolerance === s2.noiseTolerance) points += 1;

    if (s1.guestFrequency === s2.guestFrequency) points += 1;

    if (s1.smokingOrAlcohol !== s2.smokingOrAlcohol) points -= 1; // Disincentivize mismatch

    const score = Math.max(0, Math.min(100, Math.round((points / maxPoints) * 100)));
    return score;
  }

  /**
   * Finds potential roommate compatibility matches for a student among residents in the same gender/campus category.
   *
   * @param userId - Student user ID
   */
  public static async getMatches(userId: string): Promise<RoommateMatch[]> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const mySurvey = await RoommateService.getSurvey(userId);
    if (!mySurvey) return [];

    // Query user profile
    const myUserRes = await client.execute({
      sql: `SELECT u.gender, sp.campus FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE u.id = ?`,
      args: [userId]
    });

    if (myUserRes.rows.length === 0) return [];
    const myGender = String(myUserRes.rows[0].gender);
    const myCampus = String(myUserRes.rows[0].campus);

    // Query other active resident students in same campus/gender with filled surveys
    const sql = `
      SELECT u.id as user_id, u.full_name, u.matric_or_staff_no, sp.faculty, sp.department, sp.level,
             h.name as hostel_name, r.room_number, b.bed_label,
             rs.sleep_schedule, rs.study_habit, rs.cleanliness_level, rs.noise_tolerance, rs.guest_frequency, rs.smoking_or_alcohol, rs.hobbies
      FROM users u
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN bedspaces b ON u.id = b.allocated_to_user_id
      JOIN rooms r ON b.room_id = r.id
      JOIN hostels h ON r.hostel_id = h.id
      JOIN roommate_surveys rs ON u.id = rs.user_id
      WHERE u.id != ? AND u.gender = ? AND sp.campus = ? AND b.status = 'CONFIRMED'
    `;

    const res = await client.execute({
      sql,
      args: [userId, myGender, myCampus]
    });

    const matches: RoommateMatch[] = [];

    for (const row of res.rows) {
      const otherSurvey: RoommateSurvey = {
        userId: String(row.user_id),
        sleepSchedule: String(row.sleep_schedule) as any,
        studyHabit: String(row.study_habit) as any,
        cleanlinessLevel: String(row.cleanliness_level) as any,
        noiseTolerance: String(row.noise_tolerance) as any,
        guestFrequency: String(row.guest_frequency) as any,
        smokingOrAlcohol: Boolean(row.smoking_or_alcohol),
        hobbies: String(row.hobbies || '')
      };

      const score = RoommateService.calculateCompatibilityScore(mySurvey, otherSurvey);

      matches.push({
        userId: String(row.user_id),
        fullName: String(row.full_name),
        matricOrStaffNo: String(row.matric_or_staff_no),
        faculty: String(row.faculty),
        department: String(row.department),
        level: Number(row.level),
        hostelName: String(row.hostel_name),
        roomNumber: String(row.room_number),
        bedLabel: String(row.bed_label),
        compatibilityScore: score,
        survey: otherSurvey
      });
    }

    // Sort by highest compatibility score first
    return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Initiates a mutual bedswap request to another student.
   */
  public static async createBedswapRequest(requesterId: string, targetStudentId: string, reason: string): Promise<BedswapRequest> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!reason.trim()) {
      throw new Error('Please provide a reason for requesting a bed swap.');
    }

    if (requesterId === targetStudentId) {
      throw new Error('You cannot request a bed swap with yourself.');
    }

    // Ensure both students have confirmed bedspaces
    const reqBedRes = await client.execute({
      sql: `SELECT id FROM bedspaces WHERE allocated_to_user_id = ? AND status = 'CONFIRMED'`,
      args: [requesterId]
    });

    if (reqBedRes.rows.length === 0) {
      throw new Error('You must have a confirmed hostel bedspace allocation to initiate a bed swap.');
    }

    const tarBedRes = await client.execute({
      sql: `SELECT id FROM bedspaces WHERE allocated_to_user_id = ? AND status = 'CONFIRMED'`,
      args: [targetStudentId]
    });

    if (tarBedRes.rows.length === 0) {
      throw new Error('The target student does not have an active confirmed hostel bedspace allocation.');
    }

    // Prevent duplicate active pending requests
    const activeReqRes = await client.execute({
      sql: `SELECT id FROM bedswap_requests
            WHERE (requester_id = ? OR target_student_id = ?)
              AND status IN ('PENDING_PARTNER', 'PENDING_WARDEN')`,
      args: [requesterId, requesterId]
    });

    if (activeReqRes.rows.length > 0) {
      throw new Error('You already have an active pending bed swap request in progress.');
    }

    const requestId = `swap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await client.execute({
      sql: `INSERT INTO bedswap_requests (id, requester_id, target_student_id, reason, status, created_at)
            VALUES (?, ?, ?, ?, 'PENDING_PARTNER', CURRENT_TIMESTAMP)`,
      args: [requestId, requesterId, targetStudentId, reason.trim()]
    });

    const requests = await RoommateService.getUserBedswapRequests(requesterId);
    return requests.find((r) => r.id === requestId)!;
  }

  /**
   * Partner student responds to a pending bedswap request ('ACCEPT' or 'DECLINE').
   */
  public static async respondToBedswapRequest(requestId: string, partnerId: string, accept: boolean): Promise<BedswapRequest> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const reqRes = await client.execute({
      sql: `SELECT id, target_student_id, status FROM bedswap_requests WHERE id = ?`,
      args: [requestId]
    });

    if (reqRes.rows.length === 0) {
      throw new Error('Bedswap request not found.');
    }

    const row = reqRes.rows[0];
    if (String(row.target_student_id) !== partnerId) {
      throw new Error('Unauthorized. Only the requested swap partner can respond to this request.');
    }

    if (String(row.status) !== 'PENDING_PARTNER') {
      throw new Error('This swap request is no longer pending partner decision.');
    }

    const newStatus: BedswapStatus = accept ? 'PENDING_WARDEN' : 'DECLINED';

    await client.execute({
      sql: `UPDATE bedswap_requests
            SET status = ?, partner_decision_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [newStatus, requestId]
    });

    const requests = await RoommateService.getUserBedswapRequests(partnerId);
    return requests.find((r) => r.id === requestId)!;
  }

  /**
   * Warden reviews and approves/declines a bedswap request.
   * On approval, executes an atomic database transaction swapping bed assignments between both students.
   */
  public static async wardenReviewBedswap(requestId: string, wardenId: string, approve: boolean, rejectionReason?: string): Promise<BedswapRequest> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const reqRes = await client.execute({
      sql: `SELECT id, requester_id, target_student_id, status FROM bedswap_requests WHERE id = ?`,
      args: [requestId]
    });

    if (reqRes.rows.length === 0) {
      throw new Error('Bedswap request not found.');
    }

    const reqRow = reqRes.rows[0];
    if (String(reqRow.status) !== 'PENDING_WARDEN') {
      throw new Error('This request is not pending warden approval.');
    }

    const requesterId = String(reqRow.requester_id);
    const targetStudentId = String(reqRow.target_student_id);

    if (approve) {
      // Find bedspaces for both students
      const reqBedRes = await client.execute({
        sql: `SELECT id FROM bedspaces WHERE allocated_to_user_id = ? AND status = 'CONFIRMED'`,
        args: [requesterId]
      });

      const tarBedRes = await client.execute({
        sql: `SELECT id FROM bedspaces WHERE allocated_to_user_id = ? AND status = 'CONFIRMED'`,
        args: [targetStudentId]
      });

      if (reqBedRes.rows.length === 0 || tarBedRes.rows.length === 0) {
        throw new Error('Cannot complete swap: One or both students no longer have a confirmed bedspace allocation.');
      }

      const reqBedId = String(reqBedRes.rows[0].id);
      const tarBedId = String(tarBedRes.rows[0].id);

      // Execute atomic swap in Turso DB transaction batch
      await client.batch([
        {
          sql: `UPDATE bedspaces SET allocated_to_user_id = ? WHERE id = ?`,
          args: [targetStudentId, reqBedId]
        },
        {
          sql: `UPDATE bedspaces SET allocated_to_user_id = ? WHERE id = ?`,
          args: [requesterId, tarBedId]
        },
        {
          sql: `UPDATE bedswap_requests
                SET status = 'APPROVED', warden_id = ?, warden_decision_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [wardenId, requestId]
        }
      ], 'write');
    } else {
      await client.execute({
        sql: `UPDATE bedswap_requests
              SET status = 'DECLINED', warden_id = ?, warden_decision_at = CURRENT_TIMESTAMP, rejection_reason = ?
              WHERE id = ?`,
        args: [wardenId, rejectionReason || 'Declined by Hall Warden.', requestId]
      });
    }

    const requests = await RoommateService.getUserBedswapRequests(requesterId);
    return requests.find((r) => r.id === requestId)!;
  }

  /**
   * Retrieves all bedswap requests associated with a student (either requester or target).
   */
  public static async getUserBedswapRequests(userId: string): Promise<BedswapRequest[]> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const sql = `
      SELECT br.id, br.requester_id, br.target_student_id, br.reason, br.status,
             br.partner_decision_at, br.warden_id, br.warden_decision_at, br.rejection_reason, br.created_at,
             u1.full_name as req_name, u2.full_name as tar_name,
             r1.room_number as req_room, r2.room_number as tar_room,
             b1.id as req_bed_id, b2.id as tar_bed_id
      FROM bedswap_requests br
      JOIN users u1 ON br.requester_id = u1.id
      JOIN users u2 ON br.target_student_id = u2.id
      LEFT JOIN bedspaces b1 ON br.requester_id = b1.allocated_to_user_id AND b1.status = 'CONFIRMED'
      LEFT JOIN rooms r1 ON b1.room_id = r1.id
      LEFT JOIN bedspaces b2 ON br.target_student_id = b2.allocated_to_user_id AND b2.status = 'CONFIRMED'
      LEFT JOIN rooms r2 ON b2.room_id = r2.id
      WHERE br.requester_id = ? OR br.target_student_id = ?
      ORDER BY br.created_at DESC
    `;

    const res = await client.execute({ sql, args: [userId, userId] });

    return res.rows.map((row) => ({
      id: String(row.id),
      requesterId: String(row.requester_id),
      requesterName: String(row.req_name || ''),
      requesterRoom: String(row.req_room || 'N/A'),
      requesterBedId: row.req_bed_id ? String(row.req_bed_id) : undefined,
      targetStudentId: String(row.target_student_id),
      targetStudentName: String(row.tar_name || ''),
      targetRoom: String(row.tar_room || 'N/A'),
      targetBedId: row.tar_bed_id ? String(row.tar_bed_id) : undefined,
      reason: String(row.reason),
      status: String(row.status) as BedswapStatus,
      partnerDecisionAt: row.partner_decision_at ? String(row.partner_decision_at) : undefined,
      wardenId: row.warden_id ? String(row.warden_id) : undefined,
      wardenDecisionAt: row.warden_decision_at ? String(row.warden_decision_at) : undefined,
      rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
      createdAt: String(row.created_at || new Date().toISOString())
    }));
  }
}
