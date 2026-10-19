# TONIGHT-001 PR 2 acceptance

Synthetic data only, entered through the production UI and canonical commands. Production build,
Chromium, America/Chicago, reduced motion. Widths: **320, 360, 390, 412 px**. The calendar uses
the seeded rotation: Mon Oct 12 2026 is a work night (18:00–06:00), and Wed Oct 14 is a day off.

Seven screens per width:

| File | When | What it shows |
|---|---|---|
| `*-prep-quick-log.png` | Mon 16:40 | PREP leads with QUICK LOG (recent meals, water at the last amount) |
| `*-shift-quick-log-undo.png` | Mon 22:14 | One tap logged a meal; the confirmation has UNDO; focus stays on the item |
| `*-shift-meal-sheet.png` | Mon 22:14 | MEAL opens a sheet on TODAY with a name filter and "New meal or manual entry" |
| `*-briefing.png` | Tue 03:05 | The briefing opens with "Tonight so far" |
| `*-recover-morning-call.png` | Tue 06:40 | RECOVER asks "Train or sleep?", then the night's totals and main sleep |
| `*-recover-answered.png` | Tue 06:40 | After SLEEP FIRST, one quiet line; the all-clear headline returns |
| `*-off-wake-card.png` | Thu 09:05 | The lived day of Wed Oct 14 (off): "A today?" with START / LATER / NOT TODAY |

`acceptance.json` records horizontal overflow (none), axe violations (none) and page errors
(none) for every screen.

Full-page captures freeze the fixed tab bar where the viewport ended, so it can overlap a row in
the image. On a phone it stays at the bottom.

Reproduce from the repository root:

```sh
npm ci
npm run build
npx vite preview --host 127.0.0.1 --port 5177 &
node scripts/verify-tonight-001.mjs
```

Set `BEYOND_BROWSER_EXECUTABLE` if Chromium isn't in Playwright's default location. Physical
phone, Safari and screen-reader checks are not claimed.
