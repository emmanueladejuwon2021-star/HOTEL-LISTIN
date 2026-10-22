# PRODUCT REQUIREMENT DOCUMENT (PRD)
## UNILAG Hostel Management Mobile Application ("UnilagStay")

---

| Document Detail | Information |
| :--- | :--- |
| **Project Title** | UNILAG Hostel Management App (`UnilagStay`) |
| **Target Platform** | Android & iOS (Cross-platform React Native + NativeWind / Tailwind CSS) |
| **Database Architecture** | Turso (libSQL Edge SQLite DB with Offline-First Local Sync) |
| **Document Version** | 1.0.0 (Production Grade) |
| **Target Audience** | Non-technical Stakeholders (Student Affairs, Wardens, Porters, Students) & Software Engineering Team |

---

## 1. Executive Summary & Product Vision

### 1.1 Executive Summary
`UnilagStay` is a comprehensive, production-grade mobile hostel management ecosystem built specifically for the University of Lagos (UNILAG). The system digitizes, streamlines, and secures the entire student accommodation lifecycle—from eligibility verification and live quota-based bedspace balloting to physical room screening, digital gate passes, maintenance tracking, and warden administration.

### 1.2 Non-Technical Product Overview
For non-technical administrators (Dean of Student Affairs, Hall Wardens, and Hostel Porters), `UnilagStay` replaces paper-based room allocation slips, manually stamped gate passes, and physical complaint registers with a secure, automated mobile experience.
- **Students** can ballot for bedspaces in real-time, generate digital QR passcodes for entering their hostels, report broken facilities with photos, and apply for night exeat approvals from their smartphones.
- **Porters at the Gate** use an easy-to-use scanner screen to verify student identities and visitor passes in under 3 seconds—even when internet connection is down.
- **Hall Wardens** receive a high-level dashboard summarizing hall occupancy, pending clearance applications, maintenance issues, and emergency security alerts.

### 1.3 Strategic Goals & Core Value Proposition
1. **Eliminate Subletting & Squatting**: Digital biometric/QR identification tied to student matriculation numbers prevents illegal sale or transfer of hostel spaces.
2. **Fair & Transparent Balloting**: Automated priority quota allocation engine eliminates manual favoritism during the high-concurrency balloting period.
3. **Sub-Second Gate Operations**: QR code scanning enables lightning-fast student and visitor entry at busy hostel gates.
4. **Accountable Facility Maintenance**: Maintenance tickets with required photo evidence ensure plumbers, electricians, and carpenters resolve hostel issues promptly.

---

## 2. Target Audience, Personas & User Roles

`UnilagStay` enforces **strict role-based access control (RBAC)**. Each role operates within an isolated navigation tree to prevent UI clutter and security overlaps.

```
                  +-----------------------------------+
                  |      UNILAG STAYS AUTH PORTAL     |
                  +-----------------------------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+------------------+       +------------------+      +------------------+
|   STUDENT ROLE   |       |   PORTER ROLE    |      |   WARDEN ROLE    |
| - Balloting      |       | - Gate Scanner   |      | - Approvals      |
| - QR Gate Pass   |       | - Visitor Pass   |      | - Occupancy      |
| - Maintenance    |       | - Inventory      |      | - Disciplinary   |
| - Exeat Request  |       | - Incident Log   |      | - Maintenance    |
+------------------+       +------------------+      +------------------+
                                                              |
                                                              v
                                                     +------------------+
                                                     | MAINTENANCE ROLE |
                                                     | - Repair Queue   |
                                                     | - Status Updates |
                                                     | - Photo Upload   |
                                                     +------------------+
```

### 2.1 Persona Definitions

#### Role A: The UNILAG Student
- **Profile**: Undergraduate or Postgraduate student at UNILAG Main Campus or CMUL Idi-Araba.
- **Primary Need**: Quick, stress-free hostel balloting, smooth room clearance, quick entry at the hostel gate, and rapid resolution of room repairs (e.g., leaking tap or faulty fan).
- **Tech Literacy**: Moderate to High (accustomed to smartphones and social apps).

