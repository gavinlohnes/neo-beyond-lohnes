# PROJECTS-001 — help me get this done

- **Authority:** Gavin, 2026-10-31. He approved "PROJECTS-001 'Help me get this done'" ("Yes, build it"),
  including the additive database change. Goals wait; Missions already hold direction.
- **Builder:** Claude Code. **Lane:** PROTECTED (additive schema v18, new intent events, a new Alfred card).
- **Start:** master `9ccd93a` (#353). Branch `ccr-0be4f40f-16m0ja`.
- **Design source:** parked `codex/goals-projects-design` (GOALS-PROJECTS-001), narrowed to Projects only.

## Journey

Tell Alfred something finite ("Help me get this done: renew my passport"). He proposes one card:
the project and its first steps. SAVE creates them; nothing is saved before. The project then lives in
MORE → MISSIONS & OBLIGATIONS → **Projects · finite efforts**, with "X of Y done" and a next step
you choose. Steps are ordinary Obligations and open in their own editor. You can build it all by hand too.

## Scope

- `projects` table (Dexie v18, additive). Obligation gains optional `projectId` (unindexed).
- Commands (`application/projectCommands.ts`): create a project with up to 12 steps (all or nothing),
  rename or restate the finish, pause, resume, complete, close, reopen (stale-screen guard), choose or
  clear the next step, move a commitment in or out (clears it as next). One event per change:
  `PROJECT_CREATED`, `PROJECT_MODIFIED`, `PROJECT_STATUS_CHANGED`, `PROJECT_NEXT_SET`, `OBLIGATION_PROJECT_SET`.
- A project's status never changes its steps (states, dates, Engine eligibility). Finished projects
  take no new steps. A repeating step's next occurrence stays in an open project and goes standalone
  once the project is finished. Archived-Mission rules unchanged.
- Alfred: `project_new` card; `add_reminder` may name an open project; OPEN PROJECTS in his records
  (titles, status, step counts, your chosen next); projects searchable.
- Progress is step accounting ("2 of 4 done"), never a goal percentage, never an Engine input.

## Exclusions

Goals, areas, nested projects, dependencies, target dates, automatic next-step choice, TODAY rows,
new tabs, Engine/recommendation changes, notifications, dependencies, backup format changes.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** Intent commands and events (`logIntentEvent`, `writeAtomically`, archived-Mission guard),
  Obligation editor and history, Intent screen patterns (rows, filters, disclosures, confirm cards,
  session drafts), Alfred card and confirm guards, native Dexie backup. Project-detail shape informed by
  Super Productivity (MIT; studied, no code copied), as assessed in GOALS-PROJECTS-001.
- **OWN:** Project meaning and lifecycle, step links, operator-chosen next, Alfred's mapping.
- **BUILD FROM SCRATCH:** only the Project record and its commands; a Mission can't complete without
  changing its locked meaning, and outside task stores can't keep our commands and history.

## Acceptance

Integration (`tests/integration/projects.test.ts`): create with steps, all-or-nothing, lifecycle leaves
steps and eligibility identical, next-step rules, move in/out, archived Missions, recurrence, backup
round-trip, invalid rows excluded. Browser (`tests/browser/Projects.test.tsx`): the full manual journey
at 360px with axe and no overflow, moving a commitment in from its editor, Alfred's card saves only
on SAVE. Full verify, independent exact-head review, green CI; Gavin merges.

Note: an older build refuses a backup taken on this one (newer database version) and changes nothing.
Older backups restore here as before, with no projects.

## Review follow-up (after #354 merged with independent PASS)

Fixed: Alfred's add-step card names the project and the save checks the name matches (medium).
A projects read failure no longer blanks Missions & Obligations; search skips invalid project rows;
history shows "Reading history…" while it loads. Not yet built: renaming a project or changing
"finished when" (the command exists; no screen uses it yet).
