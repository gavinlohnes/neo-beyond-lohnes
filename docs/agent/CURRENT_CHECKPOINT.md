# ALFRED-003 — cheap everyday Alfred, his brief on TODAY, Alfred can do it

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("go cheap + 1 and 2"). Claude Code; Protected
  within the owner's go. Brief: `docs/agent/ALFRED-003.md`. Branch `ccr-0be4f40f-16m0ja`, PR #348
  (stacked on ALFRED-002).
- **Built:** everyday answers on the cheaper model with THINK HARDER for deep ones; Alfred's brief at
  the top of TODAY; new cards for check-in, started work, work ended, task done or moved, clean day, open TRAIN.
- **Verified:** see the PR.
- **Next:** Gavin merges and reads TODAY's brief on his phone; then notifications at key moments and Alfred's memory.

# ALFRED-001 — the man in the chair (and RULES-2026-10-31)

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("approve the new rules"; Alfred via the Claude
  API). Claude Code; Protected within the owner's go. Brief: `docs/agent/ALFRED-001.md`. Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** the rule amendments (online allowed, Alfred core, Anthropic approved, notifications at
  key moments); Alfred v1 — header and LOG entry, voice or text, answers from BEYOND's records,
  proposes logs/reminders/notes as cards the owner confirms.
- **Verified:** `npm run verify` green (3,182 passed); the Claude SDK loads lazily, keeping the start-up bundle under the precache limit.
- **Next:** Gavin adds his Claude key on the phone and tries it; then notifications and timed reminders.

# SLEEP-WINDOW-001 — "last night" reaches 36 hours

- **Authority / Builder / lane:** Gavin, 2026-10-31 (sleep in DATA but not TODAY). Claude Code;
  Routine (a display window aligned to the existing 36-hour rule; a Bridge display fix). Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** `lastNight` reaches 36 hours (was 24); Health Bridge 0.8.1 keeps the per-kind freshness
  line after a send.
- **Verified:** `npm run verify` green (3,178 passed); Bridge builds in Health Bridge CI.
- **Next:** CI and Gavin's merge; Gavin reads the Bridge's freshness line after a sync. If sleep,
  steps or resting HR read "Behind", Garmin Connect's Health Connect write access for that kind is off.

# SYNC-002 — SYNC GARMIN is one tap

- **Authority / Builder / lane:** Gavin, 2026-10-31 ("Go A"). Claude Code; Protected within the
  owner's go. Brief: `docs/agent/SYNC-002.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** SYNC GARMIN's tap lets the Bridge's files import straight away; TODAY says what came or
  that Garmin is behind; Health Bridge 0.8.0 sends straight to BEYOND.
- **Verified:** `npm run verify` green (3,178 passed). Kotlin builds and tests in Health Bridge CI.
- **Next:** CI (PR Verification + Health Bridge), Gavin installs Bridge 0.8.0 and merges. Open:
  Garmin Connect → Health Connect gaps on the owner's phone (settings check).

# CITY-FIX-001 — TODAY's city stands under the timeline

- **Authority / Builder / lane:** Gavin, 2026-10-30, from his phone: "The clock and building and
  search light are not looking correct." Claude Code; Routine (a display repair, same scene, no
  doctrine change). Branch `ccr-0be4f40f-16m0ja`.
- **Built:** the beam, skyline and perch moved into the hero's scene under the timeline (ModeScene),
  so on shift the COMMS and SHIFT rows no longer cover them, and without those rows they no longer
  rise into the timeline's labels. The COMMS line keeps its full height above the SHIFT row.
- **Verified:** `npm run verify` green (3,173 passed); `tests/browser/CityFix001.test.tsx` fails
  without the fix.
- **Also built (BOOT-BRIEF-001, owner chose option A):** the launch screen is a readable startup
  brief (mode, shift, sleep, protein, backup when due), held about 2.6 s, tap to skip.
- **Open from the same report:** sleep and resting HR not showing (needs the owner's Health Bridge
  check or a fresh backup).
- **Next:** CI and Gavin's merge.

# FOOD-001 — MEAL works like MyFitnessPal, protein first

- **Authority / Builder / lane:** Gavin, 2026-10-30 ("make it closer to my fitness pal"; protein
  left, by time, barcode yes). Claude Code; Protected within the owner's go. Brief:
  `docs/agent/FOOD-001.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** MEAL's diary header, SEARCH ALL FOODS (USDA), amount by grams or servings, SCAN BARCODE
  (Open Food Facts), any number of servings.
- **Verified:** `npm run verify`: 3,171 tests passed; build and typecheck green after a test-typing fix.
- **Next:** CI and Gavin's merge; a real-phone check of the camera scan (Chrome on Android).

# END-OF-RUN-001 — the after-action reads a run as it was lived

- **Authority / Builder / lane:** Gavin, 2026-10-29 ("merge 340 and go end of run"). Claude Code;
  Protected within the owner's go. Brief: `docs/agent/END-OF-RUN-001.md`. Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** the existing AFTER ACTION now covers only the run's own lived days, counts real
  workouts, and adds sleep by night, fuel, and open tasks.
- **Verified:** `npm run verify` green (3,163 passed).
- **Next:** CI and Gavin's merge.

# SLEEP-001 — main sleep is one tap after a shift

- **Authority / Builder / lane:** Gavin, 2026-10-29 ("merge 339 and go sleep"). Claude Code;
  Protected within the owner's go. Brief: `docs/agent/SLEEP-001.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** the sleep draft counts from the scheduled shift end when WORK ENDED / Shift Down
  weren't tapped; it reads "Slept 06:00 → 13:40?" and is the "Did you sleep?" card, so one tap logs.
- **Verified:** `npm run verify` green (3,161 passed).
- **Next:** CI and Gavin's merge.

# OWNER-GO-001 — the field study's protected fixes

- **Authority / Builder / lane:** Gavin, 2026-10-29 ("Go." and "delete or undo … can go away").
  Claude Code; Protected within the owner's go. Brief: `docs/agent/OWNER-GO-001.md`. Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** quiet log confirmations; LOG in the bottom bar; short PREFLIGHT and STARTED WORK →
  ON SHIFT; rotation needs a working set; check-in SAME AS LAST with a one-line outcome.
- **Verified:** `npm run verify` green (3,157 passed).
- **Next:** CI and Gavin's merge; a phone check of the new bottom bar.

# REAL-DATA-001 — fixes from the owner's real backup

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("Use whatever is beneficial for beyond").
  Claude Code; Routine. Brief: `docs/agent/REAL-DATA-001.md`. Branch `ccr-0be4f40f-16m0ja`.
- **Built:** task card DONE / NOT A TASK / NEW DATE; exercises shown before START; TRAIN's LAST
  skips empty completions; an idle workout no longer takes the launch; one WORK ENDED after a
  shift with the owner's plan first; DATA shows Garmin's last night when nothing is logged.
- **Verified:** `npm run verify` green (3,174 passed).
- **Next:** CI and Gavin's merge. Protected items listed in the brief wait for his word.

