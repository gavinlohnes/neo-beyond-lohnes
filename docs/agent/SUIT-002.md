# SUIT-002 — make the armor answer

- Authority: Gavin's direct BEYOND // SUIT brief, 2026-10-27, ending “Begin.”
- Builder: Codex. Lane: PROTECTED for the integrated MEMORY event contract and additive command outcomes; existing MEMORY-001 remains a
  separately approved Protected event-contract PR, not a second memory implementation.
- Baseline: fresh origin/master `8aedba5567cded7e40afd8a1fb2c0588f10f7a98`.
- Branch: `codex/suit-002`; [PR #307](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/307), stacked on #303. Every merge remains Gavin's.
- REUSE: native Vibration API, existing `feel/haptics`, HoldButton, ConfirmBanner, PREP,
  RecordSheets, TRAIN set confirmation, rotation/Flips and MEMORY-001 #303.
- OWN: semantic mapping of actual successful UI commits to light/medium/heavy feedback;
  hold threshold is arming, never a successful-save claim; calm abbreviated presentation.
- BUILD FROM SCRATCH: only the missing shared feedback dispatch, because the existing helper
  covered two haptic meanings without a visual or reduced-motion policy. No runtime dependency.
- Scope: one-shot 120ms neutral feedback; successful common record and correction paths,
  charged hold cancellation/disable handling; short next-window surface/details and plain flip
  record labels. Reuse #303's complete confirmed-memory loop; integrated into this branch for combined acceptance, without merging #303 to master.
- Exclusions: Engine, recommendation authority, new schema/events beyond the approved MEMORY-001 event, backup, inference, primary
  navigation, extra TODAY tiles/red, idle animation, notifications, sound, cloud, dependencies.
- Acceptance: failed/no-op operations do not announce success; holds cancel on release/blur/
  disable/unmount; inspection holds stay mute; reduced-motion suppresses haptic/pulse while
  retaining functionality. Vibration refusal/absence cannot break a save. Offline 360px flow,
  axe, screenshot evidence, focused regressions and full verify/required CI. Device haptic
  strength is best effort; a browser test cannot prove physical sensation on Gavin's phone.
- Campaign continuity: #303 has green CI and exact-head independent review at `71bcb079`;
  it is open and unmerged. This objective does not imply merge approval for either PR.

Native API evidence: [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)
reviewed via the upstream MDN content repository: sticky user activation, unsupported-device
no-op, DND refusal and durations rather than programmable physical intensity. Reuse the native
standard; no haptic library can manufacture hardware support.

## Review corrections and command outcomes

Independent WIP review BLOCK at `eef4714`: KEEP was a no-write choice, idempotent undo/void
could falsely acknowledge a commit, and async focus could move before confirmation. Corrected
by keeping KEEP mute, capturing the initiating control before await, and reporting actual writes
from existing application commands. Void/undo/archive/status commands return `boolean`;
ID/model-returning weekly review, clean-day, memory and workout-start commands accept an optional
caller-owned ephemeral `WriteReceipt`. Existing writes, guards, return IDs, events, transaction
boundaries and recommendation behavior remain the same. No receipt is persisted or backed up.
UI consumes the outcome only after the whole command resolves; a failed transaction never earns
feedback. The owner-approved sensory wiring requires this truthful outcome rather than a guessed
pre-read. Full gate and renewed exact-head review cover these additive API outcomes.

Combined base includes unchanged MEMORY-001 at `71bcb079`. Master `8aedba5` contributes already
merged LOOP/ROTATION work; those are not new SUIT feature scope. Merge conflicts resolved by
preserving MEMORY's nullable, day-owned PREP guard plus the successful-write acknowledgement,
and retaining both checkpoint histories. Integration order: #303, then #307; Gavin approves each.
