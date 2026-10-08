# Command Center 2.0 — Interactive Design Lab

Owner-authorized visual exploration under [DEV-FLOW-002](../../docs/agent/DEV-FLOW-002.md). **Synthetic examples only. Nothing is live Engine output.**

## Current brief — CC2-PROTOTYPE-002

- Owner objective: D — NEO-GOTHAM COMMAND, combining A's clarity and B's angular structure with a stronger BEYOND identity. Explicit prototype-only authorization in the owner's CC2-PROTOTYPE-002 instruction.
- Starting reference: existing prototype commit `b23edae228b247ae272bfab9f8c440325c8f0826` on `codex/cc2-prototype-001`; fresh master remains `8035dfbc0011bed03fb668e100aa8794cda4a8e7`.
- Risk: FEATURE visual exploration; Builder: Codex; same branch; no PR.
- Scope: fourth selectable concept, scoped styles, existing synthetic scenes and controls, real screenshots and appropriate verification. A/B/C remain available; their original screenshots are preserved.
- Exclusions: production implementation/VCC-001, data/persistence, Engine/recommendation changes, dependencies, logos/character art, public deployment, PRs and merges.
- Acceptance: 320/360/412 px, status and phase fidelity, readable typography, accessible controls/contrast, closed read-only INTELLIGENCE, reduced motion, no external requests or storage access.
- Next action: owner visual review. No production work is authorized.

## Original brief — CC2-PROTOTYPE-001