#### Role B: The Hostel Porter / Gatekeeper
- **Profile**: Frontline UNILAG security or hall administration officer stationed at hostel entrance gates and porter desks.
- **Primary Need**: An ultra-simple, high-contrast, one-tap scanning interface to verify students and visitors entering or exiting the hall.
- **Tech Literacy**: Low to Moderate. UI must feature large text, big buttons, bold colors, and voice/haptic feedback.

#### Role C: The Hall Warden & Student Affairs Administrator
- **Profile**: Senior academic or administrative staff in charge of overall hostel governance, discipline, health, and room clearance.
- **Primary Need**: Executive summary dashboards, single-click approvals for exeat passes and screening documents, and reporting tools for hall metrics.
- **Tech Literacy**: Moderate. Needs clear tabular layouts and easy exportable reports.

#### Role D: The Facility Maintenance Personnel
- **Profile**: University artisans (Plumbers, Electricians, Carpenters, Masons).
- **Primary Need**: A clear job card view showing assigned hostel, block, room number, problem photo, and a button to mark "In Progress" or "Resolved" with a proof photo.
- **Tech Literacy**: Low. Relies on visual indicators and simple action buttons.

---

## 3. UNILAG Hostel Scope & Campus Inventory

The system fully covers **all public hostels** across UNILAG Main Campus (Akoka) and College of Medicine UNILAG (CMUL, Idi-Araba).

```
========================================================================================
                          UNILAG PUBLIC HOSTEL DIRECTORY
========================================================================================

CAMPUS 1: MAIN CAMPUS (AKOKA) - MALE UNDERGRADUATE HOSTELS
----------------------------------------------------------------------------------------
1. King Jaja Hall              | Capacity: ~1,200 | Blocks: A, B, C, D
2. Augustus Mafeni Mariere     | Capacity: ~1,000 | Blocks: Main Complex
3. Eni Njoku Hall              | Capacity: ~850   | Blocks: A, B, C
4. Makama Bida Hall            | Capacity: ~500   | Blocks: Single Complex
5. Sodeinde Hall (BOA/Public)  | Capacity: ~1,100 | Blocks: High-rise Wings A & B
6. El-Kanemi Hall              | Capacity: ~600   | Blocks: Low-rise Chalets

CAMPUS 1: MAIN CAMPUS (AKOKA) - FEMALE UNDERGRADUATE HOSTELS
----------------------------------------------------------------------------------------
7. Moremi Hall                 | Capacity: ~1,400 | Blocks: High-rise Wings A, B, C
8. Kofo Ademola Hall           | Capacity: ~900   | Blocks: A, B, C, D
9. Fagunwa Hall                | Capacity: ~800   | Blocks: Main Wing
10. Madam Tinubu Hall (MTH)    | Capacity: ~1,200 | Blocks: Blocks 1 - 6
11. Biobaku Hall               | Capacity: ~650   | Blocks: Main Wing

CAMPUS 1: MAIN CAMPUS (AKOKA) - POSTGRADUATE & SPECIAL HOSTELS
----------------------------------------------------------------------------------------
12. Sodeinde Postgraduate Hall | Capacity: ~400   | PG Male & Female
13. Henry Carr Hall            | Capacity: ~500   | PG Male
14. Erastus Akingbola Hall     | Capacity: ~350   | PG Mixed / Executive
15. Honors Hall                | Capacity: ~450   | Female Undergrad / PG

CAMPUS 2: COLLEGE OF MEDICINE (CMUL, IDI-ARABA) HOSTELS
----------------------------------------------------------------------------------------
16. CMUL Medical Student Hall  | Capacity: ~800   | Clinical Students (MBBS/BDS)
17. CMUL Nursing & Allied Hall | Capacity: ~500   | Nursing & Radiography
18. CMUL Dental Hostel         | Capacity: ~300   | Dental Sciences
19. CMUL Postgraduate Hostel   | Capacity: ~350   | PG Medical Scholars
========================================================================================
```

---

## 4. End-to-End Accommodation Lifecycles & Workflows

