# GRAYSON-C3.4-001 — Home presets and optional repeating-job alert time

- **Plan items:** [C3.4 / Quick win Q1 and C3.4a](../GRAYSON_CAMPAIGN_PLAN.md#progress-tracker-and-how-to-use-this-plan). This is the concise objective brief for their existing [PR #594](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/594), not a new objective or campaign authorization.
- **Authorization:** the original Builder's PR/checkpoint records Gavin, 2026-11-20: “start with the quick wins and stuff I will feel immediately”; then, after identifying the Home alert-time and Plans yearly-edit gaps, “I'm fine with who ever would be most efficient at building this do the work.” Those instructions cover these bounded Home refinements; they do not approve the entire campaign, the caffeine objective, or other Protected changes. Gavin explicitly assigned Codex to continue this PR and repair the blocked brief/default-alert wording, with browser coverage and the relevant comment correction; no merge or other objective is authorized by that repair instruction.
- **Lane:** FEATURE. Reuse existing Home/obligation save paths and REMIND-AT-001's optional time. No Engine behavior, notification policy, schema, migration, event, dependency or navigation change. Governance sources and campaign scope are unchanged; this brief records existing bounded authority.
- **Starting commits / Builder:** original implementation started at `211ccf4dd5dc32dd1ec4773201529ffa897f8117`; master `a857f285f273e2d4580ffbfb635aed995ee6d792` was merged into the PR. Codex takes over from Claude Code on the existing branch `claude/project-thread-s69muv`, from blocked head `1a43648f0ea4b087faba6811b666ed554dbcaf35`; fetched master remains `a857f285`. Existing commits are preserved.

## Operator outcome and scope

Common Home jobs gain CO detector testing and dog flea/tick, heartworm, vet and food presets. Choosing one only fills the editable form; SAVE creates the ordinary repeating `Home: …` commitment. The existing optional `remindAt` can be set from Home and carries to the next occurrence through the existing satisfy path. Empty time preserves the existing default; the UI identifies 16:00 as a default time, never a promise of delivery. Notification settings, quiet hours, the daily cap, the synced plan window and synchronization can affect phone delivery.

The repair adds this brief, corrects that default hint and its browser coverage, fixes the C3.4a comments/test label incorrectly called GRAYSON-Q2, and updates the checkpoint/PR handoff. Otherwise the implementation is unchanged.

## Exclusions and reuse

No pet profiles, veterinary records, inventory system, early warnings (C3.2), counts/streaks, TODAY redesign, notification-rule changes or yearly-repeat editing (C3.4b). No work on PR #595, #592 or #589 as part of this repair. C1.1 Production Orientation remains the next major objective in Gavin's specified sequence; it is not started here.

- **REUSE:** HOME-SCHEDULE-001 presets, HOME-001 `addHomeItem`, REMIND-AT-001 optional `remindAt`/existing custom-time status, and INTENT-002 recurrence carry-forward.
- **OWN:** five preset entries, Home's optional time input, truthful default copy and focused coverage.
- **BUILD FROM SCRATCH:** none.

## Acceptance and handoff evidence

Run the Home browser suite, including the unset/default state, custom-time state, no write before SAVE and an unchanged unset stored time; check the Home integration suite in UTC and Chicago, architecture, TypeScript and production build. Confirm required CI on the repaired exact head. Record passed/failed/skipped/unrun checks in the PR handoff; local browser checks do not establish physical-phone notification delivery. No new full-suite run is required locally solely for a wording/brief repair; full required CI remains enabled.

The prior independent BLOCK on `1a43648f` is not a review of the repair. Return the new exact head for fresh independent review. Do not self-review or merge: Gavin's sequence requires independent PASS and his approval first. Subsequent review/research reconciliation and C1.1 remain separate work.

## Repair verification

The repaired Home browser suite passes 6/6; Home integration passes 9/9 in UTC and America/Chicago. Architecture and production build (TypeScript/PWA included) pass; diff hygiene passes. No new full local suite or physical-phone notification-delivery check is claimed. Final required CI and the new exact head are recorded in the PR handoff without changing that reviewed candidate. Fresh independent review remains outstanding; no PASS or merge is claimed.
