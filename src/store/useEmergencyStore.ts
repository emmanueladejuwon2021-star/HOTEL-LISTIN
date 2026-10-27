import { create } from 'zustand';
import { EmergencyService } from '../api/emergencyService';
import {
  EmergencyAlert,
  EmergencyHotline,
  EmergencyType,
  TriggerSOSParams
} from '../types/emergency';

interface EmergencyState {
  activeAlert: EmergencyAlert | null;
  alertHistory: EmergencyAlert[];
  hotlines: EmergencyHotline[];
  isLoading: boolean;
  error: string | null;

  // Actions
  triggerSOS: (params: TriggerSOSParams) => Promise<EmergencyAlert>;
  cancelSOS: (studentId: string) => Promise<void>;
  loadHotlines: () => Promise<void>;
  loadStudentHistory: (studentId: string) => Promise<void>;
  clearError: () => void;
  resetState: () => void;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  activeAlert: null,
  alertHistory: [],
  hotlines: [],
  isLoading: false,
  error: null,

  triggerSOS: async (params: TriggerSOSParams) => {
    set({ isLoading: true, error: null });
    try {
      const alert = await EmergencyService.triggerEmergencySOS(params);
      set(state => ({
        activeAlert: alert,
        alertHistory: [alert, ...state.alertHistory],
        isLoading: false
      }));
      return alert;
    } catch (err: any) {
      const msg = err.message || 'Failed to trigger emergency panic alert.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  cancelSOS: async (studentId: string) => {
    const { activeAlert } = get();
    if (!activeAlert) return;

    set({ isLoading: true, error: null });
    try {
      await EmergencyService.cancelSOS(activeAlert.id, studentId);
      set(state => ({
        activeAlert: null,
        alertHistory: state.alertHistory.map(a =>
          a.id === activeAlert.id
            ? { ...a, status: 'FALSE_ALARM', resolutionNotes: 'Cancelled by student (False Alarm)' }
            : a
        ),
        isLoading: false
      }));
    } catch (err: any) {
      const msg = err.message || 'Failed to cancel emergency alert.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  loadHotlines: async () => {
    set({ isLoading: true, error: null });
    try {
      const hotlines = await EmergencyService.getCampusHotlines();
      set({ hotlines, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load emergency hotlines.', isLoading: false });
    }
  },

  loadStudentHistory: async (studentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const alertHistory = await EmergencyService.getStudentAlertHistory(studentId);
      const active = alertHistory.find(a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED') || null;
      set({ alertHistory, activeAlert: active, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load alert history.', isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  resetState: () => set({
    activeAlert: null,
    alertHistory: [],
    hotlines: [],
    isLoading: false,
    error: null
  })
}));
