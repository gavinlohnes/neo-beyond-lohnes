# POLISH-001 acceptance

Synthetic fixtures only. Production build, Chromium, America/Chicago, reduced motion.
No personal data. All four widths pass: **320, 360, 390, 412 px**.

- Sixteen full-page mode screenshots: PREP, ON SHIFT, RECOVER, OFF DUTY at each width.
  The modes are pinned at 17:10; the source line retains the actual schedule.
- Four night screenshots at 23:40. The same run asserts the sky disappears at 11:00.
- A canonical low-capacity check-in exercises a real Engine action and gated searchlight.
- Name/meta stay above the city. Order is header → Engine card → numbers → action row.
  The action row clears navigation at **360×800 and 390×844**, in all four modes.
- One action-red button. Existing status/suit signals, sky and navigation keep their meanings.
- WATER → amount logs once and stays on TODAY. UNDO creates exactly one void.
- The built PWA saves offline and retains the canonical water record after a cold reload.
- No page errors or horizontal overflow. `acceptance.json` contains measured mode bounds.

Reproduce from the repository root:

```sh
npm ci
npm run build
node scripts/verify-polish-001.mjs
```

If Chromium is outside Playwright’s default installation, set `BEYOND_BROWSER_EXECUTABLE`.
The script starts and stops its own local production preview.

`npm run verify` passes: architecture, **269 files / 2,676 tests passed**, one existing skip,
TypeScript and production build. `Polish001.test.tsx` adds 13 browser cases, including
injected meal-log failure, repeated save/log and undo taps, canonical Repeat last, prompt
boundaries, retained sleep proposal, and NOT YET with zero domain writes. Existing regression
coverage retains focus, drafts, browser Back, workout continuity and backup behavior.

An inherited privacy test matched the current minute “42” as though it were a leaked total.
Its Date is now fixed; real hold timers and the original privacy assertions are retained.
No production stealth change. Physical-device, Safari and screen-reader testing are unclaimed.
Required CI and Claude Code’s independent exact-head review are recorded on PR #251.
