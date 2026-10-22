# AUTOMATED TESTING & ZERO-PLACEHOLDER POLICY RULES
## UNILAG HOSTEL MANAGEMENT APP ('UnilagStay')

---

### 1. TESTING REQUIREMENTS
1. **Unit & Integration Tests**: Every API module, utility function, and database transaction must have corresponding unit tests written using Jest.
2. **UAT Verification Alignment**: Tests must explicitly map to the 100 UAT scenarios defined in Section 15 of `PRD.md`.
3. **Network Fluctuation Tests**: Offline gate verification functions must be tested under simulated zero-connectivity environments.

---

### 2. VERIFICATION PROTOCOL BEFORE ISSUE CLOSURE
Before marking any of the 100 GitHub issues complete, the AI agent MUST:
1. Execute `npm test` / `jest` and ensure 100% test pass rate.
2. Verify that no mock functions or dummy JSON data are used in the implemented feature.
3. Inspect modified code files to ensure TypeScript types are strict and NativeWind styling is clean.

---

*End of Testing Rules (.agent/testing_rules.md)*