- Objective: compare three phone-first TODAY concepts beginning with the approved VCC-001 State Rail.
- Risk lane: FEATURE, isolated prototype exploration; no authorization to implement protected product changes.
- Builder: Codex. Branch: `codex/cc2-prototype-001`. Active PR: none, as requested.
- Starting commit: fresh `origin/master`, `8035dfbc0011bed03fb668e100aa8794cda4a8e7` (DEV-FLOW-002 adoption merged in #203).
- Scope: separate React entry, three visual treatments, in-memory demonstration controls, browser screenshots and verification.
- Exclusions: production TODAY, Engine, real recommendations, events, schemas, persistence, backups, user data, deployment, dependencies, VCC-001 production implementation.
- Acceptance: usable at 320/360/412 CSS px; synthetic status/phase examples; read-only closed INTELLIGENCE; preserved operator choices; accessible controls; reduced motion; no external requests or storage access.
- Next action: owner selects a direction. Any production implementation needs its own authorization and review.

## Run locally or on a phone

From the repository root, use the existing dependencies (`npm ci` for a fresh checkout):

```sh
npx vite --config prototype/cc2-command-center/vite.config.ts
```

Open `http://127.0.0.1:5174`. Concept A/B/C/D and example selectors are above the phone surface. GREEN, AMBER, RED, UNKNOWN, and NO READ are selectable; phase selects BEFORE, SHIFT, AFTER, or OFF. UNKNOWN intentionally disables phase selection and assigns no phase. Open INTELLIGENCE to inspect the synthetic basis.

For a phone on the **same trusted local Wi-Fi**, run the command on your computer with `--host 0.0.0.0`, then open `http://<computer-LAN-IP>:5174` on the phone. This serves only on your local network; no deployment, tunnel, public hosting, or production PWA is configured. The cloud workspace URL is not a public phone preview.

For a bundled preview with all fonts/assets local:

```sh
npx vite build --config prototype/cc2-command-center/vite.config.ts
npx vite preview --config prototype/cc2-command-center/vite.config.ts
```

The preview command also accepts `--host 0.0.0.0` for local Wi-Fi. Keep this origin separate from the production app. The prototype has no service worker or offline cache, but its build has no external runtime dependencies and works without Internet while the local server is available.

Reproducible scene: `http://127.0.0.1:5174/?concept=B&example=RED&phase=SHIFT`.

## Original A/B/C comparison and recommendation

| Concept | Strength | Tradeoff |
| --- | --- | --- |
| A — Refined Command | Clearest hierarchy; compact context and familiar decision surface; easiest practical evolution. | Less dramatic than B. |
| B — Tactical Operations | Framed operational rail, sharp geometry, explicit phase structure; strongest command-center character. | More visual framing and density. |
| C — Living Intelligence | Calm context, generous typography, minimal recommendation framing and progressive disclosure. | Softer separation between recommendation and surrounding information. |

**Original CC2-PROTOTYPE-001 recommendation: A** as the foundation, with C's calm spacing as a possible owner-selected refinement. B is useful for evaluating how much tactical character feels appropriate. This recommendation authorizes no production work.

The original A/B/C treatments retain the black command-center foundation. Red is reserved exclusively for synthetic System Status RED in the rail; other states and controls do not create red alerts. No decorative telemetry, fabricated urgency, gradients, glass, or AI animations are introduced.

## D — NEO-GOTHAM COMMAND

D borrows A's operational-first hierarchy and clear stacked decisions, and B's angular phase selection and framed context. Its new identity comes from a tall, compact BEYOND wordmark, deliberately asymmetric cutaway State Rail, existing Big Shoulders Display font for strong silhouettes, and an open recommendation surface with generous black negative space. Body copy remains Chakra Petch, with JetBrains Mono reserved for factual labels. All fonts are bundled from available assets; no new dependency or font service.

Crimson follows existing earned roles in the UX red budget: the actionable primary choice and the selected destination marker. It never decorates the header, labels, phase highlight or GREEN/NO READ rail, and GOT IT stays neutral. Rail red illumination requires the existing synthetic RED fixture. AMBER uses the existing warning color; status is always stated in text. There are no invented readings, alerts or recommendations: all fixture content and phase derivation are unchanged from the starting commit.

Motion is the existing brief entry/press treatment, with no loops or animated status indicators. Reduced motion disables animation, transitions and press scaling. Geometry frames real regions; there is no bat symbol, character art, skyline, fake telemetry, gradient or glass treatment.

D is the stronger identity candidate: more architectural than A and less boxed than B. Tradeoffs: condensed uppercase headlines are visually forceful and need owner comfort testing over repeated use; the frame costs some vertical space, especially at 320 px. Recommendation actions remain reachable by normal scrolling; neither information nor controls are removed to force everything above the fold. On smaller screens the context choice stacks rather than shrinking text. This remains an exploration, not a production design decision.

### D browser captures

Real Chromium rendering, 915 px viewport height, at each requested width. The selectors are above the captured phone surface. Every fixture remains visibly labeled synthetic.

| Width | GREEN | AMBER | RED | UNKNOWN | INTELLIGENCE | Reduced motion |
| --- | --- | --- | --- | --- | --- | --- |
| 320 | [View](screenshots/concept-d-green-320.png) | [View](screenshots/concept-d-amber-320.png) | [View](screenshots/concept-d-red-320.png) | [View](screenshots/concept-d-unknown-320.png) | [View](screenshots/concept-d-intelligence-320.png) | [View](screenshots/concept-d-reduced-motion-320.png) |
| 360 | [View](screenshots/concept-d-green-360.png) | [View](screenshots/concept-d-amber-360.png) | [View](screenshots/concept-d-red-360.png) | [View](screenshots/concept-d-unknown-360.png) | [View](screenshots/concept-d-intelligence-360.png) | [View](screenshots/concept-d-reduced-motion-360.png) |
| 412 | [View](screenshots/concept-d-green-412.png) | [View](screenshots/concept-d-amber-412.png) | [View](screenshots/concept-d-red-412.png) | [View](screenshots/concept-d-unknown-412.png) | [View](screenshots/concept-d-intelligence-412.png) | [View](screenshots/concept-d-reduced-motion-412.png) |

Open directly with `http://127.0.0.1:5174/?concept=D&example=GREEN&phase=AFTER`, or use your computer's LAN address on a phone with the same query.

## Actual TODAY and fidelity

Inspection covered `TodayScreen.tsx`, `shiftClock.ts`, status copy, global styles/tokens, the Operator Interface Doctrine, UX decisions, VCC-001 and existing HUD/STATUS screenshot evidence.

Current TODAY has a context strip, at most one dominant recommendation/operation, capped attention, phase-derived rows (maximum four), tools and existing navigation. This prototype preserves that composition rather than adding another TODAY row or dominant panel. It reuses the pure `deriveShiftClockView` phase semantics, `FieldDisclosure`, `CollapsibleRow`, `CommandSurface`, icons, status copy, tokens and local fonts. BEFORE has TONIGHT/FUEL; SHIFT QUICK LOG/FUEL; AFTER SHIFT DOWN/CHECK IN/WORKOUT/MAIN SLEEP; OFF CHECK IN/WORKOUT; UNKNOWN WORK QUESTION/CHECK IN/WORKOUT.

Operational context leads. System Status is explicit. UNKNOWN never assigns a phase. INTELLIGENCE starts closed, shows read-only synthetic provenance/facts and introduces no edits. Existing context choice, recommendation acceptance/decline, manual logging, tools and work-ended choice remain accessible in their applicable contexts. RED decline demonstrates explicit confirmation. No recommendation is computed by the Engine: fixture copy is labeled EXAMPLE RECOMMENDATION. Demo actions show feedback only; tabs outside TODAY are clearly labeled placeholders.

## Real browser screenshots

Chromium captures, 412 × 915 CSS px, no generated mockup images. The design-lab selectors are above the captured surface; “Synthetic scene” remains visible. Same GREEN/AFTER fixture enables a fair comparison.

| Concept | GREEN | AMBER | RED | UNKNOWN | Expanded INTELLIGENCE |
| --- | --- | --- | --- | --- | --- |
| A | [View](screenshots/concept-a-green-412.png) | [View](screenshots/concept-a-amber-412.png) | [View](screenshots/concept-a-red-412.png) | [View](screenshots/concept-a-unknown-412.png) | [View](screenshots/concept-a-intelligence-412.png) |
| B | [View](screenshots/concept-b-green-412.png) | [View](screenshots/concept-b-amber-412.png) | [View](screenshots/concept-b-red-412.png) | [View](screenshots/concept-b-unknown-412.png) | [View](screenshots/concept-b-intelligence-412.png) |
| C | [View](screenshots/concept-c-green-412.png) | [View](screenshots/concept-c-amber-412.png) | [View](screenshots/concept-c-red-412.png) | [View](screenshots/concept-c-unknown-412.png) | [View](screenshots/concept-c-intelligence-412.png) |

Additional captures: [320 px](screenshots/concept-a-green-320.png), [360 px](screenshots/concept-a-green-360.png), and each concept's reduced-motion RED example in the same folder. These are exploration evidence, not the six production acceptance screenshots required by VCC-001.

## Verification

```sh
npx tsc -p prototype/cc2-command-center/tsconfig.json
npx vite build --config prototype/cc2-command-center/vite.config.ts
node prototype/cc2-command-center/verify.mjs
npm run check:architecture
npm run build
```

Browser verification uses the repository's existing Playwright and axe-core. It uses `/usr/bin/chromium` when available, otherwise Playwright's installed Chromium; optionally set `CHROMIUM_EXECUTABLE_PATH`. Start the prototype first; an optional argument selects another local origin. The generated `verification.json` and build output are ignored.

The browser suite covers 60 mobile concept/status/width scenes with closed and expanded INTELLIGENCE, 16 phase cases, 45 WCAG A/AA axe scans (including D expanded), four interaction sequences, six reduced-motion cases and 18 new D screenshots. It checks horizontal overflow, minimum 16 px text and 44 px controls, phase/row fidelity, RED rail confinement and allowed primary-control red roles, decision confirmation and D keyboard disclosure, and absence of storage access, service-worker registration, external requests and runtime errors. Architecture, standalone TypeScript, isolated build and unchanged production build are also checked. The bundled D preview also passed a browser smoke check with local fonts, no external requests, errors or service workers. Production build retains its existing large-chunk advisory.

No dependencies, production source/styles/configuration, CI, or product behavior are modified. No public preview, production PR, merge or deployment is performed. Owner review is the next step.