# WHOLE-PICTURE-IN-DATA — DATA's Whole Picture stays in DATA

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("merge 336 when green and go whole picture").
  Claude Code; Protected (navigation, amending FIELD-AUTHORITY-001's COMMAND note). Branch
  `ccr-0be4f40f-16m0ja`.
- **Built:** the existing `WholePicture` renders inside DATA behind BACK TO DATA, and focus
  returns to the button that opened it. Retapping DATA or opening a cave view closes it. MORE //
  REVIEW still shows Whole Picture as before.
- **Verified:** `npm run verify` green (3,168 passed).
- **Next:** CI and Gavin's merge, then decide what's next together.

# MORE-TRIM-001 — MORE shows each destination once

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("merge 335 and trim MORE next"). Claude
  Code; Protected (it amends FIELD-AUTHORITY-001's COMMAND rows; no capability is removed).
  Branch `ccr-0be4f40f-16m0ja`.
- **Built:** 27 duplicate rows are search-only, so the browse list goes from 50 to 23 rows.
  Empty job rows (Log) are hidden. The test helper reaches search-only rows by search.
- **Verified:** `npm run verify` green (3,168 passed).
- **Next:** CI and Gavin's merge. Still open: keep DATA's WHOLE PICTURE inside DATA, and move LOG
  to the header (NAV-001).

# AUDIT-FIX-001 — fixes from the whole-app audit

- **Authority / Builder / lane:** Gavin, 2026-10-28 ("go audit fixes"). Claude Code; Routine
  (presentation and copy only, no Engine, event or schema change). Branch `ccr-0be4f40f-16m0ja`.
- **Built:**
  - TODAY no longer says "Nothing's waiting" while water or protein is behind pace: the headline
    reads "Nothing urgent." and the context names what's behind;
  - PREPARE FOR WORK is hidden once on shift;
  - TRAIN's COMPLETE button wraps instead of clipping;
  - IMPORT HEALTH DATA uses a CHOOSE HEALTH FILE button, not the browser's grey file picker;
  - the SLEEP page shows a night's logged main sleep when Garmin missed it, labelled "logged";
  - contrast: selected chips on shift, links on MORE, and an invalid aria attribute.
- **Verified:** `npm run verify` green (3,168 passed). The audit crawler is clean across 85 screens.
- **Next:** CI and Gavin's merge. Still open, and each needs his go: trim MORE (56 entries), keep
  DATA's WHOLE PICTURE inside DATA, and move LOG to the header (NAV-001).

# BRAND-MARK-003 — Brand Drop v2: the emblem and the palette

- **Authority / Builder / lane:** Gavin, 2026-10-28, Brand Drop v2 plus the palette decision (it
  supersedes the split-bat Drop). Claude Code; Protected (doctrine amended by the owner's own
  decision). Branch `ccr-0be4f40f-16m0ja`.
- **Built:**
  - the emblem SVGs in `docs/brand/beyond-emblem/`, chamfer 80/512;
  - the `--brand-yellow` and `--black` tokens;
  - the `Emblem` plate as the in-app logo everywhere;
  - `beyond-v3-*` icons for maskable, any, monochrome, apple-touch and favicon;
  - service-worker cache `beyond-mark-v3`;
  - every bat and split-bat asset removed.
- **Next:** CI and Gavin's merge. Then install on the phone to check the home-screen icon, the
  splash and the themed icon.

# SHIFT-CHANGE-001 — the end of a shift, given the whole screen once

- **Authority / Builder / lane:** Gavin, 2026-10-28 04:18 on shift ("Am."). Claude Code; PROTECTED
  (TODAY composition, presentation only). Branch `ccr-0be4f40f-16m0ja`.
- **Built:**
  - `buildShiftChange`: LANDING runs for the last 45 minutes and SECURED for 3 hours after the real
    end;
  - a full-screen moment on TODAY, shown once per shift and phase;
  - the rehearsal covers 05:30 and 06:30 on eight weeks of rotation;
  - STARTED WORK: a one-tap `WORK_PERIOD_STARTED` on TODAY and in PREFLIGHT, and the brief and the
    shift end count from it;
  - a late "work ended" tap no longer stretches the shift (CI caught "19:30 on the clock").
- **Verified:** `npm run verify` green (3,160 passed).
- **Next:** Gavin's merge before about 05:15. Then a pre-shift version, if he wants it.

# LOG overlap — the floating + steps aside while you scroll

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Fix the LOG button overlap". Claude Code;
  ROUTINE. Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master after #328 (FIELD-REHEARSAL-001).
- **Built:** `useScrollAway` on TODAY's floating LOG, which steps aside when you scroll down and
  comes back when you scroll up, reach the end or return to the top. The rehearsal now checks this,
  and checks that nothing is covered at the end.
- **Verified:** `npm run verify` green (3,151 passed).
- **Next:** CI and Gavin's merge.

# FIELD-REHEARSAL-001 — the suit, walked on eight weeks of rotation

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Make it count and do some amazing stuff."
  Claude Code; ROUTINE (corrections and a test). Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `8401f3d` (#327 SUIT-VOLUME-001 merged).
- **Built:** a real-Chromium rehearsal that seeds 56 days of the real 2-2-3 pattern through the app's
  commands, then walks TODAY, all seven cave views, TRAIN and MORE. It runs before a shift, on shift
  and on a day off, at 360px and 390px.
- **Fixed from it:**
  - on-shift primary buttons failed AA (4.03:1 before, 6.32:1 now);
  - VITALS painted days off amber on a work day;
  - PREFLIGHT read "pack · food";
  - the first day off read "no full day off since".
- **Next:** CI and Gavin's merge.

# SUIT-VOLUME-001 — flashy on action, calm at rest

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Go volume. But make it bigger." Claude Code;
  PROTECTED (TODAY composition, presentation only). Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `c8822be` (#326 BRAND-MARK-002 merged).
- **Built:**
  - one accented suit band on TODAY;
  - the beam sweeps once and never loops;
  - commit feedback on the cave BRIEF's saves;
  - VITALS bars above your usual read off-normal;
  - the volume table, recorded in SUIT-VOLUME-001 and UX_DECISIONS.
- **Next:** CI and Gavin's merge. Then live use for a shift cycle.

# BRAND-MARK-002 — the split bat is BEYOND's mark and app icon

- **Authority / Builder / lane:** Gavin, 2026-10-28, Routine Drop ("Brand mark Drop (Routine). Queue
  after D4."). Claude Code; ROUTINE. Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `44ded85` (#325 D4 + D5 merged; CAVE-DATA is complete apart from stages).
- **Built:**
  - Gavin's three SVGs in `docs/brand/suit-mark/`, using the HUD red `#D0141B` and black.
  - The in-app bat uses the icon cut in the header and cave, and the hairline cut at boot.
  - New `beyond-v2-*` icons at 192, 512, 512 maskable, 180 apple-touch, and the 32px and SVG
    favicons.
  - The manifest lists "any" and "maskable" separately, and the service worker has a new cache id
    (`beyond-mark-v2`).
  - The old icons and their generators are removed.
- **Verified:** `npm run verify` green. The built manifest and service worker carry only `beyond-v2`
  icons. A preview with a circle mask shows the bat uncropped and the split visible at 48px.
- **Next:** CI and Gavin's merge. Then install on the phone to confirm the home-screen icon. If
  Android still shows the old one, remove and re-add the app.

# CAVE-DATA D4 + D5 — since last shift in TONIGHT; resting HR and steps in VITALS

- **Authority / Builder / lane:** Gavin, 2026-10-28: "If we can get D4 and D5 done…" (this is also
  DELTA-002's slice go). Claude Code; PROTECTED (CAVE-DATA-001). Branch `ccr-0be4f40f-16m0ja`.
- **Baseline:** master `fb6230c` (#324 D3 merged).
- **Built:**
  - TONIGHT leads with SINCE LAST SHIFT: up to four facts (the shift and days off since, nights
    against your usual sleep, last workout, and weight change). Each opens its records.
  - Questions as buttons: WHY THIS? and WHAT'S NORMAL FOR ME?
  - VITALS adds RESTING HR and STEPS, which are Garmin daily readings, informational only.
- **Verified:** `npm run verify` green (3,142 passed, 1 skipped).
- **Deferred:** sleep stages against your usual, because the rows carry no stages. "What would help
  most?", because ranking factors is Protected.
- **Next:** CI and Gavin's merge. The CAVE-DATA plan is then complete apart from stages. Gavin's
  brand-mark SVG Drop (three SVGs) is waiting on the files reaching the session.

# CAVE-DATA D3 — FILE carries YOUR ROTATION

- **Authority / Builder / lane:** Gavin, 2026-10-28: "Go with number and start d3. Merge when ready."
  Claude Code; PROTECTED. [Brief](CAVE-DATA.md).
- **Baseline:** master `75f4e73` (#323 D2 merged).
- **Decided:** DATA opens on NUMBERS.
- **Built:**
  - FILE shows YOUR ROTATION, the same view as Whole Picture's, in place of its duplicate table.
  - NUMBERS' YOUR ROTATION opens FILE in place, and a tapped day opens in DATA.
  - OPEN WHOLE PICTURE in FILE.
- **Next:** CI, then merge (Gavin: "merge when ready"). Then D4 (DELTA in TONIGHT; needs DELTA's slice
  approval) or D5 (resting HR, steps and stages as vitals).

---
# CAVE-DATA D2 — VITALS carries each reading's page

- **Authority / Builder / lane:** Gavin, 2026-10-28, "D2 next" (CAVE-DATA-001). Claude Code; PROTECTED.
  [Brief](CAVE-DATA.md).
- **Baseline:** master `b2ec540` (#322 D1 merged).
- **Built:** VITALS shows sleep's D/W/M/Y page (shared with TODAY's sheet) and protein's and water's
  7/28/90 pages inline.
- **Open question for Gavin:** should DATA open on TONIGHT? It conflicts with NAV-001's two-tap paths
  (42 tests). DATA stays on NUMBERS until he decides.
- **Next:** CI and Gavin's merge; his default-view choice; then D3 (FILE absorbs YOUR ROTATION).

---
# CAVE-DATA D1 — the cave is DATA

- **Authority / Builder / lane:** Gavin, 2026-10-28, option A (CAVE-DATA-001). Claude Code; PROTECTED
  (amends NAV-001's DATA). [Brief](CAVE-DATA.md).
- **Baseline:** master `dbccca9` (#321 S8 merged; the SUIT-ALIVE build plan is complete).
- **Built:** DATA's page is the cave's first view, NUMBERS. Every cave entry (TODAY's bands, SYSTEMS's
  readings) opens DATA's cave on its view. The second cave in SYSTEMS is gone. S7's wrong "sleep
  stages not known" line is fixed.
- **Next:** CI and Gavin's merge. Then D2 (VITALS absorbs the per-number pages; DATA opens on TONIGHT).

---
# SUIT-ALIVE S8 — suit systems, vision and the log

- **Authority / Builder / lane:** Gavin, 2026-10-28. He ruled night vision may be automatic and cloak
  is only on his word (SUIT-ALIVE-007). Claude Code; PROTECTED (presentation; no Engine, schema or
  event change). [Brief](SUIT-ALIVE.md#s8--suit-systems-vision-and-the-log).
- **Baseline:** master `b0f4317` (#320 S7 merged).
- **Built:**
  - Vision: AUTO (night from midnight on shift), NORMAL, THERMAL and NIGHT, stored on this device,
    with AA holding.
  - CLOAK in SYSTEMS → SUIT SYSTEMS, entered only when pressed.
  - The cave's LOG: COMMS rebuilt from records, plus the RECORDER.
- **Next:** CI and Gavin's merge. That completes the SUIT-ALIVE build plan (S1–S8). Then live use.

---
# SUIT-ALIVE S7 — the cave, File

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S7" (SUIT-ALIVE-006). Claude Code; FEATURE,
  read-only. [Brief](SUIT-ALIVE.md#s7--the-cave-file).
- **Baseline:** master `8441d1b` (#319 checkpoint merged).
- **Built:** the cave's FILE view. The case file shows findings only once their floor is met.
  Calibration rates each usual range FIRM, BUILDING or THIN, with a "not known" list. The whole-run
  table shows each place in a run. It reuses Personal Understanding's query and links to it.
- **Next:** CI and Gavin's merge. Then S8 (Protected; needs the night-vision and cloak-default rulings).

---
# SUIT-ALIVE — S1–S6 merged; paused for live use (2026-10-28)

- **State:** S1–S6 are all on master: #313/#314 (the bat), #312 (VITALS), #315 (comms and TONIGHT),
  #316 (ROUTE), #317 (pace and the dark cockpit) and #318 (BRIEF: preflight and after-action). Rulings
  are SUIT-ALIVE-001 to SUIT-ALIVE-005 in `docs/UX_DECISIONS.md`. The brief is
  [SUIT-ALIVE.md](SUIT-ALIVE.md). There are no open PRs and no scheduled check-ins.
- **Verification:** the last full `npm run verify` (S6) passed 3,125 tests with 1 existing skip.
  Architecture checks and the production build are OK, and CI was green on every merge.
- **Owner direction:** wrap up and run real shifts. Pace, usual sleep and wake, and the usual ranges
  appear only after 10 same-kind days (3 Garmin-timed days for the route's usual sleep and wake), so
  early days will say "still learning".
- **Remaining risks:**
  - The comms line, route and brief add reads to TODAY: Whole Picture, plus up to 28 days of entries
    for pace, loaded once per day.
  - Hero height is held by swapping lines, not stacking them. Watch the fold on long cards.
- **Next, each on Gavin's go:**
  - S7 (case file, calibration and whole-run table): coordinate with Codex's Personal Understanding first.
  - S8 (cloak, thermal and night vision, comms history): Protected, and needs the night-vision and
    cloak-default rulings.
  - Deferred: a break time on the schedule (schema change).

---
# SUIT-ALIVE S6 — preflight and after-action

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S6 and make it bigger" (SUIT-ALIVE-005). Claude
  Code; FEATURE plus the TODAY band. [Brief](SUIT-ALIVE.md#s6--preflight-and-after-action).
- **Baseline:** master `79fcaed` (#317 S5 merged).
- **Built:** the cave's BRIEF view. PREFLIGHT has a T-minus clock and a GO/HOLD/LATE/ADVISORY poll
  that is auto-ticked by logs, with inline packing and handoff actions. AFTER-ACTION puts planned
  beside actual. TODAY's band shows PREFLIGHT or DEBRIEF for 3 hours either side of the shift.
- **Next:** CI and Gavin's merge. Then S7 (coordinate with Codex) or S8 (Protected, needs rulings).

---
# SUIT-ALIVE S5 — pace and the dark cockpit

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S5" (SUIT-ALIVE-004). Claude Code; PROTECTED
  (TODAY readings; no Engine, schema or event change). [Brief](SUIT-ALIVE.md#s5--pace-and-the-dark-cockpit).
- **Baseline:** master `7e9810c` (#316 S4 merged).
- **Built:** "by now" pace for protein and water. TODAY's tiles dim inside your normal and say BEHIND
  PACE in amber; the cave judges today's totals by pace.
- **Next:** CI and Gavin's merge. Then S6 (preflight and after-action), FEATURE.

---
# SUIT-ALIVE S4 — the route

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S4" (SUIT-ALIVE-003). Claude Code; PROTECTED
  (TODAY layout; no Engine, schema or event change). [Brief](SUIT-ALIVE.md#s4--the-route).
- **Baseline:** master `8fa7f33` (#315 S3 merged).
- **Built:** ROUTE on TODAY (the next three points), in-app callouts on COMMS, and the cave's
  ROUTE view. Break time deferred (schema).
- **Next:** CI and Gavin's merge. Then S5 (dark cockpit and pace), Protected.

---
# SUIT-ALIVE S3 — comms and Tonight

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S3" (SUIT-ALIVE-002). Claude Code; PROTECTED
  (presentation of recommendation authority; no Engine, schema or event change). [Brief](SUIT-ALIVE.md#s3--comms-and-tonight).
- **Baseline:** master `d937c3e` (#314 S1 merged).
- **Built:** a comms line closing TODAY's mode hero (your readings against your normal, never the call),
  and the cave's TONIGHT view (the call as made, what's furthest from normal, what's overdue).
- **Next:** CI, independent review (unless waived), Gavin's merge. Then S4 (route), Protected.

---
# SUIT-ALIVE S1 — the bat mark

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S1 with the prototype bat" (SUIT-ALIVE-001).
  Claude Code; presentation only. [Brief](SUIT-ALIVE.md#s1--the-bat-mark).
- **Baseline:** the SUIT-ALIVE-001 ruling (#313) merged as master `181aeea`.
- **Built:** the red bat is the header emblem, sits beside THE CAVE heading and opens on the cold
  start. It has one source SVG under `docs/brand/suit-mark/`. Stealth and the app icon are unchanged.
- **Next:** CI and Gavin's merge. Then S3 (comms and Tonight, Protected) on his go.

---
# SUIT-ALIVE S2 — the cave, Vitals

- **Authority / Builder / lane:** Gavin, 2026-10-28, "go S2". Claude Code; FEATURE (read-only,
  TODAY unchanged). [Brief](SUIT-ALIVE.md). Prototype and build plan in `prototype/suit-alive/`.
- **Baseline:** master `b8fb15a` (#311 LOOP-002 merged).
- **Built:** MORE → SYSTEMS rows open the cave: one vital in depth against your own normal, with
  run position, records, what it feeds and source; full history one tap further.
- **Merged:** #312 by Gavin's direction, 2026-10-28 (`cf3ccfd`).
- **Bat ruling:** recorded as SUIT-ALIVE-001 in `docs/UX_DECISIONS.md` (docs-only PR). The original red
  bat mark is allowed in the header emblem, the cave heading and the cold start; EMBLEM-002 stays the
  app icon. Open for S1: the prototype's geometry or the EMBLEM-002 master.
- **Next:** Gavin's merge of the ruling PR. Then S1 (build the mark) or S3, each on his go.

---
# LOOP-002 — one post-shift moment

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go LOOP-002". Claude Code; PROTECTED (TODAY
  post-shift composition; no Engine/schema/new event). [Brief](LOOP.md#loop-002--one-post-shift-moment-follow-ups-where-they-belong).
- **Baseline:** master `9a37a6b` (#310 REMEMBER merged; review waived by Gavin).
- **Built:** debrief folded into the shift handoff; "Did this happen?" on "From last shift";
  "Looking back?" on the next same-kind recommendation card. Duplicate debrief card and PREP line removed.
- **Next:** CI and Gavin's merge (review per DEV-FLOW-002 unless waived). Then live with the loop
  for a rotation.

---
# LOOP step 4 — REMEMBER

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go remember". Claude Code; PROTECTED
  (advisory, informational only; no Engine/schema/new event). [Brief](LOOP.md#step-4--remember).
- **Baseline:** master `3a74cc9` (#309 TRY merged by Gavin).
- **Built:** your reviewed lesson on the next recommendation of the same kind; your last debrief's
  plan under PREP; past experiment lessons when starting a new one.
- **Next:** CI and Gavin's merge (review per DEV-FLOW-002 unless waived). This completes THE LOOP.

---
# LOOP step 3 — TRY

- **Authority / Builder / lane:** Gavin, 2026-10-27, "Merge it and go try". Claude Code; PROTECTED
  (bounded: journal-backed, no schema/new event/Engine input). [Brief](LOOP.md#step-3--try).
- **Built:** Journal → Experiments (start, run, compare with your usual, close with a lesson) and a
  quiet "Trying: …" line under TODAY's mode while one runs.
- **Next:** CI, then Gavin's merge (independent review per DEV-FLOW-002 unless waived). Step 4
  REMEMBER needs its own approval.

---
# Session close — 2026-10-27 (all work merged and live)

- **Live on master `8a14c72`, deployed (GitHub Pages run 418 green):** ROTATION-002/003/004
  (#297, #299, #304), DELTA-004 (#298), SLEEP-ENGINE-001 (#300), overlay removal (#301),
  PERSONAL-UNDERSTANDING-001 (#302), LOOP step 1 ASK (#305), LOOP step 2 REFLECT (#306),
  MEMORY-001 (#303) and SUIT-002 (#307). All merged at Gavin's direction; independent review
  waived by Gavin for #300 and #306 only (recorded on each PR).
- **No open PRs from this session; no work in flight.** Builders: Claude Code owns THE LOOP;
  Codex owns Personal Understanding, memory and SUIT-002.
- **Next action:** LOOP step 3 TRY (bounded personal experiment, proposed as a journal-backed
  record with no schema change) awaits Gavin's "go try"; step 4 REMEMBER after it. Both PROTECTED.
- **Owner checks:** feel SUIT-002 haptics on the phone (water tick; hold-to-delete arm and
  commit). Delete merged branches `claude/delta-004` and `claude/remove-pcb-overlay` in GitHub.
- **Known risks:** existing bundle-size warning. REFLECT follow-ups appear in the Journal only,
  not on TODAY (deliberate; revisit with use).

---
Historical SUIT-002 checkpoint (Codex, #307 merged at `8a14c72`):

# SUIT-002 — make the armor answer

- Authority: Gavin's BEYOND // SUIT brief, 2026-10-27. Codex; PROTECTED combined memory/command-outcome review.
- Baseline: fresh master `8aedba5`; branch `codex/suit-002`; [PR #307](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/307), depends on #303; base master for required CI.
- [Brief](SUIT-002.md). Reuse existing haptics/hold/confirmation/rotation and MEMORY-001 #303.
- Built so far: shared semantic feedback after successful writes, 120ms neutral pulse,
  mute reduced-motion, cancellable holds and short rotation surface with optional detail.
- Evidence: corrected focused TRAIN/KEEP/receipt checks86/86; reviewer node29/29; code review
  PASS at6db4328. Production build + four-size offline water/undo/memory/backup acceptance PASS
  (360/390/844/1280), zero unrelated writes/errors/overflow. Final full gate/CI/review follows.
- Integration: fresh master `c28a846` (#306 reflection) merged, code clean; both checkpoint histories retained.
- Latest: inspection is one tap/mute, charged deletion retains its hold. Focused114/114 and
  code review PASS at63a222b. Built offline360 hold PASS in normal/reduced motion: tap/halfway
  zero voids, full hold exactlyone; expected native calls [10,8,35] or none.
- Next: final full gate/CI and exact-head evidence review, then owner decision. No merge authorized.
- MEMORY-001 #303 refreshed onto master `c28a846` as `1a653303`; current CI/review renewal pending. Prior exact `71bcb079` CI/review PASS.
  Integrated unchanged memory lifecycle into #307 for combined testing, plus UI feedback. Neither is deployed.

---

---
# LOOP step 2 — REFLECT

- **Authority / Builder / lane:** Gavin, 2026-10-27, "merge 305 and go reflect". Claude Code;
  PROTECTED (bounded: journal link at creation, no Engine/schema/new event). [Brief](LOOP.md#step-2--reflect).
- **Baseline / branch:** master `8aedba5` (#305 ASK merged at Gavin's direction); `ccr-0be4f40f-16m0ja`.
- **Built:** "Why not?" after declining a recommendation, the 30-second shift debrief, and "How did
  it go?" in the Journal from the next lived day.
- **Next:** CI and Gavin's merge (independent review per DEV-FLOW-002 unless Gavin waives it).
  Steps 3 TRY and 4 REMEMBER each need their own approval.

---
Historical LOOP step 1 checkpoint (#305 merged at `8aedba5`):

# LOOP step 1 — ASK

- **Authority / Builder / lane:** Gavin, 2026-10-27, "Go loop" (campaign + step 1). Claude Code;
  FEATURE (read-only). [Campaign brief](LOOP.md). Claude owns THE LOOP; Codex keeps Personal
  Understanding and memory (#303).
- **Baseline / branch:** master `98a8300` (#304 ROTATION-004 merged at Gavin's direction);
  `ccr-0be4f40f-16m0ja` reused.
- **Built:** Review → Whole Picture → Ask: four questions answered by rules from recorded days
  (`application/askProjection.ts`), every line opening the days behind it; "not enough recorded
  yet" names what is missing. No writes, Engine input or AI.
- **Next:** CI and Gavin's merge. Steps 2–4 (REFLECT, TRY, REMEMBER) are PROTECTED and each need
  their own approval. Merged branches `claude/delta-004` and `claude/remove-pcb-overlay` still
  await deletion by Gavin.

---
Historical ROTATION-004 checkpoint (#304 merged at `98a8300`):

# ROTATION-004 — your whole day on one line

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go 004". Claude Code; FEATURE.
  [Brief](ROTATION-004.md). Meals, water and workout starts on every Rotation actogram row.

---
Historical SLEEP-ENGINE-001 checkpoint (#300 merged at `c3338a0`):

# MEMORY-001 — confirmed prep and recovery memory

- **Authority / Builder / lane:** Gavin's explicit MEMORY-001 direction, 2026-10-27; Codex,
  PROTECTED additive event/command contract. [Brief](MEMORY-001.md). No new schema or Engine rule.
- **Baseline / branch / PR:** fresh master `ab3508887af7650d6e4180d815e048fd2b48b8f2` (#302
  merged/deployed); `codex/memory-001`; [#303](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/303), WIP pushed early.
- **Built:** operator-only food/bottle/other-prep/recovery facts, causal append-only revisions,
  confirmation/status/history, atomic stale/day/duplicate guards; MORE manager, PREP context and
  recovery-only TRAIN context. Existing backup/store; no consumption/tasks/advice side effects.
- **REUSE:** PREP/atomic/events/day/history/backup, native disclosures and existing routes.
  **OWN:** fact lifecycle and context mapping. **BUILD FROM SCRATCH:** only missing fact/editor
  semantics, which daily preparation confirmations and Journal records cannot represent honestly.
- **Evidence so far:** integration 7/7; focused browser/Train/PREP/Nav 104/104 before final day-read
  ownership refinement. Four-size axe/reduced-motion/bounded controls, inspect/edit/irrelevant,
  source/Engine isolation and real native backup tests included. TypeScript/architecture pass.
- **Independent WIP review:** BLOCK on `0401fa4`: day-keyed PREP remount lost a global-memory
  draft. Corrected by retaining the hidden component through no-day/new-day transitions; day-owned
  preparation reads reset separately and cannot revive yesterday's confirmation. Regression covers
  ended/null/new-day draft survival and explicit day adoption; final exact-head review follows.
- **Production / follow-up:** [Built-PWA acceptance](../screenshots/memory-001/README.md) PASS at
  360/390/landscape/desktop, offline reload, original/corrected/irrelevant history and recovery-only
  context, actual native backup preview/cancel. Exactly four memory revisions; all other domain
  records unchanged. Current Memory/Personal Understanding browser 18/18, node catalog/history/
  memory 34/34, new catalog route/focus/back/no-write case PASS; TypeScript/build pass.
- **Full-gate history:** initial local 3,031 pass / three fail / one existing skip. Two missing
  catalog expectations corrected (heading and existing meal-memory alias), original unchanged
  target-return timeout passes alone/in follow-up. No assertions/timeouts/gates weakened.
- **Review / CI:** independent corrective PASS at `b9ea7ae`, 19/19 node probes; final exact-head
  renewal required after evidence. Source `8da2c0e` required CI [PASS](https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/40467876738).
  Final full verification, exact-head review and current-head CI are recorded in #303 before
  readiness. Existing bundle warning remains; no inference, Engine or schema change.
- **Next:** final full gate/review/CI, then Gavin's separate merge decision. No merge/deployment
  or next slice authorized here. Other memory domains remain parked.

- **Mainline continuity:** merged fresh master `c3338a0` (#300 SLEEP-ENGINE-001) after it landed during final verification. Only this checkpoint conflicted; both histories are retained. MEMORY adds no Engine change relative to that master. The previous final local run was stopped for integration; combined-head verification/review/CI follow.

---
Historical SLEEP-ENGINE-001 (#300 merged at `c3338a0`):


# SLEEP-ENGINE-001 — two short main sleeps suggest the reduced session

- **Authority / Builder / lane:** Gavin, 2026-10-27, "approve option 1". Claude Code; PROTECTED.
  [Brief](SLEEP-ENGINE-001.md). Independent review waived by Gavin ("Skip the reviews for now");
  none performed. Merged at Gavin's direction ("Merge") as #300.
- **Evidence:** full verify 3,028 passed / 1 existing skip; CI green. Overlay removal merged as #301.
- **Next:** live with it on shift; check that the reduced suggestion appears only after two short nights.

---
Historical PERSONAL-UNDERSTANDING-001 (#302 merged/deployed as `ab35088`):

# PERSONAL-UNDERSTANDING-001 — connected knowledge

- **Authority / Builder / lane:** Gavin: “Let's work on personal understanding”, after the
  first-slice proposal; Codex, FEATURE read-only Review composition. [Brief](PERSONAL-UNDERSTANDING-001.md).
- **Baseline / branch / PR:** fresh master `e0da229`; `codex/personal-understanding-001`;
  [#302](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/302), draft pushed early.
- **Scope:** existing Missions/explicit targets/weekly focus, qualified personal baselines,
  comparable rotation positions, and real written lessons with canonical source/edit navigation.
  Existing word matching connects candidate lessons to Missions, with its limitation visible.
- **REUSE:** existing queries, projections, matcher, source screens and native disclosure.
  **OWN:** read-model/navigation composition. **BUILD FROM SCRATCH:** missing cross-domain view only.
- **Boundaries:** no Engine/schema/command/backup/dependency changes, new preference store,
  recommendation priority or TODAY changes. Claude's SLEEP-ENGINE-001 #300 remains separate.
- **Built:** optional Choices/Patterns/Lessons workspace in MORE → Review, lazy read-only loading,
  source inspection, direct original Mission/Journal/Targets/Schedule routes and BACK TO REVIEW.
- **Verification:** full `npm run verify` PASS on source `5f1bdeb`: architecture 312 files;
  312 test files pass, 3,015 tests pass / one existing skip; TypeScript and production/PWA build
  pass. New integration 3/3 and browser 9/9 cover exact corrected samples, all-table no-write
  snapshots, source round trips, absence/error/retry, bounded lists and stale-read rejection.
  [Production acceptance](../screenshots/personal-understanding-001/README.md) PASS at four sizes,
  offline, keyboard disclosure and original-source return; zero domain writes/errors/overflow.
- **CI / limits:** source head's required CI [PASS](https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/40454206900).
  Final evidence-only head's CI is recorded in #302. Existing bundle warning remains. This slice
  exposes existing knowledge; it does not yet learn preferences or change advice. Risk classifier
  flags the brief path, not a governance amendment; semantic lane remains FEATURE (brief explains).
- **Next:** green final-head required CI, then Gavin's merge decision. No merge/deploy is claimed.
  Feedback/experiments and a durable preference store remain future scope.

---
Historical ROTATION-003 (merged #299):

# ROTATION-003 — flip planning

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go flips". Claude Code; FEATURE.
  [Brief](ROTATION-003.md). #297 (ROTATION-002) and #298 (DELTA-004) merged at Gavin's direction.
- **Branch / baseline:** `ccr-0be4f40f-16m0ja` restarted from `c03eff3`.
- **Built:** Rotation → Flips: aligned actograms of recent flips into/out of work, usual sleep
  times around each, naps before nights with a comparison gated at 3 flips each way; next-window
  card names the next forecast flip. Rows carry nap minutes.
- **Evidence:** full verify 3,013 passed / 1 existing skip; architecture and build OK.
- **Next:** CI and Gavin's merge. Then use on shift; refinement candidates: one-sentence next
  window, "unusual" tuning, phone readability of actograms. Sleep-aware Engine stays Protected.

---
Historical DELTA-004 checkpoint (#298 merged at `c03eff3`):

# DELTA-004 — "not enough data" becomes a goal

- **Authority / Builder / lane:** Gavin, 2026-10-27, "go Delta 4". Claude Code; FEATURE.
  Brief: [DELTA-002.md, slice 2](DELTA-002.md).
- **Branch / baseline:** `claude/delta-004` from `618e435` (#297 merged, Gavin's "Merge it.").
- **Built:** abstaining readings say what to log and what it unlocks (Weekly expenditure, usual,
  waiting findings; Garmin usual; Rotation). Same floors; no streaks, scores or TODAY rows.
- **Evidence:** full verify 3,008 passed / 1 existing skip; architecture and build OK.
- **Next:** CI, Gavin's merge. Then live with ROTATION-002 + DELTA-004 on shift; candidates after
  use: one-sentence next window, "unusual" tuning from real data, ROTATION 3 flip planning.

---
Historical ROTATION-002 checkpoint (#297 merged at `618e435`):

# ROTATION-002 — BEYOND understands your rotation (Tracks A + B)

- **Authority / Builder / lane:** Gavin, 2026-10-27, "Go A + B". Claude Code; FEATURE.
  [Brief](ROTATION-002.md). PREP-001 merged as #296 (`fa5cdd8`); spending is out of BEYOND.
- **Branch / baseline:** `ccr-0be4f40f-16m0ja` from `fa5cdd8`; [PR #297](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/297).
- **Stacked next:** DELTA-004 ("not enough data" becomes a goal), Gavin's go 2026-10-27, branch
  `claude/delta-004` on #297; brief in [DELTA-002.md](DELTA-002.md).
- **Built:** Rotation tab actogram (Garmin sleep vs scheduled shift), shift-by-shift and day-off
  patterns with sample sizes and tap-through, next window (forecast days off, last workout,
  most-trained day off). TODAY's Garmin tiles flag 3+ finished days outside your own range;
  sheets explain values/range/basis. Mode-pin flake fixed in the test (expect.poll moved the
  faked clock past 16:30); app mode-pin code unchanged.
- **Not changed:** Engine, recommendations, events/commands, schema, dependencies, backups.
- **Next:** full verify + green CI; independent review if Gavin wants one (FEATURE lane does not
  require it); Gavin's merge approval. Then live with it on shift and decide the next step
  (ROTATION 3 flip planning, or DELTA-ADVANCED experiments).

---
Historical PREP-001 checkpoint (#296 merged at `fa5cdd8`):

# PREP-001 — ready for tonight

- **Authority / Builder:** Gavin approved the focused first campaign step, 2026-10-26. Codex;
  PROTECTED preparation facts/TODAY composition. [Brief](PREP-001.md).
- **Branch / baseline:** `codex/prep-001`; `560deb3bc5d080ff19c0dd537c3d20a8c93144cb` (#295 merged).
- **Scope:** food/snacks and bottle preparation, practical alternatives, undo/change and local
  persistence; no consumption logging, spending or recommendation changes.
- **REUSE:** event/atomic-write/day/backup/history and LogSheet/confirmation paths.
- **OWN:** preparation fact mapping. **BUILD FROM SCRATCH:** missing preparation projection only.
- **Built:** one-tap food/bottle before actual work, quiet manual entry at other times, native
  sheet with homemade/frozen/other/not-needed choices, change/undo and inspectable history.
  Append-only item revision in existing events; atomic idempotence/stale/day guards. New days
  start unknown; no consumption or Obligation records are created.
- **PR / evidence:** [#296](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/296), draft pushed
  early. Persistence 12/12 and initial browser 10/10 PASS (including four axe sizes), TypeScript,
  architecture (308 files), build and diff check PASS. [Production acceptance](../screenshots/prep-001/README.md)
  PASS at phone/landscape/desktop, offline confirmations, frozen option, midnight reload, native
  backup download/restore preview and unchanged non-preparation records. Final verification covers
  compact controls and retained logging-first placement; no product change after final capture.
- **Review history:** WIP BLOCK `801d138` found time sorting could revive superseded state after
  clock correction. Causal-chain projection fixes it and rejects conflicting/incomplete chains;
  independent original probe and integration 12/12 PASS. Initial CI test-type/import/order
  issues corrected without assertion/configuration weakening. Final exact-head review and full
  gate/required CI results are recorded in #296 before readiness.
- **Full-gate correction:** 2,984 passed / two failed / one skip on prior head. Retained original
  Polish001 phone-fold assertion by moving preparation below existing Log controls. Preparation
  and Polish001 now 23/23 PASS. Catalog follow-up had 57 pass / one different 15s timeout; original
  MIRROR and TODAY TOOLS cases pass 2/2 alone. Final production acceptance refreshed: four sizes
  PASS. Final full verification/review/CI results are recorded in #296.
- **Next:** final full verification, independent review and green CI, then Gavin's separate merge
  approval. Spending and later campaign stages remain outside this focused step.

---
Historical C2 checkpoint (#295 merged):

# REVIEW-001 — C2 operator-set targets

- **Authority / Builder / lane:** Gavin approved C2 on 2026-10-25 after #294 merged. Codex;
  PROTECTED operator-controlled interpretation settings.
- **Branch / baseline:** `codex/review-001-c2-targets`; fresh master
  `9bc96e826f7167cadb0be8ca5f90abd91f72d284`; [PR #295](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/295).
- **Outcome:** optional weight-change-rate, sets-per-muscle and strength-sessions-per-week targets;
  Review compares canonical recorded evidence with the operator's choices.
- **Exclusions:** no defaults, generic pass/fail verdict, Engine input, program adjustment,
  recommendation priority, provider/dependency, or JOURNAL work.
- **REUSE / OWN / BUILD FROM SCRATCH:** existing mutable targets row/save/undo/backup and Review
  projections / missing-data-aware comparison language / none.
- **Built:** COMMAND → Targets now stores and clears the three optional choices in the existing
  targets row. Review presents weight-rate, per-muscle working-set and weekly strength-session
  actuals beside those choices without a default, score or recommendation. Existing backups carry
  the additive fields with no schema migration.
- **Evidence:** TypeScript and production/PWA build pass; persistence/restore/target/strength
  integration coverage passes 43/43; focused COMMAND/Targets/Review/Body Chromium coverage passes
  169/169, including 320 px target comparison. Diff check is clean. The existing >500 kB bundle
  warning remains. `MoreOperator.test.tsx` retains its pre-existing isolated ESM-mock setup failure
  (`mockReset is not a function`) before product rendering; no assertion was weakened.
- **Independent review:** exact head `67f51c6` BLOCKED on two P2 gaps: an early-open/late-read
  race could manufacture clears for untouched Review targets, and setting guidance lacked the
  brief's inspectable sources. The correction disables Targets until its initial read succeeds,
  adds the delayed-read/no-edit regression, and attributes bounded context to the relevant JISSN,
  ACSM and meta-regression sources without creating defaults. Focused browser tests pass 52/52;
  TypeScript, production/PWA build and diff check pass. Existing bundle warning remains.
- **Closeout handoff, 2026-10-26:** Gavin explicitly approved this session taking over #295
  (“Let's finish that up then”). Existing PR branch remains `codex/review-001-c2-targets`;
  isolated local branch `codex/review-001-c2-closeout`. Preserved corrected source head
  `2708c82798936a3877eaf799db51eab7854f1574`; its required CI passes. No new product scope.
- **Closeout evidence:** current-head Targets/Review/integration regression passes 66/66.
  Corrected two stale “COMMAND → Targets” hints to “MORE → Targets”, with matching existing
  copy assertions. Final review and unchanged required CI cover that correction as well.
- **Next:** verify both reviewer corrections, renew independent exact-head review, and update
  #295 with final checks and review before readiness. Final evidence is recorded in the PR;
  Gavin separately decides merge. PREP-001 remains an unapproved implementation proposal.

---

# REVIEW-001 — Phase 1b strength and muscle intelligence (merged #294 at `9bc96e8`)

- **Authority / Builder / lane:** Gavin approved the recommended bounded Phase 1b objective on
  2026-10-24 (“do it”). Codex; PROTECTED read-only Engine analytics.
- **Branch / baseline:** `codex/review-001-phase1b`; fresh master
  `aafa5b57c85050b5cab3eed3a07e484ae3fbcd02` after #293 merged; active
  [PR #294](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/294).
- **Outcome:** Review answers strength direction/preservation, lift progress/stalls, weekly hard
  sets by muscle, and broad training balance from existing records with explicit floors and abstention.
- **Exclusions:** no schema/events/commands/backups/dependencies/providers; no template,
  progression, recommendation, target, program or automatic-decision change; no fat/muscle verdict.
- **REUSE / OWN / BUILD FROM SCRATCH:** existing session/set truth, TRAIN curves, exercise mappings
  and Review evidence UI / BEYOND comparability and abstention / only the pure aggregation layer.
- **Built so far:** pure `strengthReview` projection with two-session-per-window same-lift
  comparability; best-set and volume-led lift/index direction; secondary estimated max; relative
  strength when a prior bodyweight exists; weekly volume and muscle-set rates; explicit exercise-
  level push/pull classification; canonical exclusions; and complete 56-day source disclosure.
- **Evidence:** new Engine + integration tests 5/5; TypeScript, architecture (304 files), production
  build and diff check pass. Existing ReviewScreen/BodyAnswers browser files pass 11/11. The existing
  ReviewHub file remains unstable in isolated Chromium at its ESM mocks (`mockClear` /
  `mockRejectedValueOnce` missing) and two shared-state timing assertions; no assertion was changed.
- **Completed slice:** direct 320 px browser coverage; push/pull and upper/lower set-rate views
  retain arms/core/full-body/unknown work as unclassified rather than inventing a split; the body
  side-by-side now uses the same strength result while preserving its no-verdict language.
- **Evidence:** Engine + integration 6/6; focused strength/body browser 5/5; TypeScript,
  architecture (305 files), production/PWA build and diff check pass. Existing >500 kB bundle
  warning remains.
- **Independent review:** exact head `cacb658` BLOCKED on three scope gaps: primary strength
  measures, shoulder movement classification, and inspectable source records. The Builder corrected
  all three without expanding scope. Focused Engine/integration tests pass 7/7; direct 320 px browser
  coverage passes; TypeScript, architecture (305 files), production/PWA build and diff check pass.
  Existing >500 kB bundle warning remains.
- **Next:** push the corrected head, obtain green required CI and renewed independent exact-head
  review. Gavin separately decides merge.

---

Historical NAV-001 slice 4 (merged #293 at `aafa5b5`):

# NAV-001 — slice 4: DATA paths and Garmin sync

- **Authority / Builder:** Gavin approved the NAV map and explicitly requested “merge 292 and
  continue” on 2026-10-23. Codex; PROTECTED primary IA. [Brief](NAV-001.md#slice-4--data-paths-and-garmin-sync).
- **Branch / baseline:** `codex/nav-001-slice4`, fresh master `731279d`; slice 3 #292 merged.
- **Scope:** direct existing Whole Picture and Rotation entries in DATA; the existing Android-only
  Health Bridge sync action on TODAY's measured-number heading. No Engine, schema, Garmin import,
  logging/correction, backup, dependency or TRAIN change.
- **REUSE:** existing review destination, Whole Picture/Rotation, SyncGarminLink and path tests.
- **OWN:** presentation-only navigation focus handoff.
- **BUILD FROM SCRATCH:** none.
- **Evidence so far:** NAV paths 14/14 pass; DATA/Review/Garmin/App focused browser regression
  95/95 passed before the added Whole Picture path; the established three-part DATA layout passes
  7/7 at 320/360/390/412 px after folding the new entries into PROGRESS. Architecture (302 files),
  TypeScript and production/PWA build pass; diff check is clean. Existing bundle-size warning remains.
- **Local full-gate note:** the default and two-worker Windows runs were stopped after widespread
  shared-IndexedDB/overlapping-act contamination across unrelated suites. The isolated existing
  MoreOperator file also currently fails at its setup mock (`mockReset is not a function`) before
  rendering product code. No assertion was weakened; required clean full CI remains the authority.
- **Review correction:** independent review of `d591dad` found the DATA → Review focus request
  remained live after use. The corrected handoff is consumed once, is not queued when navigation is
  blocked, and has a leave/re-enter regression; NAV paths and TypeScript pass on the corrected tree.
- **Next:** push the correction to #293, obtain renewed independent exact-head review and green
  required CI, then merge under Gavin's recorded approval.

---

Historical slice-3 checkpoint (merged):

# NAV-001 — slice 3: sleep metric page

- **Authority / Builder:** owner-approved NAV map; Gavin: “go ahead” after slice-2 handoff.
  Codex; approved PROTECTED IA. [Brief](NAV-001.md#slice-3--sleep-metric-page).
- **Branch / baseline:** `codex/nav-001-slice3`, `64248eb8cb8bac5af05517943aa3469b494f7086`.
  #291 merged with explicit approval, green CI and independent exact-head PASS.
- **Scope:** shared week-first sleep detail, D/W/M/Y and period paging/swipe, record drill-through;
  display only. No Engine/schema/logging/Garmin/backup semantics change.
- **REUSE:** measured charts/queries, SleepEvidence, LogSheet; **OWN:** period-to-evidence mapping;
  **BUILD FROM SCRATCH:** period navigation because existing charts use fixed ranges.
- **Built:** shared week-first Garmin sleep sheet from TODAY and DATA; calendar D/W/M/Y,
  earlier/later controls and swipe, measured sample counts, keyboard/pointer night selection,
  retained stages/source records and canonical all-records/correction route. Missing is not zero;
  manual sleep is not silently converted to Garmin evidence. Existing 371-period history bound
  is disclosed, including clipped calendar periods.
- **PR / evidence:** [#292](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/292), draft pushed
  early. Architecture/typecheck/build PASS; calendar tests 4/4, Garmin regression 6/6; final sleep
  browser file 9/9 (including four axe sizes), NavPaths 11/11 with two slice-4 todos.
  [Production acceptance](../screenshots/nav-001-slice3/README.md) PASS at phone/landscape/desktop,
  offline real import→week→night/source, close/focus, all-records route, unchanged events.
- **Verification history:** first focused 17 pass / 3 new test-harness failures, then 19 pass /
  one instrumentation call-count failure. Corrected unsupported ESM spy, actual destination
  heading and expected DB invocation count; all behavior assertions retained. Keyboard focus
  refinement independently suggested and verified. WIP code review PASS; final full gate,
  exact-head review and required CI recorded in #292 before readiness.
- **Next:** finish full verification, final independent review and green exact-head CI, then
  Gavin’s merge approval. DATA layout/sync tile/tree-test rerun remain slice 4.

---
Historical slice-2 checkpoint (merged):

# NAV-001 — slice 2: DATA / MORE and backup first

- **Authority / Builder:** Gavin approved the NAV map and explicitly requested merging #290 and
  continuing on 2026-10-23. Codex; PROTECTED primary IA. [Brief](NAV-001.md#slice-2--data--more-and-backup-first).
- **Branch / baseline:** `codex/nav-001-slice2`, fresh master `3520cba`; slice 1 #290 merged.
- **Scope:** visible DATA/MORE labels and consistent headings/returns/catalog copy; compatible
  internal routes/history/shortcuts; direct “Back up my data” first in MORE, existing export
  handler and visible receipt. No backup format/restore semantics, schema, Engine or Garmin change.
- **REUSE:** existing tab renderer, catalog, MoreScreen export/backup panel and path tests.
- **OWN:** presentation mapping to existing destinations and handlers.
- **BUILD FROM SCRATCH:** none.
- **PR / evidence:** [#291](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/291).
  Typecheck, architecture (300 files), diff and build pass. [Production acceptance](../screenshots/nav-001-slice2/README.md)
  passes phone/landscape/desktop, including offline real backup download, real restore preview,
  cancel and unchanged domain records. Native-backup path, failure/retry and duplicate-click
  checks pass; internal legacy routes and “body” search alias are retained.
- **Verification history:** initial recovery-fold failure fixed without relaxing the bound;
  follow-up 26/26. First complete local full run: 2,929 passed / 6 failed / 1 skip / 3 future todos.
  Fixed a dynamic BACK TO label and two stale test selector paths; five affected files then
  pass 32/32, including both timeout cases. Final full gate runs with two workers for load;
  no assertion/timeout/configuration weakening. Final exact-head results/review are recorded
  in #291 before readiness. WIP independent review found no substantive issues.
- **Next:** final full gate, renewed exact-head independent review and green required CI, then
  Gavin’s merge approval. Metric zoom and DATA layout remain later slices.

---
Historical slice-1 checkpoint (merged):

# NAV-001 — slice 1: TODAY

- **Objective / authority:** [NAV-001](NAV-001.md); Gavin approved the map on 2026-10-23 (Protected IA).
  Builder: Codex, explicitly taking over from Claude Code on Gavin’s 2026-10-23 instruction.
  Existing branch `claude/nav-001`, [PR #290](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/290);
  local checkout `codex/nav-001`. SLEEP-FILING-001 (#289) merged.
- **Built:** a floating + LOG; the meal sheet opens with NEW MEAL / QUICK ADD; "See the reasoning ›";
  path tests per top task (`tests/browser/NavPaths.test.tsx`).
- **Takeover verification:** 8 related browser files **230 passed / 4 future-slice todos**;
  architecture (300 files), TypeScript/production build and diff check pass. Built-PWA acceptance
  passes 320/390/landscape/desktop: floating LOG placement, sheet focus return, inactive-tab hiding,
  retained meal draft, no overflow/page errors. [Evidence](../screenshots/nav-001/README.md).
  Fixed the reproduced entrance-animation containing-block bug with a TODAY-only fade; logging
  handlers unchanged. Original Claude head had green full CI/verify; final-head required CI
  runs the full suite/build again. Independent final exact-head review and CI are recorded
  in #290 before readiness. Gavin approves merging slice 1; takeover is not merge authority.
- **CI follow-up:** the first takeover CI failed four legacy fresh-install cases asserting
  LOG bottom <700px. NAV intentionally places it above bottom navigation (764px at height844).
  Replaced the superseded absolute threshold with viewport/navigation bounds, target size,
  pointer hit test and actual LOG opening, preserving empty-state, red-budget and no-day-write
  checks. RedesignToday + NavPaths follow-up: **29 passed / 4 later-slice todos**. No product
  code changed after the accepted production capture; final CI/review renewal required.
- **Later approved slices:** slice 2 (BODY → DATA, COMMAND → MORE, "Back up my data"), slice 3 (sleep page by week),
  slice 4 (DATA layout, sync on numbers, tree-test re-run).

---
Previous checkpoint (SLEEP-FILING-001, #289 merged):

# SLEEP-FILING-001 — real sleep, not quiet shifts

- **Objective / authority:** [SLEEP-FILING-001](SLEEP-FILING-001.md); Gavin: "go sleep filing"
  (2026-10-23), only while actually working. Builder: Claude Code, branch `claude/sleep-filing`.
- **Built:** shift-aware, gap-aware Garmin sleep filing; Health history notes for uncounted sleep.
- **Verified:** `npm run verify` green (2,923 passed / one skip, build OK); node suite green under
  both TZ=UTC and TZ=America/Chicago.
- **Next:** #289: CI, independent review, Gavin's merge. SYNC-001 (#287) is merged.

---
Previous checkpoint:

# SYNC-001 — current in two taps

- **Objective / authority:** [SYNC-001](SYNC-001.md); Gavin: "go SYNC-001" (2026-10-23).
  Builder: Claude Code, branch `claude/sync-001`.
- **Built:** helper 0.7.0 reads on open, explains stale Garmin data, opens from BEYOND's SYNC GARMIN
  link and sends; BEYOND shows SYNC GARMIN on Android in Garmin sheets and the old-data note.
- **Verified:** BEYOND `npm run verify` green (2,914 passed / one skip, build OK). The helper is
  compiled and tested by Health Bridge CI (no local Android SDK).
- **Next:** #287: both CI workflows on the master-merged head, renewed exact-head review, merge
  (Gavin approved on review pass); Gavin installs helper 0.7.0.

---
Previous checkpoint (ROTATION-001 phase 1, #288 merged by Gavin):

# ROTATION-001 — phase 1: the rotation map

- **Objective / authority:** [ROTATION-001](ROTATION-001.md); Gavin: "go ROTATION" (2026-10-23).
  Builder: Claude Code, branch `claude/rotation-1`. SYNC-001 (#287) is separate and pending merge.
- **Built:** Rotation tab in Whole Picture (runs by recorded context, per-day sleep/energy/workout
  cells into the existing inspector, next predicted run). Display only.
- **Verified:** `npm run verify` green: 2,916 passed / one skip, build OK.
- **Found in Gavin's 2026-10-23 backup (not committed):** two Garmin sleeps on Oct 21 were never
  filed as sleep because no lived day covered their start (BEYOND unused Oct 19–21); Garmin steps
  stop at Oct 22 05:00 local while heart rate continues. Filing fix is Protected; awaiting Gavin.
- **Next:** PR, CI, review, Gavin's merge.

---
Previous checkpoint:

# Owner-approved integration — #286 and #282

- **Authority:** Gavin explicitly requested merging both PRs on 2026-10-23. Codex integrates;
  no additional feature implementation is authorized.
- **Current truth:** Whole Picture #283, reuse-first #285 and TODAY “Why this?” #284 are merged.
  #286 records mandatory REUSE / OWN / BUILD FROM SCRATCH and proportional process. #282 records
  advanced Delta direction only; each future slice still requires owner approval.
- **Branches / verification:** #286 `codex/reuse-first-002` merges fresh master `a17a2fd`;
  #282 `claude/delta-advanced` incorporates that same reconciled base. Conflicting checkpoint
  and register entries retain both owner direction and Delta history. Final exact-head reviews
  and unchanged required CI are recorded in each PR before the owner-approved merges.
- **Mainline / next:** use Whole Picture and TODAY’s explanation on shift; Gavin decides whether
  to authorize sleep-aware Engine work. Parallel feature epics remain parked; no SUIT-ALIVE,
  visual epic, boxed AI, ranked help, new recommendation priority or pushback schema authorized.
- **REUSE:** existing register, checkpoint, Intelligence Spine and Delta direction briefs.
- **OWN:** documentation reconciliation and mapping to existing owner authority.
- **BUILD FROM SCRATCH:** none.

---
Historical checkpoint (superseded status; retained for evidence):

# REUSE-FIRST-002 — owner build direction, 2026-10-23

- **Authority / Builder / lane:** Gavin’s explicit owner direction; Codex; PROTECTED docs-only.
- **Branch / baseline:** `codex/reuse-first-002`, fresh master `fcc0d0d`; [brief](REUSE-FIRST-002.md).
- **Direction:** reuse existing work/proven patterns by default; every new brief and PR description
  states REUSE / OWN / BUILD FROM SCRATCH (one-sentence justification or none). Existing builder
  gate, risk lanes and review retained; Routine stays thin; Careful presentation uses short
  brief/tests; Protected safeguards remain. [Locked decision](../UX_DECISIONS.md#reuse-first-002--owner-build-direction-locked-2026-10-23).
- **Mainline:** Whole Picture #283, reuse-first #285 and TODAY-only DELTA slice #284 merged. Park parallel feature epics unless Gavin names them. SUIT-ALIVE/visual epics,
  boxed AI, ranked “what would help most,” new recommendation priority and new pushback schema
  are not authorized. #282 is direction documentation, not implementation permission.
- **PR / verification:** [#286](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/286).
  Local Markdown targets, diff check and architecture pass (298 files); classifier confirms
  PROTECTED. Docs-only; unchanged required CI runs full verification. Final exact-head review
  and CI evidence are recorded in #286 before readiness; Gavin approves merge.
- **Merge authority / next:** Gavin explicitly requested merging #286 and #282 on 2026-10-23.
  Fresh master through #284 merged into this branch; renew independent exact-head review and
  green required CI, then perform the approved merges without bypass. No new product work.


---
Historical checkpoint (superseded status; retained for evidence):

# DELTA-002 slice 1 — "Why this?" in plain words

- **Objective / authority:** [DELTA-002](DELTA-002.md) slice 1; Gavin: "yes start step 1"
  (2026-10-23). Builder: Claude Code, branch `claude/delta-002-slice1`, from `628ea3c` (#283).
- **Built:** `explainRecommendation` (recommendationCopy.ts) reads the DecisionTrace into plain
  sentences that lead the "How BEYOND decided" panel; always states the Engine doesn't use sleep,
  weight or training. Display only.
- **Verified:** full verify 2,912 passed / one skip (ModePinExpiry 320px clock-edge flake, passes
  alone and on master). Review @ e60e35b requested one fix (the RED + post-shift sentence said
  shift-down could wait while STABILIZE hands off to SHIFT DOWN); fixed with the cheap notes.
- **Next:** CI, exact-head re-review, Gavin's merge. Then Gavin's call: should the Engine
  consider sleep (Protected)?

---
Previous checkpoint (REUSE-FIRST-001, #285 merged):

# REUSE-FIRST-001 — reuse before invention

- **Authority / lane / Builder:** Gavin’s “Make it so,” 2026-10-23; PROTECTED; Codex.
- **Branch / baseline:** `codex/reuse-first-001`, fresh master `628ea3c`; [brief](REUSE-FIRST-001.md).
- **Scope:** existing leverage gate strengthened; concise reuse evidence in brief/PR and reviewer
  check; capability map now points to the existing Intelligence Spine. No runtime changes.
- **PR / verified:** [#285](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/285).
  Local Markdown links and new implementation pointers resolve; diff check and architecture
  pass (298 files); risk classifier confirms PROTECTED. Docs-only: no redundant local runtime
  tests; required CI is unchanged. Independent final-head review and CI results are recorded
  in #285 before readiness; Gavin approves merge.
- **Other work:** WHOLE-PICTURE-001 #283 merged; its final local gate, independent review and CI
  passed. Claude owns DELTA slice 1 (#284); #282 is separate advanced-direction documentation.
- **Next:** verify, open PR, independent review and green CI; no merge without Gavin’s approval.

---
Historical checkpoint (superseded status; retained for evidence):

# WHOLE-PICTURE-001 — connected Review production integration

- **Authority / Builder / lane:** Gavin approved the full interactive concept on 2026-10-23;
  Codex; PROTECTED. [Brief](WHOLE-PICTURE-001.md).
- **Branch / start:** `codex/whole-picture-001`, fresh master
  `ba381c77066a426c6ea52e10dfa30603c5210c3a`; no overlapping open feature PR at start.
- **Scope:** production connected evidence, comparisons, real intent/journal stories, canonical
  weekly focus, tentative real-schedule planning, source inspection and review export/print.
  Full approved concept retained; no fake data, new runtime dependency, schema or Engine rule.
- **Status / PR:** implementation pushed; draft [#283](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/283).
  Fresh master `5e0811c` through #281 merged. No `src/engine/**` diff; new pure projections
  live in application as Gavin directed.
- **Verification:** `npm run verify` PASS (2026-10-23): architecture 298 files,
  295 test files; **2,910 passed / 1 existing skip**, then TypeScript + production/PWA build.
  Risk classifier reports PROTECTED; `git diff --check` passes. No assertions, timeouts or
  suite configuration weakened. The build retains Vite’s advisory about a bundle over 500 kB.
  Built-PWA acceptance passes at 320/390/1440 pixels: source links/History return, no
  exploration writes, retained draft, canonical offline save and offline cold reload.
  [Screenshots/results/reproduction](../screenshots/whole-picture-001/README.md).
- **Review / CI:** independent review at `8c00266` found no substantive issues. Renew on this
  final documentation head and persist exact SHA / PASS or BLOCK in PR #283. Initial CI’s
  legacy-disclosure navigation failure was corrected; its assertions now pass in the full
  local gate. Required CI must be green on the final PR head; live result is in #283.
- **Next:** renew independent exact-head review, obtain green required CI on this final head,
  then Gavin’s merge approval. No merge or deployment authorized. DEPS-001 #280 and DELTA-002 #281 are now on master.
  Read DELTA-002 and the DELTA-ADVANCED brief at #282 (`c1a3c1e`); Delta implementation waits
  for this objective. Every claim must reach its records; show denominators, never causes/scores.

---
Previous checkpoint:

# DELTA-002 — direction locked (docs only)

- **Objective / authority:** Gavin locked the DELTA-002 direction on 2026-10-23 ("Lock it in for
  right now"). Builder: Claude Code, branch `claude/delta-002`. Docs only: [brief](DELTA-002.md) and
  a Decision Register entry. No implementation authorized.
- **Also in flight:** WHOLE-PICTURE-001 (Codex), unpushed in Codex's container; it goes first.
- **Next:** PR, Gavin's merge. Then Codex pushes WHOLE-PICTURE-001 for continuation.

---
Previous checkpoint:

# DEPS-001 — dev/build dependency security patches

- **Authority / lane / Builder:** Gavin approved DEPS-001 on 2026-10-23 in the task; ROUTINE;
  Codex. Disposition: USE DEPENDENCY (upstream security patches).
- **Branch / start:** `codex/deps-001`, from freshly fetched master
  `ba381c77066a426c6ea52e10dfa30603c5210c3a` (#279). No worktree or Factory activation.
- **Scope:** Vite 8.3.0 → 8.3.5; Vitest, browser, browser-playwright and mocker
  4.1.11 → 4.1.12; source-map-js 1.2.1 → 1.2.2; serialize-javascript 7.1.1 → 7.1.3.
  Declare vitest-browser-react ^2.3.0 (already locked at 2.3.0). npm regenerated the lockfile
  using installs and non-forced audit fix; no overrides or hand-edited lockfile.
- **Boundaries:** runtime dependency declarations and the entire runtime lock graph are unchanged.
  No application/Engine/persistence/protected-fixture, Kotlin, Gradle or test changes.
  Playwright remains 1.63.0; existing CI's installed Playwright CLI still installs its matched
  Chromium, so no workflow adjustment is needed.
- **Verified:** clean `npm ci`, `npm audit` (0 vulnerabilities), production-only audit (0),
  compatible `npm ls` peer tree, production build (`tsc -b && vite build`) and `git diff --check`.
  Independent review of `3f5ff89d67cc091c892db8836d2480a1305c24a5` found no code-diff issues
  (code PASS), but overall BLOCK on verification/delivery gates. Renew at the final PR head.
- **Full gate:** first run: 2,894 passed / 4 failed / 1 existing skip; two-worker run: 2,895
  passed / 3 different timeouts / 1 skip. First-run failures passed afterward, and all second-run
  failures passed in a focused check. A separate focused meal-entry timeout also passed alone.
  The one-worker complete gate finished with 2,895 passed / 3 timeouts / 1 existing skip:
  three RedesignSheets undo/duplicate-food cases. All three passed in isolation afterward
  (3 selected; 14 unselected). All failures are retained; no assertions/timeouts/tests changed.
  The complete local gate is NOT green; focused passes do not replace it. Production build
  passed independently after the full gate stopped before build. Matched Chromium uses
  `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright`. No further full retries are
  justified without new evidence or an environment change; required CI still must run.
- **PR / alerts / CI:** [#280](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/280),
  draft, against master; branch pushed. GitHub API network access recovered after reattachment.
  The authenticated alerts endpoint still returns HTTP 403, `Resource not accessible by
  integration`, requiring `vulnerability_alerts=read` (Dependabot alerts read permission).
  GitHub's ten alerts (2 high / 6 moderate / 2 low) match the ten distinct npm advisory IDs
  and severity totals, but this does not establish the private alert list or Android status.
  Any confirmed Gradle alerts belong in the PR report, not Kotlin/Gradle changes here.
- **Next:** renew independent review at this checkpoint's final PR head, monitor required CI,
  resolve/verify the intermittent gate failures and require green exact-head CI. Obtain the
  integration's Dependabot-alert read permission to finish authenticated alert reconciliation.
  Local audit/build success does not establish green full verification or a completed objective.
  Wait for Gavin's explicit merge approval; no merge authorized.

---
Previous checkpoint:

# FRICTION-001 — slice 5: owner-approved sleep freshness and PARTIAL note

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin approved both on 2026-10-22
  ("yes to both"). Builder: Claude Code, branch `claude/friction-5`; slice 4 (#278) merged and is merged in.
- **Built:** the 36 h last-main-sleep window counts from the sleep's `occurredAt` (Garmin wake time);
  SYSTEMS shows "Garmin · woke HH:MM"; the PARTIAL rotation note shows only after a set is logged
  and before completion. No schema, Engine or recommendation change.
- **Verified:** `npm run verify` green: architecture OK, 2,898 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge. This is the last planned FRICTION-001
  slice.

---
Previous checkpoint:

# FRICTION-001 — slice 4: review screens say it plainly

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin: "We have work to do".
  Builder: Claude Code, branch `claude/friction-4`; slice 3 (#277) merged and is merged in.
- **Built:** Plan today names the day instead of an ISO date; Review drops the 16:30 boundary
  wording; Import describes activity files (with calories). Copy only.
- **Verified:** `npm run verify` green: architecture OK, 2,894 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge.

---
Previous checkpoint:

# FRICTION-001 — slice 3: COMMAND in plain words

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin: "We have work to do".
  Builder: Claude Code, branch `claude/friction-3`; slice 2 (#276) merged and is merged in.
- **Built:** COMMAND descriptions rewritten in plain words (no "existing …", no "COMMAND ·" self-tag;
  IMPORT HEALTH DATA no longer says sleep only); workout-complete sentence-case test. Copy only.
- **Verified:** `npm run verify` green: architecture OK, 2,892 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge.

---
Previous checkpoint:

# FRICTION-001 — slice 2: weight in one place, honest last-night sleep

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); #275 (slice 1) merged as 7f11f20;
  Gavin: "We have work to do" (continue). Builder: Claude Code, branch `claude/friction-2`.
- **Built:** BODY home's WEIGHT card is the one weight surface, with LOG WEIGHT opening the existing
  bodyweight sheet; the readout grid drops LAST WEIGHT there. A day-before sleep reads "Garmin ·
  last main sleep" and opens all sleep history. Display/navigation only.
- **Verified:** `npm run verify` green: architecture OK, 2,891 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge.

---
Previous checkpoint:

# FRICTION-001 — slice 1: the 2:30 AM operator pass

- **Objective / authority:** [FRICTION-001](FRICTION-001.md); Gavin said "start the friction pass
  after it merges" (#274 merged as 42d6c2b). Builder: Claude Code, branch `claude/friction-1`.
- **Built:** BODY's sleep reading agrees with TODAY (last main sleep instead of "Not logged");
  shorter no-target protein line; TRAIN workout titles in sentence case; WeightTrend reuses
  `formatShortDate`. Display/copy only.
- **Verified:** `npm run verify` green: architecture OK, 2,889 passed / one skip, build OK.
- **Next:** PR, green CI, independent review, Gavin's merge. Candidate fixes and ARCH-001 notes
  are in the brief.

---
Previous checkpoint:

# UX-COHESION-001 — slice 3: one way back, quieter BODY, bounded history

- **Objective / authority:** [UX-COHESION-001](UX-COHESION-001.md), approved 2026-10-22; Gavin said
  yes to starting slice 3 after #273. Builder: Claude Code, branch `claude/ux-cohesion-3`, targets
  master (#273 merged as 91e6520 and is merged in).
- **Built:** one back/close grammar (CLOSE for sheets, BACK TO <place> for sub-screens; RETURN TO and
  arrows gone; OPEN WORKOUT for the blocked END DAY); BODY drops the day-start time and the standing
  NAPS "Not logged", and the weight card uses short dates; HISTORY pages 14 days and TRAIN history
  10 sessions with SHOW MORE, keeping a searched day reachable. Labels and copy only, plus paging;
  no data, schema, Engine or capability change. Also folds in #273's non-blocking review notes:
  BODY's busy guard no longer strands a hidden past day, one health-days layout, "Health days"
  region label, plainer GARMIN wording, and a test that choosing GARMIN clears a selected day.
- **Verified:** `npm run verify` green after the master merge: 2,886 passed / one skip, build OK.
  New `BoundedLists.test.tsx`; known full-load TODAY check-in timing flake noted, untouched here.
- **Next:** PR against master, green CI, independent exact-head review, Gavin's merge.

---
Previous checkpoint:

# UX-COHESION-001 — one health-history destination (slice 2)

- **Objective / authority:** [UX-COHESION-001](UX-COHESION-001.md), approved 2026-10-22; slice 1
  merged as #272 (`40147c3`). Codex began this slice locally (not pushed); Gavin asked Claude Code
  to continue it. Builder: Claude Code, branch `claude/health-history` from `40147c3`.
- **Built:** BODY → HISTORY keeps today's records plus one closed **Health history** with DAYS
  (existing day browser, controls shown directly) and GARMIN (measured days + imported sleep). The
  separate "Browse health days" and "Garmin history" are gone from both BODY paths. Garmin measured
  days page ten at a time (previously capped at the newest 7, so older days were unreachable);
  imported sleep already paged by ten. Closing history returns to today. No data, schema, Engine,
  import or capability change; COMMAND already shows import only (slice 1).
- **Verified:** `npm run verify` — architecture OK, 290 files / 2,882 passed / one skip, build OK.
  New `tests/browser/HealthHistory.test.tsx` (320/390 px, a month of Garmin days paged 10→20→30,
  axe, closing returns to today); updated BODY/import/connected-health tests.
- **Next:** PR, green CI, independent exact-head review, Gavin's merge. Remaining UX-COHESION
  slices (quieter BODY/TODAY, back/close grammar) stay separate.

---
Previous checkpoint:

# UX-COHESION-001 — quiet by default

- **Objective / authority:** Gavin approved the expanded mobile UX audit and its preferred
  `Quiet by Default` plan on 2026-10-22. Protected primary-information presentation work. Brief:
  [UX-COHESION-001.md](UX-COHESION-001.md).
- **Builder / baseline:** Codex on `codex/ux-cohesion-001`, starting from freshly fetched master
  `f1aeecf9e194b683bf2b03fa003730f01c2b6349` after GARMIN-005 merged.
- **Current bounded slice:** sleep truth/provenance and calm Garmin import/history. TODAY uses a
  measured Garmin sleep value when no operator-confirmed sleep exists and labels the source;
  operator-entered sleep still wins. Import previews lead with count/date range and lazily render
  individual sessions only on request. The importer no longer appends stored history. BODY keeps
  the combined compact Garmin archive behind one deliberate `Garmin history` disclosure. No data,
  import safety, schema, Engine, guidance, four-tab navigation or capability was removed.
- **Verified so far:** typecheck; focused browser coverage 61/61 across import, Garmin, connected
  health, BODY navigation, phone fit and accessibility at mobile widths. Large-preview regression
  proves 68 sessions create no record cards until review is requested. Full verification passed
  architecture and 2,878 tests / one skip, with one unrelated full-load TODAY check-in timing
  failure; that exact test then passed in isolation and the production build passed. Required CI is
  the clean full-gate authority.
- **Next:** full verification, production acceptance/screenshots, PR, independent exact-head
  review and green CI. Gavin alone decides merge. Later approved UX-COHESION slices remain separate
  so this trust/clutter correction stays reviewable.

---
Previous checkpoint:

# GARMIN-005 — eaten vs burned

- **Objective / authority:** Gavin approved [GARMIN-005](GARMIN-005.md) on 2026-10-22 ("Approved.
  Make it amazing"). PROTECTED: new Health Connect read permissions and new TODAY numbers. Builder
  Claude Code handed the objective to Codex to finish.
- **Branch:** `claude/garmin-005`, [PR #271](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/271)
  against master. GARMIN-004 PR #269 merged with owner approval as `35c9f17` after its exact-head
  CI passed; this branch includes that master integration.
- **Built:** helper 0.6.0 exports hourly total/active calories in compatible activity format 2;
  BEYOND accepts formats 1 and 2 without old imports erasing calories. TODAY shows a conditional
  CALORIES tile, eaten-vs-burned sheet, Garmin freshness/stale notice, 7D/4W/1Y comparisons and
  Weekly's measured Garmin average. No Engine, target, advice, net/remaining or schema change.
- **Finished in handoff:** corrected the 4W expectation to 27 completed measured days; 5/5 focused
  browser tests pass at 320/390 px; refreshed four screenshots; added the brief/wording table and
  UX_DECISIONS ruling. Independent review then found that a newer export with calorie access denied
  could erase stored values or make them look fresh, and active-only data could expose an unusable
  tile. Codex fixed the import to preserve each calorie field with its actual source-export time;
  the tile and its freshness now require total calories. Focused import tests pass 14/14 and focused
  browser tests pass 5/5. The renewed full gate passed architecture and 2,870 tests / one skip, then
  failed six legacy `classifyRisk` subprocess cases at their 5-second limit plus one unrelated
  mode-pin browser timing assertion; earlier attempts likewise timed out only under full-suite load,
  while the affected risk group passed 18/18 in isolation. The production build passes. Required PR
  CI is the clean full gate.
- **Limits:** no Android SDK here, so helper compilation/permission packaging awaits CI. Physical
  phone permission/export, Safari and screen readers remain unverified.
- **Next:** run the renewed full gate and exact-head CI, then renew independent exact-head review.
  Gavin alone decides merge.

---
Previous checkpoint:

# GARMIN-004 — Garmin numbers you can see

- **Objective:** [GARMIN-004](GARMIN-004.md), approved 2026-10-22. Builder: Claude Code. Branch
  `claude/garmin-004`, PR #269 against master after FIELD-AUTHORITY-001 (#268) merged as `e2661cc`.
- **Built:** STEPS and RESTING HR tiles with your usual; detail sheets for steps, resting heart rate
  and sleep (hypnogram, stages, 7D/4W/1Y, table view). Display only.
- **Owner:** Gavin approved merging #269 and #270 on 2026-10-22, wording included.
- **Next:** GARMIN-005 (calories burned, eaten vs burned; new permission, needs a yes).

---
Previous checkpoint:

# FIELD-AUTHORITY-001 — one next thing, one red

- **Objective:** Gavin's PROTECTED brief [FIELD-AUTHORITY-001](FIELD-AUTHORITY-001.md), approved
  2026-10-22. Builder: Claude Code. Branch `ccr-18eb6d33-pxewfy` from master `b3879ac`; PR to follow.
- **Before it:** REDESIGN-001 merged as #261 (`b3879ac`). Independent review PASS at `8211f96`, CI green.
- **Built:** TODAY state machine (real next thing leads, otherwise logging leads with a calm line);
  at most one red, none when calm; check-in said once; no STATUS echo of NOT CHECKED IN; number
  tiles without coaching; compact mode band when the schedule is silent; TRAIN gate as one line
  with neutral QUICK CHECK-IN; COMMAND as search plus eight job rows. Rulings in UX_DECISIONS.
- **Unchanged:** Engine, recommendation selection, schema, events, backup, Garmin semantics, sheets
  and their 2-tap paths, the four tabs and every COMMAND destination.
- **Verified:** full suite 286 files / 2,854 passed / one existing skip; architecture OK; build
  OK; REDESIGN production acceptance passes at 320/360/390/412 with offline reload. 360px FIELD
  evidence in `docs/screenshots/field-authority-001/`.
- **Risks:** the COMMAND browse is new muscle memory; physical phones, Safari and screen readers
  remain unverified.
- **Next:** green CI, independent exact-head review, Gavin's merge decision. SUIT-ALIVE is not started.

---
Previous checkpoint:

# REDESIGN-001 — merged as #261

- **Builder / objective:** owner-approved PROTECTED [REDESIGN-001](REDESIGN-001.md).
  Branch `codex/redesign-001`; [PR #261](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/261).
  Codex built items 1–8. On 2026-10-22 Gavin asked Claude Code to finish it; Claude Code
  completed the final gate with a single test-only fix.
- **Baseline:** started at master `9f0f2c23efadb7925051172e5eeac48f5882f70f`; integrates master
  `cb4f0df7f1c35843f7aa8d5dc53b42050fd4969e` with its Garmin import/share-target/source behavior.
- **Done:** frozen attachments committed unchanged; items 1–8 implemented, with the locked
  rulings recorded in UX_DECISIONS.
- **Approved exception:** Gavin's “Yes, I approve” on 2026-10-22 authorizes the bounded canonical
  meal/provenance extension for one-off meals and fractional servings. [Ruling](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/261#issuecomment-6330409263).
  No schema, backup format, migration, Engine rule, dependency or protected-fixture change.
- **Final fix:** CI at `4d26418` had one failure (2,851 passed). The LAST TIME `recordedAt` test
  read `getPerformedSets(...)[0]`, which comes back in random id order, instead of set 1. The
  test now selects set 1. CI at `74b44c1` then hit two meal-test races (route checked before the
  sheet rendered; axe mid entry animation; a read failure injected before the sheet's own
  saved-meal read finished). Each now waits for its precondition. Test-only.
- **Verified:** `npm run verify` passes locally: architecture OK, 286 files / 2,852 passed /
  one existing skip, build OK. Built production acceptance (`scripts/verify-redesign-001.mjs`)
  passes at 320/360/390/412 px with offline cold reload; screenshots and
  `final-acceptance.json` refreshed in `docs/screenshots/redesign-001/`.
- **Next:** green required CI on the final head, then an independent exact-head review by a
  reviewer that did not build this PR. Gavin alone decides merge.
- **Preservation / limits:** unrelated daily-operations work remains in stash
  `e1396c8e7ab549dec117e0f631a0c7e1144af309` (Codex's machine); do not apply it here. Synthetic
  test data only. Physical phones, Safari and screen-reader/device-keyboard testing remain
  unverified; the existing bundle-size warning remains.

---
Previous checkpoint (historical; Garmin is not this objective):
# GARMIN-003 — Garmin fills in your record

The owner approved this on 2026-10-22: brief [GARMIN-003.md](GARMIN-003.md), rulings in
UX_DECISIONS → GARMIN-003. GARMIN-002 is complete (#262, #263, #264), with SEND TO BEYOND
verified on the phone.

Current: PR 1 (history) on `ccr-83cf6ed8-ug1ym9` from master:
- the helper's READ FULL HISTORY with "Access past data" (0.5.0);
- both file formats and SEND TO BEYOND accept up to 366 days / 8 MiB.

PR 1 is #265. PR 2 (Garmin sleep becomes a sleep entry, approach A, plus baselines) is stacked on it. Display
changes and advice wording wait for #261 (REDESIGN-001, Codex). Each PR needs an independent
review and the owner's merge.

---
Previous checkpoint:

# GARMIN-002 — Garmin steps and heart rate in BEYOND

Owner-approved PROTECTED objective; brief [GARMIN-002.md](GARMIN-002.md). Builder: Claude Code.
#262 merged at 0f288f9 after two independent exact-head PASS reviews. The owner verified it on
the phone: helper 0.3.0 installs, reads 73 hours of steps/heart rate plus sleep, and BEYOND
(schema 15) imports both files and shows them under BODY → MEASURED · GARMIN.

Follow-up A (#263) merged at 614ed17: lived-day cards are capped at 24 hours, stretches with no
BEYOND day show separately, sleep times are readable, and heart rate never shows "?".

Current: follow-up B, **SEND TO BEYOND**, on branch `ccr-83cf6ed8-ug1ym9` from 614ed17:
- The helper shares its files to the installed BEYOND app through Android's share sheet (0.4.0).
- BEYOND is a Web Share Target; a small handler loaded into the service worker parks the files.
- COMMAND → IMPORT HEALTH DATA previews both; nothing imports until each is confirmed.

Phone check after merge: if BEYOND doesn't appear in the share sheet, re-add it to the home
screen. #261 (REDESIGN-001, Codex) is still open. Every PR needs owner merge approval.

---
Previous checkpoint:

# GARMIN-001 — physical-phone installation diagnosis

#258 merged at 8581af586facf1b08a29347c28787b5e4810db3a after owner approval.
Reviewed source 3d73cdeb; 2741 tests pass/1 skipped; app/Android build and packaged permission
checks passed. The delivered APK is verified against its original CI checksum/signature.

The owner cannot install it on Android 16 / Nothing OS 4.1: only a generic not-installed
toast. Chrome and Files by Google already have installation permission. Cause unconfirmed.
Do not repeat the same install instructions or claim the physical phone is validated.

Builder Codex; branch codex/garmin-001-install-diagnosis from 8581af586facf1b08a29347c28787b5e4810db3a. The branch's draft PR
adds a time-bounded Android 16 emulator probe of the exact original APK. No app/data/
permission changes. [Current bounded brief](GARMIN-001.md), phone follow-up section.
Verified (run 39274986894): the original APK installs and opens on a clean Android 16 emulator, so the
file is sound and the rejection is phone-side; signature conflict with an earlier helper build is
the leading hypothesis. Next: owner runs the uninstall/extract/adb steps in GARMIN-001.md
("Probe result"); correct only what that demonstrates. ADB success cannot validate
Nothing's user-facing installer/security policy. #257 remains open; every new PR still needs
owner merge approval. #254 remains separate.

---
Previous checkpoint:

# GARMIN-001 — local sleep import, PR #258

Owner authorized the sleep-only implementation in [#257](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/257).
Builder: Codex. Protected. Starting master: a6d315dd83f7f540782a540d37a32c9a5224a1f2.
Branch: `codex/garmin-001-sleep-import`. [PR #258](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/258)
is the active review/delivery record. [Bounded brief](GARMIN-001.md).

Built: foreground READ_SLEEP-only Android helper, local file transfer, COMMAND preview and
explicit confirmation, BODY source evidence. Additive v14 stores latest pointers, immutable
source revisions and atomic receipts. Source timestamps retain nanosecond revision order.
Optional explicit existing-day association; no automatic day assignment, canonical events,
manual log changes or Engine input. Native backup roundtrip; old native/legacy replacements
clear external evidence; failed replacements roll back. No other health categories/sync.

Verification: parser/source/limit/stage tests; import duplicate/concurrent/revision/rollback
and canonical primary/supplemental preservation; old database upgrade; native and legacy
restore tests; browser preview/cancel/confirm/focus/retained navigation/axe/320–412 px.
The isolated Android workflow runs unit tests, lint, APK build, packaged permission checks,
and emits source SHA/checksum/signing identity. Existing required PR Verification is unchanged.
Check [the PR's live checks and final review](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/258)
for execution results and exact current head; this checkpoint is committed before final CI.

Independent source review at 0e915fac found no blocking findings after fixing the source
version precision issue. The final Android compile correction uses AndroidX's heading API;
final exact-head review and green app/Android checks remain the delivery gate. The local
managed proxy is unreachable and dependencies are absent: GitHub CI supplies execution
proof. Never infer a pass from a cancelled or superseded run.

APK and phone steps: [android/health-bridge/README.md](../../android/health-bridge/README.md).
The phone-test artifact is attached to the passing Health Bridge run for the exact reviewed
PR head. It is debug-signed; later builds may require uninstalling the helper only before
installing again. No production signing keys are stored in Git. Real phone, Health Connect
permission/save behavior, Safari and a screen reader remain unclaimed until tested.

Next: resolve any final CI/review findings, deliver the verified artifact, obtain this PR's
owner merge approval, then run the brief phone smoke test. Implementation authorization is
not merge approval. #254 remains separate; TONIGHT #255/#256 are already merged.

---
Previous checkpoint (retained):

# Current checkpoint

## Current preparation — workflow command and Garmin discovery

Owner instruction, 2026-10-19: "Lets get to a good point to start work". Codex is preparing
the existing approved workflow PR #254 and the next discovery brief.

**Released:** master a6d315dd83f7f540782a540d37a32c9a5224a1f2.
- #255 merged at ea03c7266157f60c3bcc13f80063323a0df9259b: idle rollover plus deadline retry.
- #256 merged at a6d315dd83f7f540782a540d37a32c9a5224a1f2: the TODAY shift loop and headline fixes.
- Both have independent exact-head PASS. Final required CI [39250635029](https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/39250635029):
  272 files, 2,700 passed, 1 skipped; architecture, TypeScript and production build pass.
- Physical-device, Safari and screen-reader checks remain unclaimed.

**Current PR:** [#254](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/254),
codex/advance-beyond-command. Original owner-approved PROTECTED workflow objective, Builder Codex.
One shared DEV-FLOW-002 protocol, thin Claude/Codex skills, AGENTS/roadmap routing and governance
classification for .agents/. No application, dependency, CI or protection change.
Reconciled with released TONIGHT master, preserving both histories. The prior reviewed head
78650e7 is historical; the current head needs fresh independent review and green required CI.
Then it awaits owner merge approval. This preparation instruction does not authorize that merge.

**Next discovery:** [GARMIN-001 proposal, #257](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/257).
Prepared for review; integration implementation is not approved. First collect phone model/OS,
Garmin watch model, and actual Garmin Connect permissions/recent records in Health Connect.
Verify current official support and the deployed PWA's access constraints, then recommend one
route and present a bounded implementation brief. No native wrapper/backend/provider/schema
or Engine integration has started.

**Environment:** connected GitHub tools work. The local workspace has partial review-fix files,
no complete checkout or app dependencies, and its configured proxy was unreachable. Do not
treat those partial files as a fresh checkout or claim local full verification.

The sections below preserve the previous checkpoint. This summary and live PR evidence
supersede their pending-review/merge wording.

## Previous objective — TONIGHT-001 (merged 2026-10-19)

Gavin approved TONIGHT after the product discovery proposal. Brief: [TONIGHT-001.md](TONIGHT-001.md);
rulings in UX_DECISIONS → TONIGHT-001. Builder: Claude Code. Branch `ccr-83cf6ed8-ug1ym9`; [PR #255](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/255).
Starting master: `d042a1f7c54a8e50dcf045a76f62a4a819d00504` (the #253 merge; no open PRs).
POLISH-001 and POLISH-002 are merged (#251, #252, #253). The POLISH-001 handoff below is history.

**PR 1 — no frozen days (this branch).** A due 16:30 rollover no longer waits on a workout with
nothing recorded for 2 hours. The workout stays ACTIVE and resumable on its own day, and TODAY
labels it "WORKOUT STILL OPEN · started Thu 06:52". A workout in use, explicit END DAY and the
new-day-start fallback keep the CONTINUITY-001 guard. No schema, event type/payload, dependency or
recommendation change. Files: `engine/dayRollover.ts` (pure `workoutHoldsRollover`),
`application/commands.ts` (rollover reads the workout's sets in its transaction),
`ui/screens/today/ActiveWorkoutCard.tsx`, the TODAY stale note copy.

**Verification:** full suite 270 files: 2,683 passed and 1 existing skip. The two failures it found
were tests whose setup needed a workout to defer the rollover: `modePinExpiry` and
`ConnectedHealth`'s read-only browsing test. Their workouts sat idle for hours, so I made them
recently active and kept the assertions unchanged. The browser `ModePinExpiry` test has the
same premise and failed under full-suite load (a rollover timing race); its workout is now in use
at 16:30 too. Both pass. Architecture (269 files),
TypeScript and the production build pass. The three new idle-release integration tests fail on
the old code and pass with the fix. `check:risk` confirms the change is PROTECTED.

**Remaining risks:** physical-device, Safari and screen-reader checks are unclaimed. A workout
that started before a rollover still records its completion on its original day. That's
intended: day-scoped readers of workout events count that completion on the old day.

**PR 2 — the shift loop on TODAY** (branch `claude/tonight-001-pr2`, stacked on #255; Gavin
approved starting it on 2026-10-19).
- **Morning call:** RECOVER asks one question: train / short / sleep first. On a day off the wake
  card asks start / later / not today. Answers go through the existing PLANNED_WORK_SET, and TRAIN
  opens with the chosen variant.
- **QUICK LOG and the MEAL sheet:** recent saved meals and the last water amount, each one tap
  through the canonical commands with UNDO. MEAL opens a searchable sheet on TODAY.
- **Night closed, briefing, headline, protein:** the night's totals; the briefing's "Tonight so
  far"; the honest all-clear headline; ADD WEIGHT instead of NO TARGET.
- **Week Ahead:** off days plus the morning after a block's last shift.
- **Declutter:** online food lookup, Minimum Day and Small Steps reached through COMMAND.
- **Rulings:** all recorded in UX_DECISIONS → TONIGHT-001.
- **Unchanged:** no schema, event type, Engine rule or dependency change.

New: `application/tonightQueries.ts` (read-only) and `today/WorkoutCall.tsx`, `QuickLog.tsx`,
`NightClosed.tsx`. TRAIN gains the `WORKOUT_STANDARD` / `WORKOUT_REDUCED` destinations.
**Tests changed:** about 20 existing browser files encoded the old TODAY layout. They're updated
to the approved behavior and keep their guarantees (single guidance, focus return, drafts, row
cap, no stray writes). A shared `helpers/mealSheet.ts` opens BODY through the MEAL sheet.
**Acceptance:** [`screenshots/tonight-001`](../screenshots/tonight-001/README.md),
`scripts/verify-tonight-001.mjs`; 320/360/390/412 px with no overflow, axe violations or page
errors. The capture found focus dropping to the page after a QUICK LOG tap; it's fixed and
covered by a test.

**Review fixes (2026-10-19, Codex; owner: "Fix them"):** PR 2 is
[#256](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/256), stacked on #255.
Codex owns only the bounded follow-up repairs to Claude's implementation.
- #255 includes the existing labelled-section fixture repair and now schedules the held day's
  next check at the workout's idle deadline. The existing transaction revalidates any later
  activity; a new logged/skipped set postpones release. Added integration and mounted-App
  regressions. This branch incorporates #255's fix commit `20c0427442bc3c00a709a73f6eea2cf4c85f92f3`.
- #256 now shares day-keyed reactive question state between TODAY's headline and WorkoutCall.
  CHANGE reopens both together; LATER updates both immediately. Editing/deferment does not
  rewrite the canonical plan. Added after-shift change/re-answer and day-off change/LATER
  regressions, retaining the existing no-write assertions.
- #255 head `20c0427442bc3c00a709a73f6eea2cf4c85f92f3` has green required CI:
  2,690 passed, 1 skipped; architecture, TypeScript and production build pass. #256 now targets
  master so required CI can verify the combined tree before integration.
- Local dependency/browser runs remain unavailable (configured proxy unreachable, no supplied
  checkout). Node syntax checks and isolated checks of the actual scheduling query/shared
  state hook pass with in-memory dependencies; these are not browser/Dexie verification.
- Gavin authorized integration if ready: "Just merge it you think it\'s ready". A separate
  Reviewer is assigned to the exact repaired heads; the implementing session supplies no
  self-review PASS. Merge #255 first, then #256, only after independent review and green CI.
  #254 remains untouched. Physical phone, Safari and screen reader are unclaimed.
  After TONIGHT: Gavin's 5-minute Health Connect check, then a Garmin brief.

## Previous objective — POLISH-001 (2026-10-18, PROTECTED, merged)

Gavin approved the attached brief, committed unchanged as [POLISH-001.md](POLISH-001.md).
Builder: Codex. Branch `codex/polish-001`; [PR #251](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/251).
Fresh starting master: `82e923453e8634e89fccf7feee02edb6ad0eb161`; #250 was open (checkpoint only).
Master `b293472b0d7a839bc5b1d7c799592fcfefb9f2ea` (including #250) is now merged into this
branch; the checkpoint preserves its merged-session history below.
All 13 items implemented; the brief and each item were pushed separately. Rulings are in
UX_DECISIONS. Acceptance fixes preserve the water More-route focus and active-workout fold.
The skyline has its own band, real-clock sky/windows, and recommendation-gated beam.
TODAY has one persistent Engine card, numbers, action row, mode rows and Tools. Water logs
in place with canonical undo. SAVE & LOG retains the saved meal on log failure. Late RECOVER
asks about main sleep using the existing draft. Copy, return context and HH:MM are updated.

**Verification:** `npm run verify` passes: architecture, 269 test files / 2,676 tests passed,
one existing skip, TypeScript and production PWA build. Thirteen new browser cases cover
canonical log/undo double taps, water retry/repeat, SAVE & LOG failure recovery, late sleep
prompt/draft boundaries and no-write NOT YET, scene gating, order and fold. Existing navigation,
focus/drafts, browser Back, privacy, backup and protected-fixture regressions pass.
Built PWA passes 320/360/390/412: four modes, source/name separation, one action-red button,
390×844/360×800 fold, 23:40/11:00 sky, water/undo, offline save and cold reload. Synthetic
screenshots and reproduction: [polish-001/README.md](../screenshots/polish-001/README.md).
The inherited stealth test used the real clock; minute 42 falsely matched the hidden total.
Only Date is pinned in that test fixture; its privacy assertions and production stealth stay.
No Engine, phase derivation, schema, command/event semantics, backup or dependency changes.
Chromium automation only; physical-device/Safari/screen-reader checks are unclaimed. The
existing bundle-size advisory remains. The final PR Handoff binds published SHA and CI.

**Review follow-up (2026-10-19):** Claude blocked `57631dba553f6355d3bf581dcdb98558a2bb7bde`
on two test-only P2 timing races; no product defects were found. The sleep-prompt test now
awaits the pinned header mode, then polls for prompt absence. Water double-undo now awaits
the visible UNDO button before taking its DOM element and clicking twice. Assertions and
production behavior are unchanged. The focused POLISH browser suite passes all 13 cases.

**Next:** stop for Claude Code’s renewed independent exact-head review against POLISH-001, then
Gavin’s separate merge decision after green required CI. No merge or deployment by Builder.

The sections below are historical starting-checkpoint content. Read live PRs for status.

## Previous state — merged session work (2026-10-19)

Everything from the 2026-10-18 session is merged on Gavin's approval ("Merge all 6"), in this
order. Each Protected PR had an independent exact-head PASS from Codex and green required CI.
After each merge the next branch took master in; the only conflicts were append-only
(`REVIEW-001.md` delivery notes, one CSS block), resolved by keeping every section, then the full
gate ran on the combined tree before pushing.

| PR | What | Lane | Review |
|---|---|---|---|
| [#242](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/242) | SUIT-001: stealth, four glitch signals, SYSTEMS line and readout ([SUIT-001.md](SUIT-001.md)) | PROTECTED | Codex PASS at `9501e30` after one BLOCK round (stealth writes left BODY/SYSTEMS stale; a keyboard Enter after a real long-press was swallowed) |
| [#245](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/245) | REVIEW-001 monthly review (every 4th week from the first saved review; 28-lived-day body composition) | PROTECTED | Codex PASS at `569badf` after two BLOCK rounds (a hidden photo could show after a failed, then a pending, re-read) |
| [#246](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/246) | REVIEW-001 optional photo framing guide (in-app camera, last same-pose photo as a ghost) | PROTECTED | Codex PASS at `d88b85a` after two BLOCK rounds (capture didn't match the 3:4 preview crop; a just-hidden photo could be the ghost during a pending/failed read) |
| [#247](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/247) | REVIEW-001 Body questions in the Review hub (#9, #16, #20, #21) | PROTECTED | Codex PASS at `2181a48` |
| [#248](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/248) | REVIEW-001 weight answer: rate, usual swing, goal date, weigh-in timing | PROTECTED | Codex PASS at `ffd1584` |
| [#249](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/249) | BODY hold-to-DELETE on water, sleep and bodyweight entries (field report: three accidental 16 oz logs; correcting to 0 silently failed) | FEATURE | Owner merge; existing void commands, no event/schema change |

**Verification:** full local gate on all six combined: 268 files, 2,663 passed, one existing
skip; architecture, TypeScript and production build pass. Required CI green on every merged head.

**Remaining risks / unclaimed:** physical-device, Safari and screen-reader checks for all of the
above, including a real phone camera for the framing guide. `scripts/verify-suit.mjs`'s offline
step depends on the runtime reporting `navigator.onLine` false after an emulated offline reload;
some Chromium runtimes don't (Codex's network-blocked checks covered the same ground).
`ModePinExpiry` (#243's test) flaked once at 412 px under full-suite load.

**Next (historical, before POLISH-001):** Gavin picks the next objective. Suggested: a field pass on the phone through a real
shift using SYSTEMS, stealth, BODY delete and the review hub, then fix what it finds. The first
monthly review lands four weeks after the first saved weekly review.

## Previous objective — BODY-PROGRESS-001 (2026-10-18, merged in #244 at `118bd89`)

Gavin approved BODY Progress: clearer overview, dated measurements, and progress photos.
Builder: Codex; branch `codex/body-progress-001`; [PR #244](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/244).
Brief: [BODY-PROGRESS-001.md](BODY-PROGRESS-001.md). PROTECTED. Starting master `9f9100a`;
reconciled with owner-merged #243 at `85db25bbc9e6937007cffd88c34c74c3b197600c`.
Complete: recorded overview; retained Trends / Measurements / Photos; canonical dated saves,
measurement correction provenance, explicit photo capture/import/save, same-pose comparison,
metadata correction and confirmed hide/delete. Existing trends/source navigation stay.
Full verification exposed and repaired the inherited slow meal-read focus handoff; the existing
regression now reproduces its failing ordering deterministically. Saves and undo are unchanged.
Verified source head: `21932d9f23b7a4be3682aa2f0dfa4d20cc351dac`. Full gate: 255 files,
2,582 tests passed, one existing skip; architecture (247 files), TypeScript and production build
pass. Built PWA passes 320/360/412: keyboard/focus, retained measurement/photo drafts, canonical
writes/corrections, offline cold reload/reads/saves, 44 px controls, unclipped labels, zero axe
violations and page errors. [Reproduction/screenshots](../screenshots/body-progress-001/README.md).
No Engine, schema, command/event semantics, backup or dependency change. No SUIT/TODAY/global
style edit. PR #242 stays with Claude. Physical camera/iOS/Safari/virtual-keyboard/screen-reader
and large-library checks are unclaimed; the existing bundle-size advisory remains.
Next (historical): Claude's independent exact-head review passed at `14f3c1c` with green CI;
Gavin approved and it merged at `118bd89` (2026-10-18).

The #243 handoff below is historical: Gavin merged it at `85db25b`; its pending-review/merge
lines are superseded. This objective changes BODY only and includes that released fix as base.

## Previous objective — fix mode pin expiry at 16:30 (2026-10-18, merged in #243 at `85db25b`)

Gavin approved the bounded follow-up to the [reproduced PR #241 finding](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/241#issuecomment-6247508068).
Brief: the follow-up section in [COMMAND-CENTER-001.md](COMMAND-CENTER-001.md).
Builder: Codex; branch `codex/fix-mode-pin-expiry`; [PR #243](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/243). Starting master:
`9f9100ade1d54f4f4368759fb73afcb7f1201a20`. Conservative PROTECTED review lane.
Repair only: presentation pins reset at 16:30 even if the canonical day remains open for a
workout. Preserve all records, Engine authority, drafts, backup contracts and manual control.
Implemented: timestamped local UI pins with released phase-only compatibility; calendar-boundary
expiry independent of canonical rollover; live TODAY/direct-launch/visibility/pageshow refresh; mode tokens
published before paint; retained deadlines survive delayed renders. All forms, records and Engine authority remain.
Verification: 254 test files / 2,570 passed / one existing skip; architecture (244 files),
TypeScript and production build pass. Built PWA passes at 320/360/412: retained workout day,
Capture focus/draft and set draft, zero canonical expiry writes, direct offline expiry, offline
save and cold reload without duplicate records. Final CI and independent review bind the exact
published head in the follow-up PR. Physical-device/Safari/screen-reader testing is not claimed.
Next (historical): Gavin merged #243 at `85db25b`.
PR #242 (SUIT-001) and #204 remain separate and untouched by this Builder.

The previous #241 handoff below is historical: its final implementation head `259d139` received
independent PASS and green CI, then Gavin merged #241 at `9f9100a`. Its pending-merge lines no
longer describe live state.

## Previous objective — COMMAND-CENTER-001 (merged #241 at `9f9100a`)

Gavin authorized GPT Work to complete the existing objective on branch `ccr-8a82e4b3-4ub4x2`,
[PR #241](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/241). No merge authorized.
Brief: [COMMAND-CENTER-001.md](COMMAND-CENTER-001.md). Starting master remains `4fda717`.
Arrival head: `c717801` (slices 0–3 done, slice 4 WIP). Only other open PR is isolated lab #204.

**Implementation complete: slices 0–5.**
- Modes, placement-only day pins, optional separate work-day record, WATER / MEAL / LOG and
  searchable COMMAND were already implemented. Engine identity and canonical commands stay.
- Finished navigation: retained tabs/subviews, browser Back/Forward, open-sheet dismissal on
  Back, visible focus restoration, COMMAND query and settings-draft retention. TRAIN re-tap
  returns to its canonical session/root without discarding workout/set input.
- A manual pick now pins even when it currently agrees with the schedule; only Follow schedule
  clears it. Foreground Minimum Day hydration suppresses duplicate Advisory water shortcuts,
  while preserving the advisory evidence and existing log/undo commands.
- Identity: one-cut action surfaces, header reticles/ruler, original gray skyline and real-time
  windows/crimson sky, recommendation-gated searchlight, one mode-change sweep, mode tokens,
  live-mode boot and once-per-lived-day fuel-reading decrypt. Reduced motion keeps static
  scenery and skips animated feedback/decrypt; hidden TODAY spends no animation work.
  RECOVER quiets ruler/bars and slows motion without hiding factual sleep guidance.
- Display-only recommendation reason copy; WHY ends in user choice. No Engine text changed.

**Verification:** `npm run verify` passes: architecture, 252 test files, 2,556 passed / one
existing skip, TypeScript and production PWA build. Added coverage for same-as-schedule pin
continuity, retained settings input, mode identity/contrast at 320/360/412 and clock-driven city.
Built PWA acceptance passes at all three widths: modes, COMMAND/Weekly Review, browser Back and
Forward, both native sheets on Back, draft continuity (meal, sleep, workout set, Capture, Journal,
Plan Today), exactly-once writes, recurrence/release preservation, offline cold reload and writes.
Synthetic screenshots + acceptance JSON: `docs/screenshots/command-center-001/`.

**Review/CI:** independent exact-head verdict and required CI belong to PR #241 at its final
commit. Read the live PR before integration; no self-review or merge. Publication uses connected
GitHub tools because local Git has no push credential; published Git tree hashes are checked
against the staged local tree. No new branch/PR, dependency, schema, backup or Engine change.

**Limitations:** automated Chromium, not physical-device/Safari/screen-reader testing. The
existing production bundle-size advisory remains. Small phones may scroll; header effects add
no height. SUIT-001, CHRONICLE, TRAIN expansion, BODY redesign and reuse audit are not begun.
**Next (historical):** Gavin merged #241 at `9f9100a` on 2026-10-18.

## Previous objective — REVIEW-001 Weekly Review dashboard (2026-10-18, PROTECTED, merged in #240 at `4fda717`)

Gavin approved making MORE → REVIEW's weekly section match the Ultimate prototype's Weekly Review
("approve, Claude Code builds it", 2026-10-18). Builder: Claude Code. Started at master `8e5dbab`.
Scope and rules: "Weekly Review dashboard" in [REVIEW-001.md](REVIEW-001.md). Read only apart from
#238's existing save-review form; no schema, event, backup, Engine-evaluation or dependency
change. Merged on Gavin's approval at `4fda717`.

## Previous objective — REVIEW-001 weekly review loop (2026-10-17, PROTECTED, merged in #238 at `8e5dbab`)

Gavin authorized shipping the connected foundation, then building the weekly review loop.
Builder: Codex, on `codex/review-001-weekly-loop` from master `554b557`. Scope, event/backup
semantics, validation and deferred work are in the weekly-loop delivery section of
[REVIEW-001.md](REVIEW-001.md). One additive review event, no schema change. Integrated master
`5a54a1f` after #239; a delayed week-refresh draft-loss bug was found and fixed with a browser
regression. Verification and independent review are recorded in
[PR #238](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/238). Merged at `8e5dbab`.

> **Status correction, 2026-10-18:** #232 (`fda45c2`), #236 (`4404b01`), #237 (`554b557`),
> #238 (`8e5dbab`), #239 (`5a54a1f`) and #240 (`4fda717`) are all merged. "Next" lines in the
> older sections below are historical handoffs, not open actions.

## Previous objective — REVIEW-001 Phase 1a storage slice (merged #239) (2026-10-17, PROTECTED)

Builder: Claude Code. Starting master `4404b01` (RESTORE-COMPAT #236 merged); branch
`ccr-f27681c1-sb8gif`; PR linked from the branch. Scope and evidence are in the "storage slice"
section of [REVIEW-001.md](REVIEW-001.md).
- Body measurements as dated, correctable events.
- A `progressPhotos` table at schema v13. Photos are re-encoded so their metadata is stripped,
  and they travel in the normal backup.
- Hide or delete a photo permanently (Gavin, 2026-10-17).
- Measured backup sizes.
- The #236 review's follow-ups: a pre-v4 restore test and a guard for an unversioned backup.

No UI, Engine, TODAY or dependency change. Independent exact-head review passed at `7f2cf39`;
Gavin merged #239 at `5a54a1f`. Measurement and photo screens remain a later slice.

## Previous objective — RESTORE-COMPAT (2026-10-17, PROTECTED, merged in #236 at `4404b01`)

Gavin asked to keep moving after REVIEW-001's plan (#231) and its photo-backup ruling (#235,
option (a): photos in the normal backup) merged. Builder: Claude Code. Starting master `ca67da6`;
branch `ccr-f27681c1-sb8gif`; PR linked from the branch.

Found while starting Phase 1a's storage slice, and fixed first on its own: restoring any native
backup exported from an older schema failed with "Database version differs" (dexie-export-import
refuses any version but the live one). That affects every native backup made before schema v12.
Phase 1a's own acceptance needs older backups to restore after its schema bump.

The fix is in `persistence/backup.ts`:
- An older backup restores, still replace-only. Tables it predates are cleared, and missing
  settings rows read as their defaults.
- A newer backup is refused at preview with a plain message, before anything is cleared.

No schema, event, Engine, fixture, dependency or CI change; the legacy `BEYOND_BACKUP` path is
untouched. Independent exact-head review: PASS at `a1a7408`, renewed at `4a6fd7d` after
`origin/master` was merged in (#232 and #237). Merged on Gavin's approval at `4404b01`.


## Parallel objective — REVIEW-001 read-only hub slice (Codex, merged in #237) (2026-10-17, PROTECTED)

Gavin directed major progress after #232. The approved REVIEW-001 Phase 1a plan has merged;
Codex is building its first read-only question/evidence hub slice on `codex/review-001-readonly-hub`,
starting master `ca67da629628520ab1026d9d03114648e7bcb588`. Scope, floors, exclusions and
remaining Phase 1a work are recorded in the delivery section of [REVIEW-001.md](REVIEW-001.md).
Full local verification: 235 files / 2,432 tests passed / one existing skip, architecture,
TypeScript and production build pass. Two additional protected-fixture read-only cases and
final-copy browser checks pass (7 focused cases). Built PWA passes at 320/360/412 including
canonical save/rollover, source History/focus return and offline cold reload. Final head and
independent review are tracked in the active PR linked from that branch.
No storage/backup/TODAY change; #236 is separate. #232 now has independent exact-head PASS
at `742a2e4` and green required CI; Gavin approved shipping it, and #232 merged at
`fda45c2`. #237 is now reconciled with that master; independent review and CI must bind its new head. Next: verify this slice, independent exact-head review, then owner merge decision.
## PR #232 B1 follow-up and master integration (2026-10-17)

Gavin authorized fixing B1, merging latest master into #232, verification, push and a new
independent exact-head review. Builder: Codex. Started at `aa95684`; B1 fixed in this follow-up.
Merged `origin/master` at `ca67da629628520ab1026d9d03114648e7bcb588` with a merge commit,
not a rebase. The only conflict was this checkpoint; both branches' entries are preserved below.
That master includes REVIEW-001 plan #231, Training Record #233 and follow-up #234, and
photo-backup ruling #235. #236 has not merged at the integration check. The older status notes
below describe their original handoffs; the merged master state in this paragraph supersedes them.
ROADMAP_1.0 and UX_DECISIONS auto-merged; #232's entries remain under Active priority and the
Connected Health Record decision alongside the preserved REVIEW-001/photo-backup decisions.

B1: FUEL button names now include the displayed protein amount/optional target and water amount,
plus “explore records”. Visible text/layout/placement and round-trip behavior are unchanged.
New browser coverage checks both target/no-target names and updates after canonical UI protein
and water logging. N1–N3 remain unchanged; they are nonblocking and outside this repair.
Verification and review request for the new head are recorded on PR #232. The prior independent
BLOCK at `aa95684` is historical evidence, not approval of this head. Next: independent review
of the pushed head and Gavin's separate merge decision. No merge/deployment of #232 authorized.

## Previous objective — ULTIMATE-FOUNDATION-001 (2026-10-17, PROTECTED, merged in #232)

Gavin approved the Connected Health Record proposal ("Approved.", 2026-10-17).
Brief: [ULTIMATE-FOUNDATION-001.md](ULTIMATE-FOUNDATION-001.md). Sole Builder: Codex.
Fresh starting master `8c8b25feb90fd49f30e40d283547e90a6f4dd65a` (PHONE-FIT-001 #230 merged).
Branch: `codex/ultimate-foundation-001`; [PR #232](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/232), open, not merged.

Implemented: BODY readings open their existing metric explorer; recent/older lived-day browsing
is read-only and groups early-ended/restarted segments. A raw water series reuses ledger truth.
Exact observation/day/root references open effective source records, existing current-day
correction controls, and the complete History day focused on the canonical event. Return retains
metric/range/point, position, focus and unfinished forms. TODAY's existing FUEL readings link to
that evidence in their existing placement; no new row, guidance or recommendation.

Queries are application-only, read-only and source-linked. Same-time weigh-ins retain canonical
order/identity; missing remains missing, ambiguous main sleeps stay separate, old day ownership
is preserved. History re-reads on re-entry and ignores superseded requests. Retained progress
keeps exploration state but performs no hidden progress reads after quick logs.

Verification: full local gate 232 files / 2,417 passed / one existing skip; architecture (215
files), TypeScript and production build pass. The ignored local config only selects system
Chromium; full Node/browser selection and assertions remain enabled. Final-code production PWA
passes at 320/360/412 px: source/History focus and return, retained draft, canonical correction,
offline exploration/writes/reload, no browsing writes, no page errors/overflow and one main.
The 12 new browser cases also cover reduced motion/axe on sources and History, hidden-query
cost, explicit metric entry after a retained timeline, same-head History reopening and active
workout-deferred rollover. Required CI and independent review are tracked on the final PR head.
Evidence: [screenshots and reproduction](../screenshots/ultimate-foundation-001/README.md).

Unchanged: Engine/rules, schema/domain/events/commands, persistence/backup contracts, dependencies,
protected fixtures, CI/protections, primary tabs, laboratory #204. REVIEW-001 #231 is separate;
no Review hub, weekly/monthly/focus/measurement/photo or Phase 1b/C2 implementation is included.
Its docs touch UX_DECISIONS/ROADMAP too; check the merge diff and serialize shared implementation.

Limits: physical iPhone/Safari/Android keyboard and screen-reader testing unrun. Drafts remain
session-local; browser process eviction/reload clears them under existing warnings. Existing
single-browser-tab write limitations and bundle-size advisory remain. No historical repair.
Next: confirm required CI on the final pushed PR head, then assign independent qualified
exact-head review against the brief. The PR binds the exact SHA and records CI. Gavin alone approves merge/deployment;
no merge or deployment is authorized here. Other carried-forward unapproved work below stays separate.

## Previous objective — ULTIMATE-FOUNDATION-002 review follow-up (2026-10-17, ROUTINE, merged in #234)

The four nonblocking findings from #233's review were fixed in #234, merged at `5e0f86d` on
Gavin's instruction. REVIEW-001's plan merged in #231 (`69f9538`), and its Decision 2 ruling
(photos in the normal backup) merged in #235 (`ca67da6`).

## Previous objective — ULTIMATE-FOUNDATION-002 Training Record (2026-10-17, PROTECTED, merged in #233)

Gavin approved the Training Record slice ("approve, Protected, Claude Code, defer pause",
2026-10-17). Builder: Claude Code. Brief: [`ULTIMATE-FOUNDATION-002.md`](ULTIMATE-FOUNDATION-002.md).
It adds TRAIN → HISTORY, a session record and lift history during a workout, all read only, plus
one shared volume rule. Pause/resume is deferred.

PR #233 merged at `48e7b54` on Gavin's instruction. Merged head
`be49052149978b38fed9ac1a35b6c00e00750129` had green required PR Verification and an independent
Claude Code exact-head PASS review on PR #233. Four nonblocking findings from that review are
handled by the follow-up above. No deploy.

Open work alongside it:
- #232 (ULTIMATE-FOUNDATION-001, Codex) is blocked on review finding B1 (TODAY FUEL button
  names hide their values). Codex fixes it, then it needs a new exact-head review.
- After #232 merges, the session record gets a link to its History day using #232's History
  focus plumbing.
- #231 (REVIEW-001 plan) merged at `69f9538`.

## Previous objective — PHONE-FIT-001 (2026-10-14, ROUTINE, merged in #230)

Gavin approved fixing review leftovers R3 and R4 from PR #228 ("start option 1", 2026-10-14).
Builder: Claude Code. Starting master `53fcf68`; branch `claude/phone-fit-001`; PR linked from the
branch. Scope: the Obligation EDIT Due/Planned row reuses the create form's responsive
`.intent-dates` (stacks at ≤360 px), and BODY counts an open correction or saved-meal editor as
unsaved input only when a value differs from the saved record it opened with. UI only; no Engine,
schema, event, backup, fixture, dependency or CI change. Evidence and verification are in the PR.
Next action: Gavin's merge decision after green required CI.

## State before PHONE-FIT-001 (2026-10-14)

PR #228 (DAILY-EXPERIENCE-001) merged at `910c436` with Gavin's approval. Merged head
`5a4c33bdd3ab3211150130b81724e5a2e22ac8a5` had green required PR Verification and an independent
Claude Code exact-head PASS review recorded on PR #228. Housekeeping PR #227 merged earlier at
`644aae5`. No deploy. Only isolated prototype #204 remains open. Next action: on "let's work",
propose the next owner-prioritized objective; none is approved.

Open, unapproved: owner decision D1 (see COMMAND-ATOMICITY-002 below; merged default saves nothing
and suggests RELEASE); an after-the-fact independent review of PR #226's `99b8f70` if Gavin wants one.

Carried forward from the PR #228 reviews, nonblocking and unapproved:
- R3 and R4 are being fixed by PHONE-FIT-001 above.
- R3 (pre-existing on master): the Obligation EDIT Due/Planned row is an inline flex row; the page
  is 369 px wide at 320/360 px, and at 320 px the bottom nav is pushed below the viewport. Likely
  fix: use the create form's `.intent-dates`. Plan Today makes this editor easier to reach.
- R4: BODY counts an open but unchanged correction editor as unsaved input, so reload/update
  prompts can fire spuriously (Intent editors already compare against the saved record).
- Plan Today groups by calendar date, so during an overnight shift "planned today" items move at
  midnight, before the 16:30 BeyondDay boundary (existing semantics, not a regression).
- Hidden retained panes keep their timers running; retained TRAIN briefly shows its previous
  headline until its activation re-read finishes.

Also carried forward, unapproved: review notes N1–N4 from PR #220 (count-start churn on re-entry,
destination-guide descriptions, Search Capture result skipping discard confirmation, stale Capture
message); operator stage 6 consolidation (waits for field evidence); VCC-001 stays paused; F1 field
stop runs to about Oct 25. A reviewer once saw a non-reproducing local `MealRoundTrip.test.tsx:80`
scroll-poll failure under combined load; watch for it in CI.

## Historical objective — DAILY-EXPERIENCE-001 (merged PR #228)

Gavin authorized the complete PROTECTED objective on 2026-10-13; brief in
[DAILY-EXPERIENCE-001.md](DAILY-EXPERIENCE-001.md). Starting master `e145cd16`; branch
`codex/daily-experience-001`; [PR #228](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/228), merged at `910c436`.
Builder: Codex (`d962b6f`, `54aaf8a`); Gavin reassigned the review corrections to Claude Code after
Codex ran out of usage (`73abb55`, `9cb2ace`, `4177b91`, `34a17e4`, `5a4c33b`).

Implemented: session-local meal/sleep/workout-set/Journal/Capture/planning input retained across
tabs and feature links (never persisted; drafts clear on reload/process eviction); reload and
UPDATE NOW warnings for unfinished input; origin/position/focus return; compact Day Line TODAY with
separate recorded Status and Engine guidance; focused canonical water/meal and quick Capture; Plan
Today over explicit existing dates/Missions/recurrence with canonical detail resolution; compact
MORE with on-demand guidance, complete Backup/Recovery access and one main landmark. No Engine,
schema, event/backup contract, historical fixture, dependency, backend or CI change.

Review history: Claude review of `54aaf8a` BLOCKED on B1 (a TODAY shortcut's focused BODY view and
stale RETURN leaked into primary navigation). Codex review of `54aaf8a` BLOCKED on Plan Today A → B
→ A edits being lost and Intent/Plan-composer drafts missing reload/update protection. Claude review
of `34a17e4` confirmed those fixed and BLOCKED on R1 (retained TRAIN showed a stale variant under
SUGGESTED WORKOUT after a check-in; master showed REDUCED for YELLOW). `5a4c33b` re-derives
unchosen template/variant on return and clears a stale Capture return (R2).

Evidence on merged head `5a4c33b` (independent re-review): typecheck, architecture (212 files) and
build pass; full Node + Chromium suite 229 files / 2,393 passed / 1 existing skip; production
acceptance (`scripts/verify-daily-experience.mjs`) passes at 320/360/412 px; required PR
Verification green. Synthetic phone evidence: [README](../screenshots/daily-experience-001/README.md).
Untested: physical iPhone/Safari/Android keyboards and screen readers. Existing bundle-size
advisory and single-tab limitations remain.

## Historical objective — COMMAND-ATOMICITY-002 (issue #225, merged PR #226)

Gavin explicitly approved COMMAND-ATOMICITY-002 on 2026-10-13 as a bounded PROTECTED objective;
brief in [issue #225](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/225). Sole Builder:
Claude Code; branch `claude/command-atomicity-002`; [PR #226](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/226). Fresh
starting master: `e635643` (PR #224 merge, checkpoint already reconciled for #223; #221 closed).
Only prototype #204 is otherwise open.

Implemented: `src/application/atomicWrite.ts` is the one transaction helper (per-family table
lists, plus events/checkIns/recommendations for `nextSeq`'s cold-start read; nested calls join the
caller's transaction). Wrapped, with guard reads inside: `startDay`, `endDay`, rollover,
`submitCheckIn` (check-in + recommendation + both events), `rateOutcome`, `setWorkContext`,
`markWorkEnded`; every Mission/Obligation command incl. recurring next occurrence and Capture
conversion; Journal create/modify/review; TRAIN now uses the same helper. Signatures, validation,
events and payloads unchanged. Diagnostics: `recordIntegrityQueries.ts` reads one read-only
snapshot, tolerates null/malformed payloads, uses local dates, and adds days, check-ins (row side),
recommendations, missions, obligations and journal entries; MORE shows "Record mismatches".
Not covered (unreliable on old data): work context, outcome ratings, Capture conversion, WAITING/OPEN.

Owner decision D1, still open (default implemented and merged): satisfying a recurring obligation whose mission is
archived used to save SATISFIED, skip the next occurrence and still show a "cannot link" error;
now nothing is saved and the error says so and suggests RELEASE. Alternative: satisfy and stop
the recurrence silently.

Evidence: 20 new Node atomicity cases (16 fail on the old commands; the 4 cold-start cases fail
when `checkIns` is dropped from the helper), 5 new diagnostics cases (both protected backups
clean and byte-identical), 5 new real-Chromium cases (rollback, IntentScreen failure → error →
single retry save, D1 copy, MORE listing at 320/412 with axe, no writes). Full local suite,
TypeScript, architecture (209 files), build and whitespace pass; counts in the PR. Production PWA
at 320/360/412 px: day + check-in, mission, obligation satisfy, journal review, offline cold
reload, offline satisfy, Record mismatches 0 ([evidence](../screenshots/command-atomicity-002/README.md)).

Limits: rolled-back writes leave `seq` gaps (ordering only). `seq` is assigned per tab in memory,
so two tabs writing at once could still share a value (pre-existing, unchanged). Single-event
corrections keep their read-then-append shape; UI busy guards still prevent double submits.
Merged; see the current state above.

The PR #223 review notes (cold-start test, payload null guard, UTC dates) are addressed here.

## Historical objective — WORKOUT-ATOMICITY-001 (issue #221, merged PR #223)

Gavin approved [issue #221](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/221) on
2026-10-13 ("Approve #221 with option A"). Sole Builder: Claude Code; branch
`claude/workout-atomicity-001`; PR linked in GitHub. Lane: PROTECTED (command/event write
behavior, data integrity). Fresh starting master: `a0aae6865` (PR #220 merge). Housekeeping docs PR
#222 merged afterwards and was merged into this branch (checkpoint-only conflict); only prototype
#204 is otherwise open.

Implemented: `startWorkout`, `logSet`, `skipSet`, `completeWorkout` and `abandonWorkout` (so also
`completeRecoverySession`) write their row and event in one Dexie read-write transaction over
workoutSessions, performedSets, events, checkIns and recommendations (`nextSeq`'s cold-start
read). Signatures, validation, idempotency/in-flight and RED-override guards, event types and
payloads are unchanged. Option A: read-only `getWorkoutRecordMismatches()` compares session/set
rows with their events both ways; MORE → Diagnostic detail shows the count and plain messages.
It writes and repairs nothing.

Evidence: eight new Node cases (failure injection per command, row failure, undo pairing, every
split kind, read-only, empty DB and protected fixture B report zero). The four rollback cases fail
without the transaction. Five new real-Chromium cases cover rollback in real IndexedDB, readout
0, split listing at 320/360/412 with axe and no writes. TRAIN-OPERATOR-001's partial-failure test
asserted the old half-saved row; it now asserts the rollback, unchanged reconciliation (no replay,
honest re-read) and a single row/event after a manual second LOG. Full local suite: 221 files,
2,321 passed, one existing skip. TypeScript, architecture (207 files), build and whitespace pass.
Production PWA at 320/360/412 px: start, log, skip, undo, offline cold reload, offline log,
COMPLETE hold, start/stop, diagnostics 0, no overflow ([evidence](../screenshots/workout-atomicity-001/README.md)).

Limits: rolled-back writes can leave seq gaps (ordering only, as with day rollover). Non-workout
commands that write twice are out of scope. Merged; see the current state above.

## Historical objective — Guided MORE + Low-Energy TODAY (issue #219, merged PR #220)

PR #220 review correction, 2026-10-13: an independent Claude Code review of
`72b735082ceb39fbae1aec39743a0111f1c6f783` issued BLOCK on B1 only. The retained (hidden-mounted)
Journal kept its last opened entry, so re-entry from the MORE menu or a Search result showed a stale
detail instead of the list. Builder: Claude Code (taking over from Codex). Fix: Journal resets to
its list on each activation; creation drafts are separate state and stay retained. A new browser
regression fails on the reviewed head and passes with the fix. Full local Node+browser suite
(219 files, 2,308 passed, one existing skip), TypeScript, architecture (206 files), build and
whitespace pass. Nonblocking N1–N4 are left unchanged to keep this correction bounded. Prior-head
CI/review do not apply; corrected-head CI and renewed independent exact-head review belong in PR #220.

Owner authorization: [issue #219](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/219)
and Gavin's direct implementation assignment. Sole Builder: Codex; branch
`codex/guided-more-low-energy`; [PR #220](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/220).
Lane: PROTECTED — bounded MORE/TODAY presentation
and navigation composition, not new Engine or Minimum Day behavior. Fresh starting master:
`4b6cf819bfc494f2283270b277a504f5197e22e2`, verified merge of BODY PR #218 at corrected
head `830dcb143815401ee6e7ff3a047cfa625868248d`. Clean worktree; only prototype #204 open,
untouched and unintegrated. The previous BODY checkpoint below is historical, not active work.

Scope: hybrid MORE index with exactly two optional record-grounded destination suggestions,
stable reflection/direction slots and generic fallback; optional destination guide and guided
existing Journal/Mission/Obligation starts; retain free notes in Capture and in-memory writing
drafts across MORE inspection/return. TODAY adds user-chosen session-local Small Steps, direct
access to existing Minimum Day/Capture, focused tool operation and explicit all-tools/return.
Preserve status, work context, active operations, one Engine recommendation/WHY, all existing
routes, manual entry, decisions/confirmation, correction/undo, data and offline reliability.

BUILD OWNED the small read-only canonical-query composition and native React focus/disclosure;
reuse operator components/current forms. No dependency. The locked omission of fixed summaries
on named index rows remains; readable explanations live in a separate optional destination guide.
No locked UX or doctrine revision is assumed. Plain memories stay Capture, not invented journal
records; changing decision-required Journal semantics would need a separate owner ruling.

Excluded: Engine/priority/capacity/Minimum Day rules, commands/events, domain/schema, persistence/
backup formats, primary tabs, AI/diagnosis/inference, new dependencies, notifications/Pulse,
streaks or forced check-ins, silent plans, CI/protections, prototype, merge/deploy.
Acceptance: exactly two truthful/stable starts; archived-Mission eligibility; loading/error/retry;
guides never write without explicit existing save; free/manual paths and draft/focus/return;
normal/unknown/GREEN/YELLOW/RED/active operations and all essentials preserved; real offline PWA,
320/360/412 px screenshots, accessibility/reduced motion, regression/architecture/type/build,
whitespace/links/risk and green required CI. Independent exact-head review and Gavin's separate
merge decision remain required.

Implemented: canonical count-based reflection/direction starts, exactly two, with explicit generic
pending/failure fallback and read-only retry. No date rotation, urgency ranking or inference. The
full MORE index/recovery/settings remain. Optional destination descriptions and writing prompts
reuse existing forms; free memories remain Capture. Creation drafts stay mounted across MORE
inspection/return/search navigation; the new Capture exit explicitly asks before discarding them.
List reads distinguish unavailable from empty and retain manual starts. Small Steps is chosen in
the existing TOOLS toolbar, leaving closed-TOOLS TODAY's previous layout intact. Active Small Steps
offers Minimum Day/Capture, one-tool inspection, all-tools escape and predictable focus/return.
Essentials, active operations, phase/Attention policies, Engine guidance/WHY/decisions, Minimum Day
rules/enable and canonical commands are unchanged. Capture failure retains input; a known committed
save followed by failed refresh is disclosed without inviting a duplicate write.

Verification: full Node, 145 files / 1,545 passed / one existing skip. Seventeen new browser cases
cover guides/drafts/confirmation, write/read failures, explicit saves, GREEN/YELLOW/RED and unknown/
active states, unchanged recommendation/Minimum Day authority, hydration/undo, meal round-trip,
keyboard/focus, axe/reduced motion and mobile widths. Final affected TODAY/new/meal suites pass
120 tests. Earlier complete browser run passed 760 and exposed two 320px toolbar overflow cases;
the toolbar label/wrap correction passes both unchanged assertions in that final 120-case rerun.
An earlier meal-return regression caused by the inactive entry layout was corrected by moving
opt-in to existing TOOLS, not weakening the untouched meal suite. No final full local browser rerun
is claimed; required native CI runs the complete final-head suite. Architecture (206 files),
TypeScript/build, whitespace and ten local documentation links/anchors pass.
[Thirty actual mobile captures](../screenshots/guided-more-small-steps/README.md) document canonical
native restore, guided/free drafts/return, 320/360/412 px, real BODY water/undo, offline cold reload,
and explicit task/Capture saves; no horizontal overflow. Exact-head risk/CI/review evidence belongs
in the active PR. Committed baseline risk detects no automatic Protected path trigger; semantic
judgment keeps this owner-approved objective PROTECTED, with independent review required.
Engine/domain/persistence/commands/backup formats/dependencies/App navigation/CI/
protections/protected fixtures/prototype are untouched.

Limits: Chromium automation, not physical-device/iOS/native assistive-technology certification;
no arbitrary-large-history or cross-tab guarantee. Draft retention is in-memory MORE inspection,
not reload or ordinary primary-tab persistence; new guided Capture navigation confirms discard.
Small Steps is session-local, not a stored preference/plan. Existing bundle warning and command
integrity opportunities are unchanged. No additional owner ruling needed for implemented scope;
general-memory Journal semantics, new persistence or Engine/Minimum Day rules remain separate
owner decisions. Next: green required exact-head CI, independent review, then Gavin's separate
merge decision. No merge/deployment.

## Historical objective — BODY Insights & Progress Intelligence (merged PR #218)

Owner-requested PR #218 review correction, 2026-10-13: Claude Code independently reviewed
`f8274f07512895431c3d901175d6d2cfc865eb12` and issued BLOCK on B1 only. Chart extrema now
explicitly say High and Low, not apparent chronological endpoints. Focused assertions verify
both labels at 320/360/412 px. No calculations, chart interactions, accessibility, history or
other functionality changed. All 61 focused BODY/cleanup browser cases, architecture (203 files),
TypeScript, production build and whitespace pass. Nonblocking read coupling, ribbon disclosure,
selection retention, workout units and naming observations were reviewed and left unchanged to
avoid expanding this correction. Existing screenshots predate the label fix. Corrected-head CI
and renewed independent exact-head review belong in PR #218; prior-head approval does not apply.
No merge/deploy; Gavin retains separate final merge authority.

Gavin approved this bounded objective on 2026-10-13. Sole Builder: Codex; branch
`codex/body-insights-progress`; [PR #218](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/218).
Risk: PROTECTED — meaningful BODY interpretation/
presentation and the explicitly approved narrow chart exception recorded in the UX register.
Fresh starting master: `ea0c26f26d05991811676378174c21b3139805fc`, verified PR #217 merge.
Initial worktree was clean; only isolated prototype #204 is open, untouched and unintegrated.

Scope: enrich existing BODY progress with read-only selectable weight, nutrition, reliable
main-sleep and finished-workout series, useful ranges, truthful comparisons/coverage, accessible
point inspection and supporting records. Preserve Daily Record/meal entry, drafts/focus/return,
corrections/undo, accomplishments/ribbon/timeline/baselines and existing goals/targets.
Reuse canonical correction-aware queries and shared operator readouts; BUILD OWNED small
domain-specific read composition and native SVG/range/disclosure, no dependency or new chart system.
Excluded: Engine/recommendation/medical authority, new inference/correlations, commands/events,
domain/schema/persistence/backup formats, navigation, dependencies, CI/protections, prototype,
merge/deploy. Fiber is absent, not estimated; missing/partial records never become zero intake.
Acceptance: accurate window/coverage/zero/missing/comparison calculations; historical correction/
void integrity; read/loading/failure/retry; existing journeys; 320/360/412 px, accessible keyboard/
contrast/reduced motion, production offline PWA, architecture/type/build, regressions, mobile
evidence and green required exact-head CI. Independent exact-head review and Gavin's separate
merge approval remain required.

Implemented: selectable 7/28/90-day weight, meal calories, protein, reliable main-sleep and
finished-workout series; means/prior-period changes with denominators; native pointer/keyboard
point inspection; dated records and calculation/coverage disclosures; meal carb/fat details and
explicit unavailable fiber. Nutrition is recorded intake, not total intake; ambiguous multiple-main
sleep days are excluded, not combined; co-recording never implies causation. Existing goal/milestone/
projection rules remain. Daily Record/manual/meal handlers are unchanged; accomplishments, ribbon,
timeline and baselines remain reachable. Selectable charts lead, while the established last-recorded
weight SVG remains inspectable when the latest record is older than all recent ranges. Its existing
facts remain; timeline opening still hides both charts.

Evidence so far: all 144 Node files pass (1,542 tests, one existing skip). All 70 targeted real-
Chromium cases across BODY/progress/cleanup pass, including six new UI cases and seven new
calculation/canonical-history cases in Node. Architecture (203 files), TypeScript/build and
whitespace pass. A preservation test caught a new hint pushing water controls below the first
viewport; it was removed, not the assertion. Existing chart tests now assert the new graph while
retaining goal/milestone/no-warning/timeline safeguards, with deterministic dates.
Actual 320/360/412 px PWA native restore, point inspection, offline reload/local exploration,
return focus and manual water/undo pass. [Mobile evidence](../screenshots/body-insights-progress/README.md)
records synthetic fixtures and limitations. Final full browser passes 73 files / 744 tests. A final
source-date annotation distinguishes existing all-history weight facts/projection from range means;
all 71 final focused cases pass, including a seventh new UI regression proving older-history graph
access and timeline suppression. Thirty-four local documentation links/anchors pass.
Required exact-head CI is recorded in the PR. Committed baseline risk reports PROTECTED;
independent review is required before Gavin's separate merge decision. No merge/deploy.

## Historical objective — MORE-OPERATOR-001 control center (merged PR #217)

Gavin approved this bounded Protected stage on 2026-10-10, with no merge/deploy authorization.
Builder: Codex, sole implementation Builder; branch `codex/more-operator-001`;
[PR #217](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/217).
Fresh baseline: `d3386f3d9901e0fa41a10f03e5dc4536578ebc96`; GitHub confirms PR #216 merged
at exactly that commit. Clean starting worktree; sole open PR #204 remains isolated and untouched.
Brief: [Stage 5](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-5-brief--more-operator-001).

Implementation: records/review lead, Direction and Training tools stay distinct, and the identity
zone has an immediate backup/recovery jump. Existing export/share/replace-only restore remain
visible; automatic preferences/file check and time capsules use deliberate native disclosure.
All nine destinations, settings, Findings/Weekly depth and correction/manual routes are retained.
The menu stays mounted during inspection, retaining local settings/capsule drafts, disclosures,
position and focus on explicit return; primary-tab/reset semantics are unchanged. Diagnostics,
History, Review and Weekly distinguish unavailable reads from empty/zero and provide read-only
retry. Backup export failures are surfaced; synchronous UI guards preserve one in-flight safety
operation and existing backup-before-replace/preview/confirmation semantics. No Engine, application,
domain, schema, persistence, events, backup formats, dependencies, CI, protections or prototype edits.

Verification: full Node suite passes 143 files / 1,535 tests, one existing skip; full Chromium
suite passes 72 files / 736 tests. All 24 final focused operator tests pass, including added restore
failure-ordering and computed minimum-text checks (one additional test after the full local run).
Architecture passes (201 files); TypeScript, production PWA build and whitespace pass.
Actual 320/360/412 px PWA offline reload, History/events, record search/result navigation, settings
save/reload, real backup download/preview/cancel/file check and return focus pass at every width.
[Twenty-one synthetic mobile captures](../screenshots/more-operator-001/README.md) record actual
production behavior, not prototype sample rules. Eight local documentation links and heading
anchors pass; committed baseline risk reports PROTECTED. Exact-head CI/review results
belong in the linked PR rather than a self-referential checkpoint SHA.

Limits: Chromium-only automation, no physical-device/iOS/native-screen-reader or OS share-sheet
certification. Draft continuity is session-local menu inspection, not new persistence or cross-tab
draft authority. Existing bundle-size warning and excluded workout command atomicity opportunity
remain. Environment reuses the existing setup and temporary system-Chromium browser override;
no tracked runner changes or new configuration needed. Next: green required exact-head CI,
independent review, then Gavin's separate merge decision. Do not merge/deploy.

Owner-requested PR #217 follow-up, 2026-10-10: Weekly clears its last successful summary when
a fresh read begins. Pending reads show Loading; failure shows the error and RETRY WEEKLY without
old figures. A gated regression covers successful load → failed refresh → pending retry → successful
recovery and unchanged canonical events; it failed against `a664d92c94dfdbaf532411545984e8881e83d354`
before the correction. This is UI read-state repair only, reusing existing query/cancellation state;
no command, domain, persistence or authority change. All 76 focused MORE/Review browser cases
pass, including the new recovery sequence; architecture, TypeScript/build, whitespace and eight
local documentation links/anchors pass. Corrected-head native CI and renewed
independent exact-head review belong in PR #217; prior-head CI/review is not approval of this update.

## Historical objective — TRAIN-OPERATOR-001 operating surface transformation (merged PR #216)

Gavin approved this bounded Protected stage on 2026-10-10. Builder: Codex, sole implementation
Builder; branch `codex/train-operator-001`; [PR #216](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/216). Starting master is the freshly verified
`173b9f930764e99b7d03d36d14d21aa4f3f57a49`, merging PR #215. Initial working tree was clean;
initial public open-PR inspection showed only isolated prototype #204. GitHub API access initially
failed with network Forbidden (including sandbox escalation); after saving missing destinations
in the environment draft, authenticated API access and PR creation succeeded. No required CI
success is claimed here. Full concise brief:
[TRAIN stage 4](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-4-brief--train-operator-001).

Implementation: preparation leads with the chosen session, prescribed exercise/set totals and
START; the full prescription and unchanged WHY evidence remain deliberately inspectable. Active
TRAIN shows canonical session progress, current lift/prescription, known or explicitly unknown
last performance and current set inputs before progression/substitution. Gym Mode, rest,
exercise navigation, undo, finish/partial/stop confirmation and all pre-session library, template,
history and record routes remain accessible. A finished lift has an explicit CONTINUE route to
the existing first unfinished lift; chosen substitutions remain visible outside inspection.
Completion uses truthful recorded/skipped metrics and keyboard focus follows completion/return;
read retry never restarts a workout, and LOG feedback distinguishes an unconfirmed command from
a successful commit whose subsequent read failed. An uncertain command failure requires read-only
reconciliation before another LOG is possible. No protected data/rule/command layer changes.

Verification: all 143 Node files pass, 1,535 tests and one existing skip. Final full browser project
passes 71 files / 713 tests, including 15 operator tests and a real performed-row-present/event-
failed injection without duplicate recording. Architecture passes (201 files); TypeScript,
production PWA build, whitespace and 25 local documentation links pass. Actual production
PWA offline reload, canonical resumption, offline recording and hold-to-finish pass at 320/360/412
px. Eighteen synthetic mobile captures and limitations are in
[TRAIN evidence](../screenshots/train-operator-001/README.md). No physical-phone/iOS, native
assistive-technology, hardware haptic or wake-lock acceptance is claimed. Existing bundle-size
warning remains. Committed baseline risk classification reports PROTECTED; required exact-head CI
and independent review are pending. The pushed branch is recoverable in PR #216. Environment
network corrections are saved; successful live API requests do not establish a published setup
snapshot. Next: obtain independent exact-head review and successful required CI, then Gavin's
separate merge decision. Do not merge/deploy.

Separate owner decision required, not implemented: existing workout commands can write a row and
its event separately. UI recovery reconciles an uncertain result and never blindly repeats LOG;
it cannot provide transactional row/event integrity or repair policy without crossing the
excluded command/application boundary. Recommend a separately approved atomicity/recovery objective.

## Historical objective — TODAY-OPERATOR-001 command surface transformation (merged PR #215)

Gavin explicitly approved this bounded Protected objective on 2026-10-09. Freshly fetched
`origin/master` and the starting commit are
`1d83756b2ba971144365714d7450fb1091b9f2dc`, the verified merge of PR #214. Builder: Codex;
branch `codex/today-operator-001`; merged as [PR #215](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/215). Public GitHub inspection showed PR #204 was the only
other open PR; it remains an isolated interaction prototype and is neither modified nor integrated.

Scope: transform TODAY's production composition into one operator command surface ordered around
current phase/context, truthful System Status/capacity, the one canonical Engine recommendation,
immediate existing operations, earned attention and deliberate inspection. Reuse `OperatorHeader`
and existing application queries, commands, recommendation evidence, State/shift context and
presentation primitives. Preserve every existing TODAY journey, manual control, confirmation,
draft, recovery, focus, offline, exactly-once and correction path. No Engine, recommendation,
domain, schema, persistence, backup, event, command, navigation, dependency, CI, protection or
prototype change. Full concise brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-3-brief--today-operator-001).

Delivered implementation: TODAY identifies CURRENT STATE and its authoritative phase,
separates SYSTEM STATUS from context, labels the canonical Engine result PRIMARY RECOMMENDATION,
and places WATER / MEAL / SYSTEM after that recommendation as IMMEDIATE OPERATIONS. Foreground
operations still retain precedence; phase rows, capped Attention and the complete TOOLS disclosure
remain reachable below. No new inference, score, urgency, command or data path is introduced.

Verification: the full real-Chromium project passes 70 files / 698 tests, including the complete
TODAY journey, GREEN/AMBER/RED/NO READ, NO ACTION REQUIRED, recommendation/WHY, manual commands,
confirmations, failures/retries, focus return, drafts, workout continuity, reduced motion, axe and
320/360/412 px containment. All 143 Node files pass: 1,535 tests and one existing skip.
Architecture passes (201 files); TypeScript, production PWA build and whitespace pass. The built
PWA retains the synthetic day and current command surface through an offline service-worker reload
at 360 px. Synthetic production-build captures are in `docs/screenshots/today-operator-001/`.
The existing bundle-size warning remains. Final committed risk classification, required exact-head
CI and independent exact-head review remain pending. No merge or deployment is authorized.

## Historical objective — shared operator shell and primitives

Gavin approved stage 2 of the BEYOND-wide operator experience migration on 2026-10-09 after PR
#213 merged at `61b27232881f246c3e0038c9a8b1492a76b3dace`. Risk lane: PROTECTED because shared
primary-surface presentation can affect identity, hierarchy and accessibility. Builder: Codex;
branch `codex/operator-shell-primitives`; merged as PR #214. PR #204 remains an isolated prototype.

Scope: extract the already-common primary destination identity header and BODY's proven small
read-only fact matrix into constrained shared components; adopt them only with exact copy, glyph,
focus, data and layout parity. No TODAY/TRAIN/MORE redesign, behavior relocation, generic card
system, Engine/application/domain/persistence/event/schema/backup/dependency/fixture/CI/prototype
or deployment change. Acceptance and full brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-2-brief--shared-shell-and-primitives).

Implementation: `OperatorHeader` now owns the already-identical destination glyph/heading/rule
frame across the four primary screens while preserving each caller's exact copy and focus handoff.
`ReadoutGrid`/`Readout` extract BODY's daily read-only fact matrix with an explicit non-card,
non-action contract. Existing `health-*` hooks remain for compatibility; no query, state or control
moved. New browser coverage checks heading semantics/focus, long values, 320/360/412 px containment,
axe and reduced motion. Focused final sets: 46 passed before a full-gate compatibility finding;
the preserved hooks and affected BODY/protein/primitive subset then passed 21/21. Node suite: 143
files, 1,535 passed and one existing skip. Architecture passed (201 files); TypeScript, production
PWA build and whitespace passed. The existing bundle-size warning remains. Required exact-head CI,
independent review and Gavin's merge approval are pending.

## Historical objective — BEYOND-wide operator experience migration contract

Gavin explicitly approved evolving all of BEYOND toward the Insights Phase A prototype's
operator-console experience and directed Codex to start on 2026-10-09. BODY Daily Health Record is
already merged in PR #212. This first follow-on objective is documentation-only: establish the
shared screen grammar, semantic boundaries, preservation matrix and staged production sequence
before TODAY, TRAIN or MORE changes.

Risk lane: PROTECTED because the contract governs a future primary-information-architecture
migration. Starting master: `c0f0d3c1c171aa0aac301141e3ea4c1e5e7a2d47`. Builder: Codex;
branch `codex/beyond-design-system`; active PR [#213](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/213). Prototype PR #204 remains isolated and
untouched. Full brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md).

Scope is this contract and checkpoint only. No production source, runtime behavior, Engine,
events, schema, persistence, backup, dependencies, fixtures, CI, protections, prototype integration,
deployment or merge. Acceptance: authority consistency, resolving links, clean whitespace,
Protected classification, green required CI and independent exact-head PASS. Every later
production stage requires its own bounded owner-approved Protected brief.

## Historical objective — BODY Daily Health Record

Gavin explicitly approved this cohesive Protected objective on 2026-10-09, including amendment of
BODY's four-tracker presentation and latest-entry sleep summary. Fresh master:
`bb36ffbf12116cc1e29d27bac1fa549744101e8a` (#211 integrated). No overlapping Builder;
only prototype PR #204 was open and remains untouched. Builder: Codex; branch
`codex/body-daily-record`; active PR [#212](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/212).

Scope: daily calories/protein orientation, secondary nutrition details, separate main sleep/naps,
canonical record inspection/correction, immediate meal/water entry and existing progress without a
weigh-in gate. Reuse canonical forms/commands/read models; keep four tabs and all meal/undo/draft/
recovery/offline/workout safeguards. No Engine, event, schema, persistence, backup, dependency,
one-off meal or unrelated changes. UX amendments are in the existing Decision Register.
Leverage: REUSE existing BEYOND tools/queries; USE PLATFORM native disclosures; BUILD OWNED the
small connective presentation. Do not add a library or another logging architecture.

Acceptance: real mobile 320/360/412 px; effective totals and corrections; main/nap and lived-day
ownership; progress without weight; draft/focus/return/error recovery; exactly-once logging and
existing regressions; offline built PWA; architecture/type/build; green required CI and independent
exact-head PASS. Verification: architecture passed (199 files), TypeScript/production PWA build and whitespace passed.
Full local suite covered 212 files: 2,220 passed / one existing skip; six legacy presentation selectors
needed updating for the authorized layout. All affected suites were corrected and rerun successfully
(112 tests across the final focused sets), with no assertions weakened. The 10 new daily-record cases
cover all three phone widths with full contrast/axe checks, overnight main/nap ownership, canonical
meal/water inspection, retained correction drafts, read-only recovery/focus, local draft/return and
same-tick write guards. Final timeline/recovery subset: 14 passed. Existing meal/workout/rollover,
Engine, provenance and historical restore regressions remain. Actual synthetic browser screenshots
are in `docs/screenshots/body-daily-record/`; all quick water controls fit above navigation at
320/360/412 px, with no horizontal overflow. Built-PWA offline preset save/log/return/reopen/undo/
correction/cold reload passed. Required exact-head CI and independent review are pending in the PR.
Initial independent review found one minor missing inspect glyph. It is replaced with the existing
LineIcon/ArrowUpRight SVG, and affected real screenshots were recaptured. A subsequent manual
read-retry timing defect is corrected with a post-commit enabled-control handoff; the regression
uses a gated read. New layout tests load the real local production fonts before measuring rather
than relying on platform fallback fonts. Final daily/meal/focus correction set: 41 tests passed;
architecture/build pass. Renewed independent exact-head review and required CI are requested.
Limitations: Chromium verification; existing memory-only drafts/undo windows; no canonical fiber
field; existing bundle warning. No merge or deployment authorized.

## Historical objective — Delta removal and intelligence preservation

Gavin explicitly authorized this bounded Protected cleanup on 2026-10-09. Fresh master:
`1170a13bbbd96627665087cef203e45d662f3a86`, the verified merge of #210. The meal milestone
#209 is already merged; only prototype PR #204 is open and stays untouched. Builder: Codex;
branch `codex/delta-removal`; active PR [#211](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/211)
carries exact-head evidence and independent review.

Audit: current tracked production navigation/App/MORE/SYSTEM, runtime source, package manifest and
lockfile, Vite/PWA/deployment configuration, environment declarations, event/storage types and
native/legacy restore contracts contain no active Delta assistant, model integration, AI-specific
prompt/configuration/dependency or Delta storage contract. Mathematical variables named `delta`
are unrelated. Optional USDA food lookup is non-AI and remains. Local chrono-node/Compromise date
parsing, MiniSearch retrieval/relevance, advisory composition, baselines, analytics and the canonical
Engine are useful non-AI capabilities, not deletion targets. No Delta-specific compatibility shim
is needed; existing legacy importers and native backup/restore remain necessary and unchanged.

Scope: remove misleading active future-cleanup requirements and record the verified intelligence
strategy in existing documents. No invented runtime deletion, migration, dependency removal or
replacement abstraction. Production source, data, commands, schemas, backups, tests, packages,
CI/protections and historical evidence remain unchanged. Leverage: REUSE existing deterministic
capabilities; REJECT unnecessary replacement infrastructure. Acceptance: preservation regressions,
architecture/type/build, document consistency, required CI and independent exact-head review.
Verification: 18 preservation test files passed (331 tests, one existing skip), covering Engine,
advisory/date/baseline/progression intelligence, canonical nutrition/hydration, meal drafts/recovery,
SYSTEM, TRAIN and historical restore fixtures. Architecture passed (196 files), TypeScript/build,
whitespace and 38 local document links passed. Built PWA in an isolated synthetic Chromium profile
passed offline preset save, exactly-once log, explicit return/focus/reopen, undo, correction and
cold reload retaining canonical totals. No new tests are needed for documentation-only changes;
required full CI and independent exact-head review belong in the PR before owner merge approval.
Existing Chromium-only verification, memory-only drafts, undo windows and bundle warning remain.
No merge/deployment authorized.

## Historical objective — product direction and creative freedom transition

Gavin explicitly authorized this bounded Protected governance transition on 2026-10-09.
Freshly fetched master: `5a021de81d73520c3ed3a32d47ca5e5d85e69a76`; PR #209 is merged at
that commit, so no active meal Builder overlaps this objective. PR #204 is the only open prototype
PR and is untouched. Older pending meal/catalog pointers below are historical.
Builder: Codex; branch `codex/product-direction-transition`; active PR [#210](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/210).

Scope: one concise Product Direction reference and necessary links/authority reconciliation;
creative independence within approved outcomes, complete experiences, existing leverage gate,
historical-decision amendment path and smart-by-design/AI-optional direction; classify the new
product-direction authority as Protected with a focused regression. Preserve DEV-FLOW-002
review/CI/merge safeguards, locked behavior until amended and all engineering/data protections.
No product code, Delta removal, dependencies, settings, CI/protection changes, deployments or merges.
BUILD OWNED concise repository direction; reuse the current workflow and leverage gate.
Verification: 30 local document links resolve; identified authority conflicts are reconciled;
CLAUDE's router and the engineering contract are byte-unchanged. Architecture passed (196 files),
whitespace passed, and all 26 risk-classifier cases passed. The new Product Direction case failed
before path recognition and passes after it. Changes are governance documents plus the classifier
path and its regression; production code, dependencies, historical Drops/fixtures and CI stay intact.
Required CI and independent exact-head review belong in the PR. Independent PASS/BLOCK must be
recorded in GitHub before owner merge approval. No unrelated objective is activated.

## Historical objective — focused meals, Product Experience Milestone 3

Gavin approved the read-only assessment's bounded Protected recommendation on 2026-10-09.
Starting freshly fetched master: `97103b5235ff02b07fffdc7d0b5727470f2abcdb`; PRs #205–#208
are merged (older pending pointers below are historical). Builder: Codex, sole Lead Builder;
branch `codex/focused-meal-m3`; active PR [#209](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/209). PR #204 is the sole open prototype PR and stays untouched.

Scope: focused meal presentation within BODY; shared existing fields/commands/state; saved LOG
first, secondary preset management/online lookup, direct offline manual entry, local all-tracker
access. Preserve separate preset save/consumption, direct BODY workflow, four tabs, drafts,
synchronous guards, recovery/focus, undo/correction, canonical totals/history and workout continuity.
No Engine, schema, persistence, backup, new dependency, hydration redesign, progress consolidation,
VCC-001 or prototype changes. BUILD OWNED small presentation; USE PLATFORM native disclosures.
Acceptance: actual mobile 320/360/412 px, draft/return/focus and recovery, exactly-once records,
management snapshot integrity, existing regressions, architecture/type/build and required CI.
Verification: full local gate 211 files / 2,218 passed / one existing skip; 31 focused meal/journey
cases passed, including eight new presentation tests. Architecture, TypeScript/build and whitespace
passed. Actual synthetic mobile screenshots at 320/360/412 px are in
`docs/screenshots/focused-meals-m3/`. Built PWA offline preset save (no consumed record), exactly-once
log, explicit return/reopen/focus, undo, correction and cold reload all passed. Local tracker choices
supersede the delayed initial handoff. Accessibility tests finish finite entrance effects before
contrast inspection; waiting on hidden retained-screen animations cannot settle while hidden.
Required CI/exact head belong in the PR. Chromium-only evidence, memory-only drafts, existing undo
windows and the existing bundle-size warning remain. Next: independent exact-head review, then
Gavin's merge decision. No merge or deployment authorized.


## Historical objective — searchable SYSTEM catalog milestone 2

Owner authorization: Gavin's bounded implementation instruction, 2026-10-09; Protected navigation
integration. Starting freshly fetched master: `9b2e62417d639eb541b1de47e1b52ff9f5502845`, merged
PR #207. Builder: Codex, sole Lead Builder; branch `codex/system-catalog-m2`; active PR [#208](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/208).
PR #204 is the only existing open PR and remains untouched. Prior milestone handoffs below are
historical; their pending review/merge pointers do not describe current master.

Scope: the approved 18 existing destinations, browsable groups and local names/aliases in SYSTEM;
existing App navigation handlers and MORE subviews; separate record search. BUILD OWNED small
navigation metadata; USE PLATFORM native dialog/input/buttons. No new dependency, storage,
commands, Engine/schema/backup changes, tab replacement, prototype integration or unrelated work.
Keep meal drafts, synchronous guards, canonical logging/undo/correction, read recovery, explicit
return, workout continuity, accessibility and offline behavior. VCC-001 stays paused.

Acceptance: every destination and all four tabs accessible; navigation/search performs no domain
writes; alias/empty/clear behavior; destination/focus return; guarded cancellation and recovery;
canonical exactly-once meal logging and workout continuity; mobile 320/360/412 px and constrained
keyboard space; architecture, build, proportional regression and required CI. Verification: 76 targeted cases passed; final full suite 210 files / 2,201 passed / one existing
skip; architecture, TypeScript/production build and whitespace passed. Forty-one new tests
(34 browser, seven discovery cases) cover the catalog and real journey safeguards. Built PWA
offline passed preset creation/log, cold reload, catalog/aliases, meal return, History, separate
record search, water/undo and focus return. Ten actual synthetic-fixture screenshots are in
`docs/screenshots/system-catalog-m2/`. A constrained-height regression failed before chrome
refinement and now keeps a full matching result visible at 320/360/412 px with 420px height.
Final label audit distinguishes REVIEW's recommendation/decision/rating ledger from Weekly's
progress views; eight affected discovery/destination cases, build and offline PWA passed again.
Required CI/exact head are recorded in the PR. Chromium-only automation, memory-only drafts,
existing undo windows and the existing bundle warning remain; no physical/Safari/screen-reader
certification is claimed. Next: finish verification, independent exact-head review,
then owner review. No merge or deployment authorized.

Independent-review follow-up, 2026-10-09: Gavin authorized correction of the P2 BLOCK at
`75c5b7c73a62686f26003eaf7ca372a9f89e41f8`. Dialog capture prevents native search Escape
from clearing a populated query before dismissal; the existing close/focus path is reused.
Nine focused-query regressions cover empty, matching and no-result searches at 320/360/412 px,
closure after one press, stable trigger focus and clean reopen. Six populated cases failed before
the fix; all 85 targeted cases now pass, with architecture/TypeScript/build and whitespace green.
The review's unrelated meal-test readiness race is bounded to initial LOG availability: wait
before the unchanged same-tick dispatch sequence. CI also exposed the explicit-read-retry
test matching an earlier error while retry was pending; require its specific failure and enabled
control before restoring successful reads. No meal production code changed or assertions weakened.
Built PWA offline one-Escape/focus/reopen checks passed for all nine cases, alongside canonical
logging/return, record search, water/undo and cold reload. Corrected head and required CI belong
in PR #208. The prior BLOCK is not
independent approval of the corrected head; renewed exact-head review is required before owner
approval. No further milestone, merge or deployment authorized.

## Historical objective — Command Console production milestone 1

Gavin authorized this bounded Protected milestone and explicitly amended the placement rule for
persistent WATER/MEAL/SYSTEM controls (UX Decision Register, 2026-10-08). Builder: Codex, sole
Lead Builder; branch `codex/command-console-m1`; active PR [#207](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/207).
Starting fresh master: `db5bae3267ddd82e15f3038f65dc7ba3412893ff`; PR #206 is integrated with
its reviewed head and green CI. PR #204 remains the sole overlapping open prototype PR, untouched.

Scope: compact production TODAY composition, one canonical RecommendationCard retaining existing
dominant/attention/support authority, existing work context/System Status, visible workout resume,
canonical BODY water/meal entry, and a native SYSTEM chooser over existing workspaces/TODAY Tools.
The four tabs and all capabilities stay. Contextual phase rows retain their four-row cap, semantics
and timing; time-sensitive work controls keep precedence. No Engine, commands, persistence, schema,
backup, dependency, fixture, identity-asset or prototype changes. VCC-001 remains paused and is not
implemented; complete searchable launcher/Milestone 2 is deferred. BUILD OWNED composition over
existing components/commands; USE PLATFORM native dialog with explicit focus containment/return.

Evidence: 17 new real-browser console cases, including a deterministic wider-font context
control regression; console/phase/visual/motion coverage retains overflow, touch-target and
resume visibility assertions. Status context safely wraps at 320 px; touch targets stay at least
44 px. Full local regression: 208 files passed, 2,169 tests passed and one existing skip. Final
TypeScript/build, architecture, whitespace, offline and exact-head required CI results are recorded
in PR #207. Actual synthetic-fixture screenshots at 320/360/412 px,
status/evidence, logging, SYSTEM and resume are in `docs/screenshots/command-console-m1/`.
Built PWA checks cover offline save/log, cold reload, meal return, SYSTEM navigation,
water logging/undo, canonical totals and keyboard focus return.
Independent exact-head review and Gavin's final merge approval
remain required. Chromium automation is not physical-device/Safari or screen-reader testing;
memory-only meal drafts, existing undo windows and the existing bundle-size warning remain.
No merge or deployment is authorized. Next: independent review, then owner review.

## Historical objective — post-merge meal recovery focus correction

Updated 2026-10-08 by Codex. Gavin authorized a bounded accessibility follow-up to merged
PR #205. Fresh master is `22fa8c5af134088bdb0c9391914cea4282fa6a61`; open PRs #201 and
#204 are untouched. Builder: Codex; branch `codex/meal-recovery-focus`; corrective PR linked
from this branch's GitHub PR. Risk: ROUTINE accessibility repair, with independent exact-head
review explicitly requested before owner approval. BUILD OWNED: complete the existing native
focus handoff; no dependency, navigation, command, Engine, schema or persistence changes.

The delayed-read regression reproduced focus loss on master. BODY now completes the return-control
handoff after automatic recovery enables it, without stealing focus from a chosen visible control.
Deterministic gated-read tests also preserve the draft, canonical totals/history, correction access
and exactly one log. Verification: 99 browser tests passed across meal/App/BODY; both final focus
variants passed separately (21 unselected cases skipped). Architecture, TypeScript/production
build and whitespace passed. Built PWA passed offline save/log, offline cold reload, and offline
TODAY meal return with refreshed totals. Existing memory-only drafts and five-second undo remain.
Browser verification used Chromium. Required CI and exact head are recorded in the corrective PR.

Next: independent review of the exact corrective head, then Gavin's merge decision. No merge or
deployment authorized. VCC-001 remains paused. The prior milestone handoff below is historical;
its pending-merge pointers are superseded by PR #205's verified merge.

## Historical milestone 1 handoff

Updated 2026-10-08 by Codex, Lead Builder for Product Unification milestone 1.
This is a handoff, not merge authorization. Exact head and CI are recorded in the linked PR.

## Current objective — complete the meal-logging round trip

- **Authorization:** Gavin explicitly approved this bounded implementation following the Unified
  Product Blueprint. Product Unification takes priority; VCC-001 is paused, not canceled or
  superseded. No State Rail implementation or PR #204 integration is authorized.
- **Risk:** FEATURE UI handoff; conservative PROTECTED review lane because the roadmap records
  Gavin's explicit priority instruction (no workflow/authority rules changed). Independent exact-head
  review is required before merge. No primary navigation,
  doctrine, Engine, application commands, schemas, persistence, backups, dependencies or identity
  assets changed. BUILD OWNED: small React presentation state over existing canonical meal commands;
  native confirmation/focus/scroll behavior, no new infrastructure.
- **Starting state:** fresh `origin/master` = `8035dfbc0011bed03fb668e100aa8794cda4a8e7`;
  PR #203 is merged and DEV-FLOW-002 adopted. Open PRs #201 and #204 remain untouched.
- **Builder / branch:** Codex; `codex/unify-meal-round-trip`. Active PR: [#205](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/205).
- **Scope:** existing TODAY meal entry -> real BODY workflow -> explicit return with TODAY
  disclosures/position/focus retained; in-memory draft preservation; busy/discard guards; canonical
  confirmation, undo/correction and totals; near-control errors and duplicate-tap latch.
- **Exclusions:** new logger/persistence path, Engine/data/backup changes, navigation redesign,
  VCC-001, prototype changes, deployment and merges.
- **Acceptance evidence:** 115 targeted browser tests passed across seven files; follow-up
  browser/canonical nutrition/correction tests: 69 passed, one existing skip across six files
  (includes the 13 new round-trip cases again). Final repeated-return refinement: all 13
  round-trip cases pass; architecture, TypeScript/build and whitespace pass.
  Browser tests reuse installed Chromium through the existing temporary onboarding config, with
  no assertion or tracked configuration changes. Required full CI will be recorded in the PR.
- **Screenshots:** `docs/screenshots/unify-meal-round-trip/`, running app at 320/360/412 px,
  success/undo and returned TODAY; synthetic fixtures only, reduced-motion browser context.
- **Limitations:** drafts are session memory, not saved records; a supported browser warns on
  reload/close, but OS termination cannot preserve them. Existing five-second undo window is
  unchanged; later correction remains in TODAY'S MEALS. Primary tab navigation keeps its existing
  reset semantics after any needed discard confirmation. Only the existing TODAY meal entry
  gains this round trip; no new phase action is introduced.
- **Offline evidence:** built PWA passed offline preset save, canonical logging, TODAY -> BODY
  -> explicit return with updated totals, and service-worker cold reload with the meal retained.
- **Next:** confirm green required CI at the final head, obtain independent exact-head review,
  then owner review. No merge or deployment authorized. No unapproved product boundary is crossed.

## Independent review corrections — PR #205

- Owner supplied a BLOCK review of `16cff0feb46bc80b9b0e8da7e5e5dbfe6a7b7ac7`:
  P2 same-tick navigation could abandon a pending meal write; P2 post-commit read failures
  did not recover through explicit return/reopen. The reviewer reported a Forbidden review POST;
  no GitHub review existed. This handoff records the findings, not a Builder-issued review verdict.
- Fixes: synchronous BODY in-flight reporting and shell guards; synchronous existing BODY action
  guards; failed read continuations retried on reopen or through RETRY READINGS. Retry runs only
  reads, including duplicate/same-food checks, preserving drafts, confirmation and undo.
- Evidence: three new assertions fail on the blocked head. Fixed tree: 122 browser tests pass
  across seven files, plus one additional duplicate-check recovery case (21 round-trip cases total);
  immediate LOG -> all navigation paths,
  committed-preset/log recovery and explicit retry preserving another draft. Architecture,
  TypeScript/production build and whitespace pass. Built PWA offline save/log/return and cold
  reload pass again. Required CI at the new head is pending.
- The prior BLOCK is not cleared by Builder verification. Next: green exact-head CI and renewed
  independent review; owner merge approval remains required. No merge or deployment authorized.

## Historical adoption handoff

The following checkpoint is preserved as historical evidence. Its pending-adoption/merge pointers
are superseded by the verified state above.

# Current checkpoint

Updated 2026-10-08 by Codex, assigned Primary Builder for DEV-FLOW-002 only.
This is a handoff, not implementation or merge authorization. Read the approved objective brief;
verify branch/PR/head/CI from Git and GitHub rather than assuming this checkpoint is live state.

## Verified starting state

- Fresh `origin/master` and starting checkout both matched
  `9cf48c07b4b4e1ff807983dbc845d06a2de6eedb` with a clean working tree.
- PR [#200](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/200) merged at that SHA;
  both Git history and the public PR page confirm it. The former pending-review pointer is stale.
- PR [#199](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/199) remains the historical
  standalone-activation prerequisite. Its implementation and evidence are preserved.
- PR [#201](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/201) is still open on GitHub;
  this objective does not modify or close it. PR #200 already contains the AutoBackup selector repair.
- `ACTIVE_DROP.md` still records WEEKAHEAD-001 as CLOSED and is untouched historical Factory state.
  It does not assign this adoption objective or authorize VCC-001 implementation.

## DEV-FLOW-002 adoption

- **Authorization / risk:** explicit bounded owner approval, 2026-10-08; PROTECTED governance.
- **Brief:** [`DEV-FLOW-002.md`](DEV-FLOW-002.md), including scope and hard exclusions.
- **Branch:** `codex/dev-flow-002-adoption`. Exact head is derived with `git rev-parse HEAD` and
  will be bound in the PR description/review; do not use a self-referential checkpoint hash.
- **PR:** [#203](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/203),
  `DEV-FLOW-002 — Simplify BEYOND Development Workflow`; opened, not merged.
- **Done:** central workflow charter; reconciled procedural instructions; preserved historical
  Drop skill with a supersession notice; Protected governance risk guidance and 25 CLI regression
  cases; VCC-001 procedural transfer retaining all product scope, acceptance evidence, six
  screenshots, and independent exact-head review. State Rail remains unimplemented/unstarted.
- **Local verification:** 206 files passed; 2,129 tests passed, one skipped. Architecture checks,
  TypeScript/production build, syntax and whitespace checks passed. Committed-diff risk guidance
  reports PROTECTED. Consistency checks confirm unchanged product doctrine, VCC scope/invariants/
  acceptance/review, historical skill body, Factory pointer, CI workflows, and dependency files.
  Browser tests used the ignored onboarding config selecting installed `/usr/bin/chromium`;
  no tests, assertions, or tracked browser configuration were bypassed or weakened.
- **Remaining:** confirm exact-head required PR Verification, obtain independent Protected review,
  and wait for Gavin's merge approval. No PR merge is authorized in this session.
- **Environment:** initial GitHub API requests were denied by the egress policy. Added only
  `api.github.com` to the cloud environment draft, preserving presets and setup instructions.
  PR creation and subsequent read-only API checks now succeed using the existing binding; no
  new token was requested. Draft publication is not claimed.
- **Next action:** inspect required CI on the final PR head, then assign an independent Protected
  Reviewer to that exact head and resolve any findings. Wait for Gavin's explicit merge approval.
  Do not modify PR #201, start VCC-001, activate Factory Phase 2, or integrate anything.
- **Authority conflicts:** none unresolved within the approved adoption scope. Historical procedure
  is explicitly superseded for new work only after this adoption merges with owner approval.

## DECISIONS FOR GAVIN

None. Independent Protected review and owner merge approval remain separate steps.


Final-review follow-up: direct installed TRAIN/BODY shortcuts now initialize the root suit from
the same read-only phase/pin derivation used by boot. The shell refreshes it on minute/resume/
rollover until TODAY mounts, then yields to TODAY's live state and cancels obsolete reads. Two
stored-pin shortcut regressions pass. The renewed full `npm run verify` passes (252 files,
2,556 passed / one existing skip), and built offline cold workout/water shortcut acceptance
passes at 320/360/412 with no duplicate workout set. The earlier exact-head review was superseded
by its shortcut finding; the new head requires a renewed verdict recorded on PR #241.
