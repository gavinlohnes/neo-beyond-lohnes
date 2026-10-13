# WORKOUT-ATOMICITY-001 mobile evidence

Production PWA build (`npm run build`, served by `vite preview`) in Chromium 1194 at 320/360/412 × 800
CSS pixels with reduced motion requested. Every record is synthetic, entered through the existing UI in
a fresh browser context. No owner data, protected fixture, prototype or deployment is involved.

| State | 320 px | 360 px | 412 px |
| --- | --- | --- | --- |
| Offline active workout after cold reload | [capture](active-offline-320.png) | [capture](active-offline-360.png) | [capture](active-offline-412.png) |
| MORE → Diagnostic detail after the journey | [capture](diagnostics-offline-320.png) | [capture](diagnostics-offline-360.png) | [capture](diagnostics-offline-412.png) |

Additional 360 px state: [a split record listed read-only](diagnostics-split-360.png). That
session row was written straight into IndexedDB to imitate a half-save from before this fix. The
readout lists it as plain text with no action attached.

Procedure at each width:
1. Start the day, then check in with ALL GOOD.
2. In TRAIN, start the workout. Log set 1 (100 × 10), skip set 2, then UNDO the skip.
3. Wait for the service worker to take control, disconnect, and cold-reload.
4. Re-enter TRAIN and confirm set 1 survived. Log set 2 offline, then finish with the existing COMPLETE hold.
5. Start a second workout, log a set, and stop it with STOP WORKOUT → STOP WORKOUT.
6. Open MORE → Diagnostic detail. It shows **Workout record mismatches 0**.

There is no horizontal overflow at any width.

The automated failure-injection tests in `tests/integration/workoutAtomicity.test.ts` (fake-indexeddb)
and `tests/browser/WorkoutAtomicity.test.tsx` (real Chromium IndexedDB) prove the rollback itself.
These captures show only that the normal journey and the readout are unchanged.

Limitations: no physical-phone, iOS Safari/installed-PWA or native assistive-technology acceptance
is claimed.
