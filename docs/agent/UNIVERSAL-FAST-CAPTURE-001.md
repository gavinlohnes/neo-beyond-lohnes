# UNIVERSAL-FAST-CAPTURE-001 — raw first, organize only on purpose

**Owner authorization:** Gavin explicitly requested universal fast capture with no destination required, 2026-11-15. Raw by default; optional confirmed promotion into existing plan/task/note pathways; leaving raw is valid. No AI sorting, new notes app, broad navigation, family/metrics/training/evidence changes or Alfred writes. Builder Codex; branch `codex/universal-fast-capture-001`, fresh master `bc93cc25c5e5103ba3e31f6645835028a8c57dfd` (speed pack merged). FEATURE lane: UI composition of existing commands; no new event/store/schema/provider/dependency/Engine semantics. Required CI, normal review and Gavin's merge. [Active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/538).

## Bounded journey

TODAY's direct entry says CAPTURE and opens the existing shell sheet directly (LOG → Note remains a compatibility route). One multiline field, no type/folder/destination/dates before saving. CAPTURE explicitly calls existing captureItem; multiline Enter/IME and closing never save. The saved raw item is confirmed inline; nothing was filed or inferred. Close immediately or capture another thought. A small optional MAKE A TASK action previews its copied, editable title, an explicitly optional planned day and due date. Only CREATE TASK/PLAN ITEM invokes existing atomic convertCaptureToObligation; cancel/close/typing writes nothing further. The original raw text remains in canonical history with existing sourceCaptureId provenance. Existing OPEN CAPTURE route supports later processing; no new inbox management surface.

Reuse current session-draft retention, modal focus/close guard and calm explicit-save feedback. A failed raw save preserves text. Failed promotion preserves the saved raw item and its task draft; retries never replay successful conversions. No new delete/undo receipt actions (OWNER-GO-001). Promotion history and native backup stay canonical.

**REUSE:** existing captureItem, atomic convertCaptureToObligation/createObligation, raw Capture tools/detail route, RecordSheets/LogSheet, session draft and foundation controls. Inbox-first capture → optional deliberate triage is the proven interaction; no proprietary code/assets or dependency.
**OWN:** short in-sheet raw confirmation and optional promotion preview, shared busy/focus/retry mapping.
**BUILD FROM SCRATCH:** none beyond this UI mapping.

**Acceptance:** one-tap entry, no writes on open/type/Enter/close, save raw without structure/network, optional preview/cancel/confirmed task or planned item, no inferred dates or deadlines, native restore/source provenance, save/transaction failures and rapid clicks, closed/deleted/previously promoted capture, retained input and modal focus, narrow layouts/axe. Relevant existing capture/atomicity and shell/LOG/speed regressions, typecheck/build/architecture and full required CI. No merge.


## Builder verification

40 Node checks PASS across capture inbox, canonical conversion, command atomicity and a source-linked promoted-plan/native-backup regression. 67 unique real-Chromium tests PASS in seven files; 11 new acceptance cases cover no-day raw entry, no writes before save, optional preview/cancel, blank/no-inferred dates, source-linked confirmed task/plan promotion, rapid clicks, raw/promotion failures, deleted source, close/reopen, saved raw remount/later route, offline, 320/375/768px and axe. Existing sheets, TODAY, LOG, speed, retained suggestions and atomicity regressions pass. Architecture/typecheck/production/PWA build and whitespace PASS. No physical-device speed claim or new usage telemetry. FEATURE lane requires normal review/owner merge and green required CI; no independent Protected review is claimed. Final CI status belongs in the PR handoff, avoiding a documentation commit that would create a new unverified head.
