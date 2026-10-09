# Focused meals — Milestone 3 browser evidence

Actual production React rendering with clearly synthetic meals in disposable Chromium storage.
No prototype state or personal records. Mobile viewport: 320, 360 and 412 CSS px × 800;
reduced motion enabled. Captured from this branch's local Vite server, not a public deployment.

- `focused-{320,360,412}.png`: TODAY → MEAL, saved meal LOG and secondary management.
- `manual-{320,360,412}.png`: direct manual fields; one disclosure removed from focused entry.
- `confirmation-undo-360.png`: canonical consumed meal and existing undo.
- `secondary-management-360.png`: management disclosed separately from logging.
- `consumed-record-360.png`: original correction/delete controls for today's consumed record.
- `returned-today-360.png`: explicit return, with the unfinished manual draft retained in BODY.

Existing journey tests cover failed writes, failed-read retry/reopen, drafts, duplicate prevention,
focus and navigation. New focused-meal tests cover mobile accessibility, local tracker switching,
management snapshot integrity, synchronous write guards and optional lookup. A separate built-PWA
check exercises offline preset save/log, undo, correction, explicit return and cold reload.
Chromium evidence is not physical-device, Safari or screen-reader certification.
