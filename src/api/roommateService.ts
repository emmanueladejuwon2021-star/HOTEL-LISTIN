import { Client } from '@libsql/client';
import { AuthService } from './authService';
import { ReservationService } from './reservationService';
import {
  RoommateSurvey,
  RoommateMatch,
  BedswapRequest,
  SubmitSurveyParams,
  CreateBedswapParams,
  BedswapRequestStatus,
  SleepSchedule,
  CleanlinessLevel,
  StudyHabits,
  GuestPreference,
  SmokingTolerance
} from '../types/roommate';

/**
 * Service class that manages student roommate lifestyle surveys, compatibility match calculations,
 * and mutual bedspace swap requests.
 * Operates directly against the Turso libSQL SQLite database following a strict zero-mock policy.
 */
export class RoommateService {
  /**
   * Initializes database tables for roommate surveys and bedswap requests if they do not exist yet.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await ReservationService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.batch([
      `CREATE TABLE IF NOT EXISTS roommate_surveys (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        sleep_schedule TEXT CHECK(sleep_schedule IN ('EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE')) NOT NULL,
        cleanliness_level TEXT CHECK(cleanliness_level IN ('VERY_NEAT', 'MODERATE', 'CASUAL')) NOT NULL,
        study_habits TEXT CHECK(study_habits IN ('QUIET_ROOM', 'GROUP_STUDY', 'LIBRARY_ONLY')) NOT NULL,
        guest_preference TEXT CHECK(guest_preference IN ('NO_GUESTS', 'WEEKENDS_ONLY', 'ANYTIME')) NOT NULL,
        smoking_tolerance TEXT CHECK(smoking_tolerance IN ('STRICTLY_NO', 'OUTSIDE_ONLY')) NOT NULL,
        bio_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS bedswap_requests (
        id TEXT PRIMARY KEY,
        applicant_user_id TEXT NOT NULL,
        applicant_bedspace_id TEXT NOT NULL,
        target_user_id TEXT NOT NULL,
        target_bedspace_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT CHECK(status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'APPROVED_BY_WARDEN')) DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (applicant_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (applicant_bedspace_id) REFERENCES bedspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (target_bedspace_id) REFERENCES bedspaces(id) ON DELETE CASCADE
      );`
    ], 'write');
  }

  /**
   * Submits or updates a student's roommate lifestyle survey response.
   *
   * @param params - Survey response options and optional notes
   * @returns Created or updated RoommateSurvey record
   */
  public static async submitSurvey(params: SubmitSurveyParams): Promise<RoommateSurvey> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const existingSurvey = await RoommateService.getSurvey(params.userId);

    const now = new Date().toISOString();

