# BUNDLE-001 — keep the offline build under its limit

- **Why:** the main JS bundle on master was 2,083 kB, about 14 kB under Workbox's 2 MiB precache
  limit. ROUTINES-001 (#357) crossed it by 306 bytes and its PWA build failed: a file over the limit
  isn't precached, which would break offline loading. Every new feature was about to hit the same wall.
- **Builder:** Claude Code. **Lane:** Routine (build output only; no behavior, schema, Engine, TODAY or
  dependency change; no PWA config change). **Start:** master `ba19685`. Branch `claude/bundle-split-001`.
- **Change:** five MORE-only screens load on first open via `React.lazy` with a quiet "Opening…" while
  they load: History, Decision Journal, Exercise Library, Custom Programs, Import Health Data. Every
  built `.js` is still precached (`globPatterns: **/*.js`), so they open offline too.
- **Result:** main bundle 2,083 kB → 1,815 kB.
- **Not chosen:** raising `maximumFileSizeToCacheInBytes`. It would hide the growth and needs the
  owner's OK as a PWA config change.

REUSE: React.lazy/Suspense, Vite code-splitting, existing Workbox glob. OWN: which screens split.
BUILD FROM SCRATCH: none.
