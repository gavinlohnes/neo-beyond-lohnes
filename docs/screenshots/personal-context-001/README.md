# PERSONAL-CONTEXT-001 — built PWA acceptance

The source commit and per-size outcomes are recorded in `acceptance.json`.
Synthetic records only. No owner's backup, health records or live Claude key used.

- Viewports: 360×800, 390×844, 844×390 and 1280×900; 390px uses reduced motion.
- Real production/PWA build, service-worker-ready offline reload.
- MORE → REVIEW → PERSONAL UNDERSTANDING → My context: create a constraint through the
  real editor while offline; source and confirmation date remain visible.
- PLAN MY NEXT DAYS OFF opens Alfred with a draft. Explicit inclusion sends the
  selected facts to a locally intercepted/mock Anthropic endpoint.
- A supplied valid source key opens local inspection with current revision/source/date.
  Screenshots show the original-record correction entry and calm source controls.
- No page errors or horizontal overflow at any size.

`context-offline-*.png` captures real local fact entry. `planning-sources-*.png` captures
source inspection following a mocked response. This does not prove live model quality,
latency, real API cost, clinical effectiveness or physical-device voice/haptic behavior.

Browser regressions separately cover correction/irrelevance, exact canonical source routing,
retained drafts, opt-out and corrected text in actual request bodies, changed-in-flight
sources, stale-day/task rejection and duplicate clicks. Node integration covers all-table
read-only projections, native backup/old-backup round-trip, invalid history and atomic guards.

No production code or tests were modified to obtain screenshots. The harness is an ignored
local Playwright script; fixture tables were created through application commands in a fresh
browser profile, then loaded into independent production profiles for each viewport.
