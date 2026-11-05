# LIFE-PATTERN-001: the YOUR LIFE section pattern across BEYOND

## Brief

- **Authorization:** Gavin said "Go" to the plan on 2026-11-05 in the reviewer session, then confirmed it
  directly to the Builder: "Plan confirmed", with Claude Code as Builder ("I will have you do it").
  Bounded owner approval covers the TODAY step below.
- **Risk lane:** Protected presentation (it touches TODAY last). Presentation only.
- **Builder:** Claude Code. **Reviewer:** the independent review session, at each PR's exact head.
- **Starting commit:** `dd191d83` (WHOLE-LIFE-001, #423).
- **Scope:** apply what worked on the YOUR LIFE page (#423), one screen per PR, each with before and after
  phone screenshots at a real 360 px viewport:
  1. Shared section primitives, this guide and a Decision Register entry.
  2. TRAIN. 3. BODY. 4. MORE menu and Plans. 5. Weekly review. 6. TODAY last.
- **Exclusions:** no change to the Engine, recommendations, what's saved, schema, events, backups or the
  four primary tabs. On TODAY, the order and the Engine's next action above the fold stay exactly as they
  are; only the support sections below get the pattern.
- **Acceptance per PR:** typecheck and the focused tests green, the full suite green in CI, before and after
  phone screenshots, independent exact-head review PASS.

**Leverage gate.** REUSE: the YOUR LIFE page's section shape and `readSection` wrapper (#423), and the
native `<details>` disclosure for folding. OWN: BEYOND's wording rules and the order of each screen's
sections. BUILD FROM SCRATCH: none.

## Pattern guide

Use `src/ui/components/Section.tsx` and `src/application/sectionRead.ts`.

1. **One section shape.** `Section`: a small mono eyebrow label, a plain heading, one or two lines, and one
   clear way in (`wayIn`). One way in per section, not a row of buttons.
2. **Fixed order.** Where you are, then what's next, then the sections by importance, with "more" last
   (`MoreSections`).
3. **Kind empty states.** `SectionEmpty`: calm, true wording. Never a "0", never a nudge ("You haven't…",
   "Don't forget…").
4. **Recorded numbers only.** `RecordedCount` ("2 / 3 steps recorded"). No estimated progress. Missing data
   says missing.
5. **Sections fail on their own.** Read each source with `readSection`. An unread source renders
   `SectionUnavailable`, never an empty list.
6. **The BEYOND look.** Black, the red rule, mono labels and targets of 44 px or more. Borrow layout, never
   streaks or pressure.

**Voice.** Keep BEYOND's plain, direct voice: say what is there and what it does. No slogans ("Take yourself
with you", "Your day. Your direction.").

**Phone length.** The top two sections do the work. The rest folds into `MoreSections` or moves to MORE.

**Screenshots.** Check each page at a real 360 × 800 viewport. Full-page screenshots misplace the fixed tab
bar, so use viewport captures and scroll for the lower sections.
