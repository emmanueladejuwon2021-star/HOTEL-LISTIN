import { create } from 'zustand';
import { AuthSession, User, UserRole } from '../types/auth';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: UserRole | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isAuthenticated: false,
  isLoading: false,
  activeRole: null,

  setSession: (session: AuthSession) => {
    set({
      session,
      isAuthenticated: true,
      activeRole: session.user.role,
      isLoading: false
    });
  },

  clearSession: () => {
    set({
      session: null,
      isAuthenticated: false,
      activeRole: null,
      isLoading: false
    });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  }
}));
