# UNILAG Hostel Management Mobile Application ("UnilagStay")

Welcome to **UnilagStay**, the official accommodation management application designed for University of Lagos (UNILAG) students, hall wardens, hostel porters, maintenance artisans, and university administrators across Akoka Main Campus and CMUL Idi-Araba Campus.

---

## 1. WHAT UNILAGSTAY IS

UNILAG is home to over 50,000 undergraduate and postgraduate students, but university-owned hostel facilities provide approximately 10,000 bedspaces. Historically, this immense demand led to server crashes during annual hostel registration, long physical queues at porter desks, illegal bedspace trading (subletting or squatting), lost paper repair requests, and delayed document clearance.

`UnilagStay` transforms complex university accommodation procedures into an intuitive, secure, mobile experience. It completely eliminates paper forms and double-allocations by linking every hostel bedspace directly to a verified student record and encrypted dynamic QR gate pass.

---

## 2. WHO THE APP IS FOR

`UnilagStay` uses **Role-Based Access Control (RBAC)** to provide dedicated, simplified interfaces for every user role:

1. **UNILAG Students**: Perform eligibility checks, participate in real-time priority balloting, reserve bedspaces, make secure hostel fee payments via Remita, upload digital screening documents, present dynamic entry QR codes, request night exeat permissions, generate visitor passes, and log room maintenance requests with photographs.
2. **Hostel Porters (Gatekeepers)**: Scan student and visitor QR codes at hostel gatehouses in under 500 milliseconds (even when offline), record joint room check-in inventory audits with touchscreen signatures, and respond to emergency panic alerts.
3. **Hall Wardens**: Review uploaded digital student clearance packages, approve or decline overnight exeat applications, track real-time hall occupancy metrics, issue hall announcements, and manage student disciplinary flags.
4. **Maintenance Personnel (Artisans)**: View assigned hostel repair tickets, inspect student issue descriptions and photographs, update repair status ('In Progress' / 'Resolved'), and upload proof-of-fix photos.
5. **System Administrators**: Manage role permissions, configure balloting quotas, audit gate access logs, and monitor Turso database sync operations.

---

## 3. HOW THE STUDENT ACCOMMODATION JOURNEY WORKS

The accommodation lifecycle in `UnilagStay` guides students step-by-step through every phase:

1. **Sign-In & Eligibility Check**: The student signs in using their UNILAG Matriculation or UTME Number. The app verifies tuition fee payments, academic registration, and disciplinary standing in real time.
2. **Priority Quota Balloting**: During designated balloting windows (categorized for Freshers, Finalists, Scholars/Athletes, and Stallites), the student selects an available room and bedspace.
3. **72-Hour Payment Hold**: Upon selecting a bedspace, the system places an atomic transaction lock on the bed for 72 hours, generating a provisional booking slip with a countdown timer.
4. **Payment Verification**: The student completes fee payment through the Remita / card gateway. Upon payment confirmation, the bedspace status updates to confirmed.
5. **Digital Document Clearance**: The student uploads required screening documents (Medical Certificate from Jaja Clinic, Passport Photo, and signed Code of Conduct Form). Once reviewed and approved by the Warden, a unique clearance certificate reference hash is issued.
6. **Physical Room Inspection**: On move-in day, the student and porter inspect room fixtures (mattress, fan, lighting, window locks) and sign a digital inventory audit.
7. **Hostel Entry & Gate Access**: The student presents a dynamic, self-refreshing QR gate pass on their smartphone screen. Porters scan the QR code to grant instant entry.

---

## 4. HOW IMPORTANT PROCESSES WORK

- **Real-Time Priority Balloting Engine**: Implements quota reservation algorithms (40% Freshers, 30% Finalists, 10% Scholars/Athletes, 20% Stallites) that prevent double-booking.
- **72-Hour Payment Lock**: Prevents multiple students from claiming the same bedspace while allowing time for bank transfer verification. If unpaid after 72 hours, the bedspace automatically recycles back into the available pool.
- **Clearance Certificate Reference Hash**: Generates a cryptographic verification code (`CERT-...`) upon Warden approval, allowing staff to verify clearance authenticity at any time.
- **Offline-First Gatekeeper Verification**: Gate passes encode signed RSA-256 JWT tokens verified locally by porter devices without requiring an active internet connection.

