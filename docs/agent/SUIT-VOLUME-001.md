# SUIT-VOLUME-001 — flashy on action, calm at rest

- **Authority:** Gavin, 2026-10-28: "Go with the small pr idea. Go volume. But make it bigger." The
  direction came from an outside brief (Grok), slimmed because most of it was already law under
  SUIT-002 (commit feedback) and FIELD-AUTHORITY-001 (one next thing, one red).
- **Lane:** PROTECTED, because it changes how TODAY composes. Presentation only: no Engine, schema,
  event or recommendation change. **Builder:** Claude Code.
- **Law:** the suit may be dramatic when the operator touches it, or when one thing truly needs
  them. It may never be dramatic by default.

## The volumes

| Volume | When | Allowed | Where it lives |
|---|---|---|---|
| **0 · IDLE** | Nothing needs you | Gotham, the mode, the bat mark, one calm line. No loop, no pulse, no extra red. | TODAY's hero and its calm lines; the clock and the mark are identity, not alerts |
| **1 · COMMIT** | You saved something | SUIT-002: a light, medium or heavy tap, a 120ms pulse on the control, and one-shot flashes (set earned, workout secured, power-on). Hold-to-fill only for charged acts. | Every successful write; TRAIN may be the loudest room |
| **2 · SIGNAL** | One thing truly needs you | One red next thing (FIELD-AUTHORITY), the beam's one sweep, and one amber suit band at a time | TODAY's next card and at most one accented band |

## Audit (fresh master, 2026-10-28)

- **Idle motion:** every animation in `src/**/*.css` plays once and is tied to an action, except one.
  The skyline beam swept in an endless loop while a next thing stood. **Fixed:** it sweeps once
  when the next thing appears, then holds still. A test now fails on any `infinite` animation in the
  app.
- **Commit feedback:** `captureCommitFeedback` is wired across TODAY, TRAIN, BODY, COMMAND and the
  sheets. **Gap fixed:** the cave's BRIEF saves (READY, NOT NEEDED, GOT IT) now give a light tap
  and pulse. Platform limit: iOS Safari has no Vibration API, so iPhones get the pulse without the
  tap. Reduced motion suppresses both, and the action still completes.
- **Hold-to-fill:** unchanged. It stays on charged acts, and routine logs stay one tap.
- **One Volume-2 band:** TODAY's suit bands could accent two at once, a LATE preflight and an
  off-normal comms line. **Fixed:** `bandAccent` gives the accent to one band only, in this order:
  late preflight, then a point just passed, then a reading off your normal. The others keep their
  calm text.
- **Off-normal reads both ways:** VITALS bars above your usual band now take the off-normal colour,
  matching the headline. A high resting HR showed as normal before.

## Leverage gate

- **REUSE:** SUIT-002's feedback path; FIELD-AUTHORITY's one-red rule; the existing reduced-motion
  gates.
- **OWN:** the volume table, the band accent order, and the beam's single sweep.
- **BUILD FROM SCRATCH:** none.
