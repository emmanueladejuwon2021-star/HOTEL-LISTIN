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
