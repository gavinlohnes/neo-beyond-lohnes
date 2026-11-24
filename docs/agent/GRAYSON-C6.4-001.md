# GRAYSON-C6.4-001 — "Why am I seeing this?" on Delta's lines

- **Owner authorization:** Gavin, 2026-11-24: "Go". He approved the flakes fix (#637) followed by C6.4.
- **Lane:** FEATURE (plan: C6.4 · Feature · S). Independent exact-head review including product quality, plus green
  CI. The Builder may merge under the owner merge delegation. **Builder:** Claude Code. **Starting commit:** master
  after #637. **Branch:** `ccr-380c4225-1es42i`.
- **Operator benefit:** every Delta line, coach suggestion and advisory note can be asked "why?" in one tap. The answer
  is the rule that produced it and the facts it read, with dates where they have one, so he can check Delta against
  his own records instead of trusting it.
- **What ships:**
  - **Shared shape:** `WhyTrace` (`domain/intelligence/types.ts`) holds the rule plus the facts. `WhyTraceDisclosure`
    renders it inside the existing `WhyDisclosure` (DEPTH-001 native `<details>`, closed by default) as "WHY THIS?".
    `WhyTraceBody` is the same content for a surface that is already behind a disclosure.
  - **Orientation's DELTA panel.**
    - `deltaRead()` returns the line and the rule from the same branch, so the why can never drift from the words.
      `deltaLine()` is unchanged in output and is now a wrapper.
    - `deltaFacts()` lists only what the line read: the day (lived date and purpose), sleep (length and source), the
      usual range, the check-in, the guidance (Engine or draft), short nights, the shift run, Minimum Day and what is
      due.
  - **Coach cards:** each kind states its rule and facts.
    - TRAIN uses the progression, re-entry and deload rules, built from the engine's own constants, plus the last
      three working sets with dates.
    - A finished test shows its date range.
    - The weekly calorie proposal shows its numbers.
    - A tag pattern shows its counts, "a pattern, not proof".
    - REVIEW SUGGESTION stays the way to the records.
  - **Advisory:** each item's existing WHY gains the producing module's rule (`ADVISORY_RULE`, one per source module).
- **Not in scope:** new reads, so Orientation's sleep and check-in timestamps are not added. Links from Orientation's
  why to records beyond the routes it already has. Any wording change to Delta's lines. Any recommendation or Engine
  change.
- **REUSE:** `WhyDisclosure` (DEPTH-001), each surface's existing facts and the engine's own rule constants. **OWN:**
  the `WhyTrace` shape, the rule wording and the facts mapping. **BUILD FROM SCRATCH:** none.
- **Acceptance:**
  - `tests/whyTrace.test.ts`:
    - the exact why for a draft day;
    - the Engine after check-in;
    - no sleep recorded;
    - a sweep over every branch: whenever Delta speaks there is a rule, and the text equals `deltaLine` (500+ spoken
      cases);
    - every advisory source module has a rule.
  - Browser:
    - Orientation's WHY THIS? opens to the rule and facts at 320 px: 16 px text, no overflow, axe clean.
    - The coach card's WHY THIS? shows its rule and dated sets, with REVIEW SUGGESTION intact.
    - Advisory shows the rule line.
    - The existing Orientation state matrix (320/360/412 with axe) passes with the closed disclosure.
  - Screenshots: `docs/agent/screenshots/grayson-c6.4/`.
