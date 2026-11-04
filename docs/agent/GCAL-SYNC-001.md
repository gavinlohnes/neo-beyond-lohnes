# GCAL-SYNC-001 — Google Calendar sync

- **Authorization:** Gavin approved A8 in `APPS-CHECKLIST-BRIEFS.md` and directed Codex to continue the checklist.
- **Risk:** PROTECTED — approved external provider, phone-local OAuth token, and backup privacy boundary.
- **Starting commit:** `607eaf81755f3f69e5bd838904ff12cd6b352653` from fresh `origin/master`.
- **Builder / branch / PR:** Codex · `codex/gcal-sync-001` · pending.
- **Scope:** Google Identity Services in-browser connection; primary-calendar events read-only in Week Ahead; one selected/created calendar for scheduled shifts and optional planned/due task titles; explicit sync or opt-in sync on open; disconnect removes token/cache.
- **Exclusions:** no server, schema, Google events as BEYOND records, Engine/free-busy/recommendation input, notes/health/money/memory, automatic writes without the selected sync preference.
- **Acceptance:** privacy-limited payload tests, phone-local state excluded from backup round trips, provider error/disconnect behavior, 360px and accessibility checks, typecheck and verify.
- **REUSE:** existing RFC 5545 `calendarExport` projection supplies the already-tested outbound schedule/task-title boundary; native `fetch`, localStorage credential pattern, Week Ahead surface, and Google Calendar v3/GIS browser APIs.
- **OWN:** BEYOND-to-Google event identity, explicit sync controls, read-only primary-calendar projection, and product/privacy language.
- **BUILD FROM SCRATCH:** none; this is a thin provider adapter and BEYOND-specific mapping with no new dependency.

## Build configuration

Set optional `VITE_GOOGLE_CALENDAR_CLIENT_ID` to a Google OAuth 2.0 **Web application** client ID. In Google Cloud Console, enable Google Calendar API, configure the OAuth consent screen for Gavin's Google account, and add the deployed BEYOND origin (and the local development origin when testing) under **Authorized JavaScript origins**. No client secret belongs in this static PWA. If the variable is absent, BEYOND explains that the build is not configured and does not attempt sign-in.
