import { deriveShiftClockView, describeCountdown, describePhaseHeading } from "../../src/ui/screens/today/shiftClock";
import type { ShiftClockInput } from "../../src/ui/screens/today/shiftClock";
import { describeSystemStatus, describeStatusFact } from "../../src/ui/screens/today/statusCopy";
import type { SystemStatus } from "../../src/application/systemStatus";
export type Reading = "GREEN" | "AMBER" | "RED" | "NO_READ";
export type Story = "AFTER" | "BEFORE" | "SHIFT" | "OFF" | "TRAINING" | "UNKNOWN";
export type Direction = "field" | "horizon" | "index";
export const readings: Reading[] = ["GREEN", "AMBER", "RED", "NO_READ"];
export const stories: Story[] = ["AFTER", "BEFORE", "SHIFT", "OFF", "TRAINING", "UNKNOWN"];
export const storyNames: Record<Story, string> = { AFTER: "After shift", BEFORE: "Before shift", SHIFT: "On shift", OFF: "Day off", TRAINING: "Planned training / day off", UNKNOWN: "Unknown work context" };
const fixtures: Record<Reading, SystemStatus> = {
    GREEN: { level: "GREEN", facts: [{ kind: "SLEEP", minutes: 450 }, { kind: "CHECK_IN", capacity: "GREEN", reasonCodes: [] }, { kind: "LOAD", sessions: 2, days: 4 }] },
    AMBER: { level: "AMBER", facts: [{ kind: "SLEEP", minutes: 300 }, { kind: "CHECK_IN", capacity: "YELLOW", reasonCodes: ["energy <= 2"] }] },
    RED: { level: "RED", facts: [{ kind: "SLEEP", minutes: 195 }, { kind: "CHECK_IN", capacity: "RED", reasonCodes: ["energy == 1"] }] },
    NO_READ: { level: "NO_READ", facts: [] },
};
// Authored scene examples of existing recommendation kinds, not an evaluator.
const recommendations = {
    transition: { kind: "POST_SHIFT_TRANSITION", title: "Shift down after work", body: "Your shift ended and hasn't been shifted down from yet.", why: "This example includes work ended at 06:00 and no completed shift down. Existing post-shift transition example.", handoff: "Start shift down" },
    stabilize: { kind: "STABILIZE", title: "Stabilize first", body: "Capacity is low. Protect the basics before anything else.", why: "This example includes an energy-1 check-in. It illustrates the existing RED-capacity priority, not a live Engine decision.", handoff: "Start shift down" },
    recover: { kind: "RECOVER", title: "Protect recovery", body: "Capacity is constrained.", why: "This example includes an energy-2 check-in and no unresolved post-shift transition. It illustrates the existing recovery recommendation.", handoff: "Open recovery on TRAIN" },
    train: { kind: "EXECUTE_PLANNED_WORK", title: "Proceed with planned work", body: "Capacity is good and there is planned work for today.", why: "The fictional day has a clear check-in and an explicitly planned workout. This is the existing planned-work example, not an automatic plan change.", handoff: "Open workout on TRAIN" },
    quiet: { kind: "NO_ACTION_REQUIRED", title: "No action required", body: "No rule requires attention right now.", why: "In this authored example, no higher-priority need is included. Quiet is a successful state, not missing progress.", handoff: null },
    missing: { kind: "NO_ACTION_REQUIRED", title: "No action required", body: "No check-in is included. This default does not describe how you're actually doing.", why: "The scene has no sleep or check-in readings. No confidence, capacity or personal conclusion is inferred.", handoff: null },
};
export function sceneFor(story: Story, reading: Reading) {
    const status = fixtures[reading];
    const time = story === "BEFORE" ? "17:00" : story === "SHIFT" ? "03:30" : story === "AFTER" ? "06:30" : "12:00";
    const day = story === "BEFORE" ? "2026-10-08" : "2026-10-09";
    const input: ShiftClockInput = { now: new Date(`${day}T${time}:00`), workContext: story === "UNKNOWN" ? "UNKNOWN" : ["OFF", "TRAINING"].includes(story) ? "OFF" : "WORK", shiftWindow: ["OFF", "TRAINING"].includes(story) ? null : { start: new Date("2026-10-08T18:00:00"), end: new Date("2026-10-09T06:00:00") }, workEnded: story === "AFTER", mainSleepLogged: false };
    const view = deriveShiftClockView(input);
    const recommendation = reading === "RED" ? recommendations.stabilize : story === "AFTER" ? recommendations.transition : reading === "NO_READ" ? recommendations.missing : reading === "AMBER" ? recommendations.recover : story === "TRAINING" ? recommendations.train : recommendations.quiet;
    return { input, view, status, recommendation, time, heading: story === "UNKNOWN" ? "Context unconfirmed" : describePhaseHeading(view.phase, input.workContext), countdown: view.countdown ? describeCountdown(view.countdown, input.now) : story === "AFTER" ? "Work ended at 06:00" : story === "UNKNOWN" ? "No phase assumed" : "Per declared day off", statusText: describeSystemStatus(status), facts: status.facts.map(describeStatusFact), provenance: story === "UNKNOWN" ? "Work context is unanswered. A schedule prediction is not confirmation." : input.workContext === "OFF" ? "Synthetic saved schedule: day off. The operator can change it." : "Synthetic saved schedule: working. The operator can change it.", basis: story === "UNKNOWN" ? "UNKNOWN: no phase or countdown is assigned." : view.countdown ? "Existing shift-clock derivation from the fictional 18:00–06:00 shift." : story === "AFTER" ? "Synthetic work-ended record at 06:00, no later main sleep record." : "OFF is derived from the declared day-off context.", activePhase: view.phase === null ? null : ({ PRE_WORK: "BEFORE", SCHEDULED_SHIFT: "SHIFT", EXPECTED_POST_WORK: "AFTER", OFF: "OFF" } as const)[view.phase] };
}
export type Scene = ReturnType<typeof sceneFor>;
export const weightReadings = [212.4, 211.8, 212.2, 211.9, 211.5, 211.7, 211.3];
