# MORE-HOME-001 — MORE opens like YOUR LIFE

- **Authorization:** Gavin, 2026-11-09, directly to the Builder. He asked whether MORE could be guided and organised
  like YOUR LIFE, and the Builder proposed "YOUR SYSTEMS." with status cards and area shortcuts, nothing removed.
  Gavin replied: **"Redo more"**. **Lane: Protected** (MORE's primary information architecture), approved.
  Builder: Claude Code.
- **What:** MORE's menu now opens the way YOUR LIFE does:
  - The date, a big **YOUR SYSTEMS.**, and two actions: **Back up my data** (the same export, so NAV-001's two taps
    are kept) and **Find anything** (focuses the existing search).
  - Area shortcuts, one tap each: Backup & recovery, On shift, Review, Plan, Notes, Systems, Settings. Each opens
    its existing panel and moves focus to it.
  - **Status, "How things are":** one card per system with one line and at most one action. Backup covers Drive
    or the share sheet and the last backup. Garmin shows its last data, with sync or import. Work schedule opens
    the schedule. Alfred shows whether a key is on this phone. Google Calendar appears only when connected.
- **Kept:** everything below is unchanged: search, favourites and recent, every group panel, Data safety and
  restore, Settings and reminders. No capability, command, data or route changes.
- **Rules:** status shows only what was recorded; anything unread says so and never reads as fine. The 16 px floor
  applies, and the page fits a 320 px phone. Red is used only for the hero rule, as in YOUR LIFE.

## Leverage gate
- **REUSE:** YOUR LIFE's layout and visual language (`WholeLifeHome`), the existing export, search, group panels,
  the Drive and backup state, Garmin's `garminAsOf`, the Calendar connection and the Alfred key check.
- **OWN:** the YOUR SYSTEMS. composition and the status wording.
- **BUILD FROM SCRATCH:** none.

## Evidence
- `tests/browser/MoreHome.test.tsx` covers:
  - the hero, backup first, and honest empty status;
  - an area opening its panel with focus;
  - fitting 360 px, the 16 px floor, and nothing written;
  - the Drive status line.
- The existing MORE suites have two locator updates for the new area row:
  - FIELD-AUTHORITY-001's "recovery on the first screen" now uses the Backup & recovery area row, which opens the
    same panel;
  - "Plan" is now located as the area button (MoreScreen, and DailyExperience's first-screen check).
- Screenshot: `docs/screenshots/more-home-001/more.png` (invented state).

## Capability inventory (before → after)

| Before (MORE menu) | After |
|---|---|
| "Back up my data" row (export) + "Keep a copy of your records." + status line | **Moved up:** the hero's first action, "Back up my data". Same `handleExportBackup`, and the status line shows under the hero. The one-line caption is replaced by the hero intro. |
| Search box ("Find a screen or action") + results + "Search all records" | Unchanged, same place. The hero's "Find anything" scrolls to it and focuses it. |
| Favorites / Recent | Unchanged. |
| Backup & recovery panel: Data safety (EXPORT / SHARE BACKUP, last backup), Automatic backups & file check (incl. Google Drive), Restore | Unchanged. It also opens from the "Backup & recovery" area shortcut. |
| Groups Log, On shift, Review, Plan, Notes, Systems (each catalog capability as a row) | Unchanged. Each also opens from its area shortcut. |
| Settings panel (A place to start, Hidden features, Time capsule, Reminders, nutrition targets, …) | Unchanged. It also opens from the "Settings" area shortcut. |
| Destinations (views) such as SYSTEMS, HEALTH_IMPORT, WORK_SCHEDULE, … | Unchanged. The Garmin and Work schedule cards open HEALTH_IMPORT and WORK_SCHEDULE through the existing `setView`. |

- **`systemCatalog.ts`:** not edited. Every entry, alias, group and destination is the same.
- **Routes:** `MoreView`, `openMore`, `openRecord` / `OPEN_RECORD_EVENT`, `revealSection`, deep links (`?go=…`) and
  the `command-backup-panel` / `command-settings-panel` ids are all unchanged. Panels gain only a `data-area`
  attribute.
- **Removed:** nothing.