### 4.1 Phase 1: Registration & Eligibility Verification
```
[Student Logs In] ---> [Fetch Student Profile] ---> [Validate Fees Payment]
                                                           |
                                 +-------------------------+-------------------------+
                                 |                                                   |
                         (Fees Unpaid)                                       (Fees Verified)
                                 |                                                   |
                        [Lock Balloting UI]                                  [Assign Priority Tag]
                        "Pay Fees First"                                     (Fresher/Finalist/Scholar)
                                                                                     |
                                                                             [Unlock Balloting UI]
```
1. Student logs into `UnilagStay` using their UNILAG Matriculation Number / UTME Registration Number and password.
2. System queries the central academic database to confirm:
   - Full School Fees Payment for the current academic session.
   - Course Registration status.
   - Disciplinary standing (Must not be under rustication or hall blacklisting).
3. System assigns priority flags:
   - **Tag 1: Freshers (100L / Direct Entry / 200L CMUL)**
   - **Tag 2: Final Year Students (400L / 500L / 600L)**
   - **Tag 3: Sports Scholars & University Athletes**
   - **Tag 4: Special Needs / Disabled Students**
   - **Tag 5: Returning Stallites (200L - 400L non-finalists)**

---

### 4.2 Phase 2: Live Real-Time Balloting Engine Mechanics
```
[Balloting Time Opens] ---> [Student Selects Hostel & Block] ---> [Real-Time Inventory Lock]
                                                                          |
                                               +--------------------------+--------------------------+
                                               |                                                     |
                                    (Bedspace Available)                                  (Bedspace Taken)
                                               |                                                     |
                                     [Generate 72-Hour Hold]                                [Show "Full" Alert]
                                               |                                            [Suggest Alternatives]
                                     [72-Hour Payment Clock Starts]
```

1. **Priority Quota System**:
   - 40% reserved for Freshers.
   - 30% reserved for Finalists.
   - 10% reserved for Sports Scholars & Special Needs (Pre-allocated).
   - 20% open for Stallites balloting window.
2. **The Balloting Process**:
   - The app displays a live countdown timer leading up to the official balloting time (e.g., 10:00 AM WAT).
   - When the window opens, students select preferred Hostel -> Block -> Floor -> Room -> Bedspace (e.g., *King Jaja Hall - Block B - Room B204 - Bed A (Down)*).
   - The engine utilizes atomic transactions to lock the selected bedspace immediately upon selection.
3. **The 72-Hour Payment Hold Lock**:
   - Once a bedspace is successfully locked, the system issues a provisional booking slip with a **72-Hour Countdown Timer**.
   - If the student completes the hostel accommodation fee payment within 72 hours via the embedded payment link, the booking becomes **Confirmed**.
   - If payment is NOT recorded within 72 hours, the reservation automatically expires, and the bedspace is recycled back into the live balloting pool for other students.

---

### 4.3 Phase 3: Payment Confirmation & Digital Slip Generation
1. Student pays the prescribed UNILAG hostel fee via Remita / integrated card payment gateway.
2. The app verifies the transaction reference instantly.
3. The app generates an official **Digital Hostel Accommodation Slip** containing:
   - Student Photo, Full Name, Department, Level, and Matric Number.
   - Hostel Name, Block Number, Room Number, and Bedspace designation.
   - Dynamic Security QR Code containing encrypted payload signature.

---

### 4.4 Phase 4: Document Screening & Physical Clearance
```
[Upload Clearance Documents] ---> [Warden/Porter Review Portal] ---> [Status Update]
- Medical Fitness Cert                                                      |
- Passport Photos                                              +------------+------------+
- Student Bio-data Slip                                        |                         |
                                                          (Approved)                (Rejected)
                                                               |                         |
                                                      [Issue Clearance QR]    [Notify Reason in App]
```

1. Student uploads digital copies of required documents in the app:
   - UNILAG Health Centre Medical Fitness Certificate.
   - Passport Photograph with white background.
   - Signed Student Code of Conduct undertaking.
