# WHOLE-LIFE-001 browser evidence

Captured from the running App in real Chromium. All records are synthetic, in a disposable browser
context; no operator backup or real personal data was loaded.

- `phone.png`: 390×844, first viewport. A recorded commitment is visible above the fixed navigation.
- `phone-full.png`: the same page, full scrollable content. Fixed navigation is captured at its
  viewport position; it is not a second mid-page navigation bar in the app.
- `desktop.png`: 1440×1000 viewport, full scrollable content. LIFE expands beyond the legacy
  430 px FIELD wrapper; other workspaces retain their established width.
- `player.png`: the real canonical routine player opened from the overview.
- `routine-progress.png`: actual recorded progress after explicitly completing one step in that player.
- `resume.png`: the prominent resume control after creating a synthetic workout through the canonical
  command. The control only appears for a real open session; opening it does not start another.

The capture exercised TODAY → YOUR LIFE → PLAY → close, checked 390/390 and 1440/1440 viewport /
document widths, and verified hero opacity 1. The browser acceptance tests additionally cover
320/360/412 widths, axe, no-write browsing, a workday, a free day, failed reads, retained Home drafts
and explicit DONE updating the overview through the existing routine command.
