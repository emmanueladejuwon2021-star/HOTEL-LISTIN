import { AuthService } from '../api/authService';
import { validateMatricOrStaffNo, validatePassword } from '../utils/validation';

describe('[AUTH-01] Authentication & Turso DB Integration Tests', () => {
  const testPassword = 'password123';
  const hashedPassword = AuthService.hashPassword(testPassword);

  beforeAll(async () => {
    // Initialize Turso/SQLite database schema and seed test user
    await AuthService.initializeSchema();
    const client = AuthService.getDbClient();

    // Seed test student with password_hash column
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['usr_190407088', '190407088', 'Olaoluwa Adebayo', '190407088@live.unilag.edu.ng', '+2348123456789', 'STUDENT', 'MALE', hashedPassword, 1]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['usr_190407088', 'Engineering', 'Systems Engineering', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED']
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
});
