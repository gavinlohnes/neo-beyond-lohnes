# UX-POLISH-001 — make the new areas findable and finished

- **Authority:** Gavin, 2026-11-01: "Go polish", after a hands-on UX review of the built app at 390px.
- **Builder:** Claude Code. **Lane:** Routine (copy, search entries, styling, one moment rule within the
  already-approved TODAY routine row). No schema, Engine, dependency or TODAY composition change.

## Review findings and fixes

1. **Couldn't find the new areas.** Search found only "routine". Now PROJECTS, PEOPLE and HOME are
   search entries ("project", "birthday", "family", "gift", "house", "filter", "chore"…). PEOPLE and
   HOME open their own MORE screens; PROJECTS opens MISSIONS & OBLIGATIONS (described as including
   projects). All three are search-only: MORE-TRIM-001 keeps the browsed list at 25 or fewer.
2. **Two places to mark the bottle.** The routine editor now says food and bottle already have
   buttons in TODAY's prep; the example steps no longer include them.
3. **Routine row missing before the work question was answered.** The row now follows this lived day's
   own scheduled shift, live (`predictedWorkPhase`, from `livedDayShiftWindow` and the ticking clock),
   until the day is declared. A scheduled day off has no shift, so nothing shows; a declared day off is
   still a day off. (Prep itself still waits for the declaration; this is the routine row's own rule.)
   Review of #361 caught that a first version used the calendar-day prediction, which put a day off's
   morning "before shift" and went stale while TODAY stayed open; fixed and tested.
4. **Unfinished-looking controls.** Routine ticks and the Automatic Alfred box use BEYOND's accent
   (`.beyond-check`), not the browser's blue. The Limits row is one line: amount field and a normal button.
5. **Alfred's quick-starts skipped the new areas.** Added "Write a routine", "Remember a birthday" and
   "Add a house job"; each fills the start of a sentence for him to finish. Nothing is sent until SEND.

Not changed: the browsed MORE list (MORE-TRIM-001), Alfred's search entry (Alfred stays the header button).

REUSE: the COMMAND catalog and its search, existing panels, CSS accent tokens. OWN: the entries, copy
and moment fallback. BUILD FROM SCRATCH: none.
