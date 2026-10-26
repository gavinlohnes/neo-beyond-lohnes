# PREP-001 production acceptance

Built PWA, fresh disposable Chromium contexts, America/Chicago, real UI-saved default rotating
schedule and real START DAY. Synthetic records only; no personal data, direct storage writes or
protected fixtures. Offline after setup. Application code unchanged after this capture; final
reviewed SHA and full verification/CI results are recorded in PR #296.

PASS at 320×640, 390×844, 844×390, 1280×800:

- One-tap food/bottle confirmations, below existing Log controls; no-action-required preparation state.
- Frozen alternative via native options sheet; CLOSE returns focus.
- Only preparation events written; no meal, water or Obligation commands.
- Offline reload after midnight retains the same day’s food and bottle facts.
- Real downloaded native backup accepted by existing restore preview; preview cancelled.
- No overflow or page errors. Unit/browser tests also cover undo, stale/double/failed writes,
  manual access versus mode pins, clock correction, old-backup restore and four-size axe checks.

[Small phone](before-320.png) · [Phone](before-390.png) · [Ready](ready-390.png) ·
[Options](options-390.png) · [Four-viewport report](acceptance.json)

```sh
npm run build
PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node scripts/verify-prep-001.mjs
```

The preparation scope is the current lived day. No inventory, meal-consumption inference,
spending or health/financial benefit measurement is claimed by these automated checks.
