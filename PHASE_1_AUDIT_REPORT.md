# PHASE 1 AUDIT REPORT & PRIORITISED IMPLEMENTATION ROADMAP
## UNILAG Hostel Management Ecosystem ("UnilagStay")
**Repository**: `emmanueladejuwon2021-star/HOTEL-LISTIN`
**Product**: UnilagStay — Mobile Hostel Allocation & Management System
**Date**: May 2024
**Audit Scope**: Phase 1 Roadmap & Codebase Audit (PRD.md, ISSUES.md, `.agent/` Rules, Source Code, Test Matrix)

---

## EXECUTIVE SUMMARY

This audit report evaluates the current state of the **UnilagStay** repository against the Master Production PRD (`PRD.md`), the 100 atomic issues defined in `ISSUES.md`, and the architectural security rules in `.agent/`.

The application is in active development. Of the 100 planned atomic issues, **25 issues** have initial service and screen implementations in `src/`, while **75 issues** are planned but not yet implemented. Furthermore, existing implementations require security hardening and test configuration fixes before live deployment or processing real payments.

Per Phase 1 requirements, **no features were implemented or code modified during this audit**, and Issue #23 remains untouched until explicitly authorized.

---

## 1. COMPREHENSIVE ROADMAP & CODEBASE AUDIT

### 1.1 Summary Breakdown of Planned Work vs Implementation State

| Implementation Status | Count | Issue Numbers | Scope Summary |
| :--- | :--- | :--- | :--- |
| **Already Implemented & Verified** | **0** | N/A | Test pipeline currently blocked by `ts-jest` setup in Jest config. |
| **Implemented / Partially Implemented (Needs Testing & Security Hardening)** | **25** | Issues #1–#25 | Auth (`authService.ts`), Eligibility (`eligibilityService.ts`), Balloting (`ballotingService.ts`), Bedspace Reservation (`reservationService.ts`), Payment Hold (`paymentService.ts`), Clearance (`clearanceService.ts`). |
| **Planned — Not Yet Implemented** | **75** | Issues #26–#100 | Room Check-In Audit (#26–#30), Dynamic QR Gate Pass & Scanner (#31–#40), Offline Verification Queue (#41–#45), Visitor Passes (#46–#50), Maintenance Tickets & Artisan Queue (#51–#60), Night Exeat & Warden Approvals (#61–#65), Emergency SOS (#66–#70), Roommate Matching & Swaps (#71–#75), Warden Dashboard & Disciplinary Flagging (#76–#85), Noticeboard Broadcasts (#86–#90), Database Schema & CI/CD (#91–#100). |
| **Blocked / External Dependency** | **5** | Issues #16–#20 | Remita Production Gateway credentials & server-side IPN Webhook endpoint. |

---

## 2. HIGHEST-RISK PROBLEMS BEFORE PRODUCTION & REAL PAYMENTS

### Risk 1: Client-Side Database Credentials & Direct Edge Connection
- **Risk Severity**: 🔴 CRITICAL (Security)
- **Problem Description**: Currently `AuthService.getDbClient()` connects directly to Turso Edge database using client-side environment variables or local fallback. Exposing Turso auth tokens inside mobile client bundles allows malicious users to reverse-engineer app binaries and inspect/modify any database record.
- **Addressing Issue Numbers**: Issues #1–#5, #91–#95.
- **Remediation Plan**: Secure Turso credentials behind a backend API proxy service or restricted server-side middleware with role-based JWT validation.

### Risk 2: Password Salt Hardcoding & Weak JWT Token Signatures
- **Risk Severity**: 🔴 CRITICAL (Security & Identity)
- **Problem Description**: Password hashing in `authService.ts` relies on a hardcoded static salt string (`UNILAG_STAY_SECRET_SALT`), making hashed passwords susceptible to rainbow table attacks. Session tokens use string concatenation (`jwt_session_token_${user.id}_${Date.now()}`) rather than cryptographically signed RSA-256 JWT tokens.
- **Addressing Issue Numbers**: Issues #1–#5, #31–#35, #41–#45.
- **Remediation Plan**: Implement unique per-user bcrypt/Argon2 salts and RSA-256 dynamic signed JWT tokens stored in `expo-secure-store`.

### Risk 3: Unverified Remita Transactions & Client-Only Payment Confirmation
- **Risk Severity**: 🔴 CRITICAL (Payment & Allocation Integrity)
- **Problem Description**: `paymentService.ts` allows client-triggered verification without server-to-server webhook confirmation from Remita. A malicious actor could spoof payment success calls to claim bedspaces without paying N25,000.
- **Addressing Issue Numbers**: Issues #16–#20.
- **Remediation Plan**: Require trusted backend webhook (IPN) verification validating amount, currency, transaction status, and payment reference before updating `bedspaces.status` to `CONFIRMED`.

