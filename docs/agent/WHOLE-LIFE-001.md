# WHOLE-LIFE-001 — a working whole-life front door

- **Authorization:** Gavin approved a dramatically more functional, visually distinct working
  cockpit prototype, corrected the scope to total life rather than shift work, then instructed
  “I agree with you and your direction. Make it happen” (2026-11-05).
- **Builder:** Codex. Branch `codex/whole-life-001`; fresh master
  `95947a7ba539ab2691ed8e4aa24696a4da67e336`. PR pending; GitHub API still returns Forbidden.
- **Lane:** Protected presentation, conservatively: a new LIFE overview and a TODAY entry.
  Existing primary tabs, Engine recommendation authority/order, logging controls, schema, event
  semantics, backups and provider permissions are preserved. Independent exact-head review and
  green CI required; no self-merge or deployment. New owner approval authorizes this prototype
  ahead of further checklist work, without falsely closing CI-FLAKE-001's remaining CI gate.
- **Outcome:** LIFE opens a composed whole-life view: recorded calendar commitments, chosen project
  steps, playable saved routines, a lived-day note, people/home reminders and actual workout
  resumption. A free day has a useful calm state. Existing area editors retain mounted drafts.
  TODAY exposes YOUR LIFE; established health/shift operation remains available.
- **Truth:** no inferred priorities, automatic scheduling, fictional scores, fabricated people,
  generic “all clear” on read failures, or claim to know unrecorded context. Each read can fail
  independently. Calendar dates and lived-day note ownership remain explicit and distinct.
- **REUSE:** existing task smart lists, project next-step queries, routine player, daily note,
  people/home records and App destination routing; native CSS grid, fonts and Lucide icons already
  shipped in BEYOND. Existing Life tabs/editors remain the execution surfaces.
- **OWN:** a read-only composition and a purposeful visual hierarchy connecting those capabilities.
- **BUILD FROM SCRATCH:** the small whole-life composition; no existing screen connects these
  jobs while keeping their provenance and canonical execution. No new dependency or provider.
- **Acceptance:** real-browser phone and desktop inspection; a normal/free day, a workday and an
  interrupted draft; keyboard/focus, AA/axe, 320 px overflow, read failure and no-write-on-browse
  evidence. Canonical routine completion stays in the existing player.

## Evidence and handoff

- Focused Chromium: 21/21 PASS across WholeLife, existing LIFE and RoutinePlayer tests. New
  acceptance covers 320/360/412/1440 px, full axe rules, partial read failure/retry, zero browse
  writes, workday routing, a genuinely empty day, draft/focus restoration and routine DONE feedback.
- Actual App captures: [phone](../screenshots/whole-life-001/phone.png),
  [desktop](../screenshots/whole-life-001/desktop.png), [player](../screenshots/whole-life-001/player.png).
  These contain synthetic data; [capture notes](../screenshots/whole-life-001/README.md).
- Interactive inspection caught the inherited 430 px wrapper compressing desktop content and an
  overly tall phone introduction. LIFE now expands only in its own workspace, and the first
  recorded task fits above the phone navigation (explicit regression assertion).
- Full `npm run verify` at `f866f7af`: **433 files / 3,523 tests PASS**, with the existing
  one-file/two-test skips; architecture, TypeScript, production build and PWA generation PASS.
- Final visual containment repair renders the canonical player beside the overview, so overview
  button/heading rules cannot override its established presentation. After this small UI-only
  change, WholeLife/Life/RoutinePlayer are again **21/21 PASS**, including a new distinct DONE
  action assertion; architecture (455 files), TypeScript and production/PWA build again PASS.
  The full suite predates this last containment repair; exact-head required CI remains pending.
- CI-FLAKE-001's repair is already merged on master as #409. GitHub API access in this environment
  still returns Forbidden; live CI attempt/review status cannot be established through that API.
- No new runtime dependency, provider, Engine, event, schema or backup change. No automatic task
  selection, scheduling or recording. Source failures remain unavailable instead of claiming empty.
- PR creation was attempted and rejected with `Post https://api.github.com/graphql: Forbidden`.
  No PR number, remote CI result or independent review is claimed. The branch and evidence are
  pushed for an independent reviewer to open the one PR when access permits.
- Next: independent exact-head review and green required CI, then Gavin's merge/deployment
  decision. This is a working
  prototype for Gavin to judge on his phone, not a claim that the full life vision is finished.
