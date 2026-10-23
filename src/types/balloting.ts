import { PriorityCategory, Campus, Gender } from './auth';
import { Bedspace } from './reservation';

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
 * Summary details of a hostel room including block, floor, room number, and bedspaces list
 * for student selection during the balloting window.
 */
export interface BallotingRoomSummary {
  id: string;
  hostelId: string;
  hostelName: string;
  blockName: string;
  floorNumber: number;
  roomNumber: string;
  totalBeds: number;
  occupiedBeds: number;
  bedspaces: Bedspace[];
}
