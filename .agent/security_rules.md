# PRODUCTION SECURITY & DATA PRIVACY RULES
## UNILAG HOSTEL MANAGEMENT APP ('UnilagStay')

---

### 1. AUTHENTICATION & TOKEN SECURITY
1. **Dynamic RSA-256 Signature Verification**: Dynamic QR code gate passes generated for students must contain an RSA-256 signed JSON Web Token (JWT) encoding Student ID, Room Allocation ID, Expiry Timestamp (30s refresh window), and Anti-Replay Salt.
2. **Secure Token Storage**: Authentication tokens, refresh keys, and cached user biometrics MUST be stored using `expo-secure-store` (EncryptedSharedPreferences on Android / Keychain on iOS). Never store tokens in unencrypted AsyncStorage or plain state.
3. **Matriculation & Staff No Validation**: All user logins must strictly validate against standard UNILAG formats (e.g., 9-digit matric numbers like `190407088` or staff IDs).

---

### 2. DATA ENCRYPTION & PRIVACY
1. **Encryption at Rest & Transit**: All Turso local SQLite database files on mobile devices must be encrypted using SQLCipher / Turso Encryption. All network transmissions must enforce TLS 1.3.
2. **Sensitive Photo Privacy**: Student clearance passport photos, medical records, and maintenance damage photos must be stored in secure private bucket storage with signed, time-limited URLs (max 15-minute validity).
3. **Zero Plaintext Credentials**: Passwords and PIN numbers must be salted and hashed using bcrypt / Argon2 before transmission or local storage.

---

### 3. ROLE ACCESSIBILITY & AUTHORIZATION
1. **Server-Side & DB Guarding**: Frontend UI isolation is insufficient; every database mutation and query MUST verify user role and ownership at the libSQL client / backend middleware level.
2. **Disciplinary Blacklist Enforcer**: Porters scanning gate passes must be alerted instantly if a student's profile has a `DISCIPLINARY_SUSPENSION` flag set in the database.

---

*End of Security Rules (.agent/security_rules.md)*