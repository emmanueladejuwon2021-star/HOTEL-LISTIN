import { create } from 'zustand';
import { AuthSession, UserRole } from '../types/auth';
import { AuthService } from '../api/authService';

/**
 * State definition for the application's global authentication store.
 * Tracks session details, login status, active user role, and loading state.
 */
interface AuthState {
  // Current logged in session containing user info, profile, and session token
  session: AuthSession | null;
  // Boolean flag indicating if a valid user is currently logged in
  isAuthenticated: boolean;
  // Boolean flag indicating if an authentication process (like logging in or verifying token) is in progress
  isLoading: boolean;
  // Role of the active user ('STUDENT', 'PORTER', 'WARDEN', 'MAINTENANCE', 'ADMIN')
  activeRole: UserRole | null;
  // Action to save a new authenticated session in state
  setSession: (session: AuthSession) => void;
  // Action to completely clear session state when user logs out or session expires
  clearSession: () => void;
  // Action to update loading spinner state
  setLoading: (loading: boolean) => void;
  // Action to verify an existing stored session against the Turso DB on app launch
  restoreSession: (token: string, userId: string) => Promise<boolean>;
  // Action to perform clean logout
  logoutUser: () => Promise<void>;
}

/**
 * Global Zustand store managing user session lifecycle across screens.
 * Uses jargon-free logic so any developer can easily see how user login and logout work.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isAuthenticated: false,
  isLoading: false,
  activeRole: null,

  /**
   * Saves a newly authenticated user session and updates logged-in status.
   *
   * @param session - Verified AuthSession returned from login or token restore
   */
  setSession: (session: AuthSession) => {
    set({
      session,
      isAuthenticated: true,
      activeRole: session.user.role,
      isLoading: false
    });
  },

  /**
   * Resets all authentication store variables back to their initial empty values.
   * Called on logout or when session token validation fails.
   */
  clearSession: () => {
    set({
      session: null,
      isAuthenticated: false,
      activeRole: null,
      isLoading: false
    });
  },

  /**
   * Sets whether the authentication state is currently loading data from DB or waiting for a response.
   *
   * @param isLoading - True if busy, false if done
   */
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  /**
   * Restores and re-verifies a user session when the app opens up.
   * Connects to AuthService.validateSession to confirm user account is still active in Turso DB.
   *
   * @param token - Session token string
   * @param userId - User ID to verify
   * @returns True if session was restored, false if session was invalid
   */
  restoreSession: async (token: string, userId: string): Promise<boolean> => {
    set({ isLoading: true });
    try {
      // Validate token and query latest user record from Turso DB
      const session = await AuthService.validateSession(token, userId);
      get().setSession(session);
      return true;
    } catch (err) {
      // If validation fails (e.g. account disabled or bad token), clear session state cleanly
      get().clearSession();
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Logs out the user completely by notifying backend service and clearing local Zustand store state.
   */
  logoutUser: async (): Promise<void> => {
    const currentSession = get().session;
    if (currentSession?.user?.id) {
      try {
        await AuthService.logout(currentSession.user.id);
      } catch {
        // Ignore logout network errors and ensure local store state is cleared regardless
      }
    }
    get().clearSession();
  }
}));
