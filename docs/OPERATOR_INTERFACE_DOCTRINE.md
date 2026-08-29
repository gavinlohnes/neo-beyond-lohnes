# BEYOND Operator Interface Doctrine

Status: **CONSTITUTIONAL AUTHORITY** — locked 2026-08-29.

This document governs what every BEYOND operator interface is allowed to mean and how it must
relate to the operator. It applies across FIELD, COMMAND, LINK, and any later surface. Specific
locked behaviors belong in `docs/UX_DECISIONS.md`; current implementation truth belongs in code
and tests.

## Constitutional doctrine

- **INFORM → INTERPRET → RECOMMEND → USER DECIDES.** BEYOND may increase clarity and reduce
  friction, but the operator remains the final decision authority.
- The deterministic Engine owns the primary Recommendation. There is one primary recommendation,
  and **NO ACTION REQUIRED** is a valid result.
- Prediction is not fact. Provenance must remain visible enough that inferred, scheduled,
  observed, and operator-entered truth are not silently conflated.
- History is preserved. Corrections supersede; they do not erase. Manual operation remains
  available.
- The system reports; the Advisor interprets. Silence is valid. User authority is absolute.
- Capability depth must coexist with surface calm: **GLANCE → ACT → INSPECT → TRACE**.
  FIELD compresses; COMMAND exposes. Neither may conceal or fabricate capability.
- Peak efficiency is not minimum code. It is the minimum code BEYOND is uniquely responsible
  for. Consequential work must pass the leverage classification: `BUILD OWNED`,
  `USE DEPENDENCY`, `ADAPT UPSTREAM`, `INTEGRATE PROVIDER`, `STANDARDIZE`, `DEFER`, or `REJECT`.

## Interface constitution

BEYOND should feel like a quiet piece of equipment that knows far more than it is currently
showing. Preserve black-dominant negative space, sharp red directionality, controlled
asymmetry, lean silhouettes, minimal ornament, typography-led hierarchy, and geometry that
implies motion. Red authority must be earned; significance earns intensity.

Reject generic card walls, universal card abstraction, gradients, glassmorphism, decorative HUD
geometry, fake telemetry, cyberpunk clutter, tiny decorative technical text, consumer-app pill
language, excessive rounding, decorative looping animation, and imitation of protected fictional
branding. Accessibility outranks aesthetic purity.

## Adjudication and implementation authority

This doctrine answers **what an interface is allowed to mean**. The Decision Register locks
specific product and UX adjudications. Repository code and tests show **what currently exists**.
A current approved Drop defines **what may be changed now**.

Doctrine is a constraint, not implementation authorization. It does not activate a campaign,
approve a feature, expand a Drop, or permit an agent to modify the product. Future implementation
requires a direct owner decision and an explicitly authorized Drop with a bounded scope and exact
baseline. When sources genuinely conflict, stop and escalate; never silently reinterpret the
doctrine to fit an implementation.

`docs/FIELD_ALPHA_CAMPAIGN.md` remains historical evidence of the campaign that established much
of this language. Its completed campaign authority does not confer standing authorization on
future work.
