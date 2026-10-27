# SUIT-002 — make the armor answer

- Authority: Gavin's direct BEYOND // SUIT brief, 2026-10-27, ending “Begin.”
- Builder: Codex. Lane: FEATURE sensory/presentation work; existing MEMORY-001 remains a
  separately approved Protected event-contract PR, not a second memory implementation.
- Baseline: fresh origin/master `8aedba5567cded7e40afd8a1fb2c0588f10f7a98`.
- Branch: `codex/suit-002`; PR pending. Every merge remains Gavin's.
- REUSE: native Vibration API, existing `feel/haptics`, HoldButton, ConfirmBanner, PREP,
  RecordSheets, TRAIN set confirmation, rotation/Flips and MEMORY-001 #303.
- OWN: semantic mapping of actual successful UI commits to light/medium/heavy feedback;
  hold threshold is arming, never a successful-save claim; calm abbreviated presentation.
- BUILD FROM SCRATCH: only the missing shared feedback dispatch, because the existing helper
  covered two haptic meanings without a visual or reduced-motion policy. No runtime dependency.
- Scope: one-shot 120ms neutral feedback; successful common record and correction paths,
  charged hold cancellation/disable handling; short next-window surface/details and plain flip
  record labels. Reuse #303's complete confirmed-memory loop; do not merge or rebuild it here.
- Exclusions: Engine, recommendation authority, schema/events, backup, inference, primary
  navigation, extra TODAY tiles/red, idle animation, notifications, sound, cloud, dependencies.
- Acceptance: failed/no-op operations do not announce success; holds cancel on release/blur/
  disable/unmount; inspection holds stay mute; reduced-motion suppresses haptic/pulse while
  retaining functionality. Vibration refusal/absence cannot break a save. Offline 360px flow,
  axe, screenshot evidence, focused regressions and full verify/required CI. Device haptic
  strength is best effort; a browser test cannot prove physical sensation on Gavin's phone.
- Campaign continuity: #303 has green CI and exact-head independent review at `71bcb079`;
  it is open and unmerged. This objective does not imply merge approval for either PR.
