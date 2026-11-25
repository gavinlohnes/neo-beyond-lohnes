# GRAYSON-TRAIN-LOCKSCREEN — the current set on the lock screen, with DONE (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-TRAIN-LOCKSCREEN-001.md) approves these.

- **Web app notification, not Health Bridge:** BEYOND's own service worker shows the notification and parks the tap,
  so a set lands in BEYOND with no confirm screen and no new Android permission. Run cues stay in Health Bridge.
- **One way to write a set:** parked DONE and SKIP taps are applied through `logSet` / `skipSet`, in tap order, when
  BEYOND next runs. The lock screen never writes a set itself.
- **Tap time and mark (Gavin, 08:50 CT: "Extend options"):** `logSet`'s existing options object gains optional
  `{ at, from: "LOCK_SCREEN" }`, and `skipSet` and `startRest` gain an optional trailing argument. No existing caller
  changes. `at` must fall inside the workout and not in the future. The set keeps "from lock screen" through a fix.
- **Defaults:** off until he turns it on. Notification permission is asked once. One silent notification is
  replaced in place. SKIP shows unless he hides it. Rest shows as a clock time. A set with no reps yet asks for them in
  BEYOND, with no DONE. The notification closes on finish or stop, after a swipe (until he turns it on again), or after
  4 quiet hours.
- **Fallback if Android wants unlocking for the buttons (default 7):** the notification stays as a read-only "what's
  next" line with the body tap. The device check decides.
