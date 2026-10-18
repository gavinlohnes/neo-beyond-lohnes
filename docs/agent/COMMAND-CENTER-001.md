# COMMAND-CENTER-001 — visible modes, COMMAND tab, one LOG entry

**Authorization:** Gavin approved this plan in chat on 2026-10-17, choosing:
(1) bottom bar TODAY · TRAIN · BODY · COMMAND, (2) modes follow the schedule automatically, and
a manual pick holds until the 16:30 roll, (3) build after PR #238 merges. On 2026-10-18 he
approved and accepted the full prototype ("change BEYOND to be more like that prototype").
This objective and SUIT-001 are both authorized. Build them in order, one PR each. Merges still
need his approval.
**Lane:** PROTECTED. This changes primary information architecture and amends a locked rule.
**Builder:** GPT Work (owner-authorized takeover, 2026-10-18). **Starting commit:** fresh `origin/master` after #238 merges. #238 touches
`TodayScreen.tsx` and `App.tsx`. Check #239 and any other open PR for overlap before editing.
**Interaction reference:** `prototype/command-center/index.html` (commit the supplied file
there unchanged). It uses sample data. It is a reference for interaction, look and copy voice,
not for numbers or Engine output. Its DEMO panel is prototype-only.

## Outcome

TODAY names the current mode and lets Gavin change it. MORE becomes COMMAND, a searchable home for
every destination and action. Logging gets one consolidated entry. All existing capability,
canonical flows and safeguards stay.

## Scope

1. **Modes = existing Shift Clock phases, made visible.** Use `deriveShiftClockPhase` unchanged.
   - Display names: PRE_WORK = PREP, SCHEDULED_SHIFT = ON SHIFT, EXPECTED_POST_WORK = RECOVER,
     OFF = OFF DUTY.
   - The TODAY header shows the mode, its source ("per schedule" or "pinned") and a lived-day
     strip (16:30 → 16:30) with a now marker.
   - Tapping the mode opens a picker with "Follow schedule" plus the four modes. The picker marks
     which mode the schedule suggests.
   - **A pin is placement only.** It selects which phase rows TODAY shows: `PHASE_ROWS` for the
     pinned phase, with countdowns only where real times exist. It never writes `workContext`,
     never feeds the Engine, and never changes the recommendation, Attention or System Status.
   - **Pin storage:** store the pin in localStorage keyed by BeyondDay id, the same pattern as
     `persistence/shiftHandoffSkips.ts`. It is not an event, not in backups, and it clears at
     rollover or END DAY.
   - Pinning ON SHIFT on a day declared OFF offers a separate optional step that records a work
     day through the existing `setWorkContext` path. Never record it automatically.
   - An UNKNOWN day keeps today's behavior: the work question appears and no phase is assumed.
     The header reads "Mode: not set" and tapping it opens the same picker.
2. **TODAY action row:** + WATER · + MEAL · + LOG, in fixed positions in every mode.
   - The row replaces WATER · MEAL · CAPTURE · SYSTEM.
   - + LOG opens a sheet listing water, meal, sleep, bodyweight, note (Capture) and urge, plus
     "workout set → TRAIN". Each entry routes to the existing canonical form or focus, keeping its
     return, draft and undo behavior. No new logging path.
   - The QUICK_LOG phase row becomes redundant. Drop it from SCHEDULED_SHIFT and give its slot to
     the existing shift-handoff note row if eligible. The row cap stays at 4.
3. **MORE → COMMAND tab.**
   - Rename the tab and its glyph.
   - Put a search field at the top of the MORE index, reusing `findCapabilities` and its catalog
     plus every MORE view and setting.
   - Add a log-actions group. Keep separate record search as an entry.
   - Retain guided suggestions, backup and recovery access, and settings.
   - With no query, show grouped browsing. With no results, say so plainly and suggest terms.
   - Remove the TODAY SYSTEM dialog only once every catalog destination is reachable from COMMAND.
4. **Emblem** goes to TODAY root. Re-tapping an active tab returns to its root, the existing
   pattern. Back keeps position, focus, query and drafts.
