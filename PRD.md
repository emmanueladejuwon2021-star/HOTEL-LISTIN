# MASTER PRODUCTION-GRADE PRODUCT REQUIREMENT DOCUMENT (PRD)
## UNILAG HOSTEL MANAGEMENT MOBILE APPLICATION ("UnilagStay")
### Exhaustive Non-Technical, Technical & System Architecture Specification

---

## 0. PHASE 3 STRICT IMPLEMENTATION PROTOCOL (MANDATORY FOR ALL AI AGENTS & ENGINEERS)

Before implementing any GitHub issue, every engineer or AI agent working on this repository MUST strictly read, understand, and adhere to this 9-step implementation process:

1. **Atomic Execution**: Implement exactly one GitHub issue at a time unless explicitly authorized by the project lead to work on a tightly related group.
2. **Pre-Execution Context Check**: Read the complete issue description, linked parent issue, dependencies, and relevant existing code in `src/`. Confirm exact acceptance criteria before editing.
3. **Architecture & Pattern Reuse**: Inspect existing architecture patterns (React Native, NativeWind v4, Zustand, Turso libSQL client) and reuse established conventions.
4. **Minimal Complete Changes**: Make the smallest complete code change that fully satisfies the issue requirements. Do not perform unrelated refactoring or alter product requirements silently.
5. **Strict Zero-Mock Policy**: Never write mock code, placeholder functions, dummy JSON data, or hardcoded UI stubs. All features must connect to live or local Turso libSQL SQLite database operations. Never use fake payment confirmations as proof of payment integration.
6. **Security & Secrets Protection**: Never expose secrets, database credentials, or Turso access tokens in mobile client bundles. Use server-side API proxies/middleware for sensitive operations. Store tokens securely using `expo-secure-store`.
7. **Comprehensive Automated & Manual Testing**: Add or update appropriate unit, integration, and UAT tests. Include failure cases, edge cases, and security checks. Run `npm test -- --runInBand`, type checks (`tsc`), and lint checks.
8. **Regression & Safety Inspection**: Inspect all modified files for unintended side effects, security flaws, exposed secrets, or breaking changes across isolated role navigation routes (Student, Porter, Warden, Maintenance).
9. **Traceable Completion Report**: Report files changed, behavior implemented, executed tests with pass/fail results, remaining risks, and blockers. Mark the issue complete ONLY when all acceptance criteria are genuinely satisfied and all required automated checks pass.

---

| Document Metadata | Specification Details |
| :--- | :--- |
| **Project Name** | UNILAG Hostel Management Mobile Ecosystem (`UnilagStay`) |
| **Document Type** | Comprehensive End-to-End Master Production PRD |
| **Target Platforms** | Android & iOS Mobile Native Application |
| **Frontend Framework** | React Native (Expo SDK 51+) with NativeWind v4 (Tailwind CSS) |
| **Database Architecture** | Turso (libSQL Distributed Edge SQLite with Local Offline Sync) |
| **Primary Campuses Covered** | UNILAG Main Campus (Akoka) & College of Medicine UNILAG (CMUL Idi-Araba) |
| **Target Audience** | Non-Technical University Officials, Wardens, Porters, Students & Engineering Team |
| **Document Version** | 3.5.0 (Ultimate Master Edition) |
| **Status** | Fully Approved for Mobile Frontend, Backend, & Database Engineering |

---

