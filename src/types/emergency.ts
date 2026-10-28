/**
 * Emergency SOS & Security Alert Type Definitions
 *
 * This file defines strict TypeScript data interfaces for student panic SOS triggers,
 * emergency alerts, emergency campus hotlines, and real-time alert status updates
 * within the UNILAG Hostel Management Mobile Application ('UnilagStay').
 */

/** Category of emergency alert triggered by student */
export type EmergencyAlertType = 'MEDICAL' | 'SECURITY' | 'FIRE' | 'GENERAL_PANIC';

/** Processing status of an emergency alert */
export type EmergencyAlertStatus = 'ACTIVE' | 'RESPONDED' | 'RESOLVED' | 'CANCELLED';

/**
 * Interface representing an emergency alert record stored in the Turso DB database.
 * Non-technical explanation: Represents an urgent cry for help raised by a student in a hostel room.
 */
export interface EmergencyAlert {
  /** Unique primary key identifier for the emergency alert */
  id: string;
  /** Unique ID of the student who triggered the panic SOS alert */
  studentId: string;
  /** Name of the student who raised the alert */
  studentName?: string;
  /** Matriculation number of the student */
  studentMatricNo?: string;
  /** Phone number of the student to reach immediately */
  studentPhone?: string;
  /** ID of the hostel where the emergency is happening */
  hostelId: string;
  /** Name of the hostel building (e.g., King Jaja Hall) */
  hostelName?: string;
  /** Room number of the student (e.g., Room 302) */
  roomNumber: string;
  /** Type of emergency (Medical, Security, Fire, General Panic) */
  alertType: EmergencyAlertType;
  /** Current resolution status of the alert */
  status: EmergencyAlertStatus;
  /** Optional notes or description provided by the student when raising the SOS */
  additionalNotes?: string;
  /** Timestamp when the emergency alert was created */
  createdAt: string;
  /** Optional timestamp when porter or security staff responded to the alert */
  respondedAt?: string;
  /** Optional timestamp when the emergency was officially resolved */
  resolvedAt?: string;
  /** Optional ID of the staff member (porter/warden) who resolved the issue */
  resolvedByStaffId?: string;
}

/**
 * Interface representing emergency campus hotlines for immediate phone calls.
 * Non-technical explanation: Phone directory for campus security, medical center, and fire safety.
 */
export interface EmergencyHotline {
  /** Unique identifier for the hotline contact */
  id: string;
  /** Name of the service or department (e.g., UNILAG Health Center Emergency) */
  title: string;
  /** Direct phone number to call */
  phoneNumber: string;
  /** Campus location covered by this hotline (MAIN_CAMPUS or CMUL_IDI_ARABA) */
  campus: 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA' | 'ALL';
  /** Short summary of when to call this hotline */
  description: string;
  /** Icon badge color for UI rendering */
  badgeColor: string;
}

/**
 * Request payload for triggering a new emergency panic SOS alert.
 */
export interface TriggerSOSRequest {
  /** ID of the student triggering the SOS */
  studentId: string;
  /** ID of the hostel building */
  hostelId: string;
  /** Room number */
  roomNumber: string;
  /** Type of emergency */
  alertType: EmergencyAlertType;
  /** Optional extra notes */
  additionalNotes?: string;
}

/**
 * Request payload for resolving or updating an active SOS alert.
 */
export interface ResolveSOSRequest {
  /** ID of the emergency alert to update */
  alertId: string;
  /** Staff ID or student ID updating the status */
  userId: string;
  /** New status (RESOLVED or CANCELLED) */
  status: 'RESOLVED' | 'CANCELLED';
  /** Optional resolution note */
  resolutionNotes?: string;
}