5. **Identity (Batman Beyond inspiration, never costume):** port these details from the
   prototype, reusing HUD v3 tokens (`--cut-shape`, ticks, 1px lines):
   - one diagonal chamfer on the primary action, the action-row buttons and panels;
   - corner reticle brackets and an hour ruler on the mode header, with major ticks at 18:00
     and 06:00;
   - a faint, original line-drawn skyline behind the mode header (gray only);
   - one red sweep across the header when the mode changes, as feedback;
   - the existing `BootSequence`, showing the current mode.
   - **The suit changes with the mode** (owner choice: strong). This is a token swap on the
     root for the effective mode, pin included:
     - ON SHIFT is noticeably darker, with dimmer text, muted red and faint scanlines on the
       mode header only.
     - RECOVER is powered down: no hints, no ruler, no fuel bars, slower motion.
     - PREP is full detail. OFF DUTY is calm.
     - Contrast floors stay WCAG AA in every mode.
   - **Living skyline:** lit windows track real lived-day time, never the pin. The city is busy
     before the shift, thins as the shift counts down, and is nearly dark in RECOVER and quiet
     on off days.
   - **Red sky over Neo-Gotham** (owner ruling, 2026-10-18; a bounded exception to "red never
     decorates"): a dark crimson glow rises from the horizon behind the skyline. It is driven
     by real lived-day time and never by the pin: dusk at PREP, strongest overnight, faint at
     dawn, gone in daylight. Record the exception in the Decision Register.
   - **Searchlight:** a faint beam sweeps slowly behind the skyline only when the Engine's
     primary recommendation has an action. On "No action required" the sky is empty. It
     contains no symbol, and under reduced motion it holds still at a fixed angle.
   - **Data decrypt:** numbers scramble for about half a second on the first TODAY view of each
     lived day (after boot or the 16:30 roll), then lock in. It reads only the final value to
     assistive technology and is skipped under reduced motion.
   Red stays reserved for the one next step, the active tab and change feedback. Do not add
   sound, character voice lines, themed jargon or any Batman logo. Everything except the
   chamfers is disabled under reduced motion or is static.
   **Not in this objective (SUIT-001, separate approval):** stealth mode (long-press emblem),
   glitch-as-signal (stale, offline, backup overdue, save failed) and the SYSTEMS line plus its
   readout. The prototype shows all three.
6. **Bruce's voice, text only** (owner ruling, 2026-10-18; never audio). This applies to
   recommendation headlines and reasons, mode descriptions, row hints, empty states, toasts and
   notices. Rules:
   - Terse, dry, calm. Short sentences, plain verbs, contractions allowed.
   - Advise, never scold. No catch-up guilt, no streak shaming, no exclamation marks.
   - Every WHY ends with the decision left to Gavin (for example, "Your call.").
   - No character names, catchphrases, jokes or themed jargon.
   - Numbers, labels, buttons and data stay literal. The voice is in the sentences around them.
   - Examples (prototype): "Sleep first." / "Nothing needs you right now." / "These are
     yesterday's numbers." / "Readings only. No scores. You draw the conclusions."
   This is a copy change only. Where the Engine supplies text, map it to display copy in the UI
   layer. Do not edit Engine strings, because that is an excluded Engine change. The meaning of
   every message stays identical.
7. **Record the rulings:**
   - Amend `docs/UX_DECISIONS.md` (four tabs are now TODAY/TRAIN/BODY/COMMAND, the mode pin, and
     the action row replacing the console placement exception) and ROADMAP Command Center Rule 2.
   - Update `CURRENT_CHECKPOINT.md`.

## Exclusions

No Engine, recommendation, priority or attention change; no schema, event, command or backup
change; no new dependency. No desktop sidebar. No new modules or rows beyond existing ones. No
health scoring. No changes to TRAIN or BODY internals.

## Acceptance

- All four modes, plus the unknown state, render the correct existing rows on TODAY. Pinning and
  "Follow schedule" behave as specified, the pin clears at the 16:30 roll and END DAY, and the
  Engine output is identical with and without a pin. Add a test that proves this.
- WATER and MEAL are one tap from TODAY in every mode. Every record type is reachable within two
  taps of TODAY's + LOG. Exactly-once logging and undo are preserved.
- Every former MORE view and every SYSTEM catalog destination is reachable from COMMAND, by
  browsing and by search.
- Back, position, focus and draft retention work across tabs and sheets.
- The `MAX_PHASE_ROWS` test passes.
- Layout holds at 320, 360 and 412 px with 44 px targets and no horizontal overflow. Keyboard,
  focus trap and return, axe checks and reduced motion all pass.
- The built PWA works offline across a cold reload.
- `npm run verify` passes, `scripts/verify-daily-experience.mjs` is extended to cover modes and
  COMMAND, and the existing suites stay green without weakening any assertion.
- Synthetic screenshots go in `docs/screenshots/command-center-001/`.
- Independent exact-head review, green required CI and Gavin's merge approval are required.

## Owner clarifications (2026-10-18, fresh session)

- **Rules amended 2026-10-17.** Tabs are TODAY · TRAIN · BODY · COMMAND; COMMAND replaces MORE.
  Recorded in `docs/UX_DECISIONS.md` and ROADMAP Command Center Rule 2 in slice 0, before any app
  code.
- **Effects rule.** Every effect in this brief (chamfers, reticles, ruler, skyline, red sky,
  searchlight, sweep, scanlines, decrypt, boot) is presentation only. It has no animation under
  reduced motion, keeps WCAG AA text contrast in every mode, and never blocks or delays logging.
  The same rule binds SUIT-001's glitch and stealth effects.
- **TODAY A/B** (the earlier TODAY layout comparison) is superseded by this brief.
- **BODY overview** stays a separate objective after SUIT-001. Do not touch BODY internals here.
- **Weekly Review** (#240) lives in MORE → REVIEW and must stay reachable from COMMAND.
- **Starting commit:** `4fda7177dbf11c5699331243e6feaa460dae08bd` (#238 and #240 merged). Open PRs at
  start: only #204 (prototype lab, no overlap).
- **Review:** one independent exact-head review at the final head, by the other provider (Codex).

## Slices

One branch and one PR; push after each slice.

0. Briefs, prototype, Decision Register and ROADMAP amendments, checkpoint. No app code.
1. Modes: header (mode, source, lived-day strip), picker, pin storage, pinned phase rows, the
   optional work-day step, the unknown state. Engine-identity test.
2. TODAY action row (+ WATER · + MEAL · + LOG), the LOG sheet, QUICK_LOG dropped from
   SCHEDULED_SHIFT.
3. MORE → COMMAND: tab rename and glyph, search over the catalog and every MORE view, log-actions
   group, then the TODAY SYSTEM dialog removed.
4. Emblem to TODAY root, active-tab re-tap, back/position/focus/query/draft retention.
5. Identity (chamfers, reticles, ruler, skyline, red sky, searchlight, sweep, suit per mode,
   decrypt, boot mode), Bruce-voice display copy, verification script, screenshots.

## Handoff

The current Builder is named here. Whoever takes over updates this section first.

- **Builder:** GPT Work, sole builder from 2026-10-18; Gavin authorized completing PR #241.
- **Arrival:** `c717801c5d59fef9250fe58f4af6c88c71e6cfb2`; master `4fda7177dbf11c5699331243e6feaa460dae08bd`. Slices 0–3 complete; slice 4 WIP.
- **Branch:** `ccr-8a82e4b3-4ub4x2`. **PR:** [#241](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/241).
- **State:** see `docs/agent/CURRENT_CHECKPOINT.md`.

### Takeover progress (2026-10-18)

Slice 4: retained panes and existing root navigation inspected. TRAIN re-tap focuses its canonical
root without discarding the in-progress session or set input. Browser Back/Forward now restores
tabs and COMMAND subviews; COMMAND keeps its search query and existing focus/scroll return.
Leverage disposition: ADAPT UPSTREAM — browser History API plus existing retained panes; no router
or dependency. Initial full gate found a duplicated hydration shortcut during a foreground
Minimum Day operation; the final slice suppresses only the redundant Advisory water buttons while
that canonical operation is open, preserving advisory evidence and existing commands.


### Completion evidence

Slices 0–5 implemented. `npm run verify`: architecture, all 252 files / 2,556 tests pass, one
existing skip, TypeScript and production PWA build pass. Built-browser acceptance at 320/360/412
passes, including modes, COMMAND/Weekly Review, browser Back/Forward, native-sheet cancellation,
retained drafts, exactly-once logs and offline cold reload/writes. See
`docs/screenshots/command-center-001/acceptance.json` and synthetic screenshots in that folder.

Review preparation found and fixed two acceptance gaps: selecting the currently scheduled mode
must still pin, and searching COMMAND must retain mounted settings drafts. The final browser
suite also guards valid accessible decrypt text and preserves factual sleep guidance in RECOVER.
Its UI colors pass AA; on-shift primary text/fill is 4.71:1. Existing screenshot helpers settle
finite animations and pause the newly authorized infinite searchlight, without relaxing axe.
The catalog hit-target query measures the actual search-result controls while grouped browsing
is intentionally retained hidden; the same 44px/16px assertions stay.

No schema, Engine, event, backup or dependency modification. No SUIT-001/reuse-roadmap work.
Final SHA, independent exact-head verdict and CI are recorded on PR #241, so review evidence
can bind the final commit without creating another post-review documentation commit. Owner merge
approval remains required. Physical-device/Safari/screen-reader testing is not claimed.


Final-review follow-up: direct installed TRAIN/BODY shortcuts now initialize the root suit from
the same read-only phase/pin derivation used by boot. The shell refreshes it on minute/resume/
rollover until TODAY mounts, then yields to TODAY's live state and cancels obsolete reads. Two
stored-pin shortcut regressions pass. The renewed full `npm run verify` passes (252 files,
2,556 passed / one existing skip), and built offline cold workout/water shortcut acceptance
passes at 320/360/412 with no duplicate workout set. The earlier exact-head review was superseded
by its shortcut finding; the new head requires a renewed verdict recorded on PR #241.

## Follow-up — mode pin expiry at 16:30 (2026-10-18)

- **Authorization:** Gavin approved the bounded follow-up after the reproduced active-workout
  expiry finding on merged PR #241 ("I approve."). This repairs the existing reset promise.
- **Builder / branch:** Codex; `codex/fix-mode-pin-expiry`. PR pending.
- **Starting master:** `9f9100ade1d54f4f4368759fb73afcb7f1201a20`, freshly fetched; #241 merged.
- **Risk:** conservative PROTECTED review lane for the existing mode-placement/local pin seam.
  No new product ruling or Engine behavior. BUILD OWNED: timestamp the existing local UI pin,
  reuse the canonical local-calendar boundary helpers, and refresh the retained presentation.
- **Scope:** expire a pin at the first local 16:30 after selection even when a workout defers
  canonical rollover; preserve pre-update phase-only pins until their recorded day's first
  boundary; apply the same rule to TODAY, cold boot and direct TRAIN/BODY launches. A deliberate
  new selection after expiry holds until the next boundary. Follow schedule and END DAY still clear.
- **Exclusions:** canonical day/workout ownership, Engine/Attention/System Status rules, logging,
  schema/events/backups, historical repair, new dependencies, SUIT-001, merges and deployment.
- **Acceptance:** before/at/after boundary, reload, legacy keys, invalid/unavailable storage,
  DST local boundaries, active-workout retained day/set draft, Capture draft, foreground and
  direct-launch root tokens; expiration alone writes no canonical records and preserves guidance.
  Focused regression checks during development, full gate/build and built offline acceptance at
  320/360/412 before handoff; independent exact-head review + green CI + owner merge approval.
- **Coordination:** #242 currently contains SUIT-001 brief/checkpoint changes only. Its work and
  #204 remain untouched. The prior unpublished alternate continuation remains in its local stash;
  this follow-up starts from published master and does not reapply that broader work.

Implementation: timestamped pins reuse the existing local-calendar boundary helper. Released
phase-only pins use the stored day's start only as an expiry origin; no pick time is invented.
TODAY and direct-launch suit tokens refresh at the boundary and on foreground resume, with
normal cleanup of timers and obsolete reads. No form is remounted by the pin refresh.

Focused evidence: seven expiry integration cases and the existing two Engine-identity cases
pass; six expiry browser cases plus fourteen existing mode/navigation cases pass. Six of the
new Node boundary cases failed on the starting implementation. Production acceptance passes at
320/360/412, reduced motion: exact boundary with retained workout day, Capture focus/draft and
set draft, zero canonical expiry writes, direct offline BODY launch across a second boundary,
offline water save, cold reload and exactly one saved set/note/water entry. Results:
[`pin-expiry-acceptance.json`](../screenshots/command-center-001/pin-expiry-acceptance.json).
Reproduce after serving the built PWA:
`BEYOND_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/verify-mode-pin-expiry.mjs`.
Full gate and exact-head CI/review are recorded on the follow-up PR.

Rollback: reverting the presentation repair requires no data migration or historical repair.
The old reader ignores the timestamped local UI pin and follows schedule; canonical records and
backups are unaffected. Physical-device/Safari/assistive-technology testing is not claimed.

The first full gate found two timing issues. The unchanged direct-shortcut assertion exposed
one passive-effect frame between the visible mode name and root tokens; SuitMode now publishes
before paint. The workout visibility check also failed on the unmodified starting master when
sampling the 180ms pane translation. It now settles finite TODAY entrance animations before
measuring; its original bottom-boundary/overflow assertions and thresholds are unchanged.
Focused rerun: all 34 cases in the expiry, navigation, console and identity browser files pass.

Final local gate: architecture passes (244 files scanned); all 254 Node/browser test files pass,
2,569 tests passed / one existing skip; TypeScript and production PWA build pass. Local browser
verification uses installed Chromium through the existing ignored executable-path override;
the tracked Vitest/CI configuration and dependency files are unchanged. The final built-PWA
expiry acceptance also passes again at all three widths. Exact-head CI and independent review
remain separate requirements; the active follow-up PR binds them to its published commit.
