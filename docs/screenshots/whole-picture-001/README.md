# WHOLE-PICTURE-001 production acceptance

Built production PWA, Chromium, America/Chicago, isolated fresh browser contexts at
320, 390 and 1440 pixels. All records are **synthetic acceptance data**, built with
canonical commands and imported through the actual Backup & recovery UI. No real
personal records or production fallback. Captured against application code at `a60f84f`.

- [Desktop overview](overview-1440.png), [phone overview](overview-390.png)
- [Context comparison](compare-390.png), [source evidence](evidence-390.png)
- [Offline saved focus](focus-390.png), [acceptance results](acceptance.json)

Checks: claim → contributing day → source records → History → BACK TO REVIEW;
read-only exploration and tentative planning write no events; focus draft survives
primary-tab detour; canonical weekly focus saves offline with exactly one event;
offline cold reload retains it; no horizontal overflow or uncaught page errors.
Screenshots show illustrative recorded patterns, not causal conclusions.

Reproduce from the repository root after installing the matched Playwright Chromium:

```sh
mkdir -p .cache
TZ=America/Chicago BEYOND_ACCEPTANCE_BACKUP="$PWD/.cache/whole-picture-acceptance-backup.json" npx vitest run --project node tests/integration/wholePictureAcceptance.test.ts
npm run build
node scripts/verify-whole-picture.mjs
```

The script uses its own preview server and fresh disposable contexts, never an existing
user profile. The exported synthetic backup stays in `.cache`; it is not shipped.
