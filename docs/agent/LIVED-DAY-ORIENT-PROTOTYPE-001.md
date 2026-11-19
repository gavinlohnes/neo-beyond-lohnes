# LIVED-DAY-ORIENT-PROTOTYPE-001 — phone-first visual checkpoint

**Lane:** Protected, non-production prototype

**Owner authorization:** Gavin approved the exact bounded objective on 2026-11-19: create an isolated
phone-first prototype across realistic workday, day-off, difficult-day, sparse, and unknown-context
states; do not connect production commands, persist data, change TODAY, alter Engine/recommendation
semantics, call an AI provider, rename the runtime, modify Google Drive, or authorize implementation.

**Starting commit:** `29bc9efad66ff2a86836eb84394ea9be7e073f4c` (merged PR #588)

**Builder:** Codex

**Branch:** `codex/lived-day-orient-prototype`

**Active PR:** pending

## Outcome

Create one coherent, inspectable phone prototype that lets Gavin assess the approved Orientation
hierarchy and relationship before any production architecture or recommendation-authority decision.
It must demonstrate deliberate START DAY, immediate exit, non-gating context, adaptive Delta voice,
one primary recommendation with at most two supporting actions, Release, ENTER TODAY, and reopen.

## Scope

- Self-contained `prototype/lived-day-orientation/` HTML and README, outside `src/` and production entry
  points.
- Workday, day-off, difficult-day, sparse, and unknown-context scenarios.
- Responsive phone presentation at 320, 360, and 412 CSS pixels.
- Local, reversible interactions in page memory only.
- Browser, accessibility, keyboard, overflow, network, and boundary verification.
- Checkpoint/roadmap truth, reviewed PR, and visual evidence for Gavin.

## Exclusions

- No `src/` edit, production import, runtime route, TODAY composition, command, persistence, schema,
  event, Engine, recommendation semantic/priority, provider/model call, dependency, navigation, rename,
  notification, service worker, analytics, or Google Drive change.
- No crisis workflow or claim that sample recommendations are Engine output.
- No implementation authorization, production migration plan, or concurrent PR #584/#473 change.

## Acceptance evidence

- START DAY opens Orientation; EXIT and ENTER TODAY work; Orientation can reopen.
- Every state follows Situation → You → Delta → zero/one Recommendation → at most two Supporting
  actions → Release.
- Sparse/unknown states abstain instead of fabricating priority; check-in never gates access.
- All controls are keyboard reachable, named, and at least approximately 44 CSS pixels on phone.
- No page error, external network request, horizontal document overflow, persistence, or production
  connection is observed at 320/360/412 widths.
- Independent exact-head review and Gavin's visual assessment precede merge.

## Leverage disposition

- **REUSE:** existing standalone prototype boundary, current BEYOND instrument language, merged
  Orientation design, and native HTML/CSS/JavaScript.
- **OWN:** the Lived-Day Orientation composition, realistic scenario set, Delta presentation, and
  prototype interactions.
- **BUILD FROM SCRATCH:** no commodity subsystem; only the BEYOND-specific prototype surface.
