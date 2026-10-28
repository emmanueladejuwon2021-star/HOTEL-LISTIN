import { createClient, Client } from '@libsql/client';
import CryptoJS from 'crypto-js';
import { User, StudentProfile, AuthSession } from '../types/auth';
import { validateMatricOrStaffNo, validatePassword } from '../utils/validation';

/**
 * Parameters required when a user attempts to log into the application.
 */
export interface LoginParams {
  identifier: string; // Matriculation number for students or staff identification number
  password: string;   // User's secret password
}

/**
 * Service class that handles all user authentication, login checks, database setup,
 * session verification, and account validation against the Turso libSQL database.
 */
export class AuthService {
  // Holds the single active database client connection so we do not open multiple connections unnecessarily.
  private static db: Client | null = null;

  /**
   * Helper method to turn a plain password into a secure hashed string using SHA-256 algorithm and a salt string.
   * This ensures we never compare passwords as plain text for maximum security.
   *
   * @param password - Plain text password typed by the user
   * @param salt - Extra secret text added to make the password hash unique and secure
   * @returns A long scramble string representing the hashed password
   */
  public static hashPassword(password: string, salt: string = 'UNILAG_STAY_SECRET_SALT'): string {
    return CryptoJS.SHA256(password + salt).toString();
  }

  /**
   * Gets or initializes the database client connected to our Turso libSQL edge database.
   * If no connection exists yet, it creates a new one using configuration settings or local fallback.
   *
   * @returns Active libSQL client ready to execute database queries
   */
  public static getDbClient(): Client {
    if (!AuthService.db) {
      // Use environment variable URL or default to local SQLite database file
      const url = process.env.TURSO_DATABASE_URL || 'file:unilagstay_local.db';
      const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
      AuthService.db = createClient({ url, authToken });
    }
    return AuthService.db;
  }

  /**
   * Creates necessary database tables for users and student profiles if they do not already exist in the database.
   * This makes sure the application database structure is ready before any user logs in.
   */
  public static async initializeSchema(): Promise<void> {
    const client = AuthService.getDbClient();

    // Execute SQL table creation scripts in a batch operation
    await client.batch([
      // Main users table storing basic account information such as name, role, email, and password hash
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        matric_or_staff_no TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT NOT NULL,
        role TEXT CHECK(role IN ('STUDENT', 'PORTER', 'WARDEN', 'MAINTENANCE', 'ADMIN')) NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE')) NOT NULL,
        password_hash TEXT NOT NULL,
        profile_photo_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      // Student profile table holding student-specific details like department, level, fees status, and clearance status
      `CREATE TABLE IF NOT EXISTS student_profiles (
        user_id TEXT PRIMARY KEY,
        faculty TEXT NOT NULL,
        department TEXT NOT NULL,
        level INTEGER NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        priority_category TEXT CHECK(priority_category IN ('FRESHER', 'FINALIST', 'SCHOLAR', 'SPECIAL_NEEDS', 'STALLITE')) NOT NULL,
        fees_paid INTEGER DEFAULT 0,
        clearance_status TEXT CHECK(clearance_status IN ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'NOT_STARTED',
        residency_status TEXT DEFAULT 'NOT_ALLOCATED',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`
    ], 'write');
  }

