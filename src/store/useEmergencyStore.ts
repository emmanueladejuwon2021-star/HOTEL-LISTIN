/**
 * Zustand Store for Emergency Panic SOS & Security Alerts in UNILAG Hostel Management Ecosystem ("UnilagStay").
 *
 * Manages UI and async state for the 3-second panic button press progress, active emergency alert state,
 * emergency contact hotline directory, and cancellation/resolution actions.
 *
 * Implements:
 * - [EMERGENCY-01] Emergency Panic SOS Trigger & Porter Alarm - Feature Component 1 (Issue #66)
 *
 * Adheres strictly to PRD Section 4.10, 6 (Spec S-02), 12 (TC-007), and 15 (UAT-0066).
 * Documented in plain English for developers and stakeholders.
 */

import { create } from 'zustand';
import { EmergencyStoreState, TriggerSosParams } from '../types/emergency';
import { EmergencyService } from '../api/emergencyService';

export const useEmergencyStore = create<EmergencyStoreState>((set, get) => ({
  holdProgress: 0,
  isTriggering: false,
  activeAlert: null,
  emergencyContacts: [],
  isLoading: false,
  errorMessage: null,

  /**
   * Sets the 3-second long-press progress (0.0 to 1.0).
   */
  setHoldProgress: (progress: number) => {
    set({ holdProgress: Math.min(Math.max(progress, 0), 1) });
  },

  /**
   * Triggers an emergency SOS panic alert for an authenticated student.
   */
  triggerSos: async (params: TriggerSosParams) => {
    set({ isTriggering: true, errorMessage: null });
    try {
      const alert = await EmergencyService.triggerSosAlert(params);
      set({
        activeAlert: alert,
        isTriggering: false,
        holdProgress: 1,
      });
      return alert;
    } catch (error: any) {
      const msg = error.message || 'Failed to trigger emergency SOS alert.';
      set({
        isTriggering: false,
        errorMessage: msg,
      });
      throw error;
    }
  },

  /**
   * Fetches active SOS alert state for a student from Turso DB.
   */
  fetchActiveAlert: async (studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const [alert, contacts] = await Promise.all([
        EmergencyService.getActiveSosAlert(studentId),
        EmergencyService.getEmergencyContacts(),
      ]);
      set({
        activeAlert: alert,
        emergencyContacts: contacts,
        isLoading: false,
      });
      return alert;
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to fetch active SOS alert.',
      });
      return null;
    }
  },

  /**
   * Cancels a false-alarm SOS alert.
   */
  cancelSos: async (alertId: string, studentId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      await EmergencyService.cancelSosAlert(alertId, studentId);
      set({
        activeAlert: null,
        holdProgress: 0,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        errorMessage: error.message || 'Failed to cancel emergency SOS alert.',
      });
    }
  },

  /**
   * Resets emergency SOS store state to default.
   */
  resetSosState: () => {
    set({
      holdProgress: 0,
      isTriggering: false,
      activeAlert: null,
      isLoading: false,
      errorMessage: null,
    });
  },
}));