2. The Hall Warden or Porter receives the clearance bundle on their admin dashboard.
3. Upon physical verification of original documents at the porter's desk, the Porter taps **"Approve Clearance"** on their mobile interface.
4. The student's status transitions to **"Fully Cleared & Occupant Active"**.

---

### 4.5 Phase 5: Digital Room Inventory Check-In & Inspection Audit
To prevent disputes regarding damaged property when students move out, `UnilagStay` includes a digital check-in audit:
1. Upon receiving the room key, the student and Porter perform a joint inspection using the app.
2. The app presents an **Interactive Room Checklist**:
   - Mattress condition (Good / Worn / Damaged)
   - Reading Desk & Chair
   - Window Louvers & Wire Mesh
   - Ceiling Fan & Regulator
   - Electrical Sockets & Light Fittings
   - Door Lock & Keys
3. Both Student and Porter sign digitally on the app screen.
4. The audit record is stored permanently in the database.

---

### 4.6 Phase 6: Residency Experience Workflows

#### A. Digital Gatekeeper & QR Access Pass
- Students display their dynamic QR code on their smartphone screen at the hostel gate.
- The Porter scans the code using the `UnilagStay` Porter View.
- The system plays an **audible beep** and displays a **GREEN Screen** (Access Granted) with student details, or a **RED Screen** (Access Denied / Expired / Suspended).

#### B. Visitor Management System
```
[Student Generates Visitor Pass] ---> [Share QR Code / PIN with Guest]
                                                    |
                                    [Guest Arrives at Hostel Gate]
                                                    |
                                    [Porter Scans QR / Enters PIN]
                                                    |
                                +-------------------+-------------------+
                                |                                       |
                         (Valid Visitor)                         (Invalid / Expired)
                                |                                       |
                       [Check-In Timestamp]                    [Deny Gate Entry]
                       [Porter Logs Guest Out]
```
- A host student creates a visitor pass in-app by entering the visitor's Name, Phone Number, and Visit Date.
- The app generates a 6-digit PIN and temporary QR code shared via WhatsApp/SMS to the visitor.
- At the hostel gate, the Porter scans the pass or enters the PIN.
- Visitors are automatically logged out when leaving; if a visitor stays past official visiting hours (e.g., 10:00 PM), the host student receives a notification, and the Porter flag lights up.

#### C. Maintenance & Repair Tickets (With Photo Uploads)
- Students report hostel defects directly from their phones:
  - Category: Plumbing / Electrical / Carpentry / Masonry / Janitorial.
  - Description & Urgency level.
  - Up to 3 live photos taken directly from the device camera.
- The ticket is automatically routed to the Maintenance Department and Hall Warden.
- Maintenance technicians mark the ticket as **"In Progress"** and upload a **"Completion Proof Photo"** when fixed.
- The student taps **"Confirm Fix & Close Ticket"**.

#### D. Digital Exeat & Night Pass Requests
- Students requesting permission to be absent from the hostel overnight fill an Exeat form in-app:
  - Destination Address & Reason for Leave.
  - Departure Date & Return Date.
  - Emergency Contact Phone Number.
- The Hall Warden receives a push notification and can tap **"Approve"** or **"Decline"**.
- Approved exeat passes automatically update the Gate Scanner so Porters do not flag the student as unaccounted for during night headcounts.

#### E. Roommate Matching & Bedspace Transfer Requests
- **Roommate Matching**: Students fill out a lifestyle preference quiz (Study habits: Night owl / Early bird; Cleanliness preference; Music level) to view compatibility scores with potential roommates prior to balloting.
- **Transfer Requests**: Students seeking mutual bedspace swaps submit a joint swap request. Once both students and the Hall Warden approve in-app, room allocations swap automatically.

#### F. Emergency Panic Alert System
- A prominent red **"SOS Emergency"** button is available on the student home screen.
- Pressing and holding the button for 3 seconds broadcasts an immediate alert with location/room details to:
  - Hostel Security & Chief Porter Desk.
  - UNILAG Campus Security Control Room.
  - Hall Warden on duty.

---

## 5. Strict Role-Based UI/UX Specifications

