# BEYOND 4.0-a — foundation and zero-effort input (release brief)

- **Authority:** [BEYOND-4.0](BEYOND-4.0.md) (Gavin, 2026-11-15, five decisions). Builder: Claude Code.
- **Lane:** the TODAY split is a routine refactor with no visible change; the input features are Feature lane.

## Part 1 — split TODAY safely (no visible change)

`TodayScreen.tsx` was 3,517 lines and 109 pieces of state. It is split in small slices, each moving one section into
its own component with explicit inputs while TODAY keeps its in-flight guard and what each tap opens; each slice is its
own PR with the TODAY browser suites as the safety net.

- **Slice 1 — AT A GLANCE** → `ui/screens/today/TodayNumbers.tsx`. The numbers' markup moved unchanged; the two tap
  handlers stay in TODAY verbatim.
- Next slices: the tools rows (check-in, work context, reset, shift down), the phase rows, then moving each section's
  reads out of TODAY's single `refresh()` so a section reloads on its own.

**Finding (no change needed):** browser test storage is already isolated (each test clears it; parallel workers get
separate browser contexts). The intermittent CommandConsole failure was the real fold bug fixed in #535.

## Part 2 — zero-effort input (after the split slices that touch the same files)

Voice logging through the existing cards; barcode scan into the meal sheet (Open Food Facts); Garmin without a tap
(Health Bridge schedule); a home-screen quick log. Each gets its own section here before it's built.
