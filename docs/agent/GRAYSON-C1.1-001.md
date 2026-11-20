# GRAYSON-C1.1-001 — Orientation slice 1: work-night wake

- **Owner authorization:** Gavin, 2026-11-20. After the proposal page (before/after, every state, source map) and
  the runway follow-up, he chose the trigger: "I'd rather hit a button to start my day. I can't always promise
  that I'm getting up at the same time everyday ... Approved." Then, after C1.0 was split out: "C1.1 next".
  Decisions in that approval: Orientation opens from a deliberate START DAY tap; the Engine keeps sole
  recommendation authority (Option A: the recorded Engine recommendation, else the approved pre-check-in draft;
  no Orientation arbitration rule); runway-to-shift layout built only from times BEYOND already has.
- **Lane:** PROTECTED (TODAY composition; how recommendation authority is presented). Independent exact-head
  review, green CI and Gavin's merge required. Builds on C1.0 (#596); this PR merges after it.
- **Builder:** Claude Code. **Branch:** `ccr-380c4225-c1-1` (stacked on C1.0's `ccr-380c4225-1es42i`).
  **Starting commit:** `4f3d183`.
- **Operator benefit:** at 15:05 on night 2 one tap gives him, on one screen: tonight's shift and how long until
  it, last night's sleep against his own work-day range, Delta's one- or two-sentence read, the one
  recommendation with its source (DRAFT or ENGINE), the runway (nap window, timed commitments, shift, caffeine
  cut-off), and at most two things worth doing before the shift. ENTER TODAY returns to TODAY unchanged.
- **Composition:** Situation → You → Delta → 0 or 1 recommendation → runway → ≤ 2 actions → Release. Unknown
  work context asks WORK/OFF first; no sleep record says so ("No main sleep is recorded since the shift", never
  "poor sleep"); a failed read is shown as unread with RETRY, never as empty; no check-in narrows Delta and never
  gates the screen. A day off keeps today's TODAY (C1.2). A work day started by the roll or a log offers it
  through TODAY's quiet entry button, which reads ORIENT TODAY until seen and ORIENTATION after (no red, nothing
  above the day: FIELD-AUTHORITY-001 / TODAY-FOLD-001). Reviewed/set-aside is a
  device-local marker for that day only (`orientationStore.ts`), not a record.
- **Delta:** deterministic sentences from the facts on screen (`deltaLine`); it restates or explains the
  Engine's advice and never adds its own; certainty is capped by evidence (no range → no comparison). No AI call.
- **REUSE:** BEYOND 4.0-d's briefing preview (evolved and replaced: `todayBriefing.ts`, `TodayBriefingPreview`),
  `todayPicture`/`lifeState`, `shiftRun`, `getLastMainSleep`, personal baselines, the Engine recommendation and
  `getRecommendationDraft`, `getPreparation`, eligible obligations and `classifyObligation`, the shift sleep
  plan's nap window and caffeine cut-off (`caffeineAt` added, the card's own number), `CheckInSheet`,
  `WorkPreparation`, capture, TRAIN/BODY/Plan routes, the visual foundation's `Panel`/`SourceTag`.
  Flighty's "what changed, why it matters" order and Timeshifter/Structured's single timeline to a fixed time
  are borrowed as ideas only. **OWN:** `orientation.ts`, `deltaLine`, `Orientation.tsx`, the runway.
  **BUILD FROM SCRATCH:** none.
- **Exclusions:** no Engine, priority, schema, event, notification, provider, dependency or AI change; no new
  recommendation; nothing written by viewing; no day-off/recovery grammar (C1.2); no navigation change.
- **Retired:** the opt-in PREVIEW BRIEFING (its NOW line is Orientation's Situation; NEXT stays on TODAY's band;
  the Garmin import stays visible in BODY). Its entry button becomes ORIENTATION.
- **Acceptance:** pure composition tests (draft, Engine after check-in, runway order, ≤ 2 actions, unknown,
  no sleep, failed reads, Delta wording); integration against real records (writes nothing, tonight's shift 2 of
  3, Engine after check-in); browser states at 320/360/412 px (≤ 1 recommendation, ≤ 2 actions, no overflow,
  axe), routing, WORK/OFF answer, RETRY; the flow through TODAY (START DAY opens it, ENTER TODAY returns with no
  write, ORIENTATION reopens, CHECK IN opens over it, ORIENT TODAY after a rolled-in day; full-shift walkthrough with PREFLIGHT after ENTER TODAY); full Node and browser suites;
  Gavin's phone look.
- **Handover:** a START DAY close to the shift (PRE_WORK) shows Orientation, then ENTER TODAY hands over to the
  existing PREFLIGHT once. Two screens in a row on a late start; worth Gavin's look on the phone.
- **Known limits:** after ENTER TODAY, a check-in made from TODAY doesn't reopen Orientation (ORIENTATION does);
  BODY sleep and TRAIN leave Orientation for their own screens; the runway has no leave time (BEYOND records none).