---

## 5. SECURITY, PRIVACY & DATA PROTECTION

- **Zero-Mock Policy**: All operations connect directly to live or local Turso libSQL SQLite databases with foreign key integrity.
- **Isolated Role Views**: Students cannot access staff options; staff permissions are enforced by trusted server rules.
- **Data Protection**: Sensitive keys and database access tokens are stored securely in `expo-secure-store` and never exposed in public client bundles.
- **Dynamic QR Anti-Replay**: Gate pass QR codes automatically refresh every 30 seconds to prevent screenshots or unauthorized sharing.

---

## 6. STATUS OF APPLICATION FEATURES

- **Available Now (Implemented & Verified)**: Student authentication, eligibility verification, priority balloting engine, 72-hour payment lock & Remita gateway, digital clearance document upload & verification hash lookup, physical room inspection logging, immutable check-in certificate hashing, check-out audit recovery, dynamic QR gatepass generation, camera scanner UI with manual PIN lookup, sub-500ms validation, 3-second scanner auto-reset, audio chime/buzz feedback triggers, disciplinary security flag alerts, incident reporting dispatch, porter shift statistics ribbon, emergency gate lockdown mode, and offline JWT key caching with SQLite queueing.
- **In Active Development / Planned**: Network connectivity monitoring state, visitor pass management, artisan work queue dispatch screen, night exeat Warden workflow UI, and emergency SOS gate panic alarm UI.

---

---

## 7. HOW TO TEST AND RUN THE APP WITHOUT ANDROID STUDIO

You **do not need Android Studio** or heavy SDK installations to test and interact with UnilagStay! You have multiple fast, lightweight options depending on what you want to test:

### Option A: Interactive Testing on Your Physical Smartphone (Recommended)
This provides the real native mobile experience (camera, touch gestures, smooth animations) on your personal smartphone without installing Android Studio.

