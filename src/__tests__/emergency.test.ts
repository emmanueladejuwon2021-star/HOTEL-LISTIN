/**
 * Zero-Mock Integration Tests for Emergency Panic SOS Trigger & Porter Alarm System.
 *
 * Covers:
 * - [EMERGENCY-01 / UAT-0066] Emergency Panic SOS Trigger & Porter Alarm (Issue #66)
 *
 * Verifies real-time Turso libSQL SQLite database queries, active alert creation, duplicate alert prevention,
 * false-alarm cancellation, emergency hotline contact retrieval, and Zustand store actions.
 */

import { createClient } from '@libsql/client';
import { EmergencyService } from '../api/emergencyService';
import { useEmergencyStore } from '../store/useEmergencyStore';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:unilagstay.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

describe('Emergency Panic SOS Trigger System [EMERGENCY-01 / UAT-0066]', () => {
  const testStudentId = 'usr_student_emergency_test_01';
  const testHostelId = 'hostel_jaja';

  beforeAll(async () => {
    // Setup database schema and seed test student user
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        matric_or_staff_no TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT NOT NULL,
        role TEXT CHECK(role IN ('STUDENT', 'PORTER', 'WARDEN', 'MAINTENANCE', 'ADMIN')) NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE')) NOT NULL,
        profile_photo_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        faculty TEXT NOT NULL,
        department TEXT NOT NULL,
        level INTEGER NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        priority_category TEXT CHECK(priority_category IN ('FRESHER', 'FINALIST', 'SCHOLAR', 'SPECIAL_NEEDS', 'STALLITE')) NOT NULL,
        fees_paid INTEGER DEFAULT 0,
        clearance_status TEXT CHECK(clearance_status IN ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'NOT_STARTED'
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS hostels (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
        campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
        category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
        total_capacity INTEGER NOT NULL,
        available_bedspaces INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        hostel_id TEXT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
        block_name TEXT NOT NULL,
        floor_number INTEGER NOT NULL,
        room_number TEXT NOT NULL,
        total_beds INTEGER DEFAULT 4,
        occupied_beds INTEGER DEFAULT 0
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS bedspaces (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        bed_label TEXT NOT NULL,
        status TEXT CHECK(status IN ('AVAILABLE', 'LOCKED_HOLD', 'CONFIRMED', 'MAINTENANCE_BLOCKED')) DEFAULT 'AVAILABLE',
        allocated_to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        hold_expires_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES users(id),
        hostel_id TEXT NOT NULL REFERENCES hostels(id),
        room_number TEXT NOT NULL,
        alert_type TEXT DEFAULT 'MEDICAL_OR_SECURITY',
        status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED', 'CANCELLED')) DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Clean up existing records for test student
    await client.execute({ sql: `DELETE FROM emergency_alerts WHERE student_id = ?`, args: [testStudentId] });
    await client.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [testStudentId] });
    await client.execute({ sql: `DELETE FROM hostels WHERE id = ?`, args: [testHostelId] });

    // Seed student user, hostel, room, and bedspace
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, phone_number, role, gender)
            VALUES (?, '210408999', 'Emergency Test Student', 'sos_test@unilag.edu.ng', '+2348111222333', 'STUDENT', 'MALE')`,
      args: [testStudentId],
    });

    await client.execute({
      sql: `INSERT INTO hostels (id, name, gender, campus, category, total_capacity, available_bedspaces)
            VALUES (?, 'King Jaja Hall Test', 'MALE', 'MAIN_CAMPUS', 'UNDERGRADUATE', 100, 50)`,
      args: [testHostelId],
    });

    await client.execute({
      sql: `INSERT INTO rooms (id, hostel_id, block_name, floor_number, room_number)
            VALUES ('room_jaja_sos_101', ?, 'Block A', 1, 'Room A-101')`,
      args: [testHostelId],
    });

    await client.execute({
      sql: `INSERT INTO bedspaces (id, room_id, bed_label, status, allocated_to_user_id)
            VALUES ('bed_jaja_sos_01', 'room_jaja_sos_101', 'Bed A Down', 'CONFIRMED', ?)`,
      args: [testStudentId],
    });
  });

  afterEach(async () => {
    await client.execute({ sql: `DELETE FROM emergency_alerts WHERE student_id = ?`, args: [testStudentId] });
    useEmergencyStore.getState().resetSosState();
  });

  test('[EMERGENCY-01 / UAT-0066] should trigger 3-second panic SOS and create ACTIVE alert record in Turso DB', async () => {
    const alert = await EmergencyService.triggerSosAlert({
      studentId: testStudentId,
      alertType: 'MEDICAL_OR_SECURITY',
    });

    expect(alert).toBeDefined();
    expect(alert.id).toContain('sos_');
    expect(alert.studentId).toBe(testStudentId);
    expect(alert.studentName).toBe('Emergency Test Student');
    expect(alert.status).toBe('ACTIVE');
    expect(alert.roomNumber).toBe('Room A-101');
    expect(alert.hostelName).toBe('King Jaja Hall Test');

    // Verify record exists in database
    const dbCheck = await client.execute({
      sql: `SELECT status FROM emergency_alerts WHERE id = ?`,
      args: [alert.id],
    });
    expect(dbCheck.rows.length).toBe(1);
    expect(String(dbCheck.rows[0].status)).toBe('ACTIVE');
  });

  test('should return existing ACTIVE alert when student re-triggers SOS panic button', async () => {
    const alert1 = await EmergencyService.triggerSosAlert({ studentId: testStudentId });
    const alert2 = await EmergencyService.triggerSosAlert({ studentId: testStudentId });

    expect(alert1.id).toBe(alert2.id);
    expect(alert2.status).toBe('ACTIVE');
  });

  test('should cancel false-alarm emergency SOS alert and update DB status to RESOLVED', async () => {
    const alert = await EmergencyService.triggerSosAlert({ studentId: testStudentId });
    expect(alert.status).toBe('ACTIVE');

    await EmergencyService.cancelSosAlert(alert.id, testStudentId);

    const activeAlert = await EmergencyService.getActiveSosAlert(testStudentId);
    expect(activeAlert).toBeNull();

    const dbCheck = await client.execute({
      sql: `SELECT status FROM emergency_alerts WHERE id = ?`,
      args: [alert.id],
    });
    expect(String(dbCheck.rows[0].status)).toBe('RESOLVED');
  });

  test('should retrieve standard university emergency hotline contacts', async () => {
    const contacts = await EmergencyService.getEmergencyContacts();
    expect(contacts.length).toBeGreaterThanOrEqual(3);

    const healthCenter = contacts.find((c) => c.category === 'HEALTH_CENTER');
    expect(healthCenter).toBeDefined();
    expect(healthCenter?.phone).toContain('234');

    const security = contacts.find((c) => c.category === 'SECURITY');
    expect(security).toBeDefined();
  });

  test('Zustand useEmergencyStore manages panic hold progress and async trigger actions', async () => {
    const store = useEmergencyStore.getState();

    store.setHoldProgress(0.5);
    expect(useEmergencyStore.getState().holdProgress).toBe(0.5);

    await store.triggerSos({ studentId: testStudentId });
    expect(useEmergencyStore.getState().activeAlert).not.toBeNull();
    expect(useEmergencyStore.getState().activeAlert?.studentId).toBe(testStudentId);

    await store.fetchActiveAlert(testStudentId);
    expect(useEmergencyStore.getState().emergencyContacts.length).toBeGreaterThan(0);

    const currentAlertId = useEmergencyStore.getState().activeAlert!.id;
    await store.cancelSos(currentAlertId, testStudentId);
    expect(useEmergencyStore.getState().activeAlert).toBeNull();
  });
});
