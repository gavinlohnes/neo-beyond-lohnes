# GARMIN-001 — local sleep evidence import

Authorization: Gavin explicitly approved the first-release proposal in issue #257: “I absolutely
approve. It looks like Health Connect can get us a lot of good data.” Builder: Codex.
Lane: PROTECTED. Starting master: a6d315dd83f7f540782a540d37a32c9a5224a1f2.
Branch: codex/garmin-001-sleep-import. PR [#258](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/258) merged with owner approval; installation follow-up below.

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


## Phone installation follow-up (2026-10-19)

Owner reports the delivered APK is rejected with the generic “The app wasn't installed”
message on Android 16 / Nothing OS 4.1. Chrome and Files by Google already have install
permission. APK checksum, ZIP integrity, SDK bounds and absence of testOnly/native ABI
restrictions were checked; the actual package-manager rejection remains unknown.

Builder: Codex. Starting master: 8581af586facf1b08a29347c28787b5e4810db3a. Branch: codex/garmin-001-install-diagnosis.
Authorization: continuation of the approved helper delivery and owner's installation-failure
reports. This diagnostic patch adds CI verification only: download the exact original
artifact from run 39262505666, verify its source/checksum/signature, install it on an empty
Android 16 emulator, launch it, and retain package-manager/logcat/UI evidence. No phone
identifiers/screenshots are committed. No health permission is granted, no source records
read, no application/runtime/Engine/storage/permission change, and no security restriction
on the owner's phone is disabled. Keep #257 open pending successful physical phone test.

Leverage: use the official Android SDK emulator/adb and GitHub's official artifact action;
no new runtime dependency. The source artifact expires 2026-11-02, so this is a time-bounded
probe rather than permanent release CI. Acceptance: capture actual install/launch result,
inspect the evidence, then choose a correction supported by that result. ADB success alone
does not prove the owner's normal installer flow or Nothing-specific policy works.
