# NON-TECHNICAL ACCESSIBLE UI/UX DESIGN SYSTEM RULES
## UNILAG HOSTEL MANAGEMENT APP ('UnilagStay')

---

### 1. DESIGN FOR NON-TECH USERS
1. **Massive Touch Targets**: Buttons for Porters and Wardens must have a minimum touch height of `56dp` / `h-14` to allow effortless tapping on low-cost devices.
2. **High-Contrast Text**: Text against backgrounds must meet WCAG AAA contrast standards. Use `text-slate-900` or `text-white` on dark buttons.
3. **Color + Icon Dual Feedback**: Never rely solely on color to communicate state. Always pair color with clear text and distinct icons (e.g., Green + Checkmark + 'ACCESS GRANTED', Red + Crossmark + 'ACCESS DENIED').
4. **Audible & Haptic Feedback**: Porter gate scanner must trigger device haptic vibration (`Haptics.notificationAsync`) and clear sound chimes upon successful or failed scans.

---

### 2. ROLE-SPECIFIC SCREEN GUIDELINES
- **Student View**: Modern, clean, intuitive cards, live countdown timers for balloting and payment holds, quick action grids.
- **Porter View**: Full-screen camera scanner, massive status banners, one-tap manual visitor lookup, large text for outdoor sun readability.
- **Warden View**: Tabular summaries, badge counters for pending items, single-tap 'Approve' and 'Decline' actions.
- **Maintenance View**: Clear visual job cards with problem photographs, urgency badges (Emergency, High, Medium, Low), and proof upload buttons.

---

*End of UI/UX Rules (.agent/ui_ux_rules.md)*