    if (existingSurvey) {
      await client.execute({
        sql: `UPDATE roommate_surveys
              SET sleep_schedule = ?,
                  cleanliness_level = ?,
                  study_habits = ?,
                  guest_preference = ?,
                  smoking_tolerance = ?,
                  bio_notes = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE user_id = ?`,
        args: [
          params.sleepSchedule,
          params.cleanlinessLevel,
          params.studyHabits,
          params.guestPreference,
          params.smokingTolerance,
          params.bioNotes || null,
          params.userId
        ]
      });

      return {
        id: existingSurvey.id,
        userId: params.userId,
        sleepSchedule: params.sleepSchedule,
        cleanlinessLevel: params.cleanlinessLevel,
        studyHabits: params.studyHabits,
        guestPreference: params.guestPreference,
        smokingTolerance: params.smokingTolerance,
        bioNotes: params.bioNotes,
        createdAt: existingSurvey.createdAt,
        updatedAt: now
      };
    } else {
      const surveyId = `survey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await client.execute({
        sql: `INSERT INTO roommate_surveys (id, user_id, sleep_schedule, cleanliness_level, study_habits, guest_preference, smoking_tolerance, bio_notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          surveyId,
          params.userId,
          params.sleepSchedule,
          params.cleanlinessLevel,
          params.studyHabits,
          params.guestPreference,
          params.smokingTolerance,
          params.bioNotes || null
        ]
      });

      return {
        id: surveyId,
        userId: params.userId,
        sleepSchedule: params.sleepSchedule,
        cleanlinessLevel: params.cleanlinessLevel,
        studyHabits: params.studyHabits,
        guestPreference: params.guestPreference,
        smokingTolerance: params.smokingTolerance,
        bioNotes: params.bioNotes,
        createdAt: now,
        updatedAt: now
      };
    }
  }

  /**
   * Retrieves a student's existing roommate lifestyle survey.
   *
   * @param userId - Unique student user ID
   * @returns RoommateSurvey object or null if not submitted yet
   */
  public static async getSurvey(userId: string): Promise<RoommateSurvey | null> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT id, user_id, sleep_schedule, cleanliness_level, study_habits, guest_preference, smoking_tolerance, bio_notes, created_at, updated_at
            FROM roommate_surveys WHERE user_id = ?`,
      args: [userId]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: String(row.id),
      userId: String(row.user_id),
      sleepSchedule: String(row.sleep_schedule) as SleepSchedule,
      cleanlinessLevel: String(row.cleanliness_level) as CleanlinessLevel,
      studyHabits: String(row.study_habits) as StudyHabits,
      guestPreference: String(row.guest_preference) as GuestPreference,
      smokingTolerance: String(row.smoking_tolerance) as SmokingTolerance,
      bioNotes: row.bio_notes ? String(row.bio_notes) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString())
    };
  }

  /**
   * Calculates compatibility score percentage between two survey profiles.
   *
   * Scoring weights:
   * - Sleep Schedule: 25%
   * - Cleanliness Level: 25%
   * - Study Habits: 25%
   * - Guest Preference: 15%
   * - Smoking Tolerance: 10%
   *
   * @param s1 - First student survey
   * @param s2 - Candidate student survey
   * @returns Compatibility score integer (0 - 100%)
   */
  public static calculateMatchScore(s1: RoommateSurvey, s2: RoommateSurvey): number {
    let score = 0;

    if (s1.sleepSchedule === s2.sleepSchedule) score += 25;
    else if (s1.sleepSchedule === 'FLEXIBLE' || s2.sleepSchedule === 'FLEXIBLE') score += 15;

    if (s1.cleanlinessLevel === s2.cleanlinessLevel) score += 25;
    else if ((s1.cleanlinessLevel === 'VERY_NEAT' && s2.cleanlinessLevel === 'MODERATE') || (s1.cleanlinessLevel === 'MODERATE' && s2.cleanlinessLevel === 'CASUAL')) score += 12;

    if (s1.studyHabits === s2.studyHabits) score += 25;
    else score += 5;

    if (s1.guestPreference === s2.guestPreference) score += 15;
    else score += 5;

    if (s1.smokingTolerance === s2.smokingTolerance) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Finds top roommate compatibility matches for a student across all completed surveys.
   *
   * @param userId - Requesting student user ID
   * @param limit - Maximum number of matches to return (default 10)
   * @returns Array of RoommateMatch items sorted by score descending
   */
  public static async calculateCompatibilityMatches(userId: string, limit: number = 10): Promise<RoommateMatch[]> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const userSurvey = await RoommateService.getSurvey(userId);
    if (!userSurvey) {
      throw new Error('Please complete your roommate lifestyle survey before viewing compatibility matches.');
    }

    // Query candidate surveys for other active students
    const candidatesResult = await client.execute({
      sql: `SELECT s.id, s.user_id, s.sleep_schedule, s.cleanliness_level, s.study_habits, s.guest_preference, s.smoking_tolerance, s.bio_notes, s.created_at, s.updated_at,
                   u.full_name, u.matric_or_staff_no,
                   h.name as hostel_name, r.room_number, b.bed_label, b.id as bedspace_id
            FROM roommate_surveys s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN bedspaces b ON b.allocated_to_user_id = u.id AND b.status = 'CONFIRMED'
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN hostels h ON r.hostel_id = h.id
            WHERE s.user_id != ? AND u.is_active = 1`,
      args: [userId]
    });

    const matches: RoommateMatch[] = [];

    for (const row of candidatesResult.rows) {
      const candidateSurvey: RoommateSurvey = {
        id: String(row.id),
        userId: String(row.user_id),
        sleepSchedule: String(row.sleep_schedule) as SleepSchedule,
        cleanlinessLevel: String(row.cleanliness_level) as CleanlinessLevel,
        studyHabits: String(row.study_habits) as StudyHabits,
        guestPreference: String(row.guest_preference) as GuestPreference,
        smokingTolerance: String(row.smoking_tolerance) as SmokingTolerance,
        bioNotes: row.bio_notes ? String(row.bio_notes) : undefined,
        createdAt: String(row.created_at || new Date().toISOString()),
        updatedAt: String(row.updated_at || new Date().toISOString())
      };

      const matchScorePercentage = RoommateService.calculateMatchScore(userSurvey, candidateSurvey);

      matches.push({
        studentId: String(row.user_id),
        fullName: String(row.full_name),
        matricNo: String(row.matric_or_staff_no),
        hostelName: row.hostel_name ? String(row.hostel_name) : undefined,
        roomNumber: row.room_number ? String(row.room_number) : undefined,
        bedLabel: row.bed_label ? String(row.bed_label) : undefined,
        bedspaceId: row.bedspace_id ? String(row.bedspace_id) : undefined,
        matchScorePercentage,
        survey: candidateSurvey
      });
    }

    // Sort by compatibility score descending
    matches.sort((a, b) => b.matchScorePercentage - a.matchScorePercentage);

    return matches.slice(0, limit);
  }

  /**
   * Initiates a mutual bedspace swap request from one allocated student to another.
   * Both students must have active confirmed bedspace allocations.
   *
   * @param params - Applicant, target student user ID, and reason
   * @returns Newly created BedswapRequest object
   */
  public static async createBedswapRequest(params: CreateBedswapParams): Promise<BedswapRequest> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    if (!params.reason.trim()) {
      throw new Error('Please provide a valid reason for requesting a bedspace swap.');
    }

    if (params.applicantUserId === params.targetUserId) {
      throw new Error('You cannot request a bedspace swap with yourself.');
    }

    // Verify applicant assigned bedspace
    const applicantBedResult = await client.execute({
      sql: `SELECT b.id, b.bed_label, r.room_number, h.name as hostel_name
            FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            JOIN hostels h ON r.hostel_id = h.id
            WHERE b.allocated_to_user_id = ? AND b.status = 'CONFIRMED'`,
      args: [params.applicantUserId]
    });

    if (applicantBedResult.rows.length === 0) {
      throw new Error('You must have a confirmed hostel bedspace allocation before requesting a bedswap.');
    }

    const applicantRow = applicantBedResult.rows[0];
    const applicantBedspaceId = String(applicantRow.id);

    // Verify target student assigned bedspace
    const targetBedResult = await client.execute({
      sql: `SELECT b.id, b.bed_label, r.room_number, h.name as hostel_name
            FROM bedspaces b
            JOIN rooms r ON b.room_id = r.id
            JOIN hostels h ON r.hostel_id = h.id
            WHERE b.allocated_to_user_id = ? AND b.status = 'CONFIRMED'`,
      args: [params.targetUserId]
    });

    if (targetBedResult.rows.length === 0) {
      throw new Error('The target student does not currently have a confirmed bedspace allocation.');
    }

    const targetRow = targetBedResult.rows[0];
    const targetBedspaceId = String(targetRow.id);

    // Check if there is already a pending bedswap request between these two students
    const existingPending = await client.execute({
      sql: `SELECT id FROM bedswap_requests
            WHERE applicant_user_id = ? AND target_user_id = ? AND status = 'PENDING'`,
      args: [params.applicantUserId, params.targetUserId]
    });

    if (existingPending.rows.length > 0) {
      throw new Error('A pending bedswap request already exists for this student.');
    }

    const requestId = `swap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO bedswap_requests (id, applicant_user_id, applicant_bedspace_id, target_user_id, target_bedspace_id, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      args: [requestId, params.applicantUserId, applicantBedspaceId, params.targetUserId, targetBedspaceId, params.reason.trim()]
    });

    return {
      id: requestId,
      applicantUserId: params.applicantUserId,
      applicantBedspaceId,
      applicantRoomDetails: `${applicantRow.hostel_name} Rm ${applicantRow.room_number} (${applicantRow.bed_label})`,
      targetUserId: params.targetUserId,
      targetBedspaceId,
      targetRoomDetails: `${targetRow.hostel_name} Rm ${targetRow.room_number} (${targetRow.bed_label})`,
      reason: params.reason.trim(),
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Retrieves incoming or outgoing bedswap requests for a student, optionally filtered by request status.
   *
   * @param userId - Unique student user ID
   * @param statusFilter - Optional status filter ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'APPROVED_BY_WARDEN')
   * @returns Array of BedswapRequest records
   */
  public static async getBedswapRequests(userId: string, statusFilter?: BedswapRequestStatus | 'ALL'): Promise<BedswapRequest[]> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const result = await client.execute({
      sql: `SELECT r.id, r.applicant_user_id, r.applicant_bedspace_id, r.target_user_id, r.target_bedspace_id, r.reason, r.status, r.created_at, r.updated_at,
                   u1.full_name as applicant_name, u2.full_name as target_name,
                   h1.name as app_hostel, rm1.room_number as app_room, b1.bed_label as app_bed,
                   h2.name as tar_hostel, rm2.room_number as tar_room, b2.bed_label as tar_bed
            FROM bedswap_requests r
            JOIN users u1 ON r.applicant_user_id = u1.id
            JOIN users u2 ON r.target_user_id = u2.id
            LEFT JOIN bedspaces b1 ON r.applicant_bedspace_id = b1.id
            LEFT JOIN rooms rm1 ON b1.room_id = rm1.id
            LEFT JOIN hostels h1 ON rm1.hostel_id = h1.id
            LEFT JOIN bedspaces b2 ON r.target_bedspace_id = b2.id
            LEFT JOIN rooms rm2 ON b2.room_id = rm2.id
            LEFT JOIN hostels h2 ON rm2.hostel_id = h2.id
            WHERE (r.applicant_user_id = ? OR r.target_user_id = ?)
            ${statusFilter && statusFilter !== 'ALL' ? 'AND r.status = ?' : ''}
            ORDER BY r.created_at DESC`,
      args: statusFilter && statusFilter !== 'ALL' ? [userId, userId, statusFilter] : [userId, userId]
    });

    return result.rows.map((row) => ({
      id: String(row.id),
      applicantUserId: String(row.applicant_user_id),
      applicantName: String(row.applicant_name),
      applicantBedspaceId: String(row.applicant_bedspace_id),
      applicantRoomDetails: row.app_hostel ? `${row.app_hostel} Rm ${row.app_room} (${row.app_bed})` : 'N/A',
      targetUserId: String(row.target_user_id),
      targetName: String(row.target_name),
      targetBedspaceId: String(row.target_bedspace_id),
      targetRoomDetails: row.tar_hostel ? `${row.tar_hostel} Rm ${row.tar_room} (${row.tar_bed})` : 'N/A',
      reason: String(row.reason),
      status: String(row.status) as BedswapRequestStatus,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString())
    }));
  }

  /**
   * Responds to an existing bedswap request (e.g., ACCEPTED, DECLINED, CANCELLED).
   * When accepted, atomically swaps the student user assignments on the respective bedspace DB records.
   *
   * @param requestId - Unique bedswap request ID
   * @param targetUserId - Responding student user ID
   * @param actionStatus - Target status ('ACCEPTED', 'DECLINED', 'CANCELLED')
   * @returns Updated BedswapRequest record
   */
  public static async respondToBedswapRequest(requestId: string, targetUserId: string, actionStatus: BedswapRequestStatus): Promise<BedswapRequest> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const reqResult = await client.execute({
      sql: `SELECT id, applicant_user_id, applicant_bedspace_id, target_user_id, target_bedspace_id, reason, status
            FROM bedswap_requests WHERE id = ?`,
      args: [requestId]
    });

    if (reqResult.rows.length === 0) {
      throw new Error('Bedswap request record not found.');
    }

    const reqRow = reqResult.rows[0];
    const applicantUserId = String(reqRow.applicant_user_id);
    const applicantBedspaceId = String(reqRow.applicant_bedspace_id);
    const targetStudentId = String(reqRow.target_user_id);
    const targetBedspaceId = String(reqRow.target_bedspace_id);

    if (actionStatus === 'ACCEPTED' && targetUserId !== targetStudentId) {
      throw new Error('Only the requested target student can accept this bedswap request.');
    }

    if (actionStatus === 'CANCELLED' && targetUserId !== applicantUserId) {
      throw new Error('Only the initiating student can cancel this bedswap request.');
    }

    // Update bedswap status
    const finalStatus: BedswapRequestStatus = actionStatus === 'ACCEPTED' ? 'APPROVED_BY_WARDEN' : actionStatus;

    await client.execute({
      sql: `UPDATE bedswap_requests
            SET status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [finalStatus, requestId]
    });

    // If accepted/approved, perform atomic bedspace allocation swap in Turso DB
    if (actionStatus === 'ACCEPTED' || finalStatus === 'APPROVED_BY_WARDEN') {
      await client.batch([
        {
          sql: `UPDATE bedspaces SET allocated_to_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [targetStudentId, applicantBedspaceId]
        },
        {
          sql: `UPDATE bedspaces SET allocated_to_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [applicantUserId, targetBedspaceId]
        }
      ], 'write');
    }

    const updatedRequests = await RoommateService.getBedswapRequests(targetUserId);
    const updated = updatedRequests.find((r) => r.id === requestId);

    if (!updated) {
      throw new Error('Failed to retrieve updated bedswap request details.');
    }

    return updated;
  }

  /**
   * Allows a Hall Warden to review and finalize a mutual bedspace swap request.
   *
   * @param requestId - Unique bedswap request ID
   * @param wardenUserId - Unique warden user ID
   * @param approve - True to approve and swap room allocations, false to decline
   * @returns Updated BedswapRequest record
   */
  public static async reviewBedswapByWarden(requestId: string, wardenUserId: string, approve: boolean): Promise<BedswapRequest> {
    await RoommateService.initializeSchema();
    const client = AuthService.getDbClient();

    const reqResult = await client.execute({
      sql: `SELECT id, applicant_user_id, applicant_bedspace_id, target_user_id, target_bedspace_id, reason, status
            FROM bedswap_requests WHERE id = ?`,
      args: [requestId]
    });

    if (reqResult.rows.length === 0) {
      throw new Error('Bedswap request record not found.');
    }

    const reqRow = reqResult.rows[0];
    const applicantUserId = String(reqRow.applicant_user_id);
    const applicantBedspaceId = String(reqRow.applicant_bedspace_id);
    const targetStudentId = String(reqRow.target_user_id);
    const targetBedspaceId = String(reqRow.target_bedspace_id);

    const newStatus: BedswapRequestStatus = approve ? 'APPROVED_BY_WARDEN' : 'DECLINED';

    await client.execute({
      sql: `UPDATE bedswap_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [newStatus, requestId]
    });

    if (approve) {
      await client.batch([
        {
          sql: `UPDATE bedspaces SET allocated_to_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [targetStudentId, applicantBedspaceId]
        },
        {
          sql: `UPDATE bedspaces SET allocated_to_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [applicantUserId, targetBedspaceId]
        }
      ], 'write');
    }

    const updatedRequests = await RoommateService.getBedswapRequests(applicantUserId);
    const updated = updatedRequests.find((r) => r.id === requestId);

    if (!updated) {
      throw new Error('Failed to retrieve updated bedswap request details.');
    }

    return updated;
  }
}
