# COMMAND-ATOMICITY-002 mobile evidence

Production PWA build (`npm run build`, served by `vite preview`) in Chromium 1194 at 320/360/412 × 800
CSS pixels with reduced motion requested. Every record is synthetic, entered through the existing UI in
a fresh browser context. No owner data, protected fixture, prototype or deployment is involved.

| State | 320 px | 360 px | 412 px |
| --- | --- | --- | --- |
| Missions & Obligations after an offline create + satisfy | [capture](intent-offline-320.png) | [capture](intent-offline-360.png) | [capture](intent-offline-412.png) |
| MORE → Diagnostic detail at the end of the journey | [capture](diagnostics-offline-320.png) | [capture](diagnostics-offline-360.png) | [capture](diagnostics-offline-412.png) |

Procedure at each width. Every write goes through a command this objective made transactional:
1. Start the day, then check in with ALL GOOD. That covers `startDay` and `submitCheckIn`, which also issues the recommendation.
2. MORE → Missions & Obligations: create mission "Stay ready", create obligation "Renew passport", then SATISFY → CONFIRM SATISFIED.
3. MORE → Decision Journal: record "Switch gyms", then REVIEW → MARK REVIEWED.
4. Wait for the service worker to take control, disconnect, and cold-reload.
5. Offline: create and satisfy "Book dentist offline".
6. Open MORE → Diagnostic detail. It shows **Record mismatches 0**, and the Events count of 10 matches the 10 recorded actions.

There is no horizontal overflow at any width.

The rollback, double-submit, cold-start and diagnostic behaviour is proven by automated tests:
- `tests/integration/commandAtomicity.test.ts` and `tests/integration/recordIntegrity.test.ts` (fake-indexeddb);
- `tests/browser/CommandAtomicity.test.tsx` (real Chromium IndexedDB, including the IntentScreen failure, retry and D1 paths).

These captures show only that normal journeys, offline use and the readout are unchanged.

Limitations: no physical-phone, iOS Safari/installed-PWA or native assistive-technology acceptance
is claimed.
