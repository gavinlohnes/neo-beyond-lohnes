# ALFRED-COST-001 — Alfred's monthly limit and automatic switch

- **Authority:** Gavin, 2026-10-31: worried Alfred would cost too much and be too big a part; on the
  proposal (a monthly limit; an on/off switch for automatic Alfred) said "Build those 2".
- **Builder:** Claude Code. **Lane:** Feature (no schema, Engine, TODAY composition or dependency change).
  **Start:** master `ba19685`. Branch `claude/alfred-cost-001`.

## What it does

Alfred → **Limits** (footer, beside Memory):
- **Monthly limit ($).** Once BEYOND's estimate for the calendar month reaches it, Alfred makes no
  request (chat, THINK HARDER, TODAY brief, weekly review) until next month or a new limit. The chat
  says so plainly and keeps your words. Everything else in BEYOND works.
- **Automatic Alfred** on/off. Off: no TODAY brief (and no old one shown) and no auto-written weekly
  review; saved reviews still show. Alfred only speaks when opened and asked. Default on (unchanged).
- Both kept on this phone (localStorage), beside the existing spend estimate.

Honesty: the limit counts BEYOND's own estimate at list prices; the Anthropic console's spend limit is
the hard ceiling and is named in the panel. A tool round already in progress may finish one answer.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** ALFRED-005 month spend estimate, existing sheet footer and settings pattern.
- **OWN:** the limit check before each request and the automatic switch.
- **BUILD FROM SCRATCH:** none.

## Acceptance

`tests/browser/AlfredCost.test.tsx`: defaults, limit math, chat refuses at the limit with no request and
words kept, Limits panel sets both (axe), brief makes no request when off or at the limit and shows no
stale brief. Existing Alfred suites pass. Full verify, review, green CI; Gavin merges.
