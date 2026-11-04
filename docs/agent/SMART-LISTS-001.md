# SMART-LISTS-001 — dated task views

- Authorization: Gavin selected A7a in `APPS-CHECKLIST-BRIEFS.md` and directed continuation of the planned work. Builder Codex; independent reviewer/merger Claude Code.
- FEATURE, read-only application/UI projection. Starting master `8a347108c019e93760eed4a1ea10f10456280288`; branch `codex/smart-lists-001`; ready PR pending.
- Scope: Today / Next 7 / No date in the existing Plan Today surface, using `getCurrentlyEligibleUnresolvedObligations`. Today preserves existing calendar-date eligibility: planned today or due today/earlier. Next 7 is tomorrow through seven calendar days ahead, excluding tasks already in Today. No date requires both dates absent. Due and planned dates remain distinct in row descriptions.
- Earlier due dates say “from Mon”; no red, alarm, missed count or automatic changes. Existing task details and explicit add-to-today composer remain available. Views refresh on resume and a calendar-date change without dropping drafts.
- Exclusions: Engine, schema, commands/events/recurrence behavior, backup, providers/dependencies, primary navigation, #406's share-inbox surface, merge.
- REUSE: PlanTodayScreen, getTodayPlan date convention, canonical intent eligibility and existing task-detail navigation/commands.
- OWN: read-time date buckets and neutral list presentation.
- BUILD FROM SCRATCH: none.
- Acceptance: eligible/archived/resolved/waiting and date-boundary integration checks, no writes on reads/navigation, 360px/44px/axe and draft retention, typecheck and full verify. Results recorded before handoff.

## Verification and handoff

- Typecheck and architecture (424 files) PASS; production/PWA build PASS.
- Focused query, phone, existing Plan Today/date copy, draft/retry, midnight and catalog tests PASS. Browser acceptance uses the real MORE container so the shared header's intentional full-bleed margins are measured correctly; overflow assertions remain unchanged.
- Full verify test phase: 415 files passed / one failed / one skipped; 3,454 passed / two failed / two existing skips. The only failures were existing ReviewBodyAnswers photo/measurement cases at 320/360px exhausting their 15s budget under the full run.
- Unchanged isolated ReviewBodyAnswers rerun: 4/4 PASS. No timeout, assertion or test was disabled or relaxed. This uses the checklist's documented isolated-timeout rerun policy; do not claim a single green full-verify invocation. Build was run separately after the test phase stopped and passed.
- Actual App → MORE → Plan Today walkthrough: all three views rendered at 360px with no page errors. Captures: `docs/screenshots/smart-lists-001/`; synthetic records only. 320/360/412px, 44px targets and axe pass in the browser cases.
- App implementation commit: `d4b3928`. No #406 implementation files were taken over; only the existing catalog's Plan aliases overlap its broader catalog surface.
- Branch pushed at `3a96fc3`; ready PR creation attempted with `gh pr create` and rejected by the GitHub API: `Post https://api.github.com/graphql: Forbidden`. No PR number is assigned, and no independent review, merge or deployment is claimed.
- Per APPS-CHECKLIST-BRIEFS: “If GitHub write access fails, stop and tell Gavin.” Stopped before A4; Claude can open the ready PR from `codex/smart-lists-001`. The prepared PR body is `.cache/smart-lists/pr.md` in this workspace; this brief contains the durable scope and evidence.
- Next checklist item after A7a is ROUTINE-PLAYER-001 / A4 once publication is available.
