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
