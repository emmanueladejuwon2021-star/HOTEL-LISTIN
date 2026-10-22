# GITHUB ISSUES WORKFLOW & GIT BRANCHING RULES
## UNILAG HOSTEL MANAGEMENT APP ('UnilagStay')

---

### 1. ISSUE-DRIVEN DEVELOPMENT
1. Work must proceed strictly one issue at a time from `.github/issues.json`.
2. Branch naming convention: `feat/issue-<NUMBER>-<SHORT_DESCRIPTION>` (e.g. `feat/issue-001-auth-login`).
3. Commit message convention: `feat(auth): [AUTH-01] implement user login with matric number validation`.
4. PR description must link directly to the issue: `Closes #1`.

---

### 2. PRE-COMMIT & SUBMISSION CHECKLIST
1. Always run pre-commit verification tools before submitting.
2. Never leave temporary generation scripts or unneeded scratch files in the repository.

---

*End of Workflow Rules (.agent/workflow_rules.md)*