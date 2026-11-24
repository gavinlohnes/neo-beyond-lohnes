# GRAYSON-WEIGHT-TREND-001 — a smoothed trend weight beside the scale weight

- **Authorization:** Gavin, 2026-11-24. Backlog row **B8** (LEARN), from the ranked backlog he approved. At 08:19 CT
  he made Claude Code a third builder with its own lane: **"Claude Code, own lane"**. That lane is DATA, Weekly
  and Delta's read-only learning (backlog, Builders). His rule (01:26 CT): **"I should be able to edit and tweak or
  correct everything in this app."** Merging this brief is his approval of the defaults below. Claude Code builds
  it once it merges.
- **Lane: FEATURE.** A pure read of the weigh-ins BEYOND already keeps (`getBodyweightHistory`) and a display
  preference in localStorage. No stored record, event, Dexie version, Engine input, target change, notification
  or navigation change.
- **Starting commit:** `origin/master` `1fd2c47`. Re-fetch before starting.
- **Builder:** Claude Code (Gavin runs it from this brief on master). Branch `claude-code/grayson-weight-trend-001`.
  **Active PR:** pending.
- **Order:** Claude Code's first brief. Overlap check on `1fd2c47`:
  - The only open PR is #641 (campaign plan text).
  - GRAYSON-FIX-UNDO-001 (Grok Bot) routes `bodyTrendQueries.ts`'s void read through `activeVoids` and changes
    BODY's remove control in `BodyScreen.tsx`. So this brief doesn't touch `getBodyweightHistoryWithSources` or
    `BodyScreen.tsx`.
  - GRAYSON-TRAIN-REST-001 (Codex) adds a line to `TRAVELLING_SETTINGS` in `settingsTransfer.ts`. Whichever lands
    second keeps both lines.
  - Recheck open PRs at build time. While other PRs are open, leave the tracker and checkpoint to the oldest open
    PR (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

BODY shows the latest scale weight and a 60-day line of raw weigh-ins (`WeightTrend.tsx`). A salty dinner or a
night shift moves the scale two pounds, and the line zig-zags with it, so he reads noise as progress or
setback (Parity Scorecards row F11, PARTIAL). After this, BODY shows **Trend 182.4 lb** next to the scale weight,
plus a smoothed line under the raw one. One honest number moves slowly and only when the weight really moves.

**Benchmark:** MacroFactor's App Store description: "Weight Trend: cuts through the noise of daily weight
fluctuations, so you see your real progress" (apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471, read
2026-11-24). We copy the idea, not its method or look. The smoothing here is the open exponential moving average
from The Hacker's Diet, the same source `engine/expenditure.ts` already credits for its arithmetic.

## Recommended defaults (approved when Gavin merges this brief)

1. **The trend:** an exponentially smoothed average of his weigh-ins, 10% per day ("Steady").
   - Gaps are handled by elapsed time: after g days, the new weigh-in counts `1 − 0.9^g`.
   - When he weighs more than once in a local day, the last one counts.
   - It starts from his first weigh-in.
   - It's shown to one decimal, in pounds, like the rest of BODY.
2. **When it shows:** after 5 weigh-ins spread over at least 7 days. Before that the line reads **Trend shows after
   5 weigh-ins over a week** and nothing is drawn.
3. **Where:** on BODY's weight card and the weight metric sheet, wherever `WeightTrend` draws its chart:
   - **Trend 182.4 lb · scale 183.6 lb Nov 22.**
   - The chart keeps the raw line and adds the trend as a second, smoother line in the same neutral ink, drawn
     dashed or lighter so the two tell apart without colour.
   - The readout and the aria label name both.
4. **Yours to change (principle 1):** two settings under the chart. Both are localStorage preferences that travel
   with the native backup.
   - **Show trend:** On or Off. Off brings back today's view exactly.
   - **Smoothing:** **Steady** (10%, the default) or **Quicker** (20%).
5. **Unchanged:** best-since, milestones, the goal projection, the expenditure readout and Weekly still use what
   they use today. Moving any of them onto the trend is a later item that would need his OK.
6. **Calm (principle 5):** no colour for up or down, no arrow, no score, no "you gained" copy. A trend moving away
   from the goal gets no warning, as Drop 5 ruled.
7. **Says why (principle 6):** a "What's the trend?" disclosure says: "Your weigh-ins averaged so one day's water or
   salt barely moves it. It only moves when your weight really does."

## Design principles check (Vision, Nov 24)

1. Yours to change: Show trend on or off, Steady or Quicker.
2. Fix, don't ask: no dialogs. A wrong weigh-in is fixed where it's logged, as today.
3. One tap for the usual: nothing to set up.
4. Built around your shift: elapsed time, not calendar days, so a run of night shifts with odd weigh-in times
   still averages cleanly.
5. Calm: no colour, arrows or warnings.
6. Always says why: the "What's the trend?" line.
7. Simple first: one number beside the scale weight; the settings sit under the chart.
8. Tap or say it: not affected.

## Scope

