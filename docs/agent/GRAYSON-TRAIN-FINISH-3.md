# GRAYSON-TRAIN-FINISH-3 — Delta in Gym mode and the TRAIN visual finish (one batch)

- **Owner authorization:** Gavin, 2026-11-23, approving both items as proposed: "1. Delta in Gym mode … 2. C9.2,
  TRAIN visual finish." Merge stays with Gavin.
- **Lane:** PROTECTED (live-workout guidance; locked visual identity, C9.2). Independent exact-head review, green CI,
  Gavin's merge. **Builder:** Claude Code. **Starting commit:** master `59ffdca5`. **Branch:** `ccr-380c4225-1es42i`.
- **Operator benefit:** the full-screen Gym mode he uses under the bar now says exactly what the workout view says
  (one suggestion on clear evidence, the pain stop); TRAIN's four views no longer break their labels mid-word, and
  PROGRESS reads as part of the same system as Orientation and TODAY.

## Item 1 — Delta in Gym mode
- The proposal and pain-stop panels move into one shared component (`DeltaPanels.tsx`) rendered in both the workout
  view and Gym mode. Gym mode already logged through TRAIN's `handleLogSet`, so the same rules, writes (none beyond
  the existing skip) and review apply. No new behaviour.

## Item 2 — C9.2 TRAIN visual finish (the Orientation grammar; tokens only)
- **View tabs:** four views (added in #625) broke every label mid-word at phone widths. Now 2 × 2 under 460 px and one
  row above, never wrapping a word, still 16 px (TRAIN-OPERATOR-001).
- **PROGRESS:** rebuilt from plain bullets into Orientation's framed panels (`Panel` primitive): PROGRESS & DIRECTION
  (state, verdict, WHY), WHERE YOU ARE, STANDARDS, STRENGTH; one rule between rows; evidence as bordered mono tags
  (quiet for "not yet known", amber for NEEDS ATTENTION); no red. Same words and data.
- **Reviewed and left:** TRAIN home and the live workout already use the framed grammar. MY PROGRAMME above the live
  workout was considered: hiding it mid-workout would remove editing it during a session (existing behaviour and
  tests), which is a capability change, so it stays for Gavin to decide separately.
- Screenshots before/after at 360 px: `docs/agent/screenshots/grayson-train-finish-3/`.

- **REUSE:** `Panel`/foundation primitives, Orientation's tokens and row grammar, the existing Delta panels.
  **OWN:** the shared Delta component wiring and the PROGRESS layout. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no logic, Engine, schema or capability change; DATA home (the other half of C9.2) is not in this
  batch.
- **Acceptance:** Gym-mode Delta browser test at 320/412 px (proposal, USE fills the Gym weight, pain stop skips;
  axe; no overflow); PROGRESS browser tests at 320/360/412 px unchanged in content (state, evidence, WHY, axe, no
  writes); TRAIN-OPERATOR 16 px rule; existing TRAIN, Gym and OneLook framing suites.
