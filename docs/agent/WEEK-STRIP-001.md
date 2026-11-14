# WEEK-STRIP-001 — the coming days at a glance on TODAY

- **Authorization:** Gavin, 2026-11-14 ("Let's work", on the queue: "1 and 2 back to back"). This fixes WALKTHROUGH-002
  finding 6.
- **Lane:** Feature. Read only: no Engine, schema, command or IA change.
- **Branch:** `ccr-88f5c085-week-strip`.
- **REUSE:**
  - Week Ahead's own days, through the shared resolver (RECORDED > CONFIRMED > PREDICTED > UNKNOWN);
  - TODAY's in-place WEEK AHEAD panel and its rows (`data-week-ahead-day`);
  - the existing What-If and confirm, move and cancel flows.
- **OWN:** `ui/screens/today/WeekStrip.tsx` and its tiles.
- **BUILD FROM SCRATCH:** none.

## What it does

Under NEXT, seven quiet tiles show the coming lived days:

| Tile | Meaning |
|---|---|
| Bar | A work day |
| Thin line | A day off |
| Solid | Recorded |
| Outlined | Forecast |
| Red notch | Confirmed change |
| "?" | Not known; there is no saved schedule |
| Ring | The current lived day |

- **Accessible names:** each tile says what it shows, e.g. "Fri, Nov 20: work 18:00, confirmed change. Open in week
  ahead".
- **Tap:** a tile opens Week Ahead in place, scrolled to that day, where its What-If and confirm, move or cancel live.
  Nothing is written.

Screenshot: `docs/agent/screenshots/WALKTHROUGH-002/11-week-strip.png`. Not a field test.
