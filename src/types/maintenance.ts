/**
 * Maintenance Data Models and Types for UnilagStay Hostel Management App
 * Defines defect categories, urgency levels, target SLA response times, and ticket structures.
 * This file contains detailed, jargon-free English comments explaining data structures for developers.
 */

/**
 * Standard maintenance categories available for UNILAG hostel defect reports.
 */
export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'CARPENTRY'
  | 'MASONRY'
  | 'APPLIANCE'
  | 'STRUCTURAL';

/**
 * Priority levels indicating response urgency for facility repairs.
 */
export type MaintenancePriority = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Status values tracking lifecycle of a hostel maintenance ticket.
 */
export type MaintenanceStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CANCELLED';

/**
 * Metadata descriptor for each maintenance category including display labels and response SLA expectations.
 */
export interface DefectCategoryMetadata {
  category: MaintenanceCategory;
  label: string;
  description: string;
  defaultPriority: MaintenancePriority;
  targetSla: string; // Target SLA string e.g. "< 2 Hours", "< 24 Hours"
  iconName: string;
}

/**
 * Complete maintenance ticket entity stored in Turso database.
 */
export interface MaintenanceTicket {
  id: string;
  studentId: string;
  hostelId: string;
  roomNumber: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  photoBeforeUrl: string;
  photoAfterUrl?: string;
  status: MaintenanceStatus;
  targetSla: string;
  assignedArtisanId?: string;
  studentFeedback?: string;
  rating?: number;
  confirmedAt?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * Input parameters required to create a new repair ticket.
 */
export interface CreateTicketParams {
  studentId: string;
  hostelId: string;
  roomNumber: string;
  category: MaintenanceCategory;
  priority?: MaintenancePriority;
  description: string;
  photoBeforeUrl: string;
}

/**
 * Parameters for student confirmation of resolved maintenance fix.
 */
export interface ConfirmResolutionParams {
  ticketId: string;
  studentId: string;
  rating: number;
  studentFeedback?: string;
}

/**
 * Filter options for viewing tickets by status.
 */
export type StatusFilterOption = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

/**
 * Mappings for defect categories with user-friendly descriptions and target SLAs per PRD Section 8.
 */
export const CATEGORY_METADATA: Record<MaintenanceCategory, DefectCategoryMetadata> = {
  PLUMBING: {
    category: 'PLUMBING',
    label: 'Plumbing & Water',
    description: 'Leaking taps, burst pipes, blocked drainage, or toilet flushing issues',
    defaultPriority: 'HIGH',
    targetSla: '< 24 Hours',
    iconName: 'water',
  },
  ELECTRICAL: {
    category: 'ELECTRICAL',
    label: 'Electrical & Power',
    description: 'Sparking sockets, power outage, bare wires, or ceiling fan regulator faults',
    defaultPriority: 'EMERGENCY',
    targetSla: '< 2 Hours',
    iconName: 'flash',
  },
  CARPENTRY: {
    category: 'CARPENTRY',
    label: 'Carpentry & Woodwork',
    description: 'Broken doors, wardrobe handles, damaged bed frames, or squeaky furniture',
    defaultPriority: 'MEDIUM',
    targetSla: '< 48 Hours',
    iconName: 'hammer',
  },
  MASONRY: {
    category: 'MASONRY',
    label: 'Masonry & Wall',
    description: 'Cracked wall plaster, dampness, broken floor tiles, or ceiling cracks',
    defaultPriority: 'LOW',
    targetSla: '< 72 Hours',
    iconName: 'construct',
  },
  APPLIANCE: {
    category: 'APPLIANCE',
    label: 'Appliance & Lighting',
    description: 'Faulty ceiling light fittings, broken wall switches, or socket panels',
    defaultPriority: 'MEDIUM',
    targetSla: '< 48 Hours',
    iconName: 'bulb',
  },
  STRUCTURAL: {
    category: 'STRUCTURAL',
    label: 'Window & Door Security',
    description: 'Broken window wire mesh, jammed door locks, or broken window glass panes',
    defaultPriority: 'HIGH',
    targetSla: '< 24 Hours',
    iconName: 'shield',
  },
};
