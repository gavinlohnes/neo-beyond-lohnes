# Personal Understanding — production acceptance

Captured 2026-10-27 from the real production/PWA build of source head `5f1bdeb`, not a mock.
All displayed entries are synthetic; no owner backup or personal record was used.

- Isolated Chromium contexts at 320×844, 390×844, 844×390 and 1280×900; America/Chicago,
  fixed at Tue, Oct 27, 06:30. Synthetic historical work/off days, corrected canonical queries,
  explicit targets, Missions and a real reviewed decision were prepared via application commands.
  The isolated production database was populated from those synthetic canonical records.
- MORE → Review → Personal Understanding; Choices, Patterns, comparable-day evidence, Lessons,
  original Journal decision and BACK TO REVIEW. Re-entry waits for the refreshed read.
- Network disabled after initial PWA installation; the complete view/source-return journey and
  native disclosure keyboard close/reopen succeed offline at all four sizes.
- All database tables before/after are equal (zero domain writes); zero page errors and no
  horizontal overflow. [Machine-readable result](acceptance.json).
- Screenshots are actual viewport captures, so the phone shows optional depth through scrolling;
  it does not fit the entire knowledge view onto one screen. Fixed navigation stays operational.

Phone: [choices](choices-390.png), [patterns](patterns-390.png), [lessons](lessons-390.png).
The matching 320, 844 and 1280 captures document narrow phone, landscape and desktop.

Automated evidence: integration 3/3; PersonalUnderstanding browser 9/9, including four axe sizes,
all source destinations, bounded lists, honest absence/error/retry and stale-read rejection;
ReviewScreen/WholePicture regression included. Full `npm run verify`: architecture 312 files,
312 test files pass; 3,015 tests pass / one existing skip; TypeScript and production/PWA build pass.
The existing >500 kB chunk warning remains. Required final-head CI is linked from PR #302.

Initial acceptance-script selector and async-read waits were corrected without changing product
assertions; the four-size final run passes. No direct public GitHub Pages check is claimed; this
PR is not merged or deployed. Gavin separately approves integration.
