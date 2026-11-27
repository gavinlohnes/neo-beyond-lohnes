# GRAYSON-SET-TYPES — working, warm-up, drop and failure sets, and timed exercises (owner go, 2026-11-26)

Gavin approved the [brief](../agent/GRAYSON-SET-TYPES-001.md) ("Brief all four"; TRAIN must fully replace Hevy). Merging
it approves the defaults below.

- **Four kinds** on the existing set event and row (`setKind`, optional): WORKING (missing still means working),
  WARMUP, DROP and FAILURE. One tap on the set's picker, which says what the kind does to his numbers. A set's kind can
  be changed after it is logged, through the existing fix path (`correctsSetId`) with UNDO.
- **Drop sets** carry `dropOf` (the set above) and share its set number, so they never take a working slot. ADD DROP on
  a logged set logs one at once: his drop step lighter (20% by default, 5 to 50% in MORE), rounded down to the
  exercise's weight step, same reps, and the running rest timer stops. A drop counts in volume and sets per muscle; it
  never sets a best, an estimated one-rep max, a progression step or a stall's evidence, because a lighter set straight
  after a heavy one isn't a fair test.
- **Failure sets** count as working sets everywhere; reps in reserve is set to 0.
- **`countsTowardBest`** (WORKING and FAILURE) sits beside `isWorkingSet` (which still counts drops, for volume).
  Records, progression, stall, the block's estimated max, the strength curve, MIRROR and the "last time" numbers use it.
  For sets without a kind, both read exactly as before; a fixture pins the engine's outputs on today's kind of history.
- **Timed exercises** (`measure: "TIME"`, `targetSec`, 5 s to 10 min, 30 s by default) on library entries (Plank,
  Farmer's Carry), his own exercises and routine slots, switched with "Timed". A timed set logs `durationSec` (1 s to
  60 min) with 0 reps and any weight. START counts up and buzzes once at the target with the rest timer's buzz and his
  buzz setting; DONE logs the hold. He can type the seconds instead.
- **Timed bests:** the longest hold at that weight or heavier (record kind TIME); the first session sets none, as reps.
- **Timed progression:** every prescribed working set held the target → suggest the target + 5 s; otherwise hold the
  target. No re-entry or deload for holds (no load to ease off). Advisory only, like the rep rule.
- **Words:** history, the fix sheet, export (`set_kind`, a new last column `held`) and Delta's search say "warm-up",
  "drop", "to failure" and "held 0:45".
- Optional fields on the existing events, not a new event type, so his history isn't split. No table or Dexie version.
