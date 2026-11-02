# FREE-HELPER-001 — BEYOND's free helper

- **Authority:** Gavin, 2026-11-01. Asked for a free alternative to Alfred for work that doesn't need
  Alfred-level thinking ("the work doesn't call for Alfred level work it should use the free ai"), chose
  logging and questions about his data, then "We will go with your suggestions" on the v1 scope
  (logging, tasks and plans, answers from records, lookups; inside Alfred's sheet; an on-phone AI check).
- **Builder:** Claude Code. **Lane:** Feature. No schema, Engine, dependency, provider or TODAY change.
  Stacked on WEEK-PLAN-001 (#365, uses its task_plan card). Branch `claude/free-helper-001`.

## How it behaves

One message box (Alfred's sheet). Everyday messages try the free helper first:
- **Understood completely** → it answers, or makes the same SAVE/SKIP cards Alfred makes, labelled
  **BEYOND · FREE**. Free, instant, offline, no Claude key needed.
- **Anything it isn't sure of** → the whole message goes to Alfred, as before (within the monthly limit
  and the Automatic switch).
- **Alfred unreachable** (no key, no signal, at the limit) → it does the parts it understood and says
  exactly what's left and why; with nothing understood, Alfred's usual error keeps the words in the box.
- THINK HARDER, the planning quick-starts and a spoken shift debrief always go to Alfred.

It never guesses: ambiguous meals ("chicken" matching two saved meals), partial check-ins, foods
without protein, 29th–31st monthly repeats and unknown tasks are left for Alfred. Every write is a card
the operator SAVEs, through `confirmContextProposal` and the existing commands.

## What it understands (v1)

- **Logging:** water (oz/ml/l), weight, sleep and naps, at work / off work, full check-in, clean day,
  urge with reason, notes, saved meals by name with servings, a food with calories and protein given.
- **Tasks and plans:** reminders with a date, time or repeat (daily, weekly, weekday, monthly on day
  1–28), done / move / plan an open task by name, add a step to a project, tick a routine step.
- **Answers from records:** water/protein/calories today, yesterday's food totals, sleep last night or
  last 7 days (with how many days are logged), next shift, what's due or planned (week or a day), when
  did I last…, Alfred spend this month, and lookups in what he asked Alfred to keep (locker number,
  filter size, a birthday).
- Several items in one message ("16 oz water, the chicken bowl and slept 6h").

## On-phone AI check

SYSTEMS → DEVICE → CHECK ON-PHONE AI reports whether this browser offers built-in AI and WebGPU, and the
memory it reports. Read-only; downloads nothing. It decides whether a real on-phone model (v2, needs
owner approval) is worth building on this phone.

## REUSE / OWN / BUILD FROM SCRATCH

- REUSE: chrono-node (already a dependency) for dates; Alfred's proposal types, cards, describe, guards
  and `confirmProposal`; day summaries, Week Ahead, `searchRecords`, Alfred memory, spend estimate.
- OWN: the narrow phrase rules, the abstain-don't-guess policy, the free/Alfred routing.
- BUILD FROM SCRATCH: the phrase rules themselves; an on-phone LLM is deferred (v2) pending the check.

## Not yet

"Remember…" and people/home entry stay with Alfred and the People/Home screens (v2). Looser wording
waits for an on-phone model, if this phone supports one.
