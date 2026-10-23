import { PriorityCategory, Campus, Gender } from './auth';

/**
 * Status flags for priority balloting windows.
 */
export type BallotingWindowStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'PAUSED';

/**
 * Priority quota balloting window configuration.
 */
export interface BallotingWindow {
  id: string;
  category: PriorityCategory;
  title: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  status: BallotingWindowStatus;
}

/**
 * Real-time queue access token for students entering balloting windows.
 */
export interface QueueToken {
  tokenId: string;
  userId: string;
  priorityCategory: PriorityCategory;
  positionInQueue: number;
  estimatedWaitTimeSeconds: number;
  issuedAt: string;
}

/**
 * Hostel bedspace capacity and quota availability summary.
 */
export interface HostelQuotaSummary {
  hostelId: string;
  hostelName: string;
  campus: Campus;
  gender: Gender;
  totalCapacity: number;
  availableBedspaces: number;
  allocatedBedspaces: number;
}

/**
 * State object returned by balloting countdown engine.
 */
export interface BallotingCountdownState {
  currentWindow: BallotingWindow | null;
  timeRemainingSeconds: number;
  isWindowActive: boolean;
  quotas: HostelQuotaSummary[];
  queueToken?: QueueToken;
  totalQueuedUsers?: number;
}

/**
 * Detailed category quota breakdown for a hostel based on PRD 5.1 priority quotas:
 * Freshers 40%, Finalists 30%, Scholars & Special Needs 10%, Stallites 20%.
 */
export interface CategoryQuotaDetails {
  hostelId: string;
  hostelName: string;
  category: PriorityCategory;
  percentageShare: number;
  quotaLimit: number;
  allocatedCount: number;
  remainingQuota: number;
}

/**
 * Overall balloting eligibility status evaluating active window state and category quota availability.
 */
export interface BallotingEligibilityStatus {
  canBallot: boolean;
  reason: string;
  isWindowActive: boolean;
  categoryQuota?: CategoryQuotaDetails;
}
