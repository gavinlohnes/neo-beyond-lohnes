# MEMORY-001 — built-PWA acceptance

Actual production build from source `8da2c0e23fcbf54d6410276f89715fc4bf6495d4`, captured
2026-10-27 with synthetic records only. No owner backup or personal data was used.

Chromium, America/Chicago, Tue, Oct 27 at 17:00; reduced motion. Viewports 360×800, 390×844,
844×390 and 1280×900. All four pass; [machine-readable results](acceptance.json).

## Complete operator loop

1. MORE → What BEYOND should remember → add a food memory using an editable starter → explicitly
   SAVE & CONFIRM. Add an operator-authored recovery fact separately. Inspect shows source/kind
   and confirmation time. No fact exists merely from opening a view or selecting a starter.
2. TODAY → preparation sheet: food memory appears, recovery memory does not. Correct the food
   statement, then mark it irrelevant: it disappears from PREP's active context.
3. TRAIN → RECOVERY: the recovery statement appears. STANDARD hides it. No workout is started
   or changed by the memory. No extra primary/red controls are added by the memory component.
4. Offline reload → MORE memory: active recovery fact persists; the food fact remains findable
   under NO LONGER RELEVANT, with original and corrected wording in its three-revision history.
5. Native backup download → actual restore preview → cancel. No replacement applied in this
   synthetic browser; integration tests separately prove actual replace/restore and old backups.

Network is disabled before the complete author/edit/status/context journey. Across every table,
the only domain changes are exactly four MEMORY_RECORDED events (two creates, one correction,
one irrelevant revision). Original events and all other tables remain equal. No page errors or
horizontal overflow. Fresh isolated contexts are used for each viewport.

Phone captures: [PREP](prep-360.png), [manager](inspect-360.png),
[irrelevant](irrelevant-360.png), [recovery](recovery-360.png). Matching 390/844/1280 files show
the same journey at the other sizes. These are real viewport captures, not composite designs.

## Verification and test history

- Memory integration 7/7: lifecycle/source/times, retries/stale guards, clock correction/corrupt
  history, atomic/day failures, new-day/native/old-backup persistence, unchanged Engine trace.
- Memory browser 9/9: actual PREP add/irrelevant/restore, MORE correction and history, recovery
  scoping, ended/null/new-day draft survival and explicit day adoption, four axe/reduced-motion
  sizes, bounded lists, unavailable/retry and stale read rejection.
- Focused PREP/Memory/TRAIN/Nav regression 104/104 before final day-owned read refinement;
  current Memory + Personal Understanding follow-up 18/18; node catalog/history/memory 34/34.
  The new catalog route passes its exact heading/focus/back/no-write case.
- Initial full run: 3,031 pass / three fail / one existing skip. Corrected two missing catalog
  expectations (new view heading, existing MY MEALS memory alias); unchanged Personal
  Understanding target-return timeout passes in the focused follow-up. Assertions/timeouts and
  workflow gates were not weakened. Final full verification and exact-head review are in #303.
- Initial manual harness used an old preview process (page-load timeout); a fresh preview
  resolved it. Async write waits and clearing the retained menu query before restore preview
  were corrected in the harness. The final four-size journey above passes.

Source head's required CI passes:
https://github.com/gavinlohnes/neo-beyond-lohnes/actions/runs/40467876738 . Existing >500 kB bundle
warning remains. No public Pages check, merge or deployment is claimed; Gavin approves merging.
