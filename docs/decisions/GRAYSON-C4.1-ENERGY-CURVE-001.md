# GRAYSON-C4.1-ENERGY-CURVE-001 — where the energy curve puts the body clock on night runs (DRAFT)

**Status: draft for Gavin. Nothing here is locked until he chooses.** Gavin, 2026-11-23 22:01 CT: "Go on C4.1, the
energy-curve fix", with the brief and this draft coming to him before any model code changes.
[Brief](../agent/GRAYSON-C4.1-ENERGY-CURVE-001.md). PR: pending. Amends ENERGY-CURVE-001's model line "a 24-hour
circadian rhythm C has its low 1.5 h before your habitual wake" only as decided below.

## The question

`application/alertness.ts` `energyCurve()` puts the circadian low 1.5 h before the median wake of the last 7 days'
main sleeps. On a night run that is day sleep, so the low lands at 12:30 (18–06 shift), 13:30 (19–07) or 13:00
(22–06:30), inside day sleep, and the rhythm peaks mid-shift. On his 2-2-3 rotation it flips 7 h between nights, and an
even mix of night and day sleeps averages to a 09:00 low. The displayed lowest stretch and drive line already sit at
the end of the shift (the #592 reconciliation's correction stands); this decides the rhythm's shape underneath.

Evidence: most night workers do not meaningfully adapt within 3 nights (Boivin, Boudreau & Kosmadopoulos, J Biol
Rhythms 2022, doi:10.1177/07487304211064218); hospital night workers delayed a mean 1 h 40 min ± 1 h over 3–4 nights
(Stone et al., J Physiol 2018, PMC6002215), about 0.5 h per night; under 25 % of permanent night workers adapt
(Folkard 2008, PMID 18533325). A single night shift's shift "reset to normal by the next day" (Nurses' Health Study 2
field abstract, J Clin Oncol 2012 30:15_suppl 1556; an abstract, weaker evidence). None of these measures Gavin's clock;
any rule is a proxy, labelled an estimate as today.

## Options

**R. Lagging body clock (recommended).** Walk main sleeps of the last 28 days oldest first from the oldest one's own
target (wake − 1.5 h). A later target moves the low at most 30 min per main sleep; an earlier target (a night-time
sleep) is followed at once.
- His 2-2-3 (18–06, nights off 23–07): nights 1/2/3 → 05:30 / 06:00 / 06:30 (now 05:30 or 12:30, flipping).
  If he stays up late on days off (02:00–10:00): 08:30 / 09:00 / 09:30 (now 08:30 or 12:30).
- 19–07, five nights after days off: 05:30 → 07:30 by night 5 (now 05:30, then 13:30 from night 5).
- Permanent 22–06:30 nights: 05:30, +30 min a night, 09:00 by night 8, fully adapted (13:00) by night 16, then stable.
- Day worker with regular sleep: identical output. Late weekend (wake 09:00 vs 06:30): low up to 60 min later on
  Sunday, Monday back to today's value.
- Displayed "Lowest stretch" widens on short runs (night 3 of 18–06: 04:00–07:00 → 01:15–07:00); the drive line stays.
- Cost: one function, one constant, one more input; two new sources. Trade-off: one night-time sleep fully resets
  even a long-adapted clock (overstates re-adjustment, errs toward a waking-night low).

**N. No adaptation.** Anchor only on night-time sleeps (start 20:00–03:59) from 28 days; fall back to today's rule
with fewer than 3. His rotation: always 05:30. Simplest and day-worker-identical, but never models the partial delay
that does happen, and after 4 weeks of nights with no night sleep it jumps straight to full adaptation.

**P. Symmetric rate limit or smoothing.** Same walk as R but capped both ways (or an exponential average). On a
balanced rotation it has no restoring pull and settles wherever it started: simulated 11:05–12:18 for his 2-2-3,
inside day sleep. Rejected.

**C. Clamp the low to a fixed early-morning window (e.g. 03:00–08:00).** The #592 reconciliation already rejected
"forcing a 03:00–08:00 low"; it ignores his own sleep. Rejected.

**0. No maths change.** Keep the full-adaptation anchor (the displayed stretch and drive line are already at the end of
the shift) and only correct C4.1's campaign wording, which the #592 reconciliation flagged as stronger than the
evidence. Leaves the mid-shift peak, the 7 h flip and the 09:00 artifact.

## Contracts

No Engine (`src/engine/**`, `evaluate`), recommendation, advisory or trace change: the curve "never feeds the Engine
and never changes advice" (ENERGY-CURVE-001), and its only reader is TODAY's panel. No schema, Dexie version, backup,
restore, protected fixture, dependency or provider change; everything is derived from Garmin sleep already stored.
`EnergyCurve.basis` gains an additive `lowMinutes` (application → UI only). Existing tests and fixtures are
expected to be unchanged because their histories hold day sleeps only.

## To decide

1. Option R, N or 0.
2. The explanation sentence (C4.1 said "copy unchanged"). Draft amendment, replacing "against a 24-hour rhythm whose
   low sits about 1.5 hours before your usual wake":
   "against a 24-hour rhythm whose low sits about 1.5 hours before you wake from a night-time sleep and, on a run of
   day sleeps, moves later by at most half an hour a day, because most night workers' body clocks lag."
3. Accept the wider lowest stretch on short runs in C4.1, or tighten it as a separate follow-up.
