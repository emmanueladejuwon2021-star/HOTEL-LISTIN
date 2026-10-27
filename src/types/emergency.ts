/**
 * TypeScript Type Definitions for Emergency SOS Panic Trigger & Hotline Directory.
 * Implements [EMERGENCY-02] (Issue #67 / UAT-0067) for UnilagStay.
 *
 * Defines structures for panic trigger alerts, category types,
 * alert status lifecycle, and campus emergency hotlines.
 */

export type EmergencyType = 'MEDICAL' | 'FIRE' | 'SECURITY' | 'GENERAL_PANIC';

export type EmergencyStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';

/**
 * Represents an active or historical Emergency SOS alert triggered by a resident student.
 */
export interface EmergencyAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentMatric: string;
  studentPhone: string;
  hostelName: string;
  roomNumber: string;
  emergencyType: EmergencyType;
  description?: string;
  status: EmergencyStatus;
  acknowledgedByPorterId?: string;
  acknowledgedByPorterName?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  triggeredAt: string;
}

/**
 * Represents an emergency hotline phone contact in UNILAG campus.
 */
export interface EmergencyHotline {
  id: string;
  department: string; // e.g., 'UNILAG Medical Centre', 'Campus Security Command', 'Fire Unit'
  phoneNumber: string;
  description: string;
  isAvailable24_7: boolean;
  priorityOrder: number;
}

/**
 * Request parameters for triggering a panic SOS alert.
 */
export interface TriggerSOSParams {
  studentId: string;
  emergencyType: EmergencyType;
  description?: string;
}

/**
 * Request parameters for acknowledging or resolving a panic alert.
 */
export interface UpdateAlertStatusParams {
  alertId: string;
  porterId: string;
  status: 'ACKNOWLEDGED' | 'RESOLVED';
  resolutionNotes?: string;
}
