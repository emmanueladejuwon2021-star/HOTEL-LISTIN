/**
 * Emergency SOS & Security Alert Domain Types for UNILAG Hostel Management Ecosystem ("UnilagStay").
 *
 * Defines structures for student panic SOS triggers, active emergency alert records,
 * emergency status transitions, and university emergency hotline contact directories.
 *
 * Implements:
 * - [EMERGENCY-01] Emergency Panic SOS Trigger & Porter Alarm - Feature Component 1 (Issue #66)
 *
 * Adheres strictly to PRD Section 4.10, 6, 9 (emergency_alerts table DDL), 12 (TC-007), and 15 (UAT-0066).
 * Documented in clear English for non-technical university administrators, wardens, and students.
 */

export type EmergencyAlertType = 'MEDICAL_OR_SECURITY' | 'FIRE' | 'DISTRESS' | 'OTHER';

export type EmergencyAlertStatus = 'ACTIVE' | 'RESPONDED' | 'RESOLVED' | 'CANCELLED';

/**
 * Entity representation of an emergency SOS alert record stored in Turso DB.
 */
export interface EmergencyAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentMatric: string;
  studentPhone: string;
  hostelId: string;
  hostelName: string;
  roomNumber: string;
  alertType: EmergencyAlertType;
  status: EmergencyAlertStatus;
  location?: string;
  porterNotified: boolean;
  wardenNotified: boolean;
  createdAt: string;
  respondedAt?: string | null;
  resolvedAt?: string | null;
}

/**
 * Parameters required when a student triggers a 3-second panic SOS button.
 */
export interface TriggerSosParams {
  studentId: string;
  alertType?: EmergencyAlertType;
  notes?: string;
}

/**
 * University emergency hotline contact details.
 */
export interface EmergencyContact {
  id: string;
  title: string;
  category: 'HEALTH_CENTER' | 'SECURITY' | 'HALL_PORTER' | 'FIRE_STATION';
  phone: string;
  location: string;
  description: string;
  isAvailable24_7: boolean;
}

/**
 * Zustand store state interface for Emergency SOS feature.
 */
export interface EmergencyStoreState {
  holdProgress: number; // 0 to 1 representing 3-second hold countdown progress
  isTriggering: boolean;
  activeAlert: EmergencyAlert | null;
  emergencyContacts: EmergencyContact[];
  isLoading: boolean;
  errorMessage: string | null;

  setHoldProgress: (progress: number) => void;
  triggerSos: (params: TriggerSosParams) => Promise<EmergencyAlert>;
  fetchActiveAlert: (studentId: string) => Promise<EmergencyAlert | null>;
  cancelSos: (alertId: string, studentId: string) => Promise<void>;
  resetSosState: () => void;
}
