/**
 * Maintenance Data Models and Types for UnilagStay Hostel Management App
 * Defines defect categories, urgency levels, target SLA response times, and ticket structures.
 */

export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'CARPENTRY'
  | 'MASONRY'
  | 'APPLIANCE'
  | 'STRUCTURAL';

export type MaintenancePriority = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

export type MaintenanceStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface DefectCategoryMetadata {
  category: MaintenanceCategory;
  label: string;
  description: string;
  defaultPriority: MaintenancePriority;
  targetSla: string; // e.g. "< 2 Hours", "< 24 Hours", etc.
  iconName: string;
}

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
  createdAt: string;
  resolvedAt?: string;
}

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
 * Category metadata mappings with target SLAs per PRD Section 8
 */
export const CATEGORY_METADATA: Record<MaintenanceCategory, DefectCategoryMetadata> = {
  PLUMBING: {
    category: 'PLUMBING',
    label: 'Plumbing & Water',
    description: 'Leaking taps, burst pipes, blocked drainage, toilet flush issues',
    defaultPriority: 'HIGH',
    targetSla: '< 24 Hours',
    iconName: 'water',
  },
  ELECTRICAL: {
    category: 'ELECTRICAL',
    label: 'Electrical & Power',
    description: 'Sparking sockets, power failure, bare wires, ceiling fan regulators',
    defaultPriority: 'EMERGENCY',
    targetSla: '< 2 Hours',
    iconName: 'flash',
  },
  CARPENTRY: {
    category: 'CARPENTRY',
    label: 'Carpentry & Woodwork',
    description: 'Broken doors, wardrobe handles, bed frame damage, squeaky furniture',
    defaultPriority: 'MEDIUM',
    targetSla: '< 48 Hours',
    iconName: 'hammer',
  },
  MASONRY: {
    category: 'MASONRY',
    label: 'Masonry & Wall',
    description: 'Cracked plaster, damp walls, broken tiles, floor damage',
    defaultPriority: 'LOW',
    targetSla: '< 72 Hours',
    iconName: 'construct',
  },
  APPLIANCE: {
    category: 'APPLIANCE',
    label: 'Appliance & Lighting',
    description: 'Faulty ceiling light fixtures, wall switches, socket panels',
    defaultPriority: 'MEDIUM',
    targetSla: '< 48 Hours',
    iconName: 'bulb',
  },
  STRUCTURAL: {
    category: 'STRUCTURAL',
    label: 'Window & Door Security',
    description: 'Broken window mesh, jammed door locks, broken glass panes',
    defaultPriority: 'HIGH',
    targetSla: '< 24 Hours',
    iconName: 'shield',
  },
};
