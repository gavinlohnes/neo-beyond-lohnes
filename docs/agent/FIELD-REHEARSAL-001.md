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

## FIELD-REHEARSAL-002 — one whole shift, through the screens

`tests/browser/FullShift.test.tsx` uses the same eight weeks (`tests/browser/helpers/rotation.ts`) and
walks one shift using only taps, reopening the app at each moment the way a phone is picked up:
- 16:45: START DAY, then PREFLIGHT, then STARTED WORK;
- 17:30: a quick-add meal logged for 17:10;
- 21:00: water, then CHANGE TIME to 20:30;
- 05:30: LANDING, with the strip showing both;
- 05:50: WORK ENDED on TODAY;
- 06:30: SHIFT SECURED at 13:05 on the clock, from the real start and end.

Every stop is checked for overflow and axe AA.

It found and fixed:
1. **TODAY's comms line said "Water 0 oz" after a drink.** It re-read only every 5 minutes. TODAY's
   suit bands now re-read on every finished refresh.
2. **WORK ENDED was out of reach in the last minutes of a shift.** It is now one tap on LANDING and
   on TODAY's shift line.
3. **SECURED's "on plan" rows took PREFLIGHT's GO styling.** The style is now scoped to PREFLIGHT.
