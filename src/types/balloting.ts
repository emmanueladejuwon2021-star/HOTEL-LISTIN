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
 * Parameters for filtering available hostels during balloting selection.
 */
export interface HostelFilterParams {
  gender?: Gender;
  campus?: Campus;
  category?: 'UNDERGRADUATE' | 'POSTGRADUATE';
}

/**
 * Category-level priority quota breakdown details.
 */
export interface CategoryQuotaBreakdown {
  category: PriorityCategory;
  categoryLabel: string;
  sharePercentage: number;
  allocatedBeds: number;
  availableBeds: number;
  totalQuotaBeds: number;
}

/**
 * Summary analytics for hostel priority category quota allocations.
 */
export interface QuotaAnalyticsSummary {
  hostelId?: string;
  hostelName?: string;
  totalCapacity: number;
  totalAvailableBedspaces: number;
  categoryBreakdown: CategoryQuotaBreakdown[];
}

/**
 * Filtered hostel details with quota availability for student selector.
 */
export interface FilteredHostelSummary extends HostelQuotaSummary {
  category: 'UNDERGRADUATE' | 'POSTGRADUATE';
  blocksCount?: number;
}

/**
 * Room details with bedspace statuses for real-time interactive bed grid.
 */
export interface BallotingRoomDetails {
  id: string;
  hostelId: string;
  hostelName: string;
  blockName: string;
  floorNumber: number;
  roomNumber: string;
  totalBeds: number;
  occupiedBeds: number;
  bedspaces: Array<{
    id: string;
    roomId: string;
    bedLabel: string;
    status: 'AVAILABLE' | 'LOCKED_HOLD' | 'CONFIRMED' | 'MAINTENANCE_BLOCKED';
    allocatedToUserId?: string;
    holdExpiresAt?: string;
    updatedAt: string;
  }>;
}
