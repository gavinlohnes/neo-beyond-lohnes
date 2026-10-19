# GARMIN-001 — local sleep evidence import

Authorization: Gavin explicitly approved the first-release proposal in issue #257: “I absolutely
approve. It looks like Health Connect can get us a lot of good data.” Builder: Codex.
Lane: PROTECTED. Starting master: a6d315dd83f7f540782a540d37a32c9a5224a1f2.
Branch: codex/garmin-001-sleep-import. Active PR: pending.

Scope: a foreground Android helper with READ_SLEEP only and no Internet/write/background/history
permissions; latest seven days of Garmin-origin SleepSessionRecord; versioned JSON through the
Android document picker. Existing BEYOND PWA previews, explicitly confirms and atomically imports
external evidence. BODY displays the latest evidence and retained source revisions. No canonical
sleep events, manual log replacement, primary/nap inference, totals merging, or Engine changes.

Storage decision: additive database v14, with externalSleepRecords latest pointers, immutable
externalSleepRevisions and atomic healthImportReceipts. Reimported versions are no-ops; older
versions are skipped; same-version conflicting payloads fail atomically. Source deletions cannot
be inferred from absence in a partial snapshot. Native/legacy replace restore must clear evidence
absent from an older backup. Native backup automatically includes the new Dexie tables; add
roundtrip/old-version/rollback tests without editing protected fixtures.

Day ownership: records keep source intervals and UTC offsets. They do not automatically attach to
a BeyondDay or create one. Preview offers explicit optional association to an existing lived day;
16:30-spanning intervals remain whole. Stage gaps/unknown data never become invented sleep.

Reuse: INTEGRATE PROVIDER / ADAPT UPSTREAM. Official stable Health Connect SDK 1.1.0; Android
permission/read patterns from official documentation. Existing exporter inspected but not adopted
because it requires broad health permissions. Implementation is purpose-specific; no custom
health sync platform, cloud relay, Garmin API application or native wrapper around existing PWA.

Native build: isolated android/health-bridge Gradle project plus separate artifact CI; existing
PR verification/protections unchanged. Deliver a debug-signed test APK with SHA-256 and signing/
update guidance. Production signing keys are not generated/stored in Git. Phone smoke testing
requires the owner’s device and remains explicitly unclaimed until performed.

Acceptance: synthetic parser/limit/source/stage tests; preview/cancel no-write; duplicate/revision/
concurrent import/transaction rollback; old database upgrade; native and legacy backup restore
without residual evidence; browser keyboard, focus, preserved preview and BODY evidence; Android
unit tests and build/lint; full application verify/required CI; independent exact-head review.

Exclusions: other data types, automatic sync, write-back, GPS, cloud/backend/accounts, replacing
the PWA, proprietary Garmin metrics, paid services, Engine use of imports. Future scope requires
its own approval.

Research, device observations and primary-source links: https://github.com/gavinlohnes/neo-beyond-lohnes/issues/257
