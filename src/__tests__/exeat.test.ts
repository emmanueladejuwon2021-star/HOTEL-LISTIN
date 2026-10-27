import { ExeatService } from '../api/exeatService';
import { AuthService } from '../api/authService';
import { GatePassService } from '../api/gatepassService';
import { useExeatStore } from '../store/useExeatStore';

describe('ExeatService & Night Exeat Workflow [EXEAT-01, EXEAT-02, EXEAT-03, EXEAT-04 / UAT-0064]', () => {
  const studentId = `test_student_exeat_${Date.now()}`;
  const wardenId = `test_warden_exeat_${Date.now()}`;
  const todayStr = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    await ExeatService.initializeSchema();
    const client = AuthService.getDbClient();

    // Seed test student
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Exeat Test Student', ?, 'hash123', '08012345678', 'STUDENT', 'MALE', 1)`,
      args: [studentId, `MAT_${studentId}`, `${studentId}@unilag.edu.ng`]
    });

    // Seed test student profile
    await client.execute({
      sql: `INSERT INTO student_profiles (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status, residency_status)
            VALUES (?, 'Engineering', 'Electrical', 400, 'MAIN_CAMPUS', 'FINALIST', 1, 'APPROVED', 'ACTIVE_RESIDENT')`,
      args: [studentId]
    });

    // Seed test warden
    await client.execute({
      sql: `INSERT INTO users (id, matric_or_staff_no, full_name, email, password_hash, phone_number, role, gender, is_active)
            VALUES (?, ?, 'Warden Test Officer', ?, 'hash123', '08087654321', 'WARDEN', 'MALE', 1)`,
      args: [wardenId, `STAFF_${wardenId}`, `${wardenId}@unilag.edu.ng`]
    });
  });

  describe('Submit Exeat Request [EXEAT-01 / UAT-0061]', () => {
    test('should submit a valid exeat request and persist to Turso DB', async () => {
      const payload = {
        studentId,
        destinationAddress: '15 Ikeja GRA, Lagos',
        reason: 'Family weekend gathering',
        departureDate: todayStr,
        returnDate: todayStr
      };

      const result = await ExeatService.submitExeatRequest(payload);

      expect(result.id).toBeDefined();
      expect(result.studentId).toBe(studentId);
      expect(result.destinationAddress).toBe('15 Ikeja GRA, Lagos');
      expect(result.reason).toBe('Family weekend gathering');
      expect(result.wardenApprovalStatus).toBe('PENDING');

      const requests = await ExeatService.getStudentExeatRequests(studentId);
      expect(requests.length).toBeGreaterThan(0);
      expect(requests[0].id).toBe(result.id);
    });

    test('should reject exeat submission if departure date is after return date', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      await expect(
        ExeatService.submitExeatRequest({
          studentId,
          destinationAddress: 'Destination',
          reason: 'Reason',
          departureDate: tomorrow,
          returnDate: todayStr
        })
      ).rejects.toThrow('Departure date cannot be later than the return date.');
    });

    test('should throw error when submitting for non-existent student ID', async () => {
      await expect(
        ExeatService.submitExeatRequest({
          studentId: 'non_existent_student_id_123',
          destinationAddress: 'Destination',
          reason: 'Reason',
          departureDate: todayStr,
          returnDate: todayStr
        })
      ).rejects.toThrow('was not found.');
    });
  });

  describe('Warden Exeat Review Workflow [EXEAT-03 / UAT-0063]', () => {
    let pendingExeatId: string;

    beforeEach(async () => {
      const created = await ExeatService.submitExeatRequest({
        studentId,
        destinationAddress: '5 Allen Avenue, Ikeja',
        reason: 'Medical examination',
        departureDate: todayStr,
        returnDate: todayStr
      });
      pendingExeatId = created.id;
    });

    test('should retrieve pending exeat requests for Warden review queue', async () => {
      const pendingList = await ExeatService.getPendingExeatRequests();
      expect(pendingList.length).toBeGreaterThan(0);
      const found = pendingList.find(r => r.id === pendingExeatId);
      expect(found).toBeDefined();
      expect(found?.wardenApprovalStatus).toBe('PENDING');
    });

    test('should allow Warden to approve an exeat request with comment', async () => {
      const reviewed = await ExeatService.reviewExeatRequest({
        exeatId: pendingExeatId,
        wardenId,
        approvalStatus: 'APPROVED',
        wardenComment: 'Permission granted. Ensure safe return by return date.'
      });

      expect(reviewed.wardenApprovalStatus).toBe('APPROVED');
      expect(reviewed.wardenId).toBe(wardenId);
      expect(reviewed.wardenComment).toBe('Permission granted. Ensure safe return by return date.');
    });

    test('should allow Warden to decline an exeat request with feedback', async () => {
      const reviewed = await ExeatService.reviewExeatRequest({
        exeatId: pendingExeatId,
        wardenId,
        approvalStatus: 'DECLINED',
        wardenComment: 'Unjustified reason during exam period.'
      });

      expect(reviewed.wardenApprovalStatus).toBe('DECLINED');
      expect(reviewed.wardenComment).toBe('Unjustified reason during exam period.');
    });
  });

  describe('Active Approved Exeat & Curfew Gate Integration [EXEAT-02 / UAT-0062]', () => {
    let approvedExeatId: string;

    beforeAll(async () => {
      const created = await ExeatService.submitExeatRequest({
        studentId,
        destinationAddress: '42 Lekki Phase 1, Lagos',
        reason: 'Overnight research study',
        departureDate: todayStr,
        returnDate: todayStr
      });
      approvedExeatId = created.id;

      await ExeatService.reviewExeatRequest({
        exeatId: approvedExeatId,
        wardenId,
        approvalStatus: 'APPROVED',
        wardenComment: 'Approved for research'
      });
    });

    test('should return active approved exeat permission covering today', async () => {
      const active = await ExeatService.getActiveApprovedExeat(studentId, todayStr);
      expect(active).not.toBeNull();
      expect(active?.id).toBe(approvedExeatId);
      expect(active?.wardenApprovalStatus).toBe('APPROVED');
    });

    test('should grant gate access during curfew hours (23:00) when approved exeat exists', async () => {
      const pass = await GatePassService.generateDynamicGatePass(studentId, 60);
      const gateResult = await GatePassService.verifyGatePass(pass.tokenString, 'porter_test_1', 'ENTRY', 23);

      expect(gateResult.accessGranted).toBe(true);
      expect(gateResult.accessStatus).toBe('GRANTED');
      expect(gateResult.message).toContain('ACCESS GRANTED');
    });
  });

  describe('Exeat Cancellation, Date Extension, Filtering & Auto-Expiry [EXEAT-04 / UAT-0064]', () => {
    let pendingToCancelId: string;
    let approvedToExtendId: string;

    beforeEach(async () => {
      const pending = await ExeatService.submitExeatRequest({
        studentId,
        destinationAddress: '10 Maryland Crescent, Lagos',
        reason: 'Weekend retreat',
        departureDate: todayStr,
        returnDate: todayStr
      });
      pendingToCancelId = pending.id;

      const approved = await ExeatService.submitExeatRequest({
        studentId,
        destinationAddress: '20 Yaba Tech Road, Lagos',
        reason: 'Conference attendance',
        departureDate: todayStr,
        returnDate: todayStr
      });
      await ExeatService.reviewExeatRequest({
        exeatId: approved.id,
        wardenId,
        approvalStatus: 'APPROVED',
        wardenComment: 'Safe journey'
      });
      approvedToExtendId = approved.id;
    });

    test('should allow student to cancel a pending exeat request', async () => {
      const cancelled = await ExeatService.cancelExeatRequest({
        exeatId: pendingToCancelId,
        studentId,
        cancellationReason: 'Event postponed due to weather'
      });

      expect(cancelled.wardenApprovalStatus).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Event postponed due to weather');
    });

    test('should reject cancellation by unauthorized student ID', async () => {
      await expect(
        ExeatService.cancelExeatRequest({
          exeatId: pendingToCancelId,
          studentId: 'other_student_999',
          cancellationReason: 'Attempted hack'
        })
      ).rejects.toThrow('Unauthorized: You can only cancel your own exeat requests.');
    });

    test('should allow student to request a return date extension for an approved exeat', async () => {
      const newReturnDate = '2026-11-15';
      const extended = await ExeatService.requestExeatExtension({
        exeatId: approvedToExtendId,
        studentId,
        newReturnDate,
        extensionReason: 'Medical specialist appointment extended'
      });

      expect(extended.wardenApprovalStatus).toBe('PENDING');
      expect(extended.returnDate).toBe(newReturnDate);
      expect(extended.originalReturnDate).toBe(todayStr);
      expect(extended.extensionReason).toBe('Medical specialist appointment extended');
      expect(extended.isExtended).toBe(true);
    });

    test('should reject return date extension if new return date is not after current return date', async () => {
      await expect(
        ExeatService.requestExeatExtension({
          exeatId: approvedToExtendId,
          studentId,
          newReturnDate: todayStr,
          extensionReason: 'Invalid date test'
        })
      ).rejects.toThrow('New return date must be later than the current scheduled return date.');
    });

    test('should filter exeat records by approval status and search keyword', async () => {
      const filtered = await ExeatService.getFilteredExeatRequests({
        studentId,
        status: 'APPROVED',
        search: 'Yaba'
      });

      expect(filtered).toBeDefined();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].destinationAddress).toContain('Yaba');
    });

    test('should automatically transition past unreturned exeat records to EXPIRED status', async () => {
      const client = AuthService.getDbClient();
      const pastDate = '2020-01-01';
      const expiredTestId = `exeat_past_${Date.now()}`;

      // Insert an unreturned exeat record from 2020
      await client.execute({
        sql: `INSERT INTO exeat_requests (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status)
              VALUES (?, ?, 'Old Address', 'Old Leave', ?, ?, 'APPROVED')`,
        args: [expiredTestId, studentId, pastDate, pastDate]
      });

      const expiredCount = await ExeatService.markExpiredExeatRequests(todayStr);
      expect(expiredCount).toBeGreaterThan(0);

      const records = await ExeatService.getStudentExeatRequests(studentId);
      const expiredRecord = records.find(r => r.id === expiredTestId);
      expect(expiredRecord?.wardenApprovalStatus).toBe('EXPIRED');
    });
  });

  describe('Zustand useExeatStore Integration [EXEAT-04]', () => {
    test('should manage cancellation and extension actions in store', async () => {
      const store = useExeatStore.getState();

      const created = await ExeatService.submitExeatRequest({
        studentId,
        destinationAddress: 'Store Test Address',
        reason: 'Store Test Reason',
        departureDate: todayStr,
        returnDate: todayStr
      });

      const cancelSuccess = await store.cancelExeat({
        exeatId: created.id,
        studentId,
        cancellationReason: 'Cancelled via Zustand store'
      });

      expect(cancelSuccess).toBe(true);
      expect(useExeatStore.getState().successMessage).toContain('cancelled successfully');

      // Test filter in store
      await store.filterRequests({ studentId, status: 'CANCELLED' });
      expect(useExeatStore.getState().filteredRequests.length).toBeGreaterThan(0);
    });
  });
});
