# BEYOND 4.0-a — foundation and zero-effort input (release brief)

- **Authority:** [BEYOND-4.0](BEYOND-4.0.md) (Gavin, 2026-11-15, five decisions). Builder: Claude Code.
- **Lane:** the TODAY split is a routine refactor with no visible change; the input features are Feature lane.

## Part 1 — split TODAY safely (no visible change)

`TodayScreen.tsx` was 3,517 lines and 109 pieces of state. It is split in small slices, each moving one section into
its own component with explicit inputs while TODAY keeps its in-flight guard and what each tap opens; each slice is its
own PR with the TODAY browser suites as the safety net.

- **Slice 1 — AT A GLANCE** → `ui/screens/today/TodayNumbers.tsx`. The numbers' markup moved unchanged; the two tap
  handlers stay in TODAY verbatim.
- **Further slices are folded into 4.0-d** (Claude, 2026-11-15): the remaining sections (check-in, work context, reset,
  shift down) are already thin wrappers around their own components, and TODAY's weight is its 109 pieces of state and
  single `refresh()`. Release d rebuilds TODAY as the mission briefing; splitting code that d replaces would be wasted.
  The rest of the split happens inside d's rebuild, section by section.

**Finding (no change needed):** browser test storage is already isolated (each test clears it; parallel workers get
separate browser contexts). The intermittent CommandConsole failure was the real fold bug fixed in #535.

## Part 2 — zero-effort input: found already built (correction)

Checking the code before building (the leverage gate) showed the master brief's input list already exists:

| Planned | Already in BEYOND |
|---|---|
| Voice logging | DRIVE HOME (`ui/components/DriveHome.tsx`, TALK → "save"/"skip") and Alfred's TALK, both through the confirmed cards |
| Barcode scan | `ui/components/BarcodeScanner.tsx` with `application/barcodeLookup.ts` (Open Food Facts) in the meal sheet |
| Garmin without a tap | Health Bridge `BackgroundSync.kt` (GARMIN-AUTO-001, every 3 hours) |
| Home-screen quick log | PWA shortcuts (+WATER, LOG MEAL, START WORKOUT, SYNC GARMIN) and the Health Bridge brief widget |

The 4.0 proposal listed them as new without checking; that was the builder's error, and the field gate should tell
whether any needs refinement. **Release a is complete with slice 1.** The transformation's next work is 4.0-b, the
coach brain.
