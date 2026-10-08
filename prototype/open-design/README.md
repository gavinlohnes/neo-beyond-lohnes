# BEYOND — Open Design / Field

## Durable objective brief

- **Authorization:** owner-approved clean-sheet visual exploration, 2026-10-08. Synthetic prototype only; not production authorization.
- **Risk:** FEATURE exploration, isolated from production. Any eventual primary information architecture adoption needs its own bounded Protected approval.
- **Starting commit:** fresh `origin/master`, `8035dfbc0011bed03fb668e100aa8794cda4a8e7`.
- **Builder / branch:** Codex / `codex/beyond-open-design`. No PR requested or opened.
- **Scope:** original visual language, TODAY, one recommendation, read-only intelligence, manual entry previews, TRAIN/BODY/MORE extensions, mobile and desktop. Preserve earlier prototype history.
- **Exclusions:** production changes, Engine execution, canonical storage, events, schemas, backup operations, real data, AI integration, dependencies, deployments, merges, VCC-001 implementation.
- **Acceptance:** real browser captures, status/phase integrity, responsive interaction and accessibility checks, independent preview build, no production-source diff or network/storage activity.

## Review on a phone

On a computer with this repository checked out:

```sh
git fetch origin
git switch codex/beyond-open-design
npm ci
npx vite --config prototype/open-design/vite.config.ts --host 0.0.0.0 --port 5176
```

Connect phone and computer to the same trusted local network. Open `http://<computer-LAN-IP>:5176` on the phone. This runs a local preview; it does not deploy anything. Cloud localhost is not a phone-accessible URL. No temporary public preview has been published.

Open **Scene controls** to select before/on/after shift, day off, planned training, unknown context, or GREEN/AMBER/RED/NO READ. The control panel is outside the proposed product interface. It also preserves the Horizon and Index explorations. Default is the selected Field direction, after shift, GREEN.

Try accepting then undoing a recommendation; accepting does **not** start a flow. Open INTELLIGENCE and its included-record register. Use the plus control to preview manual entries. Explore TRAIN's manually selected session variant and BODY's neutral trend/record table. All feedback says what was previewed; nothing is saved. Context choices switch explicitly identified fictional scenarios only.

## Investigation and design selection

The real application centers on a deterministic recommendation, explicit work context, phase-specific operator choices, manual records, training and body information. Its event provenance, correction integrity, local ownership and backup safeguards are substantive product boundaries. Existing TODAY provided functional references, not a layout template.

The design opportunity is to make those priorities immediately legible: context first, a single decision second, relevant daily actions third. Evidence should be inspectable without competing with the recommendation. Quiet days should feel complete rather than demand activity. This is a design assessment, not a claim of user-study findings.

Three original studies used the same after-shift GREEN example:

| Study | Actual rendering | Assessment |
|---|---|---|
| Field | [Initial mobile study](screenshots/exploration-field-412.png) | Strongest division between operational context and the operator's decision. Selected and subsequently refined. |
| Horizon | [Spatial study](screenshots/exploration-horizon-412.png) | Spacious and expressive, but the enlarged context postpones the important decision and returns to a boxed composition. |
| Index | [Compact study](screenshots/exploration-index-412.png) | Faster scanning, but a technical mono recommendation loses warmth and visual character. |

The selected direction was refined after examining actual 320/412/desktop renders: tighter context, broad expressive recommendation type, a single cutout action silhouette, white phase marker and shared desktop/mobile hierarchy. It was built from master with original components and CSS; A–F layouts and assets were not used as a starting point.

## Signature language

An almost-black continuous ground replaces a stack of dashboard cards. Broad Plex headlines make the recommendation the unmistakable focal point; neutral running text and mono timestamps separate decision, explanation and observation. Whitespace and quiet dividers provide structure without decorative telemetry.

The primary action has an architectural black cutout for its directional arrow. Crimson belongs to actionable primary controls and selected navigation. Context remains neutral for GREEN and NO READ, amber for AMBER; only RED System Status colors its operational spine red. There are no copied logos, character illustrations, decorative red status lights, glow, meaningless gauges or fabricated warnings.

Navigation keeps BEYOND's four real destinations. Phone controls sit within easy reach; desktop gives phase-specific actions a parallel column without introducing essential desktop-only capabilities. Readable 16px body/control text, 44px targets, visible focus and native controls take priority over compactness.

## Intelligence and daily interactions

INTELLIGENCE is a closed-by-default, read-only native disclosure. Its concise introduction leads into a structured register: facts, work context, phase basis, interpretation, suggestion and uncertainty. A further disclosure exposes included authored records. It explicitly identifies synthetic data and never claims an Engine trace, evidence score, real provenance search or AI reasoning.

Recommendation decisions have local, undoable preview feedback. A RED-capacity decline requires explicit confirmation. A separate handoff illustrates that deciding and starting are distinct actions.

Manual entry forms use real check-in field ranges and readable direction labels, native validation and a modal focus boundary. They neither change the authored readings nor write an event. Unimplemented workflows are labeled capability previews instead of being misleadingly substituted with another action.

