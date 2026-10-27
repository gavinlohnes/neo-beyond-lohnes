# SUIT-002 — built offline acceptance

Production source `6db43288f6ec14c9df007b3c083396780cc9dc23`; final unusual-ink CSS is
verified separately by UnusualForYou browser assertions and full verification. Synthetic records
only, authored using canonical commands; no owner data. Fresh built-PWA preview, offline after
service-worker installation, reload, America/Chicago, Tue, Oct 27 at 17:00.

| Size | Motion | Flow |
| --- | --- | --- |
| 360×800 | normal | water+undo, full memory lifecycle, recovery-only context, backup preview/cancel |
| 390×844 | reduced | same, no vibration |
| 844×390 | reduced | same, no vibration |
| 1280×900 | reduced | same, no vibration |

Each run: exactly four MEMORY_RECORDED revisions and one WATER_LOGGED/WATER_LOG_VOIDED pair.
Original events and all other domain tables unchanged; no consumption/preparation/task/plan
side effects from memory. Zero page errors, unrelated writes or horizontal overflow. Active
recovery guidance never appears in PREP; irrelevant food memory disappears there and remains
inspectable after offline reload. Native backup download/restore preview cancelled without
replacement. Actual restore integrity is covered by MEMORY integration tests.

Native vibration was instrumented: water sends 10ms and undo 35ms in the normal-motion run;
reduced-motion sends neither. This proves the delivery path, not physical motor strength or
browser/device support. No sound. The final feel still needs Gavin's thumb on his phone.

- `water-*`: real saved receipt, neutral feedback, Gotham and FIELD unchanged.
- `inspect-360`: operator words, source, confirmation date and correction path.
- `prep-360`: saved food preference alongside existing preparation choices.
- `irrelevant-360`: removed from PREP, no obligation.
- `recovery-360`: recovery fact only in the chosen recovery context.

The 120ms pulse is intentionally transient; a still image cannot demonstrate its timing.
Browser tests verify timing, reduced-motion silence, origin-control targeting, hold arming,
release/blur/disable cancellation, rejected writes and exactly-once/no-op behavior. No video,
physical-haptic claim or live deployment is implied.

## Actual hold, built offline at 360px

Source `63a222bdd000b2894dc3bdab362aefacb91e7a1d`; `hold-acceptance.json`.
Logged water, opened its existing entry/correction and exercised DELETE. A tap and the
halfway point both leave zero void events; a full hold appends exactly one void. Native API
calls: `[10, 8, 35]` (water, arm, committed void). Reduced-motion repeats the complete functional
flow with no vibration calls. `hold-normal-360.png` captures the in-progress fill;
`hold-reduced-360.png` captures the same interval without decorative motion. Inspection itself
is one tap, no write and no haptic. No timer/guard/assertion was weakened.
