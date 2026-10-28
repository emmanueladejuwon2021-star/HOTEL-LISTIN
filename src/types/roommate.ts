/**
 * Sleep Schedule Options for Roommate Lifestyle Questionnaire
 */
export type SleepSchedule = 'EARLY_BIRD' | 'NIGHT_OWL' | 'FLEXIBLE';

/**
 * Study Habit Options for Roommate Lifestyle Questionnaire
 */
export type StudyHabit = 'QUIET_STUDY' | 'GROUP_STUDY' | 'BACKGROUND_MUSIC' | 'LIBRARY_ONLY';

/**
 * Cleanliness Preference Options
 */
export type CleanlinessLevel = 'NEAT_FREAK' | 'MODERATELY_CLEAN' | 'CASUAL';

/**
 * Noise Tolerance Level
 */
export type NoiseTolerance = 'SILENT' | 'MODERATE' | 'LOUD_OK';

/**
 * Guest Frequency Preference
 */
export type GuestFrequency = 'NEVER' | 'OCCASIONAL' | 'FREQUENT';

/**
 * Roommate Lifestyle Survey Interface
 */
export interface RoommateSurvey {
  userId: string;
  sleepSchedule: SleepSchedule;
  studyHabit: StudyHabit;
  cleanlinessLevel: CleanlinessLevel;
  noiseTolerance: NoiseTolerance;
  guestFrequency: GuestFrequency;
  smokingOrAlcohol: boolean;
  hobbies: string;
  updatedAt?: string;
}

/**
 * Roommate Compatibility Match Result
 */
export interface RoommateMatch {
  userId: string;
  fullName: string;
  matricOrStaffNo: string;
  faculty: string;
  department: string;
  level: number;
  hostelName: string;
  roomNumber: string;
  bedLabel: string;
  compatibilityScore: number; // Percentage score (0-100%)
  survey: RoommateSurvey;
}

/**
 * Status of Mutual Bedswap Request
 */
export type BedswapStatus = 'PENDING_PARTNER' | 'PENDING_WARDEN' | 'APPROVED' | 'DECLINED' | 'CANCELLED';

/**
 * Mutual Bedswap Request Details
 */
export interface BedswapRequest {
  id: string;
  requesterId: string;
  requesterName?: string;
  requesterRoom?: string;
  requesterBedId?: string;
  targetStudentId: string;
  targetStudentName?: string;
  targetRoom?: string;
  targetBedId?: string;
  reason: string;
  status: BedswapStatus;
  partnerDecisionAt?: string;
  wardenId?: string;
  wardenDecisionAt?: string;
  rejectionReason?: string;
  createdAt: string;
}
