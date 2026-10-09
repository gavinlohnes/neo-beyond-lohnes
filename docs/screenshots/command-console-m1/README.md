# Command Console milestone 1 — browser evidence

Actual Chromium rendering of production components, using isolated disposable browser contexts
and synthetic records created through canonical application commands. No personal records were
read. Phone captures use reduced motion, 800px viewport height, and the existing four-tab shell.
These are verification fixtures, not proposed new operational facts or user data.

| Scene | Capture |
| --- | --- |
| Console, 320/360/412 CSS px | [320](console-320.png) · [360](console-360.png) · [412](console-412.png) |
| Genuine Engine/status results from synthetic check-ins | [AMBER](console-amber-360.png) · [RED](console-red-360.png) |
| Existing recommendation evidence disclosure | [Evidence](evidence-360.png) |
| Existing meal workflow with explicit return | [Meal](meal-360.png) |
| Existing water workflow, success and undo | [Water](water-360.png) |
| Existing active session, resume above navigation | [Resume](resume-360.png) |
| Transitional workspace chooser | [SYSTEM](system-360.png) |

Measured control activations, excluding typing/disclosure details: WATER → quick amount takes
two; MEAL → existing preset LOG → explicit RETURN takes three; SYSTEM → workspace takes two;
active workout → RESUME takes one. These are task-flow counts, not measured human speed claims.
Water returns through existing tab navigation; meal retains its existing origin/focus/draft flow.
SYSTEM's complete searchable capability catalog is intentionally deferred.

Browser coverage is in `tests/browser/CommandConsole.test.tsx`, existing meal round-trip tests,
and phase/workout/motion/accessibility regressions. Physical phones, Safari and screen readers
remain separate field-validation work. Review the production branch with the repository's normal
`npm run dev` workflow; no public deployment or new preview infrastructure is provided.
