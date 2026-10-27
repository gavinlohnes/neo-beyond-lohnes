# MEMORY-001 — confirmed prep and recovery memory

- **Authority:** Gavin's MEMORY-001 direction, 2026-10-27, explicitly authorizes the complete
  operator-authored prep/recovery loop, preferring additive events in existing persistence.
- **Lane / Builder:** PROTECTED additive event/command contract; Codex. No Engine edits.
- **Baseline:** freshly fetched `ab3508887af7650d6e4180d815e048fd2b48b8f2` (#302 merged/deployed).
- **Branch / PR:** `codex/memory-001`; [#303](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/303), WIP published early. #300 was initially separate; it merged during verification and is integrated as current master `c3338a0`. MEMORY changes no Engine behavior relative to that master.

## Model and surfaces

- Kinds: `PREP_FOOD`, `PREP_BOTTLE`, `PREP_OTHER`, `RECOVERY`. Statement: 1–280 trimmed
  characters, always explicitly authored/chosen and editable. Source: `OPERATOR` (event `USER`).
- One stable fact ID, creation timestamp, last-confirmed timestamp and ACTIVE/IRRELEVANT status.
  Additive `MEMORY_RECORDED` full-state revisions in existing events, with causal supersession;
  no table, schema migration or parallel store. All revisions remain inspectable.
  Creation time is the root event's recorded time; confirmation time is derived from the latest
  explicit create/correct/confirm/restore revision, never from a read, irrelevant flag or import.
- Create, correct, re-confirm, mark irrelevant and explicitly restore. Corrections/restores are
  confirmations; marking irrelevant preserves the previous confirmation time. No silent delete.
- A stable create request/fact ID prevents duplicate retries. Atomic optimistic head ownership
  prevents stale edits or status changes; malformed/forked/orphaned history abstains with an error.
  Writes attach to the actual active day and reject stale/due/ended-day forms. Memory itself is
  global across lived days and does not expire or create catch-up debt.
- MORE → “What BEYOND should remember”: bounded active/irrelevant lists, add/edit/kind/status,
  provenance and full revision history. Existing native LogSheet and session-draft conventions.
- PREP sheet: active prep facts only, beside the existing food/bottle choices; inspect/fix/add
  within that sheet. No outer TODAY memory block or added red action.
- Recovery: quiet active RECOVERY facts in TRAIN's recovery choice/in-progress recovery surfaces.
  No recovery fact on ordinary TRAIN or permanent TODAY surface. Shared inspect/fix editor.
- PREP's component remains mounted (hidden without an active day) so the global-memory draft
  survives day transitions; the existing preparation read is explicitly owned by its day ID,
  resets on a day change and can never display the previous day's confirmation on a new day.
- Starters fill editable drafts only: frozen backup, bottle preparation, quiet recovery. Never
  stored by opening a view. All context is labelled as the operator's words, not system advice.

## Reuse disposition

- **REUSE:** PREP-001 causal event revisions and optimistic guards; writeAtomically/logEvent/seq;
  existing events/native backup and replace-only restore; LogSheet/ConfirmBanner, session drafts,
  MORE catalog/view routes and FIELD neutral controls. Prior personal-memory research is recorded
  in PERSONAL-UNDERSTANDING-001; no new package or external service is warranted.
- **OWN:** the small validated memory fact projection, command semantics and explicit kind-to-
  prep/recovery mapping.
- **BUILD FROM SCRATCH:** only the missing fact projection/editor; preparation confirmations and
  Decision Journal records cannot truthfully represent durable preferences and their lifecycle.

## Exclusions and acceptance

No inference, model/chat/cloud, notifications, ranking, scores/confidence, runtime dependency,
schema/backup-format change, Engine/capacity/rotation/trace changes, auto logging, obligations,
spending, new kinds or visual campaign. Existing primary IA and one-red authority stay intact.

Tests must prove create/duplicate retry, edit/kind changes, confirmation, irrelevant/restore,
source/history timestamps, stale/day/atomic failure guards, causal ordering and corrupt-history
abstention, old/native backup round trips, offline and cross-day persistence; scoped contextual
surfacing and no consumption/Obligation/recommendation side effects; 360px/axe/reduced motion,
draft preservation, browser source/inspect flows. Full verify, green required CI and independent
exact-head PASS precede Gavin's separate merge approval.

Next: implement this scope, push WIP early, record verification/review in PR/checkpoint. Build
MEMORY-001 only; other personal-memory domains remain later tickets.

## Evidence and review

Source `8da2c0e` required CI PASS; TypeScript, architecture and production/PWA build pass.
[Built-PWA acceptance](../screenshots/memory-001/README.md) passes four sizes offline with reload,
native backup preview, matching context and exactly four memory-only writes. Node integration
7/7; current node memory/history/catalog 34/34; Memory/Personal Understanding browser 18/18;
PREP/TRAIN/Nav broader regression 104/104 before the last day-owned read refinement.

Independent WIP BLOCK `0401fa4` found PREP day remount lost a global-memory draft. Stable nullable
parent and day-owned prep reads resolve it; ended/null/new-day regression passes. Independent
corrective PASS at `b9ea7ae` (node probes 19/19) is persisted in #303. Final evidence head review,
full verification and required CI results are recorded in #303 before Gavin's merge decision.

Mainline integration: #300 merged while final checks were running. Combined head `f58d890`
builds successfully; actual four-size offline/reload/context/backup acceptance rerun passes on
that build. Both checkpoint histories are retained. The Engine changes belong to approved
master, not MEMORY; final review and CI use the integrated head. Landscape captures were
reframed to their named content after the reviewer flagged a retained-scroll image.
