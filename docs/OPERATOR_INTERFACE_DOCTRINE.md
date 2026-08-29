# BEYOND Operator Interface Doctrine

Status: **CONSTITUTIONAL AUTHORITY** — locked 2026-08-29.

This document governs what every BEYOND operator interface is allowed to mean and how it must
relate to the operator. Specific locked behaviors belong in `docs/UX_DECISIONS.md`; code and
tests record current implementation truth.

## North Star and operating relationship

> “BEYOND should know you increasingly well while asking increasingly little from you.”

> “BEYOND'S ULTIMATE INTERFACE IS NOT THE SCREEN. IT IS THE RELATIONSHIP BETWEEN WHAT THE SYSTEM KNOWS, WHAT REALITY REQUIRES, AND HOW LITTLE OF YOUR ATTENTION IT NEEDS TO BRIDGE THE TWO.”

The core loop is **KNOW → ANTICIPATE → SURFACE → CONFIRM/CORRECT → LEARN → RECEDE**. BEYOND
must earn recession through evidence; it never earns authority over the operator.

- **INFORM → INTERPRET → RECOMMEND → USER DECIDES.** The deterministic Engine owns one primary
  Recommendation, and **NO ACTION REQUIRED** is a successful FIELD state.
- The system reports; the Advisor interprets. Prediction is not fact, silence is valid, manual
  operation remains available, and user authority is absolute.
- History and provenance remain inspectable. Corrections supersede rather than erase.

## Depth, attention, and control

Optional depth has four stable levels: **Surface** (what matters now), **Operate** (the immediate
control), **Inspect** (supporting evidence and alternatives), and **System** (configuration,
history, trace, and machinery). Capability depth must coexist with surface calm.

Attention has four states: **AVAILABLE**, **SUGGESTED**, **ATTENTION**, and **CRITICAL**. Escalate
only to the lowest state justified by five tests:

1. **Consequence:** what real harm or material loss follows if this waits?
2. **Time:** does the useful response window actually narrow now?
3. **Action:** is there a clear operator decision or operation available now?
4. **Confidence:** is the evidence strong and current enough to justify interruption?
5. **Burden:** is the interruption proportionate to the consequence and cheaper than silence?

Availability is not urgency. Color, motion, sound, haptics, position, and repetition must not
manufacture escalation that these tests do not earn. Fast controls make frequent, reversible,
well-understood actions immediate; they never bypass confirmation for destructive,
high-consequence, ambiguous, or low-confidence actions.

## Operator Model and reality

The Operator Model is a bounded, inspectable, correctable account of relevant routines,
preferences, constraints, capabilities, and current state—not a hidden personality score,
diagnosis, moral judgment, or claim of identity. Every consequential model output must retain
source, recency, confidence, and a route to correction.

Context describes present reality; posture describes the system's temporary operating stance in
response. Neither becomes a permanent label. Context and posture must decay, refresh, conflict
honestly, and yield immediately to better evidence or operator correction.

- Bad days get a shorter **reality path**: preserve essential capability, reduce decisions and
  steps, and offer the smallest safe next move. Do not demand ideal-day behavior from constrained
  reality.
- No guilt mechanics: no shame copy, punitive streaks, failure theater, withheld capability,
  nagging, or engagement pressure. A miss is evidence to reconcile, not a character verdict.
- Learned shortcuts may reorder, prefill, or surface reversible choices only when evidence is
  stable. They remain visible, correctable, and easy to escape; they never silently execute
  consequential actions or turn correlation into permission.
- Uncertainty must be named and carried forward. Low confidence reduces assertion and
  interruption; it never gets hidden behind confident interface language.
- Interruption preserves state and intent. Resume the same canonical operation at the point of
  interruption, distinguish resumption from restart, and never duplicate or silently abandon it.

## Language, identity, and sensory semantics

Vocabulary and glyphs are stable contracts: one meaning per term or symbol, the same meaning
across surfaces, and explicit migration when meaning changes. Semantic haptics may confirm a
small, stable set of meanings—success, warning, critical, or boundary—but never decorate,
gamify, carry meaning alone, or vary arbitrarily by screen.

> “The Bat identifies the machine. BEYOND's language operates it.”

The correct Batman Beyond bat symbol may be used in this private build when it has stable
semantic meaning. BEYOND should look and behave like Batman is using it in his suit. The Bat
must never be random decoration or receive inconsistent meanings. The target is **private suit
software / Wayne Applied Sciences prototype equipment**: black-dominant negative space, sharp
red directionality, controlled asymmetry, lean silhouettes, minimal ornament, typography-led
hierarchy, and geometry that implies motion. Red authority must be earned; significance earns
intensity; accessibility outranks aesthetic purity.

Reject generic card walls, universal card abstraction, gradients, glassmorphism, decorative HUD
geometry, fake telemetry, cyberpunk clutter, tiny decorative technical text, consumer-app pill
language, excessive rounding, and decorative looping animation.

## FIELD, COMMAND, and truth boundaries

FIELD is one-hand, divided-attention operation: glanceable, thumb-reachable, interruption-safe,
and sparse enough to use while reality is happening. COMMAND is deliberate deep work: broader
context, comparison, configuration, interrogation, and trace. FIELD compresses; COMMAND exposes.
They share truth and vocabulary, but neither is a scaled copy of the other.

TODAY is the smallest useful representation of the operator's situation right now—not a
dashboard, backlog, or demand for interaction. Surface only what changes understanding or the
next decision; **NO ACTION REQUIRED** means the system succeeded without taking attention.

Search and interrogation may retrieve recorded truth, attributed inference, and visible
uncertainty. They must not fabricate missing facts, imply that absence was searched when it was
not, or convert prediction into history. Configuration is restrained: expose only choices with
durable operator value; prefer learned, reversible defaults over settings sprawl, but never hide
control behind learning.

## Evidence, experiments, and field learning

Confidence must match evidence. Small-N observations can suggest a pattern or explicit personal
experiment, but cannot silently become doctrine, universal truth, or automation. Personal
experiments name the hypothesis, measure, duration, success/stop condition, and operator consent;
results remain personal evidence until stronger authority adjudicates otherwise.

Measure operator burden—not engagement: attention demanded, time to useful action, avoidable
steps, interruption cost, correction frequency, recovery/resumption quality, and whether the
system safely recedes. More opens, taps, time-in-app, or notifications are not success by
themselves.

Classify field evidence before acting:

- **Incident:** a bounded failure or defect; repair it without inventing general doctrine.
- **Friction:** recurring avoidable burden; simplify the path while preserving truth and control.
- **Pattern:** repeated evidence worth testing; do not universalize from small N.
- **Doctrine failure:** the governing principle produces the wrong relationship with the
  operator; escalate for explicit owner adjudication before changing constitutional authority.

## Adjudication and implementation authority

This doctrine answers **what an interface is allowed to mean**. The Decision Register locks
specific product/UX adjudications. Code and tests show **what currently exists**. A current
approved Drop defines **what may be changed now**.

Doctrine is a constraint, not implementation authorization. It does not activate a campaign,
approve a feature, expand a Drop, or permit an agent to modify the product. Future implementation
requires a direct owner decision and an explicitly authorized Drop with bounded scope and an
exact baseline. Genuine conflicts stop and escalate; doctrine is never silently reinterpreted to
fit implementation.

`docs/FIELD_ALPHA_CAMPAIGN.md` remains unchanged historical evidence. Its completed campaign
authority and older restrictions do not override current constitutional doctrine or confer
standing authorization on future work.
