# BEYOND apps checklist — what BEYOND takes over

Owner selection, 2026-11-03 (Gavin picked from a list). Each item still gets its own brief, tests,
independent review and green CI before merge. BEYOND's rules hold for all of them: free-first,
local-first, nothing saves without his SAVE, the Engine keeps recommendation authority, and there are
no streaks, guilt or nagging.

**Field test:** Gavin paused ROTATION-FIELD-001 (#402) on 2026-11-03 ("Pause it, build now"). It restarts
once these items are merged. **Builders:** Codex builds most items; Claude Code reviews and merges on
an independent PASS and green CI (Gavin's standing rule). These are BEYOND's own features, not the
outside apps; only A8 and A9 connect to the real services.

## Selected

| # | Item | From | Notes |
|---|---|---|---|
| A1 | **Snippets + log templates** | Espanso | `;gym` expands in any BEYOND text box; a saved phrase ("usual pre-shift") logs a set of items, still waiting for SAVE. |
| A2 | **Share into BEYOND** | Raindrop, Shortwave | The Android share menu sends a link, text or email to a **Saved** inbox: tag it, add a note, or turn it into a task. Extends the existing share target. |
| A3 | **Daily note + [[links]]** | Obsidian | One note per lived day (16:30 to 16:30) with that day's logs pulled in. `[[links]]` between notes, people, projects and days, with a "mentioned in" list. |
| A4 | **Routine player** | RoutineFlow | One step at a time, big targets, a timer per step, optional voice; step durations and "takes about N min". Started from TODAY's routine row. |
| A5 | **Habits (no streaks)** | TickTick | Tap to mark done; weekly counts only; never a streak, miss count or guilt. Built beside routines and the quit tracker. |
| A6 | **Collections** | Notion | His own lists with a few fields (gear sizes, gift ideas, car service). Searchable, in backups, free helper can add. New saved data: Protected. |
| A7 | **Highlights + smart lists** | Readwise, TickTick | Saved highlights (from Share, A2), searchable and linkable. Task lists Today / Next 7 / No date, no overdue alarms. |
| A8 | **Google Calendar sync** | Google Calendar | **New provider, approved.** His own Google sign-in; shifts and plans out, outside events in (read-only in BEYOND unless he confirms). Needs a Google Cloud OAuth client he creates; no server. |
| A9 | **IFTTT webhooks** | IFTTT | **New provider, approved.** He chooses which events go out (e.g. work ended), with his own webhook key. Off by default, nothing sent without his setting; no health or personal text unless he picks it. |

## Not selected (for now)
Focus timer, focus/sleep sound, Obsidian export, time blocking + .ics import, offer-only rules,
Readwise/Raindrop import.

## Kept as separate apps
Google Workspace, Drive, Shortwave (email), Readwise Reader (reading), Obsidian publishing,
ChatGPT for general questions, Brain.fm music.

## Suggested build order
A1 → A2 → A7 (lists) → A4 → A5 → A3 → A6 → A7 (highlights) → A8 → A9.
Persistence items (A2 inbox, A3, A5, A6, A7) follow `.claude/rules/persistence.md`: backups must
round-trip and old backups must still restore.
