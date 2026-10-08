# BEYOND — Interaction Laboratory

Three different ways to operate BEYOND. This is a navigation and task-flow experiment, not a replacement production application.

## Objective and authority

Owner-approved **Next-Generation Interface Exploration**, 2026-10-08. Builder: Codex. Branch: `codex/beyond-interaction-lab`. Starting point: freshly fetched master `8035dfbc0011bed03fb668e100aa8794cda4a8e7` (merged DEV-FLOW-002 adoption, PR #203). Active draft PR: [#204](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/204). Existing open PR #201 is unrelated and untouched.

Conservative risk lane: **PROTECTED — isolated primary interaction architecture exploration**. The owner explicitly authorized experimentation with navigation, hierarchy and task flow. That authority applies only to this laboratory; locked production navigation and VCC-001 scope are unchanged. Independent exact-head review and owner merge approval remain prerequisites to integrating even this prototype PR. No unresolved authority conflict was identified within this bounded scope.

Scope: three selectable mobile-first prototypes, synthetic task flows, evidence layers, history and workout continuity; research, real browser screenshots, focused verification and incremental adoption recommendations. Exclusions: production application, Engine execution, canonical records/events, persistence, schemas, corrections, backups, protected fixtures, dependencies, backend, AI, deployment and merges. Acceptance evidence is the browser suite, screenshots, standalone build and unchanged production source/dependency/CI diff.

The previous open-design visual study was preserved on `codex/beyond-open-design` at `d5667554e900cd9e0a6318ff0941e4ac4c5942c9`. It is an unfinished historical study, **not a passing verification claim**: its browser suite stopped on a modal focus-containment failure before the owner redirected the objective. Earlier A–F history also remains untouched. This laboratory starts from master and uses original interaction components/CSS, not that study's page layouts. Authored fixture data was adapted and corrected against current Engine priority rules.

## Review on a phone

On a computer with the repository:

```sh
git fetch origin
git switch codex/beyond-interaction-lab
npm ci
npx vite --config prototype/interaction-lab/vite.config.ts --host 0.0.0.0 --port 5178
```

Connect phone and computer to the same trusted LAN. Open `http://<computer-LAN-IP>:5178` in the phone browser. This is a local preview, not a public deployment. Cloud localhost is not reachable directly from your phone. No temporary external preview has been published.

The obvious selector at the top switches A/B/C. **Sample scene** selects work context, status or a fresh/unfinished workout, and resets temporary records. The panel is laboratory tooling, not proposed production navigation.

Try this same sequence in each concept:

1. Understand context, System Status and the single recommendation.
2. Accept or decline; notice nothing starts automatically. RED decline asks for confirmation.
3. Record water and a meal; inspect them in History.
4. Resume the sample workout, log a set, leave, resume at the same position, and undo the last demo set.
5. Finish the demo explicitly, then start a new one.
6. Inspect the recommendation and its read-only source readings.
7. Return home with the visible Home/Close control. Escape is an additional route, never the only one.
8. In C, change Display mode. Observe that operational state and recommendation do not change.

All inputs are synthetic or entered into temporary React memory. Reload resets the laboratory. No real data is read or written. Demo entries do not recompute System Status or recommendations.

## What the repository teaches

TODAY orients and recommends; TRAIN owns training execution and exact workout continuity; BODY presents nutrition, hydration, recovery and observations; MORE holds deeper capabilities such as history, planning, journal and backups. The application layer mediates commands/queries over event-sourced local records. The Engine's priority and evidence contract are substantive product behavior, not a design detail.

Relevant inspected implementation includes `TodayScreen`, `RecommendationCard`, `ActiveWorkoutCard`, `TrainScreen`/`GymMode`, `BodyScreen`, `HistoryScreen`/history copy, primary navigation, `evaluate`, `systemStatus` and `shiftClock`. Also read governance, checkpoint, capability map, engineering contract, doctrine, UX decisions, VCC-001 and existing prototype documentation/history. Existing Gym Mode already demonstrates that a focused task can occupy a whole screen without changing the underlying model.

The opportunity is to separate **orientation**, **action**, and **inspection**, instead of putting their full contents on one scrolling home page. Workout resumption should be an always-discoverable continuation rather than a hunt through navigation. Frequent logging should need little travel. A complete capability list must remain reachable when contextual shortcuts omit a task.

## Research: inspected sources and useful principles

Research was source/documentation based, not hands-on testing of the external applications. Public Apple, Niagara, Raycast, Android-design and Things support pages returned network-policy 403s. I did not pretend to inspect Dynamic Island, Nothing OS, Garmin, Hevy, WHOOP, Oura or other inaccessible products. GitHub source endpoints were available and provided the following usable evidence:

| Inspected source | Why the interaction works | BEYOND application / caution |
|---|---|---|
| [Kvaesitso launcher](https://github.com/MM2-0/Kvaesitso/blob/main/readme.md), [quick actions](https://github.com/MM2-0/Kvaesitso/blob/main/docs/docs/user-guide/search/quickactions.md), [favorites](https://github.com/MM2-0/Kvaesitso/blob/main/docs/docs/user-guide/concepts/favorites.md) | Search routes an intention to a specific action; visible pinned items avoid typing for frequent tasks. It distinguishes explicit pins from automatically reordered frequency. | B searches named tasks and provides fixed visible shortcuts. No inferred ranking, web search, Android intents or copied assets. Keyboard-first search alone would be poor for a tired phone user. |
| [Home Assistant quick bar](https://github.com/home-assistant/frontend/blob/dev/src/dialogs/quick-bar/ha-quick-bar.ts), [navigation/action command model](https://github.com/home-assistant/frontend/blob/dev/src/data/quick_bar.ts) | A global entry point spans many destinations; navigating and executing are distinct categories. Context is used to narrow access without replacing the complete catalog. | Shared System entry point, visible search results and dedicated workspaces. Choosing a recommendation and starting an activity remain distinct. No Home Assistant backend or its Lit implementation is copied. |
| [Super Productivity](https://github.com/super-productivity/super-productivity) | Its documented capture → plan → focus progression separates collecting information from focused execution. It describes explicit focus sessions and privacy without mandatory accounts. | Quick recording is a short layer; workouts get their own workspace. No timers, pressure metrics, integrations or automation are imported. README findings are not proof of superior usability. |
| [wger mobile](https://github.com/wger-project/flutter), [wger](https://github.com/wger-project/wger) | Training, measurements and nutrition are distinct jobs rather than one universal feed. Its server-connected architecture is a poor match to BEYOND's offline boundary. | Domain separation is useful; its application stack, progression rules, exercise assets and backend are not adopted. BEYOND's own Gym Mode and pure workout definitions are better reuse sources. |
| [Radix dialog guidance](https://github.com/radix-ui/website/blob/main/data/primitives/docs/components/dialog.mdx), [React Spectrum overlay variants](https://github.com/adobe/react-spectrum/blob/main/packages/@adobe/react-spectrum/docs/dialog/DialogTrigger.mdx) | Modal naming, containment, Escape and focus return make layers understandable. Tray versus fullscreen is chosen by task complexity and screen constraints. | A uses short sheets for logging and inspection; all concepts give workouts dedicated space. Native dialog plus explicit keyboard containment; no dependency added. |
| [cmdk](https://github.com/pacocoursey/cmdk) | Filtering named actions and explicit nested pages reduce navigation travel. Empty states and predictable keyboard behavior matter more than a glamorous palette. | Native search input with ordinary focusable result buttons, explicit empty results and visible browsing alternatives. No fake combobox roles or hidden-only shortcut. |

Batman Beyond's atmosphere informs near-black continuous surfaces, strong silhouettes and disciplined crimson primary decisions. No franchise logos, art, HUD assets or copied proprietary screens are used. Industrial clarity is expressed through real hierarchy and task separation, not fake telemetry.

## The three architectures

| | A — Command Console | B — System Launcher | C — Adaptive Experience |
|---|---|---|---|
| Home hierarchy | Context → one dominant decision → continuity → quick tasks | Context → action search/shortcuts → compact decision → continuity | Context → explicit display mode → relevant task surface → compact decision |
| Navigation architecture | Home remains the anchor; short tasks open modal sheets | Actions lead into dedicated full-screen workspaces; a searchable catalog replaces destination tabs | Activity changes the home's composition and shortcuts; deeper tasks open workspaces |
| Task completion | Sheets dismiss back to the console | Completed entries return to launcher; longer tasks keep a visible Home control | Entries return to the selected mode; workout position survives leaving |
| Deeper inspection | Read-only sheet preserves orientation behind it | Dedicated evidence workspace | Dedicated evidence workspace |
| Main risk | Complete capabilities can become buried in System | Typing can compete with quick access; recommendation is less dominant | Moving shortcuts can undermine muscle memory or look like automated judgment |

These are not three skins of four tabs: A keeps operations overlaid on a stable home; B organizes access around named actions and workspaces; C reorganizes the operating surface by an explicit activity. They share task primitives and synthetic facts so comparisons are meaningful. There is no gesture-only navigation, radial-menu precision burden or infinite dashboard.

C defaults its display mode only from the existing known phase (BEFORE/SHIFT/AFTER/OFF); UNKNOWN selects no mode. Manual selection changes presentation only. Train is an operator-selected activity, not a new phase or physiological inference. Mode never changes System Status, work context or recommendation.

## Usability evaluation

These are **measured logical control activations from implemented flows**, excluding typing, native select-picker mechanics and optional feedback dismissal; not human timing measurements or a user study. Default is after shift with an unfinished sample session.

| Task from home | A | B | C (Recover mode) |
|---|---:|---:|---:|
| Water form → submit prefilled/edited amount | 2 | 2 | 3 via Record |
| Meal form → submit completed fields | 2 | 2 | 3 via Record |
| Resume unfinished workout | 1 | 1 | 1 |
| Fresh workout (no active sample), open → explicitly start | 3 via System | 2 via shortcut | 3 via System; 2 when already in Train mode |
| Open history | 1 | 1 | 2 via System; 1 in Free mode |
| Inspect primary recommendation | 1 | 1 | 1 |
| Return from inspection to home | 1 | 1 | 1 |

At 320/360/412 × 800 CSS px the default operating surfaces fit without page scrolling. Longer evidence registers, timelines and forms may scroll **inside the task being inspected**. Smaller heights, larger text and explicit RED confirmation may need vertical scrolling; content is never clipped to claim a one-screen result.

| Criterion | A | B | C |
|---|---|---|---|
| Discoverability / clarity | Strong recommendation, obvious quick logging; full catalog secondary | Explicit searchable catalog and shortcuts; action names must be intuitive | Excellent relevant controls; irrelevant ones require System |
| One-handed use | Lower record/system dock, immediate logging, visible resume | Same reachable dock; search near center invokes keyboard | Lower relevant controls; mode picker is higher and less convenient |
| Visual identity | Strongest decision silhouette and negative space | Feels most like an OS launcher, calmer decision hierarchy | Most activity-specific identity, risk of competing mode headline |
| Accessibility | Native sheet + focus management needs careful testing | Native forms/workspace focus simpler; search has ordinary keyboard controls | Explicit mode selector; changing controls require predictable focus |
| Complexity / maintenance | Low–medium: a catalog plus reusable layers | Medium: workspace routing and return state | Highest: layout mappings and continuity across modes |
| Offline / expansion | Local task registry grows without expanding home | Best scale for many capabilities and lexical search | Scales only with disciplined mode rules and complete fallback catalog |

**Recommendation:** A as the default operating surface, B's searchable System catalog for complete access, and dedicated workspaces for training/history. This wins on routine task travel, clarity and discoverability rather than cinematic appearance. Keep C as an optional, explicitly selected focus view; do not silently rearrange the home based on inferred state. Owner phone testing may change that recommendation.

## Reuse assessment and leverage gate

No package was installed or copied. Existing React, lucide icons, local IBM Plex assets, pure `shiftClock`/status copy, check-in metadata and the built-in A workout prescription are reused. Production screens with application-layer I/O were inspected rather than mounted. Recommendation examples are authored fixtures, not a second runtime evaluator. The unfinished workout is a temporary interaction model, not a replacement session engine.

Repository-health observations below were fetched 2026-10-08; recent commits do not guarantee support. Bundle estimates are qualitative: no speculative exact kilobyte figures are claimed or measured from uninstalled packages.

| Candidate / disposition | License & observed maintenance | Fit, cost, compatibility and alternative |
|---|---|---|
| Native dialog/details/forms — **USE PLATFORM** | Browser platform, no new distributed library | No added bundle; offline and keyboard-capable. Chromium verified; Safari/Firefox and screen readers still need device testing. Explicit focus containment/return needed. Best for this bounded lab. |
| [Radix](https://github.com/radix-ui/primitives) — **DEFER dependency, use principles** | MIT; repository pushed Oct 8, not archived | Unstyled modular dialog/popover, mature keyboard patterns. Additional JS and integration tests; offline-compatible when bundled, mobile support should be tested. Worth considering when production overlays outgrow native primitives. Preserve MIT notice if adopted. |
| [React Aria](https://github.com/adobe/react-spectrum) — **DEFER** | Apache-2.0; pushed Oct 8 | Broad touch/keyboard/internationalization support. Integration/state conventions and potentially greater selected-package footprint; offline-compatible browser UI. Consider for a complex accessible command system, not this small list. Preserve license and applicable NOTICE on redistribution. |
| [cmdk](https://github.com/pacocoursey/cmdk) — **DEFER** | MIT; last observed push Oct 29, 2025; not archived | Rich command filtering/navigation; Radix dialog composition adds dependency surface. Browser/offline-compatible, but mobile keyboard ergonomics require testing. Native input/buttons suffice for nine actions. Existing MiniSearch is already the repo's approved lexical donor for larger local search. |
| [Vaul](https://github.com/emilkowalski/vaul) — **REJECT for now** | MIT; README explicitly says unmaintained; last push Oct 3, 2025 | Mobile drawer/gesture abstraction is tempting, but maintenance and drag/keyboard behavior increase risk. A native bottom-positioned dialog provides the useful layer without gesture dependency. |
| [Motion](https://github.com/motiondivision/motion) — **DEFER** | MIT; pushed Oct 8 | Gesture/layout/spring toolkit, tree-shakable but nonzero runtime cost. Offline-compatible; browser feature/performance and reduced-motion integration still need tests. Short CSS entry transitions meet this lab's needs. No paid Motion+ work used. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) — **DEFER** | MIT; pushed Oct 8 | Source ownership/customization useful, but copied components bring maintenance and usually styling/primitives conventions not present here. Imported components need license notice. Avoid importing an entire visual system for a few overlays. |
| Kvaesitso / wger / Home Assistant / Super Productivity — **BORROW PRINCIPLES, NOT STACKS** | Respectively GPL-3.0 / AGPL-3.0 / Apache-2.0 / MIT; all observed recent Oct pushes | Android, Flutter/server, Lit/backend and full productivity architectures do not match this React/local-first app. Source copying would require license-specific obligations and substantial adaptation. No source/assets copied, no backend/integrations added. |

No timeline/chart dependency is warranted for a chronological record list; native disclosures suffice. No new local-first state library is warranted: Dexie/event commands already own production persistence. Do not replace those with prototype memory or a donor store. Haptics are deferred: browser support, permission and platform differences would make them unreliable core feedback. Visible feedback remains sufficient without vibration.

## Screenshots

Actual Chromium captures, not AI mockups. Each link resolves directly to repository evidence.

| Home | 320 px | 360 px | 412 px | Desktop |
|---|---|---|---|---|
| A | [View](screenshots/A-home-320.png) | [View](screenshots/A-home-360.png) | [View](screenshots/A-home-412.png) | [View](screenshots/A-desktop.png) |
| B | [View](screenshots/B-home-320.png) | [View](screenshots/B-home-360.png) | [View](screenshots/B-home-412.png) | [View](screenshots/B-desktop.png) |
| C | [View](screenshots/C-home-320.png) | [View](screenshots/C-home-360.png) | [View](screenshots/C-home-412.png) | [View](screenshots/C-desktop.png) |

| Task / state | A | B | C |
|---|---|---|---|
| Water | [View](screenshots/A-water.png) | [View](screenshots/B-water.png) | [View](screenshots/C-water.png) |
| Meal | [View](screenshots/A-meal.png) | [View](screenshots/B-meal.png) | [View](screenshots/C-meal.png) |
| Workout resumed | [View](screenshots/A-workout.png) | [View](screenshots/B-workout.png) | [View](screenshots/C-workout.png) |
| Timeline | [View](screenshots/A-timeline.png) | [View](screenshots/B-timeline.png) | [View](screenshots/C-timeline.png) |
| Intelligence | [View](screenshots/A-intelligence.png) | [View](screenshots/B-intelligence.png) | [View](screenshots/C-intelligence.png) |
| AMBER | [View](screenshots/A-amber.png) | [View](screenshots/B-amber.png) | [View](screenshots/C-amber.png) |
| RED decision | [View](screenshots/A-red.png) | [View](screenshots/B-red.png) | [View](screenshots/C-red.png) |
| NO READ | [View](screenshots/A-no_read.png) | [View](screenshots/B-no_read.png) | [View](screenshots/C-no_read.png) |
| UNKNOWN context | [View](screenshots/A-unknown.png) | [View](screenshots/B-unknown.png) | [View](screenshots/C-unknown.png) |
| Reduced motion | [View](screenshots/A-reduced-motion.png) | [View](screenshots/B-reduced-motion.png) | [View](screenshots/C-reduced-motion.png) |

C also demonstrates [Work mode](screenshots/C-work-mode.png) and [Train mode](screenshots/C-train-mode.png).

## Verification and practical limits

```sh
npx tsc --project prototype/interaction-lab/tsconfig.json --noEmit
npx vite build --config prototype/interaction-lab/vite.config.ts
node prototype/interaction-lab/verify.mjs
npm run check:architecture
npm run build
```

Completed against the built preview: **69 layout/semantic checks, 60 axe scans, 47 actual screenshots**, with zero browser exceptions, external requests or canonical storage accesses. All three default homes fit 320/360/412 × 800px. All three built concepts also completed a water-entry smoke check. Standalone TypeScript/build and production architecture/TypeScript/build passed. Existing full suite: **206 test files, 2,129 passed, one skipped**. That suite used an external `/tmp` Vitest wrapper selecting installed Chromium; test selection/assertions and tracked configuration were unchanged. The existing production bundle-size advisory remains; no assertions or CI were weakened.

Browser verification uses existing Playwright and axe dependencies. Default Chromium is `/usr/bin/chromium`; override with `CHROMIUM_PATH`. `PROTOTYPE_URL` can target a separately running built preview. It checks three concepts at three widths, default home fit, 44px targets, no horizontal overflow, WCAG A/AA automated rules, forms/validation, in-memory timeline entries, workout cursor/undo/finish/start, one recommendation, no automatic start, RED confirmation, keyboard evidence disclosure, modal trapping/Escape/focus return, UNKNOWN no phase/mode, status-color integrity, mode invariance, reduced motion and interactions after disabling network. Any canonical storage access, service-worker registration, external request or browser exception fails the run. Generated JSON/build outputs are ignored.

The independent Vite root has no production router, public directory, manifest/PWA plugin or SW. Fonts bundle locally. Runtime imports are pure metadata/view helpers; application SystemStatus is a type-only import. No production source, dependencies, lockfile, governance authority, CI or old prototype files changed.

Offline **interaction after loading** is verified; cold-start offline caching is deliberately not added to this isolated lab. A locally running server is required to initially load it. Temporary forms and workout state are not a complete implementation of production session/correction/variant semantics. Unsubmitted form drafts and browser-history routing are not fully modeled; visible Home and Escape work. Chromium automation is not iPhone Safari, a screen-reader audit, physical thumb-reach testing or evidence of faster human completion times.

## Incremental production roadmap — proposal only

1. Owner compares the same tasks on a real phone and selects an architecture. Record the choice and a bounded Protected brief; obtain independent exact-head review before any implementation merge.
2. Inventory every current destination/action and its return/continuity contracts. Keep the existing four production destinations available while adding an approved optional System entry point; do not drop capabilities to make a clean home.
3. Build the command catalog over existing application commands/queries. Separate navigate, inspect and execute; commands never silently mutate. Reuse existing MiniSearch only if catalog size warrants lexical indexing; no network indexing or new canonical store.
4. Introduce one low-risk short interaction at a time, beginning with hydration. Keep event writes, validation, provenance, corrections and undo in existing application handlers. Verify assistive technology, keyboard/virtual-keyboard, 320px/reflow and offline behavior before expanding to meals/check-ins.
5. Adapt existing TRAIN/Gym Mode and continuity handlers into approved workspaces, retaining exact session position, logged values, recovery/variant safeguards and real return navigation. Test interruptions, reload recovery and backup compatibility against existing safeguards.
6. Compose the chosen home from existing context/Engine query results. There is still one primary recommendation, closed read-only inspection and explicit choices. VCC-001 remains its own unchanged bounded scope; this lab does not authorize a larger rollout under that name.
7. Only after owner testing and Protected approval consider optional explicit activity views. Never infer a physiological mode, alter status meaning or automatically change plans. Keep a stable complete catalog and a reversible fallback while migrating.

No merge, deployment, production VCC-001 implementation or data migration is part of this deliverable. Next action: owner visual/task-flow review; independent Protected review remains separate from the Builder's checks.