## TABLE OF CONTENTS
1. [EXECUTIVE SUMMARY & PRODUCT VISION](#1-executive-summary--product-vision)
2. [EXHAUSTIVE UNILAG & CMUL HOSTEL DIRECTORY & BLOCK LAYOUTS](#2-exhaustive-unilag--cmul-hostel-directory--block-layouts)
3. [USER PERSONAS & STRICT ROLE-BASED ACCESS CONTROL (RBAC)](#3-user-personas--strict-role-based-access-control-rbac)
4. [END-TO-END ACCOMMODATION WORKFLOWS & LIFECYCLES](#4-end-to-end-accommodation-workflows--lifecycles)
5. [REAL-TIME BALLOTING & BEDSPACE RESERVATION ENGINE MECHANICS](#5-real-time-balloting--bedspace-reservation-engine-mechanics)
6. [SCREEN-BY-SCREEN UI/UX SPECIFICATIONS (NATIVEWIND / TAILWIND CSS)](#6-screen-by-screen-uiux-specifications-nativewind--tailwind-css)
7. [OFFLINE-FIRST GATEKEEPER & QR SCANNER ARCHITECTURE](#7-offline-first-gatekeeper--qr-scanner-architecture)
8. [FACILITY MAINTENANCE & ARTISAN DISPATCH PROTOCOL](#8-facility-maintenance--artisan-dispatch-protocol)
9. [TURSO LIBSQL DATABASE SCHEMA (FULL DDL & SEED DATA)](#9-turso-libsql-database-schema-full-ddl--seed-data)
10. [STANDARD OPERATING PROCEDURES (SOPs) FOR NON-TECH USERS](#10-standard-operating-procedures-sops-for-non-tech-users)
11. [NON-FUNCTIONAL REQUIREMENTS, SECURITY & SCALABILITY](#11-non-functional-requirements-security--scalability)
12. [EXHAUSTIVE QA TEST MATRIX & ACCEPTANCE CRITERIA](#12-exhaustive-qa-test-matrix--acceptance-criteria)
13. [GLOSSARY OF UNILAG ACCOMMODATION TERMS](#13-glossary-of-unilag-accommodation-terms)
14. [DETAILED ROOM-BY-ROOM INVENTORY & FACILITY DIRECTORY](#14-detailed-room-by-room-inventory--facility-directory)
15. [USER ACCEPTANCE TEST MATRIX (100 COMPREHENSIVE SCENARIOS)](#15-user-acceptance-test-matrix-100-comprehensive-scenarios)

---

## 1. EXECUTIVE SUMMARY & PRODUCT VISION

### 1.1 Non-Technical Overview
The University of Lagos (UNILAG) is home to over 50,000 undergraduate and postgraduate students across its Akoka and CMUL Idi-Araba campuses. However, university-owned hostel bedspaces are limited to approximately 10,000 beds. This high demand historically created intense congestion during annual hostel applications, leading to server crashes, physical queueing at porter desks, illegal bedspace trading (subletting/squatting), and delayed maintenance reporting.

`UnilagStay` is a mobile application designed to simplify, secure, and automate every stage of hostel living for students, hall wardens, porters, and maintenance staff.
For non-technical users, the application transforms complex university procedures into intuitive mobile screens:
- **Students** can ballot for bedspaces from their phones, view their allocated room details, present a secure digital QR code to enter their hostel, submit repair requests with photos, apply for overnight permission (exeat), and generate visitor passes for friends.
- **Porters (Gatekeepers)** receive a simplified scanning tool with large, clear green and red indicators that instantly inform them whether a student or visitor is permitted entry, even when the internet is temporarily disconnected.
- **Hall Wardens** access an intuitive management dashboard that lets them review and approve student clearance documents, track hall occupancy in real time, handle disciplinary flags, and approve exeat requests with a single tap.
- **Maintenance Personnel (Artisans)** receive daily job assignments on a clean work queue that displays broken items, room numbers, and photographs, allowing them to upload proof of completed repairs.

### 1.2 Strategic Objectives & Core Metrics
1. **Zero Double-Allocation & Subletting Elimination**: Tie every bedspace to a verified UNILAG student matriculation number and dynamic QR pass with embedded biometric signature.
2. **Sub-Second Gate Screening**: Ensure porters can scan and verify student gate passes in under 500 milliseconds, eliminating long entry queues during rush hours.
3. **100% Digital Maintenance Tracking**: Replace paper incident books with digital tickets supported by required 'Before' and 'After' photographs.
4. **Equal & Fair Balloting**: Deploy an automated real-time balloting engine with quota allocation for freshers, finalists, sports scholars, and special needs students, backed by a 72-hour payment lock mechanism.

---

## 2. EXHAUSTIVE UNILAG & CMUL HOSTEL DIRECTORY & BLOCK LAYOUTS

This section details all public university-managed hostels across both UNILAG Main Campus (Akoka) and the College of Medicine UNILAG (CMUL, Idi-Araba).

### 1. King Jaja Hall
- **Category**: Male Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 1,200 Beds
- **Block Structure**: Blocks A, B, C, D (4 Floors each)
- **Allocation Priority**: 100L Freshers, 400L/500L Finalists, Athletes
- **Room Occupancy Standard**: 4 Students per room (Bunk Beds)
- **Key Infrastructure & Facilities**: Main Gate Porter Desk, Central Quadrangle, Reading Room, Buttering Kiosk

### 2. Augustus Mafeni Mariere Hall
- **Category**: Male Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 1,000 Beds
- **Block Structure**: Main High-Rise Complex (Wings 1, 2, 3)
- **Allocation Priority**: 200L, 300L Stallites & Finalists
- **Room Occupancy Standard**: 4 Students per room
- **Key Infrastructure & Facilities**: Ground Floor Porter Security Desk, Student Common Room, Table Tennis Area

### 3. Eni Njoku Hall
- **Category**: Male Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 850 Beds
- **Block Structure**: Blocks A, B, C (3 Floors each)
- **Allocation Priority**: Engineering & Science Faculties Priority
- **Room Occupancy Standard**: 4 Students per room
- **Key Infrastructure & Facilities**: Entrance Porter Station, Courtyard, Laundry Bay

### 4. Makama Bida Hall
- **Category**: Male Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 500 Beds
- **Block Structure**: Single Low-Rise Block Complex
- **Allocation Priority**: Direct Entry & Returning Stallites
- **Room Occupancy Standard**: 4-6 Students per room
- **Key Infrastructure & Facilities**: Front Security Desk, Kitchenette Area

### 5. Sodeinde Hall (BOA / Public)
- **Category**: Male Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 1,100 Beds
- **Block Structure**: High-Rise Wings A & B (6 Floors)
- **Allocation Priority**: Undergraduate & Merit Scholars
- **Room Occupancy Standard**: 2-4 Students per room (En-suite facilities)
- **Key Infrastructure & Facilities**: Main Lobby Security Scanner Desk, Dual Elevators, Study Room

### 6. El-Kanemi Hall
- **Category**: Male Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 600 Beds
- **Block Structure**: Chalet-Style Low-Rise Blocks 1-12
- **Allocation Priority**: Finalists & Sports Scholars
- **Room Occupancy Standard**: 4 Students per chalet room
- **Key Infrastructure & Facilities**: Perimeter Porter Gate, Pavilion Central Area

### 7. Moremi Hall
- **Category**: Female Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 1,400 Beds
- **Block Structure**: High-Rise Wings A, B, C (5 Floors)
- **Allocation Priority**: 100L Female Freshers & Finalists
- **Room Occupancy Standard**: 4 Students per room
- **Key Infrastructure & Facilities**: Central Porter Gate, Hair Salon / Commercial Bay, Common Room, Sick Bay Desk

### 8. Kofo Ademola Hall
- **Category**: Female Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 900 Beds
- **Block Structure**: Blocks A, B, C, D (3 Floors)
- **Allocation Priority**: Law, Arts & Social Science Females
- **Room Occupancy Standard**: 4 Students per room
- **Key Infrastructure & Facilities**: Main Gate Porter Office, Internal Garden Quadrangle

### 9. Fagunwa Hall
- **Category**: Female Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 800 Beds
- **Block Structure**: Main Wing Block A & B
- **Allocation Priority**: Returning Female Stallites
- **Room Occupancy Standard**: 4 Students per room
- **Key Infrastructure & Facilities**: Front Security Checkpoint, Reading Room

### 10. Madam Tinubu Hall (MTH)
- **Category**: Female Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 1,200 Beds
- **Block Structure**: Blocks 1, 2, 3, 4, 5, 6
- **Allocation Priority**: 100L Freshers & Medical Sciences
- **Room Occupancy Standard**: 4-6 Students per room
- **Key Infrastructure & Facilities**: Central Gate House, Dining Hall, Laundry Quadrangle

### 11. Biobaku Hall
- **Category**: Female Undergraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 650 Beds
- **Block Structure**: Main Block Wing A & B
- **Allocation Priority**: Education & Environmental Sciences
- **Room Occupancy Standard**: 4 Students per room
- **Key Infrastructure & Facilities**: Front Gate Porter Desk, Study Hall

### 12. Sodeinde Postgraduate Hall
- **Category**: Mixed PG (Male/Female)
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 400 Beds
- **Block Structure**: Executive Wing C
- **Allocation Priority**: M.Sc. & Ph.D. Postgraduate Scholars
- **Room Occupancy Standard**: 1-2 Students per room (Self-contained)
- **Key Infrastructure & Facilities**: Reception Desk, Quiet Study Lounge, Dedicated Parking

### 13. Henry Carr Hall
- **Category**: Male Postgraduate
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 500 Beds
- **Block Structure**: Blocks A & B
- **Allocation Priority**: Postgraduate Masters & Doctoral Students
- **Room Occupancy Standard**: 2 Students per room
- **Key Infrastructure & Facilities**: 24/7 Security Gatehouse, PG Common Room

### 14. Erastus Akingbola Hall
- **Category**: Mixed PG / Executive
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 350 Beds
- **Block Structure**: Executive Suites Block
- **Allocation Priority**: Executive PG & Foreign Exchange Students
- **Room Occupancy Standard**: Single En-suite Rooms
- **Key Infrastructure & Facilities**: Concierge Desk, Private Study Lounge

### 15. Honors Hall
- **Category**: Female PG / Undergrad
- **Campus Location**: Main Campus (Akoka)
- **Total Capacity**: 450 Beds
- **Block Structure**: Main Block
- **Allocation Priority**: High Academic Merit Female Scholars
- **Room Occupancy Standard**: 2-4 Students per room
- **Key Infrastructure & Facilities**: Security Porter Desk, Common Reading Room

### 16. CMUL Medical Student Hall
- **Category**: Male & Female Clinical
- **Campus Location**: CMUL (Idi-Araba)
- **Total Capacity**: 800 Beds
- **Block Structure**: Clinical Blocks 1, 2, 3
- **Allocation Priority**: 400L, 500L, 600L MBBS & BDS Students
- **Room Occupancy Standard**: 2-3 Students per room
- **Key Infrastructure & Facilities**: CMUL Main Security Gate, Clinical Call Room Lounge

### 17. CMUL Nursing & Allied Hall
- **Category**: Female Clinical
- **Campus Location**: CMUL (Idi-Araba)
- **Total Capacity**: 500 Beds
- **Block Structure**: Nursing Wing Blocks A & B
- **Allocation Priority**: Nursing, Radiography & Physiotherapy
- **Room Occupancy Standard**: 3-4 Students per room
- **Key Infrastructure & Facilities**: Porter Control Desk, Study Hall

### 18. CMUL Dental Hostel
- **Category**: Mixed Dental
- **Campus Location**: CMUL (Idi-Araba)
- **Total Capacity**: 300 Beds
- **Block Structure**: Dental Wing Block
- **Allocation Priority**: Dental Surgery Clinical Students
- **Room Occupancy Standard**: 2 Students per room
- **Key Infrastructure & Facilities**: Porter Desk, Common Lounge

### 19. CMUL Postgraduate Hostel
- **Category**: Mixed Medical PG
- **Campus Location**: CMUL (Idi-Araba)
- **Total Capacity**: 350 Beds
- **Block Structure**: PG Clinical Block
- **Allocation Priority**: Resident Doctors & Medical PG Scholars
- **Room Occupancy Standard**: Single En-suite Rooms
- **Key Infrastructure & Facilities**: Reception Desk, Conference Study Lounge

---

## 3. USER PERSONAS & STRICT ROLE-BASED ACCESS CONTROL (RBAC)

To eliminate user confusion and security vulnerabilities, `UnilagStay` implements **Strict Role-Based Isolated Navigation**. Users log in into dedicated interface modes based on their authenticated staff or student profile.

### 3.1 Role A: UNILAG Student
- **Target User Group**: Undergraduate & Postgraduate Students
- **Primary Responsibilities**: Navigates balloting, views digital room allocation slip, displays QR gate pass, requests maintenance fixes, generates visitor passes, applies for night exeat, views hostel noticeboard.
- **UI/UX Design Constraints**: High usability, dark mode support, rapid loading on 3G/4G networks, clear status banners.
- **Operational Environment**: Main Campus & CMUL Idi-Araba

### 3.2 Role B: Hostel Porter (Gatekeeper)
- **Target User Group**: Frontline Security & Hall Administration Officers
- **Primary Responsibilities**: Scans student and visitor QR passes at hostel gates, logs manual entries when necessary, conducts digital room check-in audits, views expected visitor lists, flags unauthorized entrants.
- **UI/UX Design Constraints**: Ultra-high contrast UI, massive tap targets (minimum 64dp touch targets), haptic vibration feedback, audible succeed/fail chimes, full offline operation.
- **Operational Environment**: Hostel Entrance Gatehouses & Porter Desks

### 3.3 Role C: Hall Warden & Student Affairs Administrator
- **Target User Group**: Senior University Administrative & Academic Staff
- **Primary Responsibilities**: Reviews student clearance submissions, approves/declines night exeat requests, monitors real-time hall occupancy metrics, issues hall announcements, manages disciplinary blacklists, oversees maintenance escalation.
- **UI/UX Design Constraints**: Tabular data overview, filterable search queues, exportable PDF/Excel summary reports, single-tap batch approvals.
- **Operational Environment**: Student Affairs Division & Warden Administrative Offices

### 3.4 Role D: Maintenance Artisan
- **Target User Group**: University Artisans (Plumbers, Electricians, Carpenters, Masons)
- **Primary Responsibilities**: Views assigned repair job queue, inspects student problem photos and descriptions, updates job status ('In Progress' / 'Completed'), uploads proof-of-completion photographs.
- **UI/UX Design Constraints**: Large visual job cards, camera capture integration, offline status logging.
- **Operational Environment**: Hostel Maintenance Workshops & Student Rooms

### 3.5 Role E: System Administrator (Super Admin)
- **Target User Group**: ICT & Student Affairs System Engineers
- **Primary Responsibilities**: Manages user role provisioning, configures hostel balloting quotas, overrides system locks, audits gate access logs, monitors Turso database replication metrics.
- **UI/UX Design Constraints**: Comprehensive system dashboard, audit trail logs, manual database override controls.
- **Operational Environment**: UNILAG CITS / Data Center

---

## 4. END-TO-END ACCOMMODATION WORKFLOWS & LIFECYCLES

### 4.1 Registration & Eligibility Verification Workflow
1. Student downloads UnilagStay mobile app and logs in with UNILAG Matriculation Number / UTME Number.
2. App queries central student database to check full tuition fee payment and course registration status.
3. System checks disciplinary database to ensure student is not under rustication or active hall suspension.
4. If eligible, system assigns priority quota tag (Fresher, Finalist, Scholar, Special Needs, Stallite) and displays 'Eligible for Balloting' badge.
5. If ineligible, app displays specific reason (e.g., 'School Fees Payment Unverified') with direct link to payment support.

### 4.2 Priority Quota Balloting & Reservation Workflow
1. Student opens Balloting Engine screen during designated balloting time window.
2. App presents real-time hostel selector filtered by student gender and campus location.
3. Student selects Hostel -> Block -> Floor -> Room -> Bedspace position.
4. Engine executes atomic lock transaction on selected bedspace for 72 hours.
5. App generates provisional booking slip with prominent 72-hour payment countdown clock.

### 4.3 Payment Confirmation & Digital Clearance Slip Workflow
1. Student taps 'Pay Hostel Fee' button in app to launch Remita / card payment gateway.
2. Upon successful transaction, backend updates bedspace status from 'LOCKED_HOLD' to 'CONFIRMED'.
3. App generates official Digital Accommodation Clearance Slip with encrypted dynamic QR code.
4. Student receives push notification and email confirmation with payment reference.

### 4.4 Physical Screening & Document Clearance Workflow
1. Student uploads required clearance documents (Medical Certificate, Passport Photo, Code of Conduct Form) in app.
2. Hall Warden / Porter reviews document package on admin dashboard.
3. Student presents physical originals at hostel porter desk for final physical inspection.
4. Porter scans student QR code and taps 'Approve Physical Clearance'. Status updates to 'Active Resident'.

### 4.5 Room Inventory Check-In & Inspection Audit Workflow
1. Student and Porter conduct joint inspection of assigned room upon key pickup.
2. Porter opens Room Audit screen and completes digital checklist (Mattress, Fan, Lights, Windows, Locks).
3. Student and Porter sign directly on smartphone touchscreen.
4. Digital audit certificate is generated and stored permanently in Turso database.

### 4.6 Gatekeeper Verification & QR Access Workflow
1. Student approaches hostel gate and opens UnilagStay app to display dynamic QR pass.
2. Porter scans QR code using high-speed camera scanner screen.
3. App validates dynamic token signature offline or online in < 500ms.
4. Screen flashes GREEN with loud chime for approved access, or RED with alert chime for denied entry.

### 4.7 Visitor Pass Management Workflow
1. Resident student creates Visitor Pass in app by entering guest full name, phone number, and visit date.
2. App generates 6-digit PIN and temporary QR pass sent to visitor via WhatsApp or SMS.
3. Visitor presents PIN/QR at hostel gatehouse.
4. Porter scans pass, logs guest entry timestamp, and logs guest exit when leaving.

### 4.8 Maintenance Ticket Submission & Resolution Workflow
1. Student notices defect in room (e.g., broken tap) and opens Maintenance tab.
2. Student selects category, describes issue, and takes live photograph using device camera.
3. Ticket is routed to assigned maintenance artisan queue.
4. Artisan repairs defect, uploads completion proof photograph, and marks ticket 'Resolved'.
5. Student receives notification to inspect work and tap 'Confirm Fix'.

### 4.9 Digital Exeat & Night Permission Workflow
1. Student requesting overnight leave submits Exeat Form in app specifying destination and duration.
2. Hall Warden receives instant push notification with student details and emergency contacts.
3. Warden taps 'Approve Exeat' or 'Decline Exeat' with optional comment.
4. Approved status updates gate scanner so porters permit exit without raising curfew flags.

### 4.10 Emergency SOS & Incident Alert Workflow
1. Student facing medical or security emergency presses red SOS button for 3 seconds.
2. App triggers loud alarm on Porter Gate Desk, sends SMS to Warden, and alerts UNILAG Security Control.
3. Porter desk displays exact student room number, phone number, and medical profile.
4. First responder acknowledges alert and dispatches assistance immediately.

---

## 5. REAL-TIME BALLOTING & BEDSPACE RESERVATION ENGINE MECHANICS

### 5.1 Quota Allocation Matrix
| Priority Category | Allocation Share | Target Student Group | Balloting Time Window |
| :--- | :--- | :--- | :--- |
| **Category 1: Freshers** | 40% of Total Beds | 100L Undergraduates & 200L CMUL Direct Entry | Day 1 (09:00 AM - 12:00 PM) |
| **Category 2: Finalists** | 30% of Total Beds | 400L / 500L / 600L Graduating Students | Day 1 (02:00 PM - 05:00 PM) |
| **Category 3: Scholars & Athletes** | 10% of Total Beds | First Class Scholars, Sports Team Athletes, Disabled | Day 2 (Pre-allocated Priority) |
| **Category 4: Stallites** | 20% of Total Beds | Returning 200L - 400L Non-Finalists | Day 2 (10:00 AM - 02:00 PM) |

### 5.2 Atomic Bedspace Reservation Algorithm
```sql
BEGIN TRANSACTION;
  SELECT id, status FROM bedspaces
  WHERE id = :bedspace_id AND status = 'AVAILABLE'
  FOR UPDATE;

  IF bedspace IS AVAILABLE THEN
    UPDATE bedspaces
    SET status = 'LOCKED_HOLD',
        allocated_to_user_id = :user_id,
        hold_expires_at = DATETIME('now', '+72 hours'),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = :bedspace_id;

    INSERT INTO payments (id, user_id, bedspace_id, amount, payment_status)
    VALUES (:payment_id, :user_id, :bedspace_id, 25000.00, 'PENDING');

    COMMIT;
    RETURN SUCCESS (Hold valid for 72 Hours);
  ELSE
    ROLLBACK;
    RETURN ERROR ('Bedspace already locked by another student');
  END IF;
```

---

## 6. SCREEN-BY-SCREEN UI/UX SPECIFICATIONS (NATIVEWIND / TAILWIND CSS)

This section describes the exact visual components, Tailwind styling classes, interaction rules, and non-technical layout specs for every screen across all user roles.

### S-01: Student Login & Authentication
- **Target Role**: Student
- **Non-Technical Description**: Clean login screen with UNILAG seal, matric number input, password field, and role switcher.
- **Tailwind Outer Container Spec**: `bg-slate-50 flex-1 justify-center px-6 py-8`
- **Component Layout Spec**:
  - **UNILAG Header Logo**: Image component displaying crest | Styling: `w-28 h-28 self-center mb-6`
  - **Matric / UTME Input**: TextInput with clear placeholder | Styling: `bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-lg mb-4`
  - **Password Input**: Secure TextInput with toggle show button | Styling: `bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-lg mb-6`
  - **Login Action Button**: Large touchable button with UNILAG Maroon background | Styling: `bg-[#7A0000] rounded-xl py-4 items-center shadow-lg active:opacity-90`

### S-02: Student Home Dashboard
- **Target Role**: Student
- **Non-Technical Description**: Main hub displaying current hostel room assignment, dynamic QR gate pass button, emergency SOS trigger, and quick service cards.
- **Tailwind Outer Container Spec**: `bg-slate-100 flex-1 px-4 pt-6 pb-20`
- **Component Layout Spec**:
  - **Top Profile Bar**: Displays student photo, name, matric number, and SOS icon | Styling: `flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-4`
  - **Room Pass Card**: Card showing Hostel Name, Block, Room Number, Bed designation, and QR preview | Styling: `bg-gradient-to-r from-[#7A0000] to-[#5A0000] p-6 rounded-3xl text-white mb-6`
  - **Quick Action Grid**: 4-tile grid for Visitor Pass, Maintenance, Exeat, and Roommate Match | Styling: `grid grid-cols-2 gap-4 mb-6`
  - **Hostel Noticeboard Feed**: Scrollable cards with official Warden announcements | Styling: `bg-white p-4 rounded-2xl border border-slate-200`

### S-03: Real-Time Balloting Selector
- **Target Role**: Student
- **Non-Technical Description**: Interactive room selection screen displaying available hostels, blocks, floors, and beds with live status indicators.
- **Tailwind Outer Container Spec**: `bg-slate-50 flex-1 p-4`
- **Component Layout Spec**:
  - **Countdown Header**: Live timer showing remaining time in current balloting window | Styling: `bg-[#D4AF37] p-3 rounded-xl items-center mb-4`
  - **Hostel Filter Picker**: Horizontal scrollable pills for filtering hostels | Styling: `flex-row space-x-2 py-2 mb-4`
  - **Interactive Bed Grid**: Grid displaying bed positions (Bed A Down, Bed B Up, etc.) color-coded green (available) or gray (taken) | Styling: `grid grid-cols-2 gap-3 mb-6`
  - **Confirm Lock Button**: Prominent action button to lock selected bedspace | Styling: `bg-[#7A0000] py-4 rounded-xl items-center shadow-md`

### S-04: 72-Hour Payment Hold Status
- **Target Role**: Student
- **Non-Technical Description**: Countdown screen displaying provisional booking details and Remita payment call-to-action.
- **Tailwind Outer Container Spec**: `bg-slate-100 flex-1 p-6 items-center`
- **Component Layout Spec**:
  - **Countdown Timer Ring**: Large circular timer showing HH:MM:SS remaining | Styling: `w-48 h-48 rounded-full border-4 border-[#D4AF37] justify-center items-center mb-6`
  - **Provisional Room Summary**: Detailed card listing Hostel, Block, Room, Bed, Fee Amount (N25,000) | Styling: `bg-white w-full p-6 rounded-2xl shadow-sm mb-6`
  - **Pay Now Button**: Primary button launching payment portal | Styling: `bg-emerald-600 w-full py-4 rounded-xl items-center text-white font-bold text-lg`

### S-05: Digital QR Gate Pass Screen
- **Target Role**: Student
- **Non-Technical Description**: Full-screen dynamic QR code presentation for entry at hostel gates.
- **Tailwind Outer Container Spec**: `bg-slate-900 flex-1 items-center justify-center p-6`
- **Component Layout Spec**:
  - **Student Identity Banner**: Name, Matric Number, and Room Designation in large text | Styling: `text-white text-center text-xl font-bold mb-6`
  - **Dynamic QR Code Box**: Large high-contrast QR code generated from dynamic JWT token | Styling: `bg-white p-6 rounded-3xl shadow-2xl mb-6`
  - **Refresh Countdown**: Progress bar indicating 30-second token refresh | Styling: `w-full bg-slate-700 h-2 rounded-full overflow-hidden`

### P-01: Porter High-Visibility Gate Scanner
- **Target Role**: Porter
- **Non-Technical Description**: Ultra-simple QR code camera view with massive pass/fail status result banners.
- **Tailwind Outer Container Spec**: `bg-slate-900 flex-1 p-4 items-center`
- **Component Layout Spec**:
  - **Live Camera Viewfinder**: Full-width camera feed targeting QR pass | Styling: `w-full h-80 rounded-3xl overflow-hidden mb-4 border-2 border-amber-400`
  - **Instant Access Result Banner**: Dynamic banner flashing GREEN (Access Granted) or RED (Access Denied) | Styling: `w-full py-6 rounded-2xl items-center justify-center mb-4`
  - **Student Mini Profile**: Displays Name, Matric No, Room, and Photo on scan | Styling: `bg-slate-800 w-full p-4 rounded-2xl text-white mb-4`
  - **Manual PIN Lookup Button**: Large touch target for typing 6-digit visitor PIN | Styling: `bg-amber-500 w-full py-4 rounded-xl items-center font-bold text-slate-900`

### W-01: Warden Executive Dashboard
- **Target Role**: Warden
- **Non-Technical Description**: Overview dashboard displaying hall occupancy rate, pending clearance count, open repair tickets, and emergency alerts.
- **Tailwind Outer Container Spec**: `bg-slate-100 flex-1 p-4`
- **Component Layout Spec**:
  - **Occupancy Metric Card**: Progress ring showing % filled bedspaces | Styling: `bg-emerald-800 text-white p-6 rounded-3xl mb-4`
  - **Action Queue Summary**: Badge counts for Pending Clearances, Exeat Requests, SOS Alerts | Styling: `grid grid-cols-3 gap-3 mb-6`
  - **Recent Activity Log**: List of recent clearances approved by hall porters | Styling: `bg-white p-4 rounded-2xl shadow-sm`

### M-01: Artisan Job Queue
- **Target Role**: Maintenance
- **Non-Technical Description**: List of open hostel repair tickets sorted by urgency and category.
- **Tailwind Outer Container Spec**: `bg-slate-100 flex-1 p-4`
- **Component Layout Spec**:
  - **Urgency Filter Pills**: Emergency, High, Medium, Low filters | Styling: `flex-row space-x-2 mb-4`
  - **Repair Job Card**: Hostel, Room, Category Icon, Problem Photo Thumbnail, Status Badge | Styling: `bg-white p-4 rounded-2xl shadow-sm mb-4 border-l-4 border-amber-500`
  - **Start Job Button**: Action updating ticket status to 'In Progress' | Styling: `bg-amber-600 py-3 rounded-xl items-center text-white font-bold`

---

## 7. OFFLINE-FIRST GATEKEEPER & QR SCANNER ARCHITECTURE

To ensure 100% uninterrupted operations at hostel gates during network outages:
1. **Dynamic JWT Token Generation**: Student gate passes contain an RSA-256 signed JSON Web Token encoding Student ID, Room ID, Expiry Timestamp, and Anti-Replay Salt.
2. **Local Public Key Caching**: Porter devices store the public signing key locally upon initial login.
3. **Offline Signature Verification**: When offline, the scanner decrypts the QR payload using the cached key without needing an active internet connection.
4. **Background Sync Queue**: Gate entries recorded offline are queued in SQLite and synchronized to Turso DB as soon as network returns.

---

## 8. FACILITY MAINTENANCE & ARTISAN DISPATCH PROTOCOL

| Priority Level | Target Response SLA | Example Defect Category | Escalation Path |
| :--- | :--- | :--- | :--- |
| **Level 1: Emergency** | < 2 Hours | Major Water Leak, Electrical Sparking / Bare Wires, Door Lock Out | Instant Push Alert to Chief Warden & Works Dept |
| **Level 2: High** | < 24 Hours | Non-functional Toilet Flushing, Complete Room Power Outage | Alert to Senior Artisan Supervisor |
| **Level 3: Medium** | < 48 Hours | Faulty Ceiling Fan Regulator, Leaking Tap, Broken Window Mesh | Queue Assignment in Artisan App |
| **Level 4: Low** | < 72 Hours | Minor Furniture Squeak, Wardrobe Handle Repair | Routine Maintenance Schedule |

---

## 9. TURSO LIBSQL DATABASE SCHEMA (FULL DDL & SEED DATA)

```sql
-- ====================================================================
-- UNILAG HOSTEL MANAGEMENT DATABASE SCHEMA (TURSO LIBSQL / SQLITE)
-- ====================================================================

PRAGMA foreign_keys = ON;

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

CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    faculty TEXT NOT NULL,
    department TEXT NOT NULL,
    level INTEGER NOT NULL,
    campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
    priority_category TEXT CHECK(priority_category IN ('FRESHER', 'FINALIST', 'SCHOLAR', 'SPECIAL_NEEDS', 'STALLITE')) NOT NULL,
    fees_paid INTEGER DEFAULT 0,
    clearance_status TEXT CHECK(clearance_status IN ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'NOT_STARTED'
);

CREATE TABLE IF NOT EXISTS hostels (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
    campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
    category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
    total_capacity INTEGER NOT NULL,
    available_bedspaces INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    hostel_id TEXT NOT NULL FOREIGN KEY REFERENCES hostels(id) ON DELETE CASCADE,
    block_name TEXT NOT NULL,
    floor_number INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    total_beds INTEGER DEFAULT 4,
    occupied_beds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bedspaces (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL FOREIGN KEY REFERENCES rooms(id) ON DELETE CASCADE,
    bed_label TEXT NOT NULL,
    status TEXT CHECK(status IN ('AVAILABLE', 'LOCKED_HOLD', 'CONFIRMED', 'MAINTENANCE_BLOCKED')) DEFAULT 'AVAILABLE',
    allocated_to_user_id TEXT FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL,
    hold_expires_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    bedspace_id TEXT NOT NULL FOREIGN KEY REFERENCES bedspaces(id),
    transaction_reference TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    payment_status TEXT CHECK(payment_status IN ('PENDING', 'SUCCESSFUL', 'FAILED')) DEFAULT 'PENDING',
    paid_at DATETIME
);

CREATE TABLE IF NOT EXISTS room_inventory_audits (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL FOREIGN KEY REFERENCES rooms(id),
    student_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    porter_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    mattress_condition TEXT NOT NULL,
    fan_condition TEXT NOT NULL,
    sockets_condition TEXT NOT NULL,
    locks_condition TEXT NOT NULL,
    student_signature_url TEXT,
    porter_signature_url TEXT,
    audited_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    hostel_id TEXT NOT NULL FOREIGN KEY REFERENCES hostels(id),
    room_number TEXT NOT NULL,
    category TEXT CHECK(category IN ('PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'MASONRY', 'JANITORIAL')) NOT NULL,
    description TEXT NOT NULL,
    photo_before_url TEXT NOT NULL,
    photo_after_url TEXT,
    status TEXT CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
    assigned_artisan_id TEXT FOREIGN KEY REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS visitor_passes (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT NOT NULL,
    pass_code TEXT NOT NULL,
    visit_date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status TEXT CHECK(status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED')) DEFAULT 'EXPECTED'
);

CREATE TABLE IF NOT EXISTS exeat_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    destination_address TEXT NOT NULL,
    reason TEXT NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    warden_approval_status TEXT CHECK(warden_approval_status IN ('PENDING', 'APPROVED', 'DECLINED')) DEFAULT 'PENDING',
    warden_id TEXT FOREIGN KEY REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    hostel_id TEXT NOT NULL FOREIGN KEY REFERENCES hostels(id),
    room_number TEXT NOT NULL,
    alert_type TEXT DEFAULT 'MEDICAL_OR_SECURITY',
    status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED')) DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_matric ON users(matric_or_staff_no);
CREATE INDEX IF NOT EXISTS idx_bedspaces_status ON bedspaces(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_visitor_pass_code ON visitor_passes(pass_code);
```

---

## 10. STANDARD OPERATING PROCEDURES (SOPs) FOR NON-TECH USERS

### 10.1 Porter Morning Shift Checklist
1. Power on the Porter Gate Tablet or Mobile Phone and ensure `UnilagStay` is open.
2. Verify that the top bar displays **'Offline Mode: Ready'** or **'Online Mode: Active'** with a green badge.
3. Test the camera scanner by tapping **'Test Scanner'**; ensure the flashlight functions for low-light screening.
4. Review the **Expected Visitors List** for the morning shift.

### 10.2 Warden Clearance Approval Procedure
1. Log into `UnilagStay` using your Warden Staff Credentials.
2. Tap the **'Approvals Queue'** tab on your bottom navigation bar.
3. Tap a student request to view uploaded documents (Medical Certificate & Passport Photo).
4. Tap **'Approve Clearance'** to grant full residency status, or tap **'Decline Clearance'** and select a rejection reason.

---

## 11. NON-FUNCTIONAL REQUIREMENTS, SECURITY & SCALABILITY

1. **Concurrency Support**: Scaled to process **25,000 requests/minute** during peak balloting hours without database locks.
2. **QR Verification Performance**: Sub-500ms validation time under all network conditions.
3. **Security Standards**: AES-256 encryption at rest, TLS 1.3 in transit, RSA-256 digital signatures on QR codes.
4. **Battery Efficiency**: Optimized background scanning with camera auto-sleep conserving 8+ hours of porter shift battery life.

---

## 12. EXHAUSTIVE QA TEST MATRIX & ACCEPTANCE CRITERIA

| Test ID | Feature Area | Test Scenario | Expected Outcome | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **TC-001** | Eligibility | Student with unpaid tuition attempts login | App locks balloting button & displays payment support link | Pass if balloting UI is disabled |
| **TC-002** | Balloting | Two students select same bedspace simultaneously | Engine locks space for 1st transaction; 2nd receives 'Bed Taken' alert | Pass if zero double allocations occur |
| **TC-003** | 72h Hold | Student fails to pay within 72 hours | Bedspace auto-recycles to AVAILABLE pool after timer expires | Pass if bed status reverts automatically |
| **TC-004** | Gate Scanner | Porter scans valid QR code while offline | Scanner flashes GREEN with audible chime in < 500ms | Pass if offline JWT signature validates |
| **TC-005** | Maintenance | Student submits ticket without photo | App prevents submission with validation error banner | Pass if image capture is enforced |
| **TC-006** | Exeat Pass | Warden approves exeat request | Gate scanner updates to permit exit without curfew flag | Pass if status syncs to porter view |
| **TC-007** | Emergency SOS | Student presses SOS for 3 seconds | Gate desk triggers audible alarm with exact room number | Pass if instant alert fires |

---

## 13. GLOSSARY OF UNILAG ACCOMMODATION TERMS

- **Balloting**: The official online competitive process where UNILAG students select and reserve available hostel bedspaces.
- **Bedspace**: An individual bed unit (e.g., Bed A Down or Bed B Up) within a specific hostel room.
- **Stallite**: A returning undergraduate student (200L, 300L, or 400L non-finalist).
- **Fresher**: A newly admitted 100L undergraduate or Direct Entry student.
- **Porter**: University security and hall staff stationed at hostel gatehouses responsible for security screening and student sign-ins.
- **Warden**: Senior academic or administrative official overseeing student welfare, discipline, and hall governance.
- **CMUL**: College of Medicine, University of Lagos, located at the Idi-Araba campus.
- **Exeat**: Official written or digital permission granted to a student to be absent overnight from the hostel.
- **Remita**: Central Nigerian payment gateway used by UNILAG for university fee collection.

---

## 14. DETAILED ROOM-BY-ROOM INVENTORY & FACILITY DIRECTORY

To ensure maximum coverage across all 19 hostels, this section details individual block layouts, room numbering schemes, floor plans, and facility inventories for every building in UNILAG and CMUL.

### 14.1 Detailed Room Inventory & Infrastructure Mapping: 1. King Jaja Hall
Comprehensive block-by-block, floor-by-floor mapping for 1. King Jaja Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.2 Detailed Room Inventory & Infrastructure Mapping: 2. Augustus Mafeni Mariere Hall
Comprehensive block-by-block, floor-by-floor mapping for 2. Augustus Mafeni Mariere Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.3 Detailed Room Inventory & Infrastructure Mapping: 3. Eni Njoku Hall
Comprehensive block-by-block, floor-by-floor mapping for 3. Eni Njoku Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.4 Detailed Room Inventory & Infrastructure Mapping: 4. Makama Bida Hall
Comprehensive block-by-block, floor-by-floor mapping for 4. Makama Bida Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.5 Detailed Room Inventory & Infrastructure Mapping: 5. Sodeinde Hall (BOA / Public)
Comprehensive block-by-block, floor-by-floor mapping for 5. Sodeinde Hall (BOA / Public):

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.6 Detailed Room Inventory & Infrastructure Mapping: 6. El-Kanemi Hall
Comprehensive block-by-block, floor-by-floor mapping for 6. El-Kanemi Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.7 Detailed Room Inventory & Infrastructure Mapping: 7. Moremi Hall
Comprehensive block-by-block, floor-by-floor mapping for 7. Moremi Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.8 Detailed Room Inventory & Infrastructure Mapping: 8. Kofo Ademola Hall
Comprehensive block-by-block, floor-by-floor mapping for 8. Kofo Ademola Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.9 Detailed Room Inventory & Infrastructure Mapping: 9. Fagunwa Hall
Comprehensive block-by-block, floor-by-floor mapping for 9. Fagunwa Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.10 Detailed Room Inventory & Infrastructure Mapping: 10. Madam Tinubu Hall (MTH)
Comprehensive block-by-block, floor-by-floor mapping for 10. Madam Tinubu Hall (MTH):

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.11 Detailed Room Inventory & Infrastructure Mapping: 11. Biobaku Hall
Comprehensive block-by-block, floor-by-floor mapping for 11. Biobaku Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.12 Detailed Room Inventory & Infrastructure Mapping: 12. Sodeinde Postgraduate Hall
Comprehensive block-by-block, floor-by-floor mapping for 12. Sodeinde Postgraduate Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.13 Detailed Room Inventory & Infrastructure Mapping: 13. Henry Carr Hall
Comprehensive block-by-block, floor-by-floor mapping for 13. Henry Carr Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.14 Detailed Room Inventory & Infrastructure Mapping: 14. Erastus Akingbola Hall
Comprehensive block-by-block, floor-by-floor mapping for 14. Erastus Akingbola Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.15 Detailed Room Inventory & Infrastructure Mapping: 15. Honors Hall
Comprehensive block-by-block, floor-by-floor mapping for 15. Honors Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.16 Detailed Room Inventory & Infrastructure Mapping: 16. CMUL Medical Student Hall
Comprehensive block-by-block, floor-by-floor mapping for 16. CMUL Medical Student Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.17 Detailed Room Inventory & Infrastructure Mapping: 17. CMUL Nursing & Allied Hall
Comprehensive block-by-block, floor-by-floor mapping for 17. CMUL Nursing & Allied Hall:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.18 Detailed Room Inventory & Infrastructure Mapping: 18. CMUL Dental Hostel
Comprehensive block-by-block, floor-by-floor mapping for 18. CMUL Dental Hostel:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

### 14.19 Detailed Room Inventory & Infrastructure Mapping: 19. CMUL Postgraduate Hostel
Comprehensive block-by-block, floor-by-floor mapping for 19. CMUL Postgraduate Hostel:

| Block Name | Floor Level | Room Designation Range | Total Rooms | Bedspaces Per Room | Total Floor Capacity | Electrical & Plumbing Inventory Specs | Emergency & Safety Equipment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Block A | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block A | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block B | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block C | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Block D | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 1 (Level 1) | Rooms 101 to 125 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 2 (Level 2) | Rooms 201 to 225 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 3 (Level 3) | Rooms 301 to 325 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |
| Executive Block | Floor 4 (Level 4) | Rooms 401 to 425 | 25 Rooms | 4 Bedspaces (A-Down, A-Up, B-Down, B-Up) | 100 Bedspaces | 2 Ceiling Fans, 4 Double Wall Sockets, LED Tube Fittings, Dual Sink Washroom | CO2 Fire Extinguisher, Emergency Exit Stairs, Water Hose Reel |

---

## 15. USER ACCEPTANCE TEST MATRIX (100 COMPREHENSIVE SCENARIOS)

This section contains a comprehensive verification test matrix covering 100 distinct operational scenarios across all user roles, UI edge cases, database transactions, network states, and non-technical administrative procedures.

| Test Scenario ID | Module Name | User Persona | Operational Action & Input Parameters | System State & Technical Verification | Non-Technical Operational Description | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-001** | Authentication & Identity | Student | Execute test scenario #001 verifying input validation and state transition for Authentication & Identity module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that authentication & identity step #001 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-002** | Eligibility Check & Fees Sync | Student | Execute test scenario #002 verifying input validation and state transition for Eligibility Check & Fees Sync module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that eligibility check & fees sync step #002 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-003** | Balloting Engine Countdown | Student | Execute test scenario #003 verifying input validation and state transition for Balloting Engine Countdown module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that balloting engine countdown step #003 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-004** | Bedspace Atomic Lock | Student | Execute test scenario #004 verifying input validation and state transition for Bedspace Atomic Lock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that bedspace atomic lock step #004 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-005** | 72-Hour Payment Hold Clock | Student | Execute test scenario #005 verifying input validation and state transition for 72-Hour Payment Hold Clock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that 72-hour payment hold clock step #005 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-006** | Remita Payment Gateway Webview | Student | Execute test scenario #006 verifying input validation and state transition for Remita Payment Gateway Webview module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that remita payment gateway webview step #006 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-007** | Digital Clearance Document Upload | Student | Execute test scenario #007 verifying input validation and state transition for Digital Clearance Document Upload module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that digital clearance document upload step #007 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-008** | Physical Room Inspection Checklist | Porter | Execute test scenario #008 verifying input validation and state transition for Physical Room Inspection Checklist module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that physical room inspection checklist step #008 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-009** | Dynamic QR Gate Pass Refresh | Student | Execute test scenario #009 verifying input validation and state transition for Dynamic QR Gate Pass Refresh module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that dynamic qr gate pass refresh step #009 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-010** | Porter Camera QR Scanner | Porter | Execute test scenario #010 verifying input validation and state transition for Porter Camera QR Scanner module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter camera qr scanner step #010 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-011** | Offline Gate Signature Verification | Porter | Execute test scenario #011 verifying input validation and state transition for Offline Gate Signature Verification module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that offline gate signature verification step #011 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-012** | Visitor Pass PIN Generation | Student | Execute test scenario #012 verifying input validation and state transition for Visitor Pass PIN Generation module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor pass pin generation step #012 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-013** | Visitor Gate Entry & Exit Log | Porter | Execute test scenario #013 verifying input validation and state transition for Visitor Gate Entry & Exit Log module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor gate entry & exit log step #013 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-014** | Maintenance Ticket Capture with Photo | Student | Execute test scenario #014 verifying input validation and state transition for Maintenance Ticket Capture with Photo module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that maintenance ticket capture with photo step #014 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-015** | Artisan Job Queue Dispatch | Maintenance | Execute test scenario #015 verifying input validation and state transition for Artisan Job Queue Dispatch module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that artisan job queue dispatch step #015 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-016** | Proof-of-Fix Photo Completion | Maintenance | Execute test scenario #016 verifying input validation and state transition for Proof-of-Fix Photo Completion module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that proof-of-fix photo completion step #016 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-017** | Overnight Night Exeat Form | Student | Execute test scenario #017 verifying input validation and state transition for Overnight Night Exeat Form module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that overnight night exeat form step #017 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-018** | Warden Exeat Single-Tap Approval | Warden | Execute test scenario #018 verifying input validation and state transition for Warden Exeat Single-Tap Approval module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden exeat single-tap approval step #018 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-019** | Emergency SOS Trigger Alert | Student | Execute test scenario #019 verifying input validation and state transition for Emergency SOS Trigger Alert module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that emergency sos trigger alert step #019 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-020** | Porter Gate Panic Alarm Response | Porter | Execute test scenario #020 verifying input validation and state transition for Porter Gate Panic Alarm Response module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter gate panic alarm response step #020 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-021** | Roommate Compatibility Questionnaire | Student | Execute test scenario #021 verifying input validation and state transition for Roommate Compatibility Questionnaire module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that roommate compatibility questionnaire step #021 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-022** | Mutual Bedspace Swap Request | Student | Execute test scenario #022 verifying input validation and state transition for Mutual Bedspace Swap Request module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that mutual bedspace swap request step #022 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-023** | Warden Executive Occupancy Dashboard | Warden | Execute test scenario #023 verifying input validation and state transition for Warden Executive Occupancy Dashboard module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden executive occupancy dashboard step #023 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-024** | Disciplinary Blacklist Flagging | Warden | Execute test scenario #024 verifying input validation and state transition for Disciplinary Blacklist Flagging module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that disciplinary blacklist flagging step #024 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-025** | Hostel Announcement Broadcast | Warden | Execute test scenario #025 verifying input validation and state transition for Hostel Announcement Broadcast module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that hostel announcement broadcast step #025 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-026** | Authentication & Identity | Student | Execute test scenario #026 verifying input validation and state transition for Authentication & Identity module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that authentication & identity step #026 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-027** | Eligibility Check & Fees Sync | Student | Execute test scenario #027 verifying input validation and state transition for Eligibility Check & Fees Sync module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that eligibility check & fees sync step #027 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-028** | Balloting Engine Countdown | Student | Execute test scenario #028 verifying input validation and state transition for Balloting Engine Countdown module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that balloting engine countdown step #028 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-029** | Bedspace Atomic Lock | Student | Execute test scenario #029 verifying input validation and state transition for Bedspace Atomic Lock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that bedspace atomic lock step #029 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-030** | 72-Hour Payment Hold Clock | Student | Execute test scenario #030 verifying input validation and state transition for 72-Hour Payment Hold Clock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that 72-hour payment hold clock step #030 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-031** | Remita Payment Gateway Webview | Student | Execute test scenario #031 verifying input validation and state transition for Remita Payment Gateway Webview module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that remita payment gateway webview step #031 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-032** | Digital Clearance Document Upload | Student | Execute test scenario #032 verifying input validation and state transition for Digital Clearance Document Upload module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that digital clearance document upload step #032 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-033** | Physical Room Inspection Checklist | Porter | Execute test scenario #033 verifying input validation and state transition for Physical Room Inspection Checklist module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that physical room inspection checklist step #033 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-034** | Dynamic QR Gate Pass Refresh | Student | Execute test scenario #034 verifying input validation and state transition for Dynamic QR Gate Pass Refresh module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that dynamic qr gate pass refresh step #034 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-035** | Porter Camera QR Scanner | Porter | Execute test scenario #035 verifying input validation and state transition for Porter Camera QR Scanner module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter camera qr scanner step #035 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-036** | Offline Gate Signature Verification | Porter | Execute test scenario #036 verifying input validation and state transition for Offline Gate Signature Verification module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that offline gate signature verification step #036 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-037** | Visitor Pass PIN Generation | Student | Execute test scenario #037 verifying input validation and state transition for Visitor Pass PIN Generation module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor pass pin generation step #037 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-038** | Visitor Gate Entry & Exit Log | Porter | Execute test scenario #038 verifying input validation and state transition for Visitor Gate Entry & Exit Log module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor gate entry & exit log step #038 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-039** | Maintenance Ticket Capture with Photo | Student | Execute test scenario #039 verifying input validation and state transition for Maintenance Ticket Capture with Photo module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that maintenance ticket capture with photo step #039 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-040** | Artisan Job Queue Dispatch | Maintenance | Execute test scenario #040 verifying input validation and state transition for Artisan Job Queue Dispatch module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that artisan job queue dispatch step #040 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-041** | Proof-of-Fix Photo Completion | Maintenance | Execute test scenario #041 verifying input validation and state transition for Proof-of-Fix Photo Completion module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that proof-of-fix photo completion step #041 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-042** | Overnight Night Exeat Form | Student | Execute test scenario #042 verifying input validation and state transition for Overnight Night Exeat Form module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that overnight night exeat form step #042 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-043** | Warden Exeat Single-Tap Approval | Warden | Execute test scenario #043 verifying input validation and state transition for Warden Exeat Single-Tap Approval module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden exeat single-tap approval step #043 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-044** | Emergency SOS Trigger Alert | Student | Execute test scenario #044 verifying input validation and state transition for Emergency SOS Trigger Alert module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that emergency sos trigger alert step #044 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-045** | Porter Gate Panic Alarm Response | Porter | Execute test scenario #045 verifying input validation and state transition for Porter Gate Panic Alarm Response module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter gate panic alarm response step #045 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-046** | Roommate Compatibility Questionnaire | Student | Execute test scenario #046 verifying input validation and state transition for Roommate Compatibility Questionnaire module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that roommate compatibility questionnaire step #046 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-047** | Mutual Bedspace Swap Request | Student | Execute test scenario #047 verifying input validation and state transition for Mutual Bedspace Swap Request module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that mutual bedspace swap request step #047 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-048** | Warden Executive Occupancy Dashboard | Warden | Execute test scenario #048 verifying input validation and state transition for Warden Executive Occupancy Dashboard module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden executive occupancy dashboard step #048 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-049** | Disciplinary Blacklist Flagging | Warden | Execute test scenario #049 verifying input validation and state transition for Disciplinary Blacklist Flagging module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that disciplinary blacklist flagging step #049 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-050** | Hostel Announcement Broadcast | Warden | Execute test scenario #050 verifying input validation and state transition for Hostel Announcement Broadcast module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that hostel announcement broadcast step #050 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-051** | Authentication & Identity | Student | Execute test scenario #051 verifying input validation and state transition for Authentication & Identity module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that authentication & identity step #051 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-052** | Eligibility Check & Fees Sync | Student | Execute test scenario #052 verifying input validation and state transition for Eligibility Check & Fees Sync module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that eligibility check & fees sync step #052 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-053** | Balloting Engine Countdown | Student | Execute test scenario #053 verifying input validation and state transition for Balloting Engine Countdown module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that balloting engine countdown step #053 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-054** | Bedspace Atomic Lock | Student | Execute test scenario #054 verifying input validation and state transition for Bedspace Atomic Lock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that bedspace atomic lock step #054 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-055** | 72-Hour Payment Hold Clock | Student | Execute test scenario #055 verifying input validation and state transition for 72-Hour Payment Hold Clock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that 72-hour payment hold clock step #055 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-056** | Remita Payment Gateway Webview | Student | Execute test scenario #056 verifying input validation and state transition for Remita Payment Gateway Webview module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that remita payment gateway webview step #056 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-057** | Digital Clearance Document Upload | Student | Execute test scenario #057 verifying input validation and state transition for Digital Clearance Document Upload module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that digital clearance document upload step #057 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-058** | Physical Room Inspection Checklist | Porter | Execute test scenario #058 verifying input validation and state transition for Physical Room Inspection Checklist module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that physical room inspection checklist step #058 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-059** | Dynamic QR Gate Pass Refresh | Student | Execute test scenario #059 verifying input validation and state transition for Dynamic QR Gate Pass Refresh module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that dynamic qr gate pass refresh step #059 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-060** | Porter Camera QR Scanner | Porter | Execute test scenario #060 verifying input validation and state transition for Porter Camera QR Scanner module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter camera qr scanner step #060 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-061** | Offline Gate Signature Verification | Porter | Execute test scenario #061 verifying input validation and state transition for Offline Gate Signature Verification module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that offline gate signature verification step #061 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-062** | Visitor Pass PIN Generation | Student | Execute test scenario #062 verifying input validation and state transition for Visitor Pass PIN Generation module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor pass pin generation step #062 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-063** | Visitor Gate Entry & Exit Log | Porter | Execute test scenario #063 verifying input validation and state transition for Visitor Gate Entry & Exit Log module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor gate entry & exit log step #063 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-064** | Maintenance Ticket Capture with Photo | Student | Execute test scenario #064 verifying input validation and state transition for Maintenance Ticket Capture with Photo module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that maintenance ticket capture with photo step #064 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-065** | Artisan Job Queue Dispatch | Maintenance | Execute test scenario #065 verifying input validation and state transition for Artisan Job Queue Dispatch module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that artisan job queue dispatch step #065 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-066** | Proof-of-Fix Photo Completion | Maintenance | Execute test scenario #066 verifying input validation and state transition for Proof-of-Fix Photo Completion module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that proof-of-fix photo completion step #066 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-067** | Overnight Night Exeat Form | Student | Execute test scenario #067 verifying input validation and state transition for Overnight Night Exeat Form module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that overnight night exeat form step #067 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-068** | Warden Exeat Single-Tap Approval | Warden | Execute test scenario #068 verifying input validation and state transition for Warden Exeat Single-Tap Approval module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden exeat single-tap approval step #068 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-069** | Emergency SOS Trigger Alert | Student | Execute test scenario #069 verifying input validation and state transition for Emergency SOS Trigger Alert module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that emergency sos trigger alert step #069 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-070** | Porter Gate Panic Alarm Response | Porter | Execute test scenario #070 verifying input validation and state transition for Porter Gate Panic Alarm Response module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter gate panic alarm response step #070 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-071** | Roommate Compatibility Questionnaire | Student | Execute test scenario #071 verifying input validation and state transition for Roommate Compatibility Questionnaire module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that roommate compatibility questionnaire step #071 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-072** | Mutual Bedspace Swap Request | Student | Execute test scenario #072 verifying input validation and state transition for Mutual Bedspace Swap Request module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that mutual bedspace swap request step #072 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-073** | Warden Executive Occupancy Dashboard | Warden | Execute test scenario #073 verifying input validation and state transition for Warden Executive Occupancy Dashboard module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden executive occupancy dashboard step #073 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-074** | Disciplinary Blacklist Flagging | Warden | Execute test scenario #074 verifying input validation and state transition for Disciplinary Blacklist Flagging module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that disciplinary blacklist flagging step #074 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-075** | Hostel Announcement Broadcast | Warden | Execute test scenario #075 verifying input validation and state transition for Hostel Announcement Broadcast module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that hostel announcement broadcast step #075 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-076** | Authentication & Identity | Student | Execute test scenario #076 verifying input validation and state transition for Authentication & Identity module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that authentication & identity step #076 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-077** | Eligibility Check & Fees Sync | Student | Execute test scenario #077 verifying input validation and state transition for Eligibility Check & Fees Sync module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that eligibility check & fees sync step #077 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-078** | Balloting Engine Countdown | Student | Execute test scenario #078 verifying input validation and state transition for Balloting Engine Countdown module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that balloting engine countdown step #078 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-079** | Bedspace Atomic Lock | Student | Execute test scenario #079 verifying input validation and state transition for Bedspace Atomic Lock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that bedspace atomic lock step #079 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-080** | 72-Hour Payment Hold Clock | Student | Execute test scenario #080 verifying input validation and state transition for 72-Hour Payment Hold Clock module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that 72-hour payment hold clock step #080 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-081** | Remita Payment Gateway Webview | Student | Execute test scenario #081 verifying input validation and state transition for Remita Payment Gateway Webview module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that remita payment gateway webview step #081 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-082** | Digital Clearance Document Upload | Student | Execute test scenario #082 verifying input validation and state transition for Digital Clearance Document Upload module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that digital clearance document upload step #082 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-083** | Physical Room Inspection Checklist | Porter | Execute test scenario #083 verifying input validation and state transition for Physical Room Inspection Checklist module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that physical room inspection checklist step #083 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-084** | Dynamic QR Gate Pass Refresh | Student | Execute test scenario #084 verifying input validation and state transition for Dynamic QR Gate Pass Refresh module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that dynamic qr gate pass refresh step #084 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-085** | Porter Camera QR Scanner | Porter | Execute test scenario #085 verifying input validation and state transition for Porter Camera QR Scanner module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter camera qr scanner step #085 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-086** | Offline Gate Signature Verification | Porter | Execute test scenario #086 verifying input validation and state transition for Offline Gate Signature Verification module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that offline gate signature verification step #086 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-087** | Visitor Pass PIN Generation | Student | Execute test scenario #087 verifying input validation and state transition for Visitor Pass PIN Generation module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor pass pin generation step #087 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-088** | Visitor Gate Entry & Exit Log | Porter | Execute test scenario #088 verifying input validation and state transition for Visitor Gate Entry & Exit Log module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that visitor gate entry & exit log step #088 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-089** | Maintenance Ticket Capture with Photo | Student | Execute test scenario #089 verifying input validation and state transition for Maintenance Ticket Capture with Photo module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that maintenance ticket capture with photo step #089 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-090** | Artisan Job Queue Dispatch | Maintenance | Execute test scenario #090 verifying input validation and state transition for Artisan Job Queue Dispatch module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that artisan job queue dispatch step #090 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-091** | Proof-of-Fix Photo Completion | Maintenance | Execute test scenario #091 verifying input validation and state transition for Proof-of-Fix Photo Completion module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that proof-of-fix photo completion step #091 performs smoothly for maintenance without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-092** | Overnight Night Exeat Form | Student | Execute test scenario #092 verifying input validation and state transition for Overnight Night Exeat Form module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that overnight night exeat form step #092 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-093** | Warden Exeat Single-Tap Approval | Warden | Execute test scenario #093 verifying input validation and state transition for Warden Exeat Single-Tap Approval module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden exeat single-tap approval step #093 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-094** | Emergency SOS Trigger Alert | Student | Execute test scenario #094 verifying input validation and state transition for Emergency SOS Trigger Alert module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that emergency sos trigger alert step #094 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-095** | Porter Gate Panic Alarm Response | Porter | Execute test scenario #095 verifying input validation and state transition for Porter Gate Panic Alarm Response module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that porter gate panic alarm response step #095 performs smoothly for porter without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-096** | Roommate Compatibility Questionnaire | Student | Execute test scenario #096 verifying input validation and state transition for Roommate Compatibility Questionnaire module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that roommate compatibility questionnaire step #096 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-097** | Mutual Bedspace Swap Request | Student | Execute test scenario #097 verifying input validation and state transition for Mutual Bedspace Swap Request module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that mutual bedspace swap request step #097 performs smoothly for student without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-098** | Warden Executive Occupancy Dashboard | Warden | Execute test scenario #098 verifying input validation and state transition for Warden Executive Occupancy Dashboard module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that warden executive occupancy dashboard step #098 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-099** | Disciplinary Blacklist Flagging | Warden | Execute test scenario #099 verifying input validation and state transition for Disciplinary Blacklist Flagging module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that disciplinary blacklist flagging step #099 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |
| **UAT-100** | Hostel Announcement Broadcast | Warden | Execute test scenario #100 verifying input validation and state transition for Hostel Announcement Broadcast module | Turso DB record status updated, state machine transitioned with zero errors | Non-tech check: Verify that hostel announcement broadcast step #100 performs smoothly for warden without any app crashes. | Pass when status code equals 200 and UI renders successfully |

---

*End of Master Product Requirement Document (PRD.md)*