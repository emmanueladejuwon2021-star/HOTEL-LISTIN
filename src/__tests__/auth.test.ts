import { AuthService } from '../api/authService';
import { validateMatricOrStaffNo, validatePassword } from '../utils/validation';
import { useAuthStore } from '../store/useAuthStore';

describe('[AUTH-01 to AUTH-05] Authentication & Turso DB Integration Tests', () => {
  const testPassword = 'password123';
  const hashedPassword = AuthService.hashPassword(testPassword);

  beforeAll(async () => {
    // Initialize Turso/SQLite database schema and seed test user
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Clean existing user records with matric 190407088 and inactive test user
    await client.execute({ sql: `DELETE FROM student_profiles WHERE user_id IN ('usr_190407088', 'usr_190407099') OR user_id IN (SELECT id FROM users WHERE matric_or_staff_no IN ('190407088', '190407099'))`, args: [] });
    await client.execute({ sql: `DELETE FROM users WHERE id IN ('usr_190407088', 'usr_190407099') OR matric_or_staff_no IN ('190407088', '190407099')`, args: [] });

    // Seed test active student with password_hash column
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['usr_190407088', '190407088', 'Olaoluwa Adebayo', '190407088@live.unilag.edu.ng', '+2348123456789', 'STUDENT', 'MALE', hashedPassword, 1]
    });

    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['usr_190407088', 'Engineering', 'Systems Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED']
    });

    // Seed test inactive student for session deactivation testing
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['usr_190407099', '190407099', 'Inactive Student', '190407099@live.unilag.edu.ng', '+2348123456780', 'STUDENT', 'FEMALE', hashedPassword, 0]
    });
  });

  describe('Matriculation & Staff No Validation', () => {
    test('validates 9-digit UNILAG undergraduate matric number', () => {
      const res = validateMatricOrStaffNo('190407088');
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    test('validates 10-digit UTME temp registration number', () => {
      const res = validateMatricOrStaffNo('2024109882');
      expect(res.isValid).toBe(true);
    });

    test('validates UNILAG Staff ID format', () => {
      const res = validateMatricOrStaffNo('STAFF/1042');
      expect(res.isValid).toBe(true);
    });

    test('rejects empty input', () => {
      const res = validateMatricOrStaffNo('');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('required');
    });

    test('rejects invalid character string', () => {
      const res = validateMatricOrStaffNo('ABC!@#$');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('valid 9-digit UNILAG Matric Number');
    });
  });

  describe('Password Validation', () => {
    test('accepts valid password >= 6 characters', () => {
      const res = validatePassword('unilag2024');
      expect(res.isValid).toBe(true);
    });

    test('rejects short password < 6 characters', () => {
      const res = validatePassword('123');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('6 characters');
    });
  });

  describe('Live Turso DB Authentication Query Execution', () => {
    test('authenticates valid UNILAG student credentials directly from Turso DB', async () => {
      const session = await AuthService.login({
        identifier: '190407088',
        password: testPassword
      });

      expect(session).toBeDefined();
      expect(session.user.matricOrStaffNo).toBe('190407088');
      expect(session.user.fullName).toBe('Olaoluwa Adebayo');
      expect(session.user.role).toBe('STUDENT');
      expect(session.studentProfile).toBeDefined();
      expect(session.studentProfile?.department).toBe('Systems Engineering');
      expect(session.studentProfile?.level).toBe(400);
      expect(session.token).toContain('jwt_session_token_usr_190407088');
    });

    test('rejects authentication when wrong password is supplied', async () => {
      await expect(
        AuthService.login({
          identifier: '190407088',
          password: 'wrong_password_123'
        })
      ).rejects.toThrow('Invalid credentials');
    });

    test('throws account not found error for non-existent student in Turso DB', async () => {
      await expect(
        AuthService.login({
          identifier: '999999999',
          password: testPassword
        })
      ).rejects.toThrow('Account not found');
    });

    test('throws validation error for invalid matric format', async () => {
      await expect(
        AuthService.login({
          identifier: 'invalid_id',
          password: testPassword
        })
      ).rejects.toThrow('valid 9-digit UNILAG Matric Number');
    });
  });

  describe('[AUTH-05] Session Persistence, Token Validation & Logout Lifecycle', () => {
    test('validates active student session token against live Turso DB', async () => {
      const validToken = 'jwt_session_token_usr_190407088_1234567890';
      const session = await AuthService.validateSession(validToken, 'usr_190407088');

      expect(session).toBeDefined();
      expect(session.user.id).toBe('usr_190407088');
      expect(session.user.fullName).toBe('Olaoluwa Adebayo');
      expect(session.studentProfile?.department).toBe('Systems Engineering');
    });

    test('rejects session validation when token format does not match user ID', async () => {
      const badToken = 'jwt_session_token_usr_WRONG_1234567890';
      await expect(
        AuthService.validateSession(badToken, 'usr_190407088')
      ).rejects.toThrow('Session invalid: Session token format is unverified or expired.');
    });

    test('rejects session validation when user account is deactivated in Turso DB', async () => {
      const inactiveUserToken = 'jwt_session_token_usr_190407099_1234567890';
      await expect(
        AuthService.validateSession(inactiveUserToken, 'usr_190407099')
      ).rejects.toThrow('Session expired or account deactivated. Please log in again.');
    });

    test('restores session successfully into Zustand auth store', async () => {
      const validToken = 'jwt_session_token_usr_190407088_1234567890';
      const store = useAuthStore.getState();

      const success = await store.restoreSession(validToken, 'usr_190407088');
      expect(success).toBe(true);

      const updatedState = useAuthStore.getState();
      expect(updatedState.isAuthenticated).toBe(true);
      expect(updatedState.activeRole).toBe('STUDENT');
      expect(updatedState.session?.user.fullName).toBe('Olaoluwa Adebayo');
    });

    test('handles logout and clears session store completely', async () => {
      const store = useAuthStore.getState();
      await store.logoutUser();

      const stateAfterLogout = useAuthStore.getState();
      expect(stateAfterLogout.isAuthenticated).toBe(false);
      expect(stateAfterLogout.session).toBeNull();
      expect(stateAfterLogout.activeRole).toBeNull();
    });
  });
});
