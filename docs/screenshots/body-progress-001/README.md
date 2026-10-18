# BODY Progress — production acceptance

Synthetic records and abstract photo frames only. No owner data or protected fixtures changed.
The built PWA is tested at 320, 360 and 412 px, America/Chicago, reduced motion.
`acceptance.json` is the machine result. Screens show overview, quick measurement entry,
photo entry and a same-pose comparison. Dates below the photos remain readable independently
of the native selects. The final PR records exact head, full verification and review status.

Reproduce with installed dependencies:

```sh
npm run build
npm exec vite -- preview --host 127.0.0.1 --port 5177 --strictPort
```

In another terminal:

```sh
BEYOND_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/verify-body-progress.mjs
```

Omit `BEYOND_BROWSER_EXECUTABLE` when Playwright's bundled Chromium is installed.
`BEYOND_ACCEPTANCE_URL` overrides the script's local preview address.

The walkthrough uses canonical UI writes and read-only IndexedDB assertions: correction
provenance; unchanged events during exploration; retained measurement and selected-photo input;
explicit photo saves; JPEG re-encoding; four measurement roots, one correction and three photos;
service-worker-controlled offline cold reload, reads, new saves and a second reload.
Each screen has no horizontal overflow, one main landmark, controls at least 44 px high,
unclipped button labels and zero axe violations. The abstract frames are not evidence of
physical camera behavior. Actual camera pickers, iOS/Safari, virtual keyboards, assistive
technology and large real photo libraries still need device checks. Existing encoding,
metadata stripping and native backup/restore tests cover the unchanged storage contracts.
