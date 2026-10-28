/**
 * Roommate Compatibility & Lifestyle Survey Type Definitions
 * UnilagStay Hostel Management System
 *
 * This module provides strict TypeScript types and interfaces for the roommate matching system,
 * including student lifestyle survey preferences, compatibility scoring metrics, and mutual
 * bedspace swap requests.
 */

/**
 * Student daily sleep schedule preference.
 */
export type SleepSchedule = 'EARLY_BIRD' | 'NIGHT_OWL' | 'FLEXIBLE';

/**
 * Student room cleanliness and organization standard.
 */
export type CleanlinessLevel = 'VERY_NEAT' | 'MODERATE' | 'CASUAL';

/**
 * Primary study environment preference within the hostel.
 */
export type StudyHabits = 'QUIET_ROOM' | 'GROUP_STUDY' | 'LIBRARY_ONLY';

/**
 * Room guest policy preference for daytime or overnight visitors.
 */
export type GuestPreference = 'NO_GUESTS' | 'WEEKENDS_ONLY' | 'ANYTIME';

/**
 * Tolerance level regarding smoking or vaping around hostel areas.
 */
export type SmokingTolerance = 'STRICTLY_NO' | 'OUTSIDE_ONLY';

/**
 * Complete roommate lifestyle survey questionnaire response profile.
 */
export interface RoommateSurvey {
  /** Unique survey response ID */
  id: string;
  /** Unique student user ID who completed the survey */
  userId: string;
  /** Sleep schedule choice */
  sleepSchedule: SleepSchedule;
  /** Cleanliness level preference */
  cleanlinessLevel: CleanlinessLevel;
  /** Preferred room study environment */
  studyHabits: StudyHabits;
  /** Guest policy preference */
  guestPreference: GuestPreference;
  /** Smoking tolerance level */
  smokingTolerance: SmokingTolerance;
  /** Optional personal bio or additional roommate notes */
  bioNotes?: string;
  /** Timestamp when the survey was originally submitted */
  createdAt: string;
  /** Timestamp when the survey was last updated */
  updatedAt: string;
}

/**
 * Calculated compatibility match result between two students.
 */
export interface RoommateMatch {
  /** Unique user ID of the matched candidate student */
  studentId: string;
  /** Full name of the candidate student */
  fullName: string;
  /** UNILAG matriculation or registration number */
  matricNo: string;
  /** Currently allocated hostel name (if assigned) */
  hostelName?: string;
  /** Currently allocated room number */
  roomNumber?: string;
  /** Bedspace designation (e.g. Bed A Down) */
  bedLabel?: string;
  /** Bedspace ID of candidate */
  bedspaceId?: string;
  /** Calculated compatibility match score percentage (0 - 100%) */
  matchScorePercentage: number;
  /** Lifestyle survey profile of the matched candidate */
  survey: RoommateSurvey;
}

/**
 * Lifecycle status of a mutual bedspace swap request between two students.
 */
export type BedswapRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'APPROVED_BY_WARDEN';

/**
 * Mutual bedspace swap request record.
 */
export interface BedswapRequest {
  /** Unique request ID */
  id: string;
  /** User ID of the student initiating the bedswap request */
  applicantUserId: string;
  /** Full name of the applicant student */
  applicantName?: string;
  /** Bedspace ID currently assigned to the applicant */
  applicantBedspaceId: string;
  /** Descriptive room summary for applicant (e.g., King Jaja Hall Block A Rm 102 - Bed A Down) */
  applicantRoomDetails?: string;
  /** User ID of the student requested to swap bedspaces */
  targetUserId: string;
  /** Full name of the target student */
  targetName?: string;
  /** Bedspace ID currently assigned to the target student */
  targetBedspaceId: string;
  /** Descriptive room summary for target student */
  targetRoomDetails?: string;
  /** Reason provided for requesting the mutual bedspace swap */
  reason: string;
  /** Current approval status of the swap request */
  status: BedswapRequestStatus;
  /** Timestamp when request was submitted */
  createdAt: string;
  /** Timestamp when request was last updated */
  updatedAt: string;
}

/**
 * Filter options for querying candidate roommate compatibility matches.
 */
export interface MatchFilterOptions {
  /** Minimum compatibility score percentage threshold (0 - 100) */
  minScore?: number;
  /** Filter candidates by specific sleep schedule */
  sleepSchedule?: SleepSchedule | 'ALL';
  /** Filter candidates by specific study habit preference */
  studyHabits?: StudyHabits | 'ALL';
}

/**
 * Input payload for submitting or updating a roommate lifestyle survey.
 */
export interface SubmitSurveyParams {
  /** Unique student user ID */
  userId: string;
  /** Sleep schedule preference */
  sleepSchedule: SleepSchedule;
  /** Cleanliness level preference */
  cleanlinessLevel: CleanlinessLevel;
  /** Study habits preference */
  studyHabits: StudyHabits;
  /** Guest preference */
  guestPreference: GuestPreference;
  /** Smoking tolerance preference */
  smokingTolerance: SmokingTolerance;
  /** Optional personal bio or additional roommate notes */
  bioNotes?: string;
}

/**
 * Input payload for initiating a mutual bedswap request.
 */
export interface CreateBedswapParams {
  /** Applicant student user ID */
  applicantUserId: string;
  /** Target student user ID */
  targetUserId: string;
  /** Reason for swap */
  reason: string;
}