To ensure zero confusion for non-technical users, each role operates on a customized user interface with distinct visual branding and navigation options.

```
========================================================================================
                          ROLE-BASED NAVIGATION ARCHITECTURE
========================================================================================

1. STUDENT INTERVIEW NAVIGATION (Theme: UNILAG Maroon #7A0000 & Gold #D4AF37)
   ├── Tab 1: Home Dashboard (QR Pass Button, SOS Alert, Active Room Card)
   ├── Tab 2: Balloting Engine (Live Countdown, Quota Picker, 72h Payment Status)
   ├── Tab 3: Services (Maintenance Tickets, Exeat Requests, Visitor Passes)
   ├── Tab 4: Roommate & Community (Roommate Profile, Noticeboard, Complaints)
   └── Tab 5: Profile & Docs (Clearance Slips, Payment Receipts, Settings)

2. PORTER / GATEKEEPER NAVIGATION (Theme: Navy Blue #0A2540 & High-Vis Green)
   ├── Tab 1: Gate Scanner (Full-screen Camera QR Reader, Big Visual Status Cards)
   ├── Tab 2: Visitor Log (Active Guests, Overdue Visitors, Manual PIN Lookup)
   ├── Tab 3: Room Inventory (Check-in Checklist, Inspection Sign-off)
   └── Tab 4: Incidents (Quick Incident Logger, Security Flash Alerts)

3. HALL WARDEN / ADMIN NAVIGATION (Theme: Deep Emerald #064E3B & Gold)
   ├── Tab 1: Executive Dashboard (Total Occupancy %, Pending Clearances, Open Repairs)
   ├── Tab 2: Approvals Queue (Exeat Requests, Document Clearances, Swaps)
   ├── Tab 3: Hall Roster (Search Students by Name/Room, Disciplinary Flagging)
   └── Tab 4: Broadcast (Post Announcements to Noticeboard, Alert Porters)

4. MAINTENANCE STAFF NAVIGATION (Theme: Industrial Amber #B45309 & Charcoal)
   ├── Tab 1: Ticket Queue (Assigned Repairs sorted by Urgency)
   ├── Tab 2: Active Work (In-Progress Jobs, Photo Upload Tools)
   └── Tab 3: Work History (Completed Jobs, Student Ratings)
========================================================================================
```

### 5.1 Design System & Color Palette
- **UNILAG Primary Maroon**: `#7A0000` (Headers, Primary Actions, Branding)
- **UNILAG Accent Gold**: `#D4AF37` / `#FFC107` (Highlights, Badges, Badges)
- **Gate Success Green**: `#16A34A` (Clear Access Granted, Completed Tickets)
- **Gate Denied Red**: `#DC2626` (Access Denied, Overdue Exeat, Panic Alert)
- **Background Slate**: `#F8FAFC` (Clean, non-glare background for outdoor visibility)
- **Typography**: Large, high-contrast sans-serif fonts (System Default / Inter) tuned for non-tech readability.

---

## 6. Turso Database Schema & Data Models

`UnilagStay` utilizes **Turso (libSQL)**, an edge SQLite database that supports fast distributed synchronization and local offline caching. Below is the relational DDL database schema.

