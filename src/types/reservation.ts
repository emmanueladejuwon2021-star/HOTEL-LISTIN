export type BedspaceStatus = 'AVAILABLE' | 'LOCKED_HOLD' | 'CONFIRMED' | 'MAINTENANCE_BLOCKED';

export interface Bedspace {
  id: string;
  roomId: string;
  bedLabel: string; // e.g. 'Bed A Down', 'Bed A Up', 'Bed B Down', 'Bed B Up'
  status: BedspaceStatus;
  allocatedToUserId?: string;
  holdExpiresAt?: string;
  updatedAt: string;
}

export interface RoomDetails {
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

export interface LockBedspaceResult {
  success: boolean;
  paymentId?: string;
  bedspaceId: string;
  bedLabel: string;
  roomNumber: string;
  hostelName: string;
  amount: number;
  holdExpiresAt: string;
  message: string;
}

/**
 * Interface representing the details of an active 72-hour hostel room payment hold.
 * Contains information about the reserved bed, hostel location, payment amount, and countdown timer.
 */
export interface PaymentHoldDetails {
  paymentId: string;
  userId: string;
  bedspaceId: string;
  hostelName: string;
  blockName: string;
  roomNumber: string;
  bedLabel: string;
  amount: number;
  transactionReference: string;
  paymentStatus: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  holdExpiresAt: string;
  secondsRemaining: number;
  isExpired: boolean;
}

/**
 * Interface representing the result of confirming a payment through the Remita gateway.
 * Confirms that payment was successful and the bed reservation is officially finalized.
 */
export interface PaymentConfirmationResult {
  success: boolean;
  paymentId: string;
  transactionReference: string;
  paymentStatus: 'SUCCESSFUL';
  bedspaceStatus: 'CONFIRMED';
  confirmedAt: string;
  message: string;
}
