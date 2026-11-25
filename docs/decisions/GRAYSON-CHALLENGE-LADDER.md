# GRAYSON-CHALLENGE-LADDER — the earned challenge ladder for habits (owner go, 2026-11-25)

Gavin's answers on the design, and his merge of the [brief](../agent/GRAYSON-CHALLENGE-LADDER-001.md)'s PR, approve
these.

- **Habits only, for now:** a miss is an explicit "Didn't do it" on a day the habit was due. An unanswered day never
  counts as a miss.
- **On by default, easy to turn off:** there is one switch for all habits (TODAY's quiet line "Habit check-ins") and
  one per habit ("Stop asking about…", with UNDO). The per-habit switch travels with the backup.
- **Four steps, each earned:**
  - ASK (2 misses in 14 days);
  - NAME (3 misses in 28 days and 2 answers);
  - CHALLENGE (only after he agrees, and only for "forgot" / "didn't feel like it" on days that weren't low-energy);
  - EXAMINE (6 misses, or a challenge answered twice), after which Delta stops asking.
  - NOT RIGHT, CHANGE THE PLAN and EXAMINE's replies give 14 quiet days, and counting restarts.
- **Calm:**
  - one line a day at most;
  - none on a low-energy day;
  - it sits in the quiet-line budget;
  - never red and no streaks;
  - patterns are named as the plan or the moment, never the person.
- **Stored:** his answers, as a global, strict, append-only event (`HABIT_LADDER_ANSWERED`). Nothing changes a habit,
  a recommendation or the Engine.