```sql
-- ====================================================================
-- UNILAG HOSTEL MANAGEMENT DATABASE SCHEMA (TURSO LIBSQL / SQLITE)
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. USERS & AUTHENTICATION TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- UUID v4
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

-- 2. STUDENT PROFILES & ELIGIBILITY TABLE
CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    faculty TEXT NOT NULL,
    department TEXT NOT NULL,
    level INTEGER NOT NULL, -- 100, 200, 300, 400, 500, 600, 700 (PG)
    campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
    priority_category TEXT CHECK(priority_category IN ('FRESHER', 'FINALIST', 'SCHOLAR', 'SPECIAL_NEEDS', 'STALLITE')) NOT NULL,
    fees_paid INTEGER DEFAULT 0, -- 0 = False, 1 = True
    clearance_status TEXT CHECK(clearance_status IN ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'NOT_STARTED'
);

-- 3. HOSTELS DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS hostels (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- e.g. "King Jaja Hall"
    gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'MIXED')) NOT NULL,
    campus TEXT CHECK(campus IN ('MAIN_CAMPUS', 'CMUL_IDI_ARABA')) NOT NULL,
    category TEXT CHECK(category IN ('UNDERGRADUATE', 'POSTGRADUATE')) NOT NULL,
    total_capacity INTEGER NOT NULL,
    available_bedspaces INTEGER NOT NULL
);

-- 4. BLOCKS & ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    hostel_id TEXT NOT NULL FOREIGN KEY REFERENCES hostels(id) ON DELETE CASCADE,
    block_name TEXT NOT NULL, -- e.g. "Block A"
    floor_number INTEGER NOT NULL,
    room_number TEXT NOT NULL, -- e.g. "A204"
    total_beds INTEGER DEFAULT 4,
    occupied_beds INTEGER DEFAULT 0
);

-- 5. BEDSPACES & BALLOTING ALLOCATION TABLE
CREATE TABLE IF NOT EXISTS bedspaces (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL FOREIGN KEY REFERENCES rooms(id) ON DELETE CASCADE,
    bed_label TEXT NOT NULL, -- e.g. "Bed A (Down)", "Bed B (Up)"
    status TEXT CHECK(status IN ('AVAILABLE', 'LOCKED_HOLD', 'CONFIRMED', 'MAINTENANCE_BLOCKED')) DEFAULT 'AVAILABLE',
    allocated_to_user_id TEXT FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL,
    hold_expires_at DATETIME, -- 72-hour countdown deadline
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    bedspace_id TEXT NOT NULL FOREIGN KEY REFERENCES bedspaces(id),
    transaction_reference TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    payment_status TEXT CHECK(payment_status IN ('PENDING', 'SUCCESSFUL', 'FAILED')) DEFAULT 'PENDING',
    paid_at DATETIME
);

-- 7. ROOM INVENTORY AUDIT TABLE
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

-- 8. MAINTENANCE TICKETS TABLE
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

-- 9. VISITOR PASSES TABLE
CREATE TABLE IF NOT EXISTS visitor_passes (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT NOT NULL,
    pass_code TEXT NOT NULL, -- 6-Digit PIN
    visit_date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status TEXT CHECK(status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED')) DEFAULT 'EXPECTED'
);

-- 10. EXEAT & NIGHT PASS REQUESTS TABLE
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

-- 11. EMERGENCY SOS ALERTS TABLE
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL FOREIGN KEY REFERENCES users(id),
    hostel_id TEXT NOT NULL FOREIGN KEY REFERENCES hostels(id),
    room_number TEXT NOT NULL,
    alert_type TEXT DEFAULT 'MEDICAL_OR_SECURITY',
    status TEXT CHECK(status IN ('ACTIVE', 'RESPONDED', 'RESOLVED')) DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_users_matric ON users(matric_or_staff_no);
CREATE INDEX IF NOT EXISTS idx_bedspaces_status ON bedspaces(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_visitor_pass_code ON visitor_passes(pass_code);
```

---

## 7. Technical Stack & Offline-First Sync Architecture

### 7.1 Technology Stack
- **Frontend Framework**: React Native (Bare Workflow / Expo SDK 51+)
- **Styling Engine**: NativeWind v4 (Tailwind CSS for React Native)
- **Database Client**: `@libsql/client` / `expo-sqlite` with Turso Edge Replication
- **State Management**: Zustand / TanStack React Query v5
- **Camera & QR Scanning**: `expo-camera` & `react-native-qrcode-svg`
- **Push Notifications**: Expo Notifications & Firebase Cloud Messaging (FCM)

### 7.2 Offline-First Strategy for Hostel Gates
Because mobile network signal inside thick concrete UNILAG hostel gate buildings can fluctuate:
1. **Local SQLite Caching**: Porter devices automatically fetch and sync active hostel bedspace passes and expected visitor lists every morning.
2. **Offline Verification**: When the device is offline, gate validation takes place against the encrypted JWT payload encoded inside the QR code signature and verified with a public key cached locally on the device.
3. **Background Sync Queue**: Gate scan logs recorded offline are placed in an indexed SQLite Queue and synchronized back to Turso DB as soon as network connection is restored.