1. **Install Expo Go on your mobile phone**:
   - **Android**: Search for **Expo Go** in the [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) and tap Install.
   - **iOS (iPhone/iPad)**: Search for **Expo Go** in the [Apple App Store](https://apps.apple.com/app/expo-go/id982107779) and tap Get.

2. **Connect Phone and Computer to the Same Wi-Fi Network** (or phone mobile hotspot).

3. **Start the Development Bundler in Terminal**:
   ```bash
   cd HOTEL-LISTIN
   npm start
   ```
   *(Or run `npx expo start`)*

4. **Open the App on Your Phone**:
   - **On Android**: Open the **Expo Go** app, tap **Scan QR code**, and point your camera at the QR code displayed in your terminal.
   - **On iOS**: Open the built-in **iOS Camera** app, aim at the QR code, and tap the "Open in Expo Go" banner.

> [!TIP]
> **Wi-Fi Isolation / Tunnel Mode**: If your phone cannot reach your computer over local Wi-Fi (e.g. university network or campus hostel Wi-Fi with client isolation), start Expo with the tunnel flag:
> ```bash
> npx expo start --tunnel
> ```
> This creates a secure external link so your phone can connect from anywhere on cellular data or separate Wi-Fi!

---

### Option B: Instant Web Browser Preview (Zero Phone or App Setup)
You can run and test the complete user interfaces, navigation flows, and forms directly in Google Chrome, Microsoft Edge, Firefox, or Safari on your computer:

1. **Start Expo with Web Support**:
   ```bash
   cd HOTEL-LISTIN
   npm run web
   ```
   *(Or run `npx expo start --web`, or press `w` in an active Expo terminal)*

2. **Mobile Device Emulation in Chrome/Edge**:
   - Open DevTools by pressing `F12` (or `Ctrl + Shift + I`).
   - Click the **Toggle Device Toolbar** icon (or press `Ctrl + Shift + M`).
   - Select a device preset such as **iPhone 14 Pro**, **Pixel 7**, or **Samsung Galaxy S20** to preview the exact mobile layout, tabs, and modals.

---

### Option C: Automated Test Verification (Headless CLI)
To verify that all backend database constraints, SQLite encryption, JWT signatures, role permissions, payment locks, and offline gate sync queues are functioning with zero regressions:

1. **Run All 11 Automated Test Suites (163+ Tests)**:
   ```bash
   cd HOTEL-LISTIN
   npm test -- --runInBand
   ```

2. **Run a Specific Feature Test Suite**:
   ```bash
   # Test Offline Key Caching & Background Sync (Issue #41)
   npx jest src/__tests__/offline.test.ts --runInBand

   # Test Porter QR Scanner, 3s Reset, Audio Chimes & Lockdown (Issues #36-#40)
   npx jest src/__tests__/scanner.test.ts --runInBand

   # Test Digital Room Check-in/Check-out Audits (Issues #26-#30)
   npx jest src/__tests__/inventory.test.ts --runInBand

   # Test Dynamic RSA-256 Gate Pass Generation & Expiry (Issues #31-#32)
   npx jest src/__tests__/gatepass.test.ts --runInBand
   ```

---

### Option D: Build a Standalone `.apk` File in the Cloud (No Local Android Studio)
If you need an installable `.apk` file to install directly onto Android devices without Android Studio installed on your computer:

1. **Install EAS (Expo Application Services) CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Log into Expo** (free account):
   ```bash
   eas login
   ```

3. **Build the Android APK in Expo's Cloud**:
   ```bash
   eas build -p android --profile preview
   ```
   Expo's cloud builders will compile the standalone APK and provide a download link and QR code to download and install the `.apk` directly onto any Android phone.

---

## 8. DEVELOPER SETUP & QUICK START

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npx expo`)

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suites (Jest with SQLite concurrency isolation)
npm test -- --runInBand

# 3. Perform TypeScript type check
npx tsc --noEmit

# 4. Start Expo development server
npm start
```

---

## 9. COMPLETE FEATURE CHECKLIST

### Status Legend
- `[x]` **Implemented and Verified**: The feature is implemented and confirmed through passing automated unit, integration, or end-to-end tests.
- `[ ]` **Not yet verified as complete**: The feature is planned, in development, or awaiting full implementation and testing.

---

### Student Accounts & Profiles
- [x] Students can sign in securely with UNILAG Matriculation or UTME Number (`[AUTH-01]` - Issue #1)
- [x] Students can view and manage profile details including faculty, department, level, and campus (`[AUTH-02]` - Issue #2)
- [x] Secure password hashing and authentication token storage in `expo-secure-store` (`[AUTH-03]` - Issue #3)
- [x] Student active status and disciplinary suspension checks (`[AUTH-04]` - Issue #4)
- [x] Role-based view separation ensuring students access student-only screens (`[AUTH-05]` - Issue #5)

### Eligibility & Accommodation Applications
- [x] Real-time verification of school fees payment status (`[ELIGIBILITY-01]` - Issue #6)
- [x] Automatic academic registration standing checks (`[ELIGIBILITY-02]` - Issue #7)
- [x] Priority quota classification (Fresher, Finalist, Scholar, Special Needs, Stallite) (`[ELIGIBILITY-03]` - Issue #8)
- [x] Detailed error explanations when student is ineligible (e.g. School Fees Unpaid) (`[ELIGIBILITY-04]` - Issue #9)
- [x] Integration between eligibility verification and balloting activation (`[ELIGIBILITY-05]` - Issue #10)

### Balloting & Bedspace Allocation
- [x] Real-time balloting window countdown timer and status indicator (`[BALLOTING-01]` - Issue #11)
- [x] Gender and campus hostel filtering (Main Campus vs. CMUL Idi-Araba) (`[BALLOTING-02]` - Issue #12)
- [x] Interactive block, floor, room, and bed position selector (`[BALLOTING-03]` - Issue #13)
- [x] Concurrency control preventing two students from locking the same bed (`[BALLOTING-04]` - Issue #14)
- [x] Real-time bedspace availability status updates (`[BALLOTING-05]` - Issue #15)

### Reservations & Bedspace Locks
- [x] Atomic 72-hour hold transaction when student selects a bedspace (`[PAYMENT-01]` - Issue #16)
- [x] Display of provisional booking slip with HH:MM:SS countdown clock (`[PAYMENT-02]` - Issue #17)
- [x] Automatic recycling of expired bedspaces back to available pool (`[PAYMENT-03]` - Issue #18)
- [x] Bedspace status transition tracking (`AVAILABLE` -> `LOCKED_HOLD` -> `CONFIRMED`) (`[PAYMENT-04]` - Issue #19)
- [x] Prevention of duplicate reservation attempts by the same student (`[PAYMENT-05]` - Issue #20)

### Payments, Receipts & Payment Verification
- [x] Integration with Remita fee payment gateway webview flow (`[PAYMENT-01]` - Issue #16)
- [x] Payment reference number generation and status tracking (`[PAYMENT-02]` - Issue #17)
- [x] Instant payment verification updating bedspace hold to confirmed status (`[PAYMENT-03]` - Issue #18)
- [x] Digital payment receipt summary with transaction reference (`[PAYMENT-04]` - Issue #19)
- [x] Protection against duplicate charge submissions (`[PAYMENT-05]` - Issue #20)

### Clearance & Required Documentation
- [x] Digital upload of Jaja Clinic Medical Certificate (`[CLEARANCE-01]` - Issue #21)
- [x] Digital upload of red-background Passport Photograph (`[CLEARANCE-02]` - Issue #22)
- [x] Digital upload of signed UNILAG Hostel Code of Conduct form (`[CLEARANCE-03]` - Issue #23)
- [x] Physical document screening inspection logging at porter desk (`[CLEARANCE-04]` - Issue #24)
- [x] Generation and verification lookup of clearance certificate hash codes (`[CLEARANCE-05]` - Issue #25)

### Room Inventory & Check-In Audits
- [x] Digital room checklist audit for mattress, fan, light fittings, and locks (`[INVENTORY-01]` - Issue #26)
- [x] Joint touchscreen signature capture for student and porter (`[INVENTORY-02]` - Issue #27)
- [x] Room property defect reporting upon check-in (`[INVENTORY-03]` - Issue #28)
- [x] Generation of immutable digital room check-in certificate (`[INVENTORY-04]` - Issue #29)
- [x] Check-out inventory inspection and clearance recovery (`[INVENTORY-05]` - Issue #30)

### Dynamic QR Pass & Gatekeeping
- [x] RSA-256 dynamic QR gate pass generation for verified residents (`[GATEPASS-01]` - Issue #31)
- [x] 30-second token auto-refresh countdown to prevent pass sharing (`[GATEPASS-02]` - Issue #32)
- [x] Porter camera scanner interface with high-contrast pass/fail indicators (`[SCANNER-01]` - Issue #36)
- [x] Sub-500ms QR verification performance (`[SCANNER-02]` - Issue #37)
- [x] Manual 6-digit PIN lookup backup for gate access (`[SCANNER-03]` - Issue #38)
- [x] Porter scanner auto-reset after 3s, audio feedback chime/buzz & disciplinary security flags (`[SCANNER-04]` - Issue #39)
- [x] Porter shift statistics, occupancy counters & emergency lockdown mode (`[SCANNER-05]` - Issue #40)

### Offline Operations & Network Recovery
- [x] Offline local public key caching for JWT gate pass verification (`[OFFLINE-01]` - Issue #41)
- [x] Local SQLite queueing for offline gate entry logs (`[OFFLINE-02]` - Issue #42)
- [x] Automatic background sync when internet connection resumes (`[OFFLINE-03]` - Issue #43)
- [ ] Offline status badge and network connectivity state monitoring (`[OFFLINE-04]` - Issue #44)
- [ ] Conflict resolution for offline gate check-in records (`[OFFLINE-05]` - Issue #45)

### Visitor Management System
- [ ] Student visitor pass creation with guest name, phone, and visit date (`[VISITOR-01]` - Issue #46)
- [ ] Temporary 6-digit PIN and temporary QR code for guests (`[VISITOR-02]` - Issue #47)
- [ ] Porter guest entry check-in and exit logging (`[VISITOR-03]` - Issue #48)
- [ ] Visitor curfew alert for guests remaining past allowed hours (`[VISITOR-04]` - Issue #49)
- [x] Visitor log history and frequent guest management (`[VISITOR-05]` - Issue #50)

### Maintenance & Artisan Ticket System
- [ ] Student maintenance ticket creation with live problem photo capture (`[MAINTENANCE-01]` - Issue #51)
- [ ] Categorization by defect type (Plumbing, Electrical, Carpentry, Masonry) (`[MAINTENANCE-02]` - Issue #52)
- [ ] Artisan repair job queue sorted by urgency SLA (`[MAINTENANCE-01]` - Issue #56)
- [ ] Proof-of-fix 'After' photo upload by maintenance staff (`[MAINTENANCE-02]` - Issue #57)
- [ ] Student inspection and fix confirmation trigger (`[MAINTENANCE-03]` - Issue #58)

### Night Exeat & Overnight Permission
- [ ] Student night exeat application specifying destination and duration (`[EXEAT-01]` - Issue #61)
- [ ] Automated push notification to Hall Warden for exeat approval (`[EXEAT-02]` - Issue #62)
- [ ] Warden single-tap exeat approval or decline with comments (`[EXEAT-03]` - Issue #63)
- [ ] Gate scanner sync permitting student exit without curfew flags (`[EXEAT-04]` - Issue #64)
- [ ] Exeat return deadline tracking and overdue alert logging (`[EXEAT-05]` - Issue #65)

### Emergency SOS & Security Alerts
- [ ] Student 3-second red SOS panic button trigger (`[EMERGENCY-01]` - Issue #66)
- [ ] Loud audible alarm and red screen alert at Porter Gate Desk (`[EMERGENCY-02]` - Issue #67)
- [ ] Instant room location, student name, and phone display on porter desk (`[EMERGENCY-03]` - Issue #68)
- [ ] Automatic SMS alert dispatch to Hall Warden and UNILAG Security (`[EMERGENCY-04]` - Issue #69)
- [ ] Emergency response logging and resolution audit trail (`[EMERGENCY-05]` - Issue #70)

### Roommate Compatibility & Bedswap
- [ ] Roommate lifestyle survey questionnaire (sleep schedule, study habits) (`[ROOMMATE-01]` - Issue #71)
- [ ] Automated compatibility matching score display (`[ROOMMATE-02]` - Issue #72)
- [ ] Mutual bedspace swap request between two willing students (`[ROOMMATE-03]` - Issue #73)
- [ ] Warden approval check for bedswap requests (`[ROOMMATE-04]` - Issue #74)
- [ ] Database swap transaction execution updating bed assignments (`[ROOMMATE-05]` - Issue #75)

### Administration & Warden Operations
- [x] Warden executive dashboard displaying hall occupancy rate (`[ADMIN-01]` - Issue #76)
- [x] Pending student clearance review queue (`[ADMIN-02]` - Issue #77)
- [ ] Disciplinary blacklist flagging preventing unauthorized balloting (`[ADMIN-01]` - Issue #81)
- [ ] Official hostel noticeboard announcement broadcast system (`[COMMUNITY-01]` - Issue #86)
- [ ] Detailed occupancy and revenue reporting export (`[ADMIN-05]` - Issue #80)

---

*UnilagStay Hostel Management Mobile Application • University of Lagos (UNILAG)*