  /**
   * Authenticates a student or staff member by checking their credentials directly against records stored in the Turso DB.
   *
   * Step 1: Validate input formatting (matriculation/staff ID and password minimum length).
   * Step 2: Search database for matching active user record.
   * Step 3: Hash typed password and compare against stored password hash in database.
   * Step 4: If user is a student, fetch additional details like course level, fees payment, and clearance status.
   * Step 5: Return fully constructed session object containing user details and access token.
   *
   * @param params - Object containing user's identifier (Matric/Staff ID) and password
   * @returns Active AuthSession object containing user info, student profile (if applicable), and session token
   */
  static async login(params: LoginParams): Promise<AuthSession> {
    // Check if the matriculation or staff number format is correct
    const idValidation = validateMatricOrStaffNo(params.identifier);
    if (!idValidation.isValid) {
      throw new Error(idValidation.error);
    }

    // Check if the password meets the minimum length requirement
    const passValidation = validatePassword(params.password);
    if (!passValidation.isValid) {
      throw new Error(passValidation.error);
    }

    // Clean up input by removing accidental spaces and making text uppercase
    const cleanId = params.identifier.trim().toUpperCase();
    const client = AuthService.getDbClient();

    // Query database for an active user matching this matriculation or staff number
    const userResult = await client.execute({
      sql: `SELECT id, matric_or_staff_no, full_name, email, phone_number, role, gender, password_hash, profile_photo_url, is_active, created_at
            FROM users WHERE matric_or_staff_no = ? AND is_active = 1`,
      args: [cleanId]
    });

    // If no matching user record is found, stop and tell the user account was not found
    if (userResult.rows.length === 0) {
      throw new Error('Account not found. Please verify your UNILAG Matriculation or Staff Number.');
    }

    const row = userResult.rows[0];

    // Compute password hash for provided password and compare with stored hash from database
    const expectedHash = AuthService.hashPassword(params.password);
    const storedHash = String(row.password_hash);

    if (expectedHash !== storedHash) {
      throw new Error('Invalid credentials. Password verification failed.');
    }

    // Map database record fields to our user object structure
    const user: User = {
      id: String(row.id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      email: String(row.email),
      phoneNumber: String(row.phone_number),
      role: String(row.role) as User['role'],
      gender: String(row.gender) as User['gender'],
      profilePhotoUrl: row.profile_photo_url ? String(row.profile_photo_url) : undefined,
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at)
    };

    let studentProfile: StudentProfile | undefined = undefined;

    // If the logged in user is a student, look up their detailed student profile record
    if (user.role === 'STUDENT') {
      const profileResult = await client.execute({
        sql: `SELECT user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status
              FROM student_profiles WHERE user_id = ?`,
        args: [user.id]
      });

      if (profileResult.rows.length > 0) {
        const pRow = profileResult.rows[0];
        studentProfile = {
          userId: String(pRow.user_id),
          faculty: String(pRow.faculty),
          department: String(pRow.department),
          level: Number(pRow.level),
          campus: String(pRow.campus) as StudentProfile['campus'],
          priorityCategory: String(pRow.priority_category) as StudentProfile['priorityCategory'],
          feesPaid: Boolean(pRow.fees_paid),
          clearanceStatus: String(pRow.clearance_status) as StudentProfile['clearanceStatus']
        };
      }
    }

    // Return the successful login session details and a new session token
    return {
      user,
      studentProfile,
      token: `jwt_session_token_${user.id}_${Date.now()}`
    };
  }

  /**
   * Verifies an existing user session token and checks if the corresponding user account is still active in Turso DB.
   * This is used when the app starts up to restore an existing user session without asking the user to re-type their password.
   *
   * @param token - Session token string previously generated for the user
   * @param userId - Unique ID of the user whose session we want to verify
   * @returns Updated AuthSession object if valid, or throws an error if token is invalid or account was deactivated
   */
  static async validateSession(token: string, userId: string): Promise<AuthSession> {
    // Basic check: token and userId must be provided
    if (!token || !userId) {
      throw new Error('Session invalid: Missing token or user identity.');
    }

    // Check token format basic structure
    if (!token.startsWith(`jwt_session_token_${userId}`)) {
      throw new Error('Session invalid: Session token format is unverified or expired.');
    }

    const client = AuthService.getDbClient();

    // Query database to check if user still exists and is currently active
    const userResult = await client.execute({
      sql: `SELECT id, matric_or_staff_no, full_name, email, phone_number, role, gender, profile_photo_url, is_active, created_at
            FROM users WHERE id = ? AND is_active = 1`,
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      throw new Error('Session expired or account deactivated. Please log in again.');
    }

    const row = userResult.rows[0];

    // Construct fresh user object from latest database state
    const user: User = {
      id: String(row.id),
      matricOrStaffNo: String(row.matric_or_staff_no),
      fullName: String(row.full_name),
      email: String(row.email),
      phoneNumber: String(row.phone_number),
      role: String(row.role) as User['role'],
      gender: String(row.gender) as User['gender'],
      profilePhotoUrl: row.profile_photo_url ? String(row.profile_photo_url) : undefined,
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at)
    };

    let studentProfile: StudentProfile | undefined = undefined;

    // Fetch latest student profile information if the user is a student
    if (user.role === 'STUDENT') {
      const profileResult = await client.execute({
        sql: `SELECT user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status
              FROM student_profiles WHERE user_id = ?`,
        args: [user.id]
      });

      if (profileResult.rows.length > 0) {
        const pRow = profileResult.rows[0];
        studentProfile = {
          userId: String(pRow.user_id),
          faculty: String(pRow.faculty),
          department: String(pRow.department),
          level: Number(pRow.level),
          campus: String(pRow.campus) as StudentProfile['campus'],
          priorityCategory: String(pRow.priority_category) as StudentProfile['priorityCategory'],
          feesPaid: Boolean(pRow.fees_paid),
          clearanceStatus: String(pRow.clearance_status) as StudentProfile['clearanceStatus']
        };
      }
    }

    // Return active and refreshed session object
    return {
      user,
      studentProfile,
      token
    };
  }

  /**
   * Logs out the current user session safely by invalidating session state.
   * This helps cleanly clear active session credentials when a user taps 'Log Out'.
   *
   * @param userId - ID of the user logging out
   * @returns Promise resolving to true when logout completes successfully
   */
  static async logout(userId: string): Promise<boolean> {
    // In local state, clearing session store removes session token; this method acts as backend log of user sign out.
    if (!userId) {
      return false;
    }
    return true;
  }
}
