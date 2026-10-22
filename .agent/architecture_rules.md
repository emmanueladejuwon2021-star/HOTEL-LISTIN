# REACT NATIVE, NATIVEWIND & TURSO ARCHITECTURE RULES
## UNILAG HOSTEL MANAGEMENT APP ('UnilagStay')

---

### 1. FRONTEND ARCHITECTURE (REACT NATIVE + NATIVEWIND)
1. **NativeWind v4 Mandatory**: All UI styling must use NativeWind (Tailwind CSS utility classes). Avoid inline `style={{ ... }}` objects unless calculating dynamic animated values.
2. **UNILAG Visual Identity Enforced**: Colors must strictly align with the UNILAG design system:
   - Primary Maroon: `#7A0000` (`bg-[#7A0000]`, `text-[#7A0000]`)
   - Accent Gold: `#D4AF37` / `#FFC107` (`bg-[#D4AF37]`)
   - Gate Pass Success Green: `#16A34A` (`bg-emerald-600`)
   - Gate Pass Denied Red: `#DC2626` (`bg-red-600`)
   - Slate Neutral Background: `#F8FAFC` (`bg-slate-50`)
3. **Component Reusability**: Buttons, Inputs, Cards, and Headers must be atomic components placed in `src/components/` and accept strict props.

---

### 2. TURSO LIBSQL EDGE DATABASE ARCHITECTURE
1. **Atomic Transactions**: Bedspace balloting selections MUST use SQL transactions (`BEGIN TRANSACTION ... COMMIT`) with explicit checks to prevent race conditions and double bookings.
2. **72-Hour Hold Lock Logic**: When a student selects a bedspace, the database status must transition to `LOCKED_HOLD` with `hold_expires_at = DATETIME('now', '+72 hours')`. If payment is not recorded before expiry, a background job or query filter must automatically recycle the bedspace to `AVAILABLE`.
3. **Offline-First Synchronization**: Porters scanning gate passes must read from a local SQLite database replicated from Turso. Offline gate logs must be queued locally and pushed to Turso when network connection is restored.

---

*End of Architecture Rules (.agent/architecture_rules.md)*