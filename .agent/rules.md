# MASTER AI CODING AGENT DIRECTIVES & STRICT ZERO-MOCK POLICY
## UNILAG HOSTEL MANAGEMENT APP ('UnilagStay')

---

### 1. CORE DIRECTIVES & MANDATES
1. **STRICT ZERO-MOCK POLICY**: No AI agent or human engineer working on this repository shall write mock code, placeholder functions, dummy JSON data responses, or hardcoded UI stubs. Every feature implemented must connect to a live or local Turso libSQL database, process real input validation, and execute genuine business logic.
2. **PRODUCTION GRADE CODE MANDATE**: All code written must be production-ready from day one. This means strict TypeScript types, runtime prop validation, comprehensive error handling, graceful network recovery, and offline fallback mechanisms.
3. **NON-TECHNICAL ACCESSIBILITY FIRST**: The user interface must cater to non-technical users (hostel porters, hall wardens, and students). Buttons must be large, text must be high-contrast, status badges must be color-coded, and error messages must be plain English without technical jargon.
4. **ROLE SEPARATION IS MANDATORY**: Enforce strict Role-Based Access Control (RBAC). The mobile application must maintain isolated navigation trees for Student, Porter, Warden, and Maintenance roles. A user logged in as a Student must NEVER see or access Porter or Warden UI routes.
5. **ATOMIC GITHUB ISSUE BINDING**: Every code commit, branch creation, or pull request MUST correspond to one of the 100 atomic issues defined in `.github/issues.json` or `ISSUES.md`. Agents must work on one issue at a time and close it upon full verification.

---

### 2. ARCHITECTURAL BOUNDARIES
- **Frontend Stack**: React Native (Expo SDK 51+) with NativeWind v4 (Tailwind CSS) for cross-platform Android and iOS styling.
- **Database & Edge Layer**: Turso (libSQL Edge SQLite) accessed via `@libsql/client` and `expo-sqlite` for local offline replication.
- **State Management**: TanStack React Query v5 for server state and asynchronous query caching; Zustand for global client-side auth and role state.
- **Camera & Hardware APIs**: `expo-camera` for QR code scanning and defect photo capturing; `expo-notifications` for push alerts.

---

### 3. MANDATORY CODE STRUCTURE & CONVENTIONS
```
src/
├── api/             # Live API clients & Turso database queries
├── components/      # Atomic UI components styled with NativeWind
├── navigation/      # Isolated navigation stacks per user role
├── screens/         # Screen components for Student, Porter, Warden, Maintenance
├── store/          # Zustand global state stores (Auth, Offline Queue, User Role)
├── utils/          # Helper functions, JWT dynamic token validators, formatting
└── types/          # Strict TypeScript interfaces matching Turso SQL Schema
```

---

### 4. FORBIDDEN PATTERNS
- ❌ **Forbidden**: `const data = [{ id: 1, name: 'Dummy Student' }]` — Use live database queries instead.
- ❌ **Forbidden**: `// TODO: Implement later` — Implement the feature fully or do not commit.
- ❌ **Forbidden**: Using `any` type in TypeScript — All interfaces must match `PRD.md` SQL schema exactly.
- ❌ **Forbidden**: Generic alert boxes like `alert('Error')` — Use stylized NativeWind alert banners with specific user guidance.

---

*End of Master AI Agent Rules (.agent/rules.md)*