### Risk 4: Concurrent Allocation Race Conditions
- **Risk Severity**: 🟠 HIGH (Bedspace Integrity)
- **Problem Description**: High-concurrency balloting (up to 25,000 requests/minute during peak balloting) can lead to double-allocating the same bedspace if atomic locks (`BEGIN TRANSACTION ... FOR UPDATE`) are not strictly enforced at the SQLite/libSQL engine level.
- **Addressing Issue Numbers**: Issues #11–#15.
- **Remediation Plan**: Implement atomic SQL transaction locks with automated 72-hour expiration background sweepers.

### Risk 5: Jest Test Pipeline Configuration Block
- **Risk Severity**: 🟡 MEDIUM (Reliability & CI/CD)
- **Problem Description**: Running `npm test` fails with `Preset ts-jest not found relative to rootDir`. Tests cannot execute until Jest configuration and dependencies are aligned.
- **Addressing Issue Numbers**: Issues #96–#100.
- **Remediation Plan**: Configure `jest.config.js` to correctly resolve `ts-jest` or Babel transforms for TypeScript files.

---

## 3. IMPORTANT GAPS NOT ADEQUATELY COVERED BY EXISTING ISSUES

1. **Server-Side API Gateway Proxy**: Existing issues cover mobile frontend components and direct libSQL client calls, but do not explicitly specify the server-side API proxy layer required to conceal Turso credentials from mobile clients.
2. **Remita Webhook IPN Endpoint**: Remita payment callback webhooks require a publicly accessible backend listener service to reconcile pending transactions safely.
3. **Offline Schema Migration & Multi-Device Sync**: Detailed conflict resolution rules when multiple porters scan gate passes offline and re-sync simultaneously when network reconnects.

---

## 4. RECOMMENDED IMPLEMENTATION ORDER & DEPENDENCIES

To ensure stability, security, and integrity, work must proceed in the following prioritized sequence:

```
[Phase A: Infrastructure & Test Pipeline Fix]
       │
       ▼
[Priority 1: Security & Identity (#1–#5, #91–#95)]
  (RSA-256 JWTs, Secure Store, Password Salting, RBAC)
       │
       ▼
[Priority 2: Bedspace & Transaction Integrity (#6–#20)]
  (Atomic Locks, Quotas, Remita Backend Verification, 72h Hold Recycler)
       │
       ▼
[Priority 3: Complete Student Journey (#21–#25, #31–#35)]
  (Document Clearance, Clearance Slips, Student Dynamic QR Pass)
       │
       ▼
[Priority 4: Staff Operations & Offline Functionality (#26–#30, #36–#70, #76–#90)]
  (Porter Scanner, Offline Queue, Visitor Passes, Maintenance, Exeats, Wardens)
       │
       ▼
[Priority 5: Reliability, Stress Testing & Release (#71–#75, #96–#100)]
  (Roommate Matching, Stress Tests, Clean Build & Release Pipelines)
```

---

## 5. CONCRETE ACCEPTANCE CRITERIA & QA TEST MATRIX

### Critical Workflow Test Scenarios

1. **TC-001 (Eligibility & Fees Guard)**:
   - *Criteria*: An unverified/unpaid student cannot access the balloting selector screen.
   - *Test*: Query `student_profiles.fees_paid`. If `0`, UI locks balloting button and displays tuition payment support banner.

2. **TC-002 (Atomic Bedspace Lock)**:
   - *Criteria*: When two students tap the same bedspace simultaneously, exactly one succeeds and receives a 72-hour hold; the other receives a "Bed space locked by another student" notification.
   - *Test*: Execute concurrent SQL transactions on `bedspaces.status = 'AVAILABLE'`.

3. **TC-003 (72-Hour Hold Auto-Recycle)**:
   - *Criteria*: Beds locked under `LOCKED_HOLD` whose `hold_expires_at < CURRENT_TIMESTAMP` automatically revert to `AVAILABLE` status.
   - *Test*: Run timer sweeper service and verify bed availability status updates.

4. **TC-004 (Offline Porter QR Verification)**:
   - *Criteria*: Porter app verifies student dynamic QR code signature offline in < 500ms using local public key.
   - *Test*: Disconnect device network, scan student pass, confirm GREEN banner and audit log recorded in local SQLite queue.

5. **TC-005 (Remita Payment Signature & Verification)**:
   - *Criteria*: Payment status transitions to `SUCCESSFUL` only after server validates amount (N25,000), currency (NGN), reference, and signature with Remita API.
   - *Test*: Verify invalid payment references are rejected with error code 400/422.

---

## CONCLUSION & NEXT STEPS

- **Audit Complete**: Phase 1 audit report delivered.
- **No Code Changes Applied**: Application codebase and GitHub issues remain unchanged per instructions.
- **Pending Direction**: Awaiting review and authorization before proceeding to Phase 3 issue-by-issue execution (starting with Issue #23 when requested).
