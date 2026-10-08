# CC2-PROTOTYPE-001 — Command Center 2.0

Owner-authorized visual exploration under [DEV-FLOW-002](../../docs/agent/DEV-FLOW-002.md). **Synthetic examples only. Nothing is live Engine output.**

## Durable brief

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

Open `http://127.0.0.1:5174`. Concept and example selectors are above the phone surface. GREEN, AMBER, RED, UNKNOWN, and NO READ are selectable; phase selects BEFORE, SHIFT, AFTER, or OFF. UNKNOWN intentionally disables phase selection and assigns no phase. Open INTELLIGENCE to inspect the synthetic basis.

For a phone on the **same trusted local Wi-Fi**, run the command on your computer with `--host 0.0.0.0`, then open `http://<computer-LAN-IP>:5174` on the phone. This serves only on your local network; no deployment, tunnel, public hosting, or production PWA is configured. The cloud workspace URL is not a public phone preview.

For a bundled preview with all fonts/assets local:

```sh
npx vite build --config prototype/cc2-command-center/vite.config.ts
npx vite preview --config prototype/cc2-command-center/vite.config.ts
```

The preview command also accepts `--host 0.0.0.0` for local Wi-Fi. Keep this origin separate from the production app. The prototype has no service worker or offline cache, but its build has no external runtime dependencies and works without Internet while the local server is available.

Reproducible scene: `http://127.0.0.1:5174/?concept=B&example=RED&phase=SHIFT`.

## Concepts and recommendation

| Concept | Strength | Tradeoff |
| --- | --- | --- |
| A — Refined Command | Clearest hierarchy; compact context and familiar decision surface; easiest practical evolution. | Less dramatic than B. |
| B — Tactical Operations | Framed operational rail, sharp geometry, explicit phase structure; strongest command-center character. | More visual framing and density. |
| C — Living Intelligence | Calm context, generous typography, minimal recommendation framing and progressive disclosure. | Softer separation between recommendation and surrounding information. |

**Recommend A** as the foundation, with C's calm spacing as a possible owner-selected refinement. B is useful for evaluating how much tactical character feels appropriate. This recommendation authorizes no production work.

All treatments retain the black command-center foundation. Red is reserved exclusively for synthetic System Status RED in the rail; other states and controls do not create red alerts. No decorative telemetry, fabricated urgency, gradients, glass, or AI animations are introduced.

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

The browser suite covers 45 mobile concept/status/width scenes with closed and expanded INTELLIGENCE, 12 phase cases, 15 WCAG A/AA axe scans, three interaction sequences, three reduced-motion cases and 20 screenshots. It checks horizontal overflow, minimum 16 px text and 44 px controls, phase/row fidelity, RED confinement, decision confirmation, and absence of storage access, service-worker registration, external requests and runtime errors. Architecture, standalone TypeScript, isolated build and unchanged production build are also checked. Production build retains its existing large-chunk advisory.

No dependencies, production source/styles/configuration, CI, or product behavior are modified. No public preview, production PR, merge or deployment is performed. Owner review is the next step.