---

## 8. Non-Technical Feature Walkthrough & Visual Wireframe Specs

Below are non-technical textual wireframes illustrating how key screens present information clearly.

### 8.1 Screen 1: Student Gate Pass & Home Screen
```
+-------------------------------------------------------+
|  [UNILAG LOGO]   UnilagStay            [SOS ALERT]    |
+-------------------------------------------------------+
|  Welcome back, OLAOLUWA                               |
|  King Jaja Hall | Block B | Room B204 | Bed A (Down)  |
+-------------------------------------------------------+
|                                                       |
|             +---------------------------+             |
|             |                           |             |
|             |   [ DYNAMIC QR CODE ]     |             |
|             |   (Refreshes every 30s)   |             |
|             |                           |             |
|             +---------------------------+             |
|                                                       |
|               STATUS: ACTIVE RESIDENT                 |
|                                                       |
+-------------------------------------------------------+
|  [ QUICK ACTIONS ]                                    |
|  +--------------------+    +-----------------------+  |
|  | [+] Visitor Pass   |    | [!] Maintenance Fix   |  |
|  +--------------------+    +-----------------------+  |
|  | [->] Night Exeat   |    | [=] View Clearances   |  |
|  +--------------------+    +-----------------------+  |
+-------------------------------------------------------+
| [Home]  [Ballot]  [Services]  [Roommates]  [Profile]  |
+-------------------------------------------------------+
```

### 8.2 Screen 2: Porter High-Visibility Gate Scanner
```
+-------------------------------------------------------+
|  PORTER GATE PASS VERIFIER         [OFFLINE MODE: OK] |
+-------------------------------------------------------+
|                                                       |
|             +---------------------------+             |
|             |                           |             |
|             |    CAMERA SCANNER VIEW    |             |
|             |                           |             |
|             +---------------------------+             |
|                                                       |
+-------------------------------------------------------+
|  LAST SCAN RESULT:                                    |
|  +-------------------------------------------------+  |
|  |                 [ ACCESS GRANTED ]              |  |
|  |  NAME: ADEBAYO CHUKWUEMEKA                      |  |
|  |  MATRIC: 190407088                              |  |
|  |  ROOM: MOREMI HALL - C302                       |  |
|  |  CLEARANCE: APPROVED (VALID UNTIL AUG 2025)     |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
|  [ SCAN VISITOR PIN ]         [ LOG MANUAL ENTRY ]    |
+-------------------------------------------------------+
```

---

## 9. Non-Functional Requirements (NFRs)

1. **Concurrency & Load Capacity**: The balloting engine must handle up to **25,000 concurrent requests** during the initial 15-minute balloting launch window without server crash or double-booking.
2. **Scan Latency**: QR gate verification must process in **< 500 milliseconds** on entry.
3. **Battery Optimization**: Porter scanning mode must operate continuously for **8+ hours** on a standard Android battery without overheating.
4. **Data Security & Privacy**: Student biometric data, passport photos, and matric records must be encrypted at rest using **AES-256** and in transit using **TLS 1.3**.

---

## 10. Implementation Roadmap & Milestones

- **Phase 1 (Sprint 1-2)**: Core Database setup on Turso, Auth System, & Student/Hostel Data Models.
- **Phase 2 (Sprint 3-4)**: Live Priority Balloting Engine with Atomic Room Locks & 72-Hour Payment Hold logic.
- **Phase 3 (Sprint 5-6)**: Mobile UI development with NativeWind/Tailwind (Student, Porter, Warden, Maintenance views).
- **Phase 4 (Sprint 7)**: QR Code Scanner, Offline-First Sync for Porters, & Gatekeeper Verification.
- **Phase 5 (Sprint 8)**: End-to-End User Testing across UNILAG Main Campus & CMUL Hostels.

---
*End of Product Requirement Document (PRD.md)*
