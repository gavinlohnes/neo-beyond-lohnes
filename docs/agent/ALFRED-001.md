# ALFRED-001 — the man in the chair, first working version

- **Authority:** Gavin, 2026-10-31: "I think the Claude API idea is fantastic and so is the Alfred
  idea", then "approve the new rules" (RULES-2026-10-31 in `docs/UX_DECISIONS.md`; amendments in
  `docs/PRODUCT_DIRECTION.md`, `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, `AGENTS.md`).
- **Builder / lane:** Claude Code; Protected (new runtime dependency `@anthropic-ai/sdk`, new
  external provider, governance amendment), within the owner's go. Branch `ccr-0be4f40f-16m0ja`.

## What it does

Alfred opens from every screen's header (Ask Alfred) and from LOG (SAY IT TO ALFRED).
- **Talk or type.** Voice uses the browser's speech recognition; text works everywhere.
- **He reads BEYOND's records** (`application/alfred/alfredContext.ts`): today's food and shift,
  the next 7 days' schedule, Garmin's last night, steps and resting HR, the last 14 lived days, open
  tasks and notes, saved meals, targets and the quit tracker. Plain lines he can cite; nothing inferred.
- **He proposes, the operator confirms** (`alfredActions.ts`): log meal (saved meal by id, or an
  estimate), water, sleep, weight; add a reminder (date, repeat RRULE, "after you wake" note); save a
  note. Each is a card — SAVE runs BEYOND's own command; SKIP writes nothing. The next turn tells him
  which were saved.
- **Claude Opus 5.5** through the official SDK in the browser with the owner's key (kept in this
  phone's storage, never in backups or the code), adaptive thinking at effort medium, server-side
  refusal fallback (`fallbacks: "default"`), the records block prompt-cached. Each conversation shows
  its approximate cost.
- **Fails plainly:** no key → setup; no signal, a bad key or a limit → a clear line; BEYOND keeps working.

## Leverage

- **REUSE:** the Anthropic TypeScript SDK and tool use; BEYOND's queries and commands; the existing
  LogSheet; browser speech recognition; obligations' existing RRULE recurrence.
- **OWN:** Alfred's persona and rules, the records summary, the proposal cards.
- **BUILD FROM SCRATCH:** none beyond that BEYOND-specific glue.

## Next

Notifications at moments (native app), reminders that fire at a time, Alfred speaking first when it
matters, and asking "did this work for me?" over longer history.

## Tests

`tests/browser/Alfred001.test.tsx` (key setup with axe; cards and SAVE/SKIP through real commands;
request shape: model, cached records, tools; tool results on the next turn; offline message; the
records summary), with Claude's replies faked.
