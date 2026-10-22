# FIELD-AUTHORITY-001 — one next thing, one red, silence the rest

**Authorization:** Gavin wrote this brief and asked for it to be built on 2026-10-22 ("Here is my
idea … Ship the authority pass"), right after REDESIGN-001 (#261) merged. The brief below is his,
unchanged. Rulings are recorded in [UX_DECISIONS → FIELD-AUTHORITY-001](../UX_DECISIONS.md).
**Lane:** PROTECTED. It changes TODAY's composition and amends locked REDESIGN-001 rulings.
**Builder:** Claude Code. **Start:** master `b3879ac` (merge of #261).
**Review and merge:** independent exact-head review, green CI, and Gavin's merge approval.
**Leverage gate:** BUILD OWNED. Presentation and priority only; reuses the existing recommendation,
check-in, signal and catalog machinery. No new dependency.

---

Master is at REDESIGN-001 + GARMIN-003 (merge #261 / b3879ac or current origin/master). Do not revert redesign homes. Do not touch Engine rules, schema, backup, Garmin import semantics, or TRAIN workout flow beyond check-in gate copy/chrome.

## Intent

REDESIGN fixed where jobs live. The day still feels like a vertical pile of equal panels that repeat messages and overuse red. Fix priority, redundancy, empty-state honesty, and COMMAND browse — so FIELD is glance → act → resume.

Best outcome: on TODAY the operator always knows the single next thing (or true all-clear); logging stays fast; check-in is one path; red is scarce and earned; COMMAND is job-based not archival.

## Non-negotiables

- Preserve Gotham skyline + day timeline (may compact header when schedule is empty — do not remove).
- Preserve WATER · MEAL · LOG sheets over TODAY (2-tap log paths).
- Preserve four tabs and redesign destinations (BODY progress/history, TRAIN switcher, etc.).
- Exactly one filled red primary action visible on a screen at a time (tab underline excluded). Secondary = outline/ghost/neutral.
- Owner voice: terse, calm, present. No corporate filler. No “your tools are ready.”
- prefers-reduced-motion respected; 44px targets; 320–412 layout; offline OK.
- npm run verify must pass; update browser tests that encode old copy/order/red assumptions.

## Problems to kill

1. TODAY is six equal zones; null states narrate emptiness with a fake-urgent red CTA (“CHOOSE AN ACTION” / “No guidance recorded yet”).
2. Check-in hydra: next-action copy + STATUS under numbers + CHECK-IN section + TRAIN yellow wall — same fact, many mouths.
3. Red bankruptcy: START DAY / CHOOSE AN ACTION / QUICK CHECK-IN / START WORKOUT all full red.
4. COMMAND = nested filing cabinet (“A place to start”, “Find the right destination”, deep accordions).
5. Number tiles lecture inside the metric (coaching prose in the cell).
6. Mode/schedule band stays huge when schedule says nothing yet.

## TODAY information architecture

### Sections allowed (nothing else on main TODAY)

- Mode header (+ skyline; compact when no schedule / thin state)
- Optional NEXT card (only when there is a real next thing OR true all-clear line — see states)
- WATER · MEAL · LOG
- TODAY’S NUMBERS (glance values only)
- At most one compact signal line (offline / backup overdue / stale / save failed) — not a second check-in essay
- Check-in only as defined in states below (not a permanent duplicate block)

### State machine for primary content (implement explicitly)

**A. Fresh / mode not set**
- Primary: START DAY (one red).
- No “CHOOSE AN ACTION.”
- No separate nagging CHECK-IN section required before day start (don’t block day start with a second homework block).
- Numbers quiet.

**B. Day on, Engine has a real primary recommendation**
- NEXT card first among content (below compact mode): one sentence + one red action + WHY access unchanged.
- Log row below NEXT (thumb still reachable; priority is the recommendation).
- Check-in is NOT repeated as STATUS + section if the recommendation already is check-in / sleep prompt / etc.

**C. Day on, no Engine recommendation (log-first)**
- Do NOT show a fake red “CHOOSE AN ACTION.”
- All-clear or calm line: e.g. “Nothing needs you.” / “Log when you want.” (pick terse Bruce-voice; match existing copy helpers).
- Log row ABOVE or immediately under that line (operator came to log).
- If check-in still missing: ONE quiet path only — either a single text button “Check in” or the next card becomes check-in — not three reminders.

**D. All-clear (checked in, nothing pending)**
- Calm presence, no red primary.
- Numbers + log rack only.
- Optional one line: “Nothing needs you.”

**E. RECOVER / OFF**
- Same rules as B/C; mode title changes; do not clone ON SHIFT empty-state anxiety.

### Check-in rules

- Single owner surface on TODAY for “not checked in.”
- Remove duplicate STATUS · NOT CHECKED IN under numbers when the next card or single check-in control already states it.
- TRAIN: if check-in required to suggest, one short line + one control — not a large yellow essay frame if avoidable. QUICK CHECK-IN may be red only if it is the sole primary on that screen; otherwise neutral/outline with clear label.
- Do not change check-in command semantics or the five-scale sheet behavior beyond copy/placement.

### Numbers

- Tiles show value + unit + minimal meta (counts, not lectures).
- Move coaching (“log bodyweight to see target”) out of the cell — detail route or single line under grid if needed.

### Mode band

- When schedule empty / “says nothing yet”: reduce vertical cost (tighter padding/subtitle); keep Gotham.
- Do not invent a new schedule product in this objective; optional one clear link to existing work-schedule destination is OK if already reachable.

## COMMAND

- Keep search first.
- Replace nested “A place to start / Find the right destination / encyclopedia accordions” with a short **job-based** list (approx 6–8 top rows), e.g.:
  - Log (sheet picker / log actions)
  - On shift (work context, mark work ended, end day, stealth)
  - Review (weekly, monthly, after action, journal, history, mirror as already grouped)
  - Plan (plan today, missions, schedule)
  - Note / Capture
  - Systems
  - Backup & recovery
  - Settings (incl. hidden features, nutrition, meals, reminders)
- Every pre-change destination must remain reachable (catalog/reachability tests).
- No marketing blurbs (“Control center / every screen…” can be one quiet line or removed).

## Red rule (enforce in UI)

- One filled red CTA per view.
- Null/empty states must not wear emergency red unless the only action is truly the day-start or the single required gate.
- “CHOOSE AN ACTION” as generic red slab: remove; replace with specific action or calm all-clear.

## Copy

- Kill: “No guidance recorded yet”, “Your tools are ready”, vague “CHOOSE AN ACTION.”
- Prefer specific verbs and calm all-clear.
- Update today copy modules and any asserted test strings.

## Out of scope

- Full visual skin / SUIT-ALIVE / CRT / new dependencies
- Engine, capacity rules, recommendation selection
- Schema, events, Garmin fill-in logic
- BODY full re-layout beyond stopping tile lectures if numbers shared
- New features (notes, weekly, etc.)

## Implementation notes

- Read current TODAY composition after redesign (mode scene, QuickLog, next-action card, numbers, check-in). Prefer extending state logic over another parallel stack.
- Reuse existing recommendation/check-in/signal machinery; this is authority and layout, not new domain.
- Comment FIELD-AUTHORITY-001 on non-obvious branch conditions.
- Screenshots optional but update broken acceptance tests; 360px FIELD gate manually described in the PR.

## Acceptance

1. Fresh: one red START DAY; no fake CHOOSE AN ACTION; no check-in hydra.
2. On shift + real recommendation: NEXT prominent; one red; log row available; check-in not tripled.
3. On shift + no recommendation: calm/all-clear or log-first; no emergency red null CTA.
4. All-clear: no red primary; calm.
5. TRAIN check-in gate: short, one primary control.
6. COMMAND: search + flat job list; reachability catalog still green.
7. Numbers: no coaching essays inside tiles.
8. Gotham preserved; empty schedule doesn’t dominate.
9. `npm run verify` green; axe/reduced-motion not regressed.
10. Garmin/redesign sheet log paths still 2-tap.

## PR / checkpoint

Branch from current master. Title: FIELD-AUTHORITY-001 — one next thing, one red.
Update docs/agent/CURRENT_CHECKPOINT.md with objective, head, verification, risks.
Record any UX ruling deltas in UX_DECISIONS if locked text changes.

Ship the authority pass. Do not start SUIT-ALIVE in this PR.