- `src/application/weightTrend.ts` (new, pure):
  - `smoothWeights(history, { alpha })` returns `{ recordedAt, trendLbs }[]` from `WeighIn[]`, with the elapsed-time
    rule, last-per-local-day, `TREND_MIN_WEIGH_INS = 5` and `TREND_MIN_SPAN_DAYS = 7`.
  - `latestTrend(history, alpha)` returns `{ trendLbs, scaleLbs, scaleAt } | { waiting: true }`.
  - No db access.
- `src/persistence/weightTrendPreference.ts` (new): `{ show: boolean, smoothing: "STEADY" | "QUICKER" }` under
  `beyond:weightTrendPreference`, default `{ show: true, smoothing: "STEADY" }`. It reads safely, the way
  `restMemory.ts` does.
- `src/persistence/settingsTransfer.ts`: add `"beyond:weightTrendPreference": "Weight trend"` to
  `TRAVELLING_SETTINGS`.
- `src/ui/screens/body/WeightTrend.tsx`: the trend line, the readout, the waiting line, the two settings and the
  disclosure. These show only where the chart shows (`hideChart` false), so `BodyProgress`'s facts-only use is
  unchanged.

## Excluded

Moving best-since, milestones, the goal projection, expenditure or Weekly onto the trend; a weekly-rate number;
kilograms; body fat or measurements; Health Connect weight (C4.7); any change to how weigh-ins are logged,
corrected or removed; any change to `bodyTrendQueries.ts`, `BodyScreen.tsx` or `MetricDetailSheet.tsx` beyond
what `WeightTrend` draws itself.

## Files

- **In scope:** the two new files, `settingsTransfer.ts` (one allowlist line), `WeightTrend.tsx`, CSS in
  `suitData.css`, tests, `docs/decisions/GRAYSON-WEIGHT-TREND.md`,
  `docs/agent/screenshots/GRAYSON-WEIGHT-TREND-001/`.
- **Off limits:** `src/domain/**`, `src/engine/**`, `src/persistence/db.ts`, `bodyTrendQueries.ts`,
  `BodyScreen.tsx`, `expenditure.ts`, `weeklyQueries.ts`, `android/**`, `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:**
  - the weigh-ins as `WeightTrend` already receives them, already corrected and with removals left out;
  - its chart frame, scales and `suit-data` styles;
  - `formatShortDate`;
  - the localStorage preference pattern of `restMemory.ts`;
  - the `TRAVELLING_SETTINGS` allowlist.
- **OWN:** the smoothing rule, the thresholds, the copy.
- **BUILD FROM SCRATCH:** nothing; no library.

## Acceptance

- `tests/weightTrend.test.ts` (pure, in `TZ=UTC` and `TZ=America/Chicago`):
  - Constant weigh-ins give a flat trend. A one-day 3 lb spike moves the trend by about 0.3 lb (Steady) or
    0.6 lb (Quicker).
  - A 5-day gap weights the next weigh-in `1 − 0.9^5`. Two weigh-ins in one local day use the last.
  - Under 5 weigh-ins or under 7 days, it waits. A weigh-in at 23:30 Central counts on its Central day.
  - The output is stable to one decimal.
- `tests/browser/WeightTrend.test.tsx`:
  - BODY shows "Trend … · scale …", both lines draw, and the aria label names both. The waiting line shows with
    4 weigh-ins.
  - Show trend Off restores today's chart exactly.
  - Quicker changes the number, and the preference survives a native backup round trip.
  - The facts-only `BodyProgress` use shows no trend controls.
  - Keyboard only; 320/360/412 px with no overflow; axe clean.
- Existing BODY, weight, expenditure and Weekly tests stay green, and the new tests fail on master. Run
  `typecheck`, `check:architecture`, `check:risk`, build, focused tests in both zones, and the full
  `TZ=UTC npm run verify`.
- **Screenshots** go in `docs/agent/screenshots/GRAYSON-WEIGHT-TREND-001/` at 360 px, with the key ones also at
  320 and 412: the card with the trend, the waiting line, the settings, and the disclosure open.
- **Device check (Gavin, Android):** open BODY and check the trend number sits close to the scale weight and the
  smooth line follows the zig-zag. Switch to Quicker, then turn the trend Off and back On. Then
  KEEP / REFINE / RETHINK.

## Decision record

The build PR records the approved defaults in `docs/decisions/GRAYSON-WEIGHT-TREND.md` (DEV-FLOW-002, 2026-11-23
amendment).

## Stop and ask Gavin if

- the work needs a stored record, event, Dexie version or a change to `bodyTrendQueries.ts`;
- the trend would feed the goal projection, expenditure, a target, Weekly or the Engine;
- the chart can't show both lines legibly at 320 px without colour;
- it seems to need a weekly-rate number or any up or down colour.

## Risks and checks

- **Early weigh-ins:** starting from the first weigh-in means the first few trend values lean on it. The 5-and-7
  floor keeps that out of view.
- **Two numbers:** the scale weight stays the big number, and the trend sits beside it, so nothing he relies on
  moves.
- **Size:** S.
- **Stale facts to recheck at build time:** the `WeightTrend` call sites, the `TRAVELLING_SETTINGS` list, and
  open PRs.
