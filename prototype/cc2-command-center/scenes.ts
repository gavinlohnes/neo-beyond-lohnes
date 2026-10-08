import type { SystemStatus } from "../../src/application/systemStatus";
import { deriveShiftClockView, describeCountdown, describePhaseHeading } from "../../src/ui/screens/today/shiftClock";
import type { ShiftClockInput } from "../../src/ui/screens/today/shiftClock";
import { describeStatusFact, describeSystemStatus } from "../../src/ui/screens/today/statusCopy";

export type Concept = "A" | "B" | "C";
export type Example = "GREEN" | "AMBER" | "RED" | "UNKNOWN" | "NO_READ";
export type Phase = "BEFORE" | "SHIFT" | "AFTER" | "OFF";
export const concepts = {
  A: { name: "Refined Command", note: "Precise. Practical. Unmistakably BEYOND." },
  B: { name: "Tactical Operations", note: "Sharper structure. The same truth." },
  C: { name: "Living Intelligence", note: "Context first. Depth when you want it." },
};
export const phases: Phase[] = ["BEFORE", "SHIFT", "AFTER", "OFF"];
export const examples: Example[] = ["GREEN", "AMBER", "RED", "UNKNOWN", "NO_READ"];

// Frozen, invented examples of existing readings — NOT a status evaluator or Engine output.
// type-only SystemStatus import is erased; no application/persistence module executes.
const statuses: Record<Example, SystemStatus> = {
  GREEN: { level: "GREEN", facts: [{ kind: "SLEEP", minutes: 435 }, { kind: "CHECK_IN", capacity: "GREEN", reasonCodes: ["no severe or constrained condition"] }, { kind: "LOAD", sessions: 1, days: 4 }] },
  AMBER: { level: "AMBER", facts: [{ kind: "SLEEP", minutes: 300 }, { kind: "CHECK_IN", capacity: "YELLOW", reasonCodes: ["energy <= 2"] }, { kind: "LOAD", sessions: 3, days: 4 }] },
  RED: { level: "RED", facts: [{ kind: "SLEEP", minutes: 210 }, { kind: "CHECK_IN", capacity: "RED", reasonCodes: ["energy == 1"] }] },
  UNKNOWN: { level: "NO_READ", facts: [] },
  NO_READ: { level: "NO_READ", facts: [] },
};
const clocks: Record<Phase, string> = { BEFORE: "2026-10-08T17:00:00", SHIFT: "2026-10-09T03:30:00", AFTER: "2026-10-09T06:45:00", OFF: "2026-10-09T12:00:00" };
const phaseNames = { PRE_WORK: "BEFORE", SCHEDULED_SHIFT: "SHIFT", EXPECTED_POST_WORK: "AFTER", OFF: "OFF" } as const;

export function makeScene(example: Example, phase: Phase) {
  const input: ShiftClockInput = {
    now: new Date(clocks[phase]),
    workContext: example === "UNKNOWN" ? "UNKNOWN" : phase === "OFF" ? "OFF" : "WORK",
    shiftWindow: phase === "OFF" ? null : { start: new Date("2026-10-08T18:00:00"), end: new Date("2026-10-09T06:00:00") },
    workEnded: phase === "AFTER" && example !== "UNKNOWN",
    mainSleepLogged: false,
  };
  const view = deriveShiftClockView(input);
  const status = statuses[example];
  const hasCheckIn = example === "GREEN" || example === "AMBER" || example === "RED";
  // Illustrative copies of already-existing recommendation kinds, selected as demo scenes.
  // Nothing calls evaluate(), issues a recommendation, or mutates canonical data.
  const suggestion = !hasCheckIn
    ? { kind: "NO_ACTION_REQUIRED", title: "No action required", body: "No check-in yet today — this default doesn't reflect how you're actually doing.", action: "GOT IT", why: "No check-in is included in this synthetic example." }
    : example === "RED"
      ? { kind: "STABILIZE", title: "Stabilize first", body: "Capacity is low. Protect the basics before anything else.", action: "I'll do this", why: "Synthetic check-in: energy 1. Existing RED-capacity example; not a live Engine result." }
      : phase === "AFTER"
        ? { kind: "POST_SHIFT_TRANSITION", title: "Shift down after work", body: "Your shift ended and hasn't been shifted down from yet.", action: "I'll do this", why: "Synthetic MARK WORK ENDED at 06:00; SHIFT DOWN not completed. Example of the existing post-shift recommendation." }
        : example === "AMBER"
          ? { kind: "RECOVER", title: "Protect recovery", body: "Capacity is constrained.", action: "I'll do this", why: "Synthetic check-in: energy 2. This illustrates the existing recovery recommendation; System Status itself never recommends." }
          : { kind: "NO_ACTION_REQUIRED", title: "No action required", body: "Nothing else needed attention first.", action: "GOT IT", why: "Synthetic clear check-in, no planned work, no unresolved shift transition. Not live Engine output." };
  return {
    input, view, status, suggestion,
    activePhase: view.phase ? phaseNames[view.phase] : null,
    heading: view.phase === null ? "Context not confirmed" : describePhaseHeading(view.phase, input.workContext),
    countdown: view.countdown ? describeCountdown(view.countdown, input.now) : null,
    statusLine: describeSystemStatus(status),
    statusSummary: status.facts[0] ? describeStatusFact(status.facts[0]) : "Log sleep or check in",
    provenance: input.workContext === "UNKNOWN" ? "Work context unanswered. Schedule prediction is not confirmation." : input.workContext === "OFF" ? "Synthetic saved schedule: day off. CHANGE TO WORKING remains available." : "Synthetic saved schedule: working. CHANGE TO OFF remains available.",
    basis: view.phase === null ? "UNKNOWN: no phase or countdown assumed." : view.countdown ? "Synthetic shift: 18:00–06:00. Countdown uses the shift owned by this lived day." : view.phase === "OFF" ? "OFF comes from the synthetic standing work context, set from the saved schedule." : "Synthetic MARK WORK ENDED at 06:00; no main sleep recorded afterward.",
    time: input.now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}
export type Scene = ReturnType<typeof makeScene>;
