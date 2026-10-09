# SYSTEM catalog milestone 2 — browser evidence

Actual Chromium rendering of production components, isolated disposable contexts, synthetic
fixtures created through existing application commands. No real user records were inspected.
Captures use reduced motion and the retained four-tab application. No prototype state is used.

| Scene | Capture |
| --- | --- |
| Browse without typing, 800px height | [320px](browse-320.png) · [360px](browse-360.png) · [412px](browse-412.png) |
| Capability search: History | [320px](search-320.png) · [360px](search-360.png) · [412px](search-412.png) |
| Real production destinations | [History](history-360.png) · [Meal with explicit return](meal-return-360.png) |
| No matching capability | [360px](no-results-360.png) |
| Reduced visual space, 360 × 420px | [Launchable result](compact-keyboard-space-360.png) |

The constrained-height capture models space available with a phone keyboard; it does not show
an actual operating-system keyboard. Optional introductory copy yields space to real results;
Close, query, result count and launch controls remain available. Physical phones/Safari and
screen-reader testing remain field-validation work.

Task paths: SYSTEM → browse/select a capability; or SYSTEM → type a name/alias → select.
Selecting opens an existing tool, never performs a domain action. Water and Meal remain directly
accessible from TODAY without search. Search Records opens existing personal record retrieval;
capability search does not read or index personal records.

Review locally: `git fetch origin`, `git switch codex/system-catalog-m2`, `npm ci`, `npm run dev`.
On a trusted LAN open `http://<computer-LAN-IP>:5173/neo-beyond-lohnes/` from the phone.
No public preview, deployment, new package or infrastructure is involved.