TRAIN reuses the genuine built-in A template; STANDARD/REDUCED is a manual visual selection, without progression inference. BODY uses neutral fictional observations and a seven-reading chart with a table, sample size and a warning against causal interpretation. MORE sketches the real navigation destinations without manipulating backups, schedules or plans.

These identity and interaction treatments are candidates for owner consideration. They are not approved production behavior. Full recording workflows, persistence, recommendation evaluation, event inspection and backup screens remain outside this exploration. No speculative Delta integration or new achievement system was needed to demonstrate the visual identity.

## External references actually consulted

- [Carbon spacing principles](https://github.com/carbon-design-system/carbon-website/blob/main/src/pages/elements/spacing/overview.mdx): deliberate whitespace, relationship through distance, responsive density and an ordered spacing scale.
- [Carbon typography](https://github.com/carbon-design-system/carbon-website/blob/main/src/pages/elements/typography/overview.mdx): expressive focal type paired with productive, legible interface text.
- [Carbon motion](https://github.com/carbon-design-system/carbon-website/blob/main/src/pages/elements/motion/overview.mdx): short, purposeful transitions instead of decorative movement.
- [IBM Plex](https://github.com/IBM/plex): a coherent available sans/mono family. Fonts come from existing repository dependencies and are served locally.
- [Radix dialog guidance](https://github.com/radix-ui/website/blob/main/data/primitives/docs/components/dialog.mdx): focus containment, explicit naming, Escape and focus return. Implemented with native dialog, without adding Radix.

Sources were read through public GitHub source endpoints; blocked public marketing pages were not treated as reviewed references. Batman Beyond's black/red contrast and striking silhouettes come from the owner's aesthetic brief, translated into original interface geometry.

## Screenshot index

Actual Chromium browser captures; no generated mockups.

| Scene | 320px | 360px | 412px |
|---|---|---|---|
| GREEN | [View](screenshots/today-green-320.png) | [View](screenshots/today-green-360.png) | [View](screenshots/today-green-412.png) |
| AMBER | [View](screenshots/today-amber-320.png) | [View](screenshots/today-amber-360.png) | [View](screenshots/today-amber-412.png) |
| RED | [View](screenshots/today-red-320.png) | [View](screenshots/today-red-360.png) | [View](screenshots/today-red-412.png) |
| UNKNOWN context / NO READ | [View](screenshots/today-unknown-320.png) | [View](screenshots/today-unknown-360.png) | [View](screenshots/today-unknown-412.png) |
| Expanded intelligence | [View](screenshots/intelligence-320.png) | [View](screenshots/intelligence-360.png) | [View](screenshots/intelligence-412.png) |
| Reduced motion | [View](screenshots/reduced-motion-320.png) | [View](screenshots/reduced-motion-360.png) | [View](screenshots/reduced-motion-412.png) |

- [Desktop TODAY](screenshots/desktop-today.png) · [Desktop intelligence](screenshots/desktop-intelligence.png)
- [Manual entry chooser](screenshots/record-chooser-360.png) · [Water entry](screenshots/water-entry-360.png) · [Check-in](screenshots/check-in-360.png)
- [TRAIN](screenshots/train-412.png) · [BODY](screenshots/body-412.png) · [MORE](screenshots/more-412.png)
- [Before shift](screenshots/scenario-before-412.png) · [On shift](screenshots/scenario-shift-412.png) · [Planned training](screenshots/scenario-training-412.png) · [Day off](screenshots/scenario-off-412.png)

## Verification

```sh
npx tsc --project prototype/open-design/tsconfig.json --noEmit
npx vite build --config prototype/open-design/vite.config.ts
node prototype/open-design/verify.mjs
npm run check:architecture
npm run build
```

The browser verifier uses existing Playwright/axe dependencies and installed Chromium (`CHROMIUM_PATH` can select another executable). `PROTOTYPE_URL` selects a separately running dev or built preview. It checks all 72 combinations of six scenarios, four readings and three phone widths, derived phase rows, one recommendation maximum, explicit statuses, closed intelligence, RED-only operational illumination, layout and touch targets; runs WCAG A/AA axe scans; exercises keyboard disclosure, decisions, RED decline confirmation, input validation, native modal containment/Escape/focus return, scenario choices, variants and chart records. Storage access and service-worker registration throw during the run, and external requests/browser exceptions fail it. Reduced-motion behavior is separately verified.

Generated verification JSON and build outputs are ignored. Production source, dependencies, lockfile, CI and previous prototype history are unchanged. This independent Vite root has no production router, public directory, PWA plugin, manifest or service-worker registration. Only pure production view helpers, field metadata and workout definitions are reused; Engine and persistence are not executed.

Automated accessibility checks do not replace physical-phone, assistive-technology or everyday-comfort review. Prototype forms do not implement production event semantics. This local preview has no offline cache; its assets require the local server, but no Internet services. Owner visual review is the next step; no production implementation or merge is authorized.
