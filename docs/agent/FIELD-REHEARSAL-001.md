# FIELD-REHEARSAL-001 — the suit, walked on eight weeks of rotation

- **Authority:** Gavin, 2026-10-28: "Make it count and do some amazing stuff." This applies the
  acceptance bar from SUIT-VOLUME-001 ("360px smoke") and the standing doctrine (AA in every mode,
  one red, calm idle). ROUTINE: corrections and a test. No Engine, schema, event or product-rule
  change. **Builder:** Claude Code.

## The rehearsal

`tests/browser/FieldRehearsal.test.tsx` writes 56 lived days of the owner's own schedule pattern
(DEFAULT_SCHEDULE_PATTERN, the real 2-2-3) through the app's real commands. Each day gets sleep, a
check-in, water, protein, and a weigh-in every third day. The test then walks TODAY, every DATA
cave view (NUMBERS, TONIGHT, ROUTE, BRIEF, VITALS, FILE, LOG), TRAIN and MORE in real Chromium at
three moments:
- 75 minutes before a shift;
- on shift at 21:00;
- the first day off.

It runs at 360px, plus 390px on shift. Each screen must have:
- no page error;
- no horizontal overflow;
- no WCAG A or AA axe violation once animations settle.

On TODAY, it also checks that at most one suit band is accented and nothing is still moving. Set
`VITE_REHEARSAL_SHOTS=$PWD/.cache/rehearsal` to save screenshots of each screen.

## What it found and fixed

1. **On-shift primary buttons failed AA.** The dimmed `--text-1` on the dimmed red measured
   4.03:1, so every red primary failed on shift (START WORKOUT and the rest). The fix uses the
   prototype's on-shift CTA text, `#e2e2e2`, which gives 6.32:1.
2. **VITALS painted every day off amber on a work day.** This was a regression from SUIT-VOLUME's
   "off-normal both ways" rule. Days off sleep above the work-day band. Bars are now judged only
   against the band of their own kind, and the caption names that band.
3. **PREFLIGHT read "pack · food and pack · bottle".** Panel labels had leaked into the sentence.
   It now reads "food and bottle".
4. **On the first day off, TONIGHT said "no full day off since".** It now says "today is your first
   day off". Later days off add "and today".
