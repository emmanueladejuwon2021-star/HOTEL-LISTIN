/**
 * Emergency SOS & Security Alert Zustand State Store
 *
 * Manages global application state for emergency panic SOS triggers, active alert tracking,
 * emergency campus hotlines, and loading state across student and porter mobile views.
 */

import { create } from 'zustand';
import { EmergencyService } from '../api/emergencyService';
import {
  EmergencyAlert,
  EmergencyHotline,
  TriggerSOSRequest,
  EmergencyAlertType
} from '../types/emergency';

interface EmergencyState {
  /** Currently active SOS alert triggered by student */
  activeAlert: EmergencyAlert | null;
  /** List of active hostel emergency alerts for porters/wardens */
  allActiveAlerts: EmergencyAlert[];
  /** Directory of campus emergency hotlines */
  hotlines: EmergencyHotline[];
  /** Loading state for API operations */
  isLoading: boolean;
  /** Error message if any operation fails */
  errorMessage: string | null;
  /** Success message for user feedback */
  successMessage: string | null;

  /** Actions */
  fetchHotlines: (campus?: string) => Promise<void>;
  fetchStudentActiveAlert: (studentId: string) => Promise<void>;
  fetchAllActiveAlerts: (hostelId?: string) => Promise<void>;
  triggerSOS: (params: TriggerSOSRequest) => Promise<EmergencyAlert | null>;
  cancelActiveAlert: (studentId: string) => Promise<boolean>;
  clearMessages: () => void;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  activeAlert: null,
  allActiveAlerts: [],
  hotlines: [],
  isLoading: false,
  errorMessage: null,
  successMessage: null,

  fetchHotlines: async (campus?: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const list = await EmergencyService.getEmergencyHotlines(campus);
      set({ hotlines: list, isLoading: false });
    } catch (err: any) {
      set({ errorMessage: err.message || 'Failed to load emergency hotlines', isLoading: false });
    }
  },

  fetchStudentActiveAlert: async (studentId: string) => {
    if (!studentId) return;
    set({ isLoading: true, errorMessage: null });
    try {
      const alert = await EmergencyService.getStudentActiveAlert(studentId);
      set({ activeAlert: alert, isLoading: false });
    } catch (err: any) {
      set({ errorMessage: err.message || 'Failed to check active SOS status', isLoading: false });
    }
  },

  fetchAllActiveAlerts: async (hostelId?: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const alerts = await EmergencyService.getActiveAlerts(undefined, hostelId);
      set({ allActiveAlerts: alerts, isLoading: false });
    } catch (err: any) {
      set({ errorMessage: err.message || 'Failed to fetch active emergency alerts', isLoading: false });
    }
  },

  triggerSOS: async (params: TriggerSOSRequest) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const alert = await EmergencyService.triggerSOS(params);
      set({
        activeAlert: alert,
        isLoading: false,
        successMessage: 'EMERGENCY SOS TRIGGERED: Security & Porter desk notified!'
      });
      return alert;
    } catch (err: any) {
      set({
        errorMessage: err.message || 'Failed to trigger emergency SOS alert',
        isLoading: false
      });
      return null;
    }
  },

  cancelActiveAlert: async (studentId: string) => {
    const { activeAlert } = get();
    if (!activeAlert) return false;

    set({ isLoading: true, errorMessage: null });
    try {
      const success = await EmergencyService.cancelAlert(activeAlert.id, studentId);
      if (success) {
        set({
          activeAlert: null,
          isLoading: false,
          successMessage: 'Emergency alert cancelled successfully'
        });
        return true;
      }
      set({ isLoading: false, errorMessage: 'Could not cancel emergency alert' });
      return false;
    } catch (err: any) {
      set({ errorMessage: err.message || 'Failed to cancel emergency alert', isLoading: false });
      return false;
    }
  },

  clearMessages: () => {
    set({ errorMessage: null, successMessage: null });
  }
}));
