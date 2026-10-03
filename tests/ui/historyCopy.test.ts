import { describe, expect, it } from "vitest";
import { describeEvent, describeHistoryDayMeta } from "../../src/ui/screens/history/historyCopy";
import type { DomainEvent, DomainEventType } from "../../src/domain/common/types";

function event(type: DomainEventType, payload: unknown): DomainEvent {
  return {
    id: "e1",
    type,
    beyondDayId: "d1",
    occurredAt: "2026-08-20T12:00:00.000Z",
    recordedAt: "2026-08-20T12:00:00.000Z",
    payload,
    source: "USER",
    correlationId: "c1",
  };
}

describe("describeEvent — human-readable summary per real event type", () => {
  it("DAY_ENDED labels every non-explicit reason as auto-closed, including new reasons this ternary hasn't seen before (DAY-ROLLOVER-001)", () => {
    expect(describeEvent(event("DAY_ENDED", { reason: "EXPLICIT_END_DAY" }))).toBe("Day ended (explicit).");
    expect(describeEvent(event("DAY_ENDED", { reason: "AUTO_CLOSED_ON_NEW_DAY_START" }))).toBe(
      "Day ended (auto-closed).",
    );
    expect(describeEvent(event("DAY_ENDED", { reason: "AUTO_CLOSED_DAY_ROLLOVER" }))).toBe(
      "Day ended (auto-closed).",
    );
  });

  it("SLEEP_LOGGED names duration and kind", () => {
    expect(describeEvent(event("SLEEP_LOGGED", { commandId: "x", durationMinutes: 400, kind: "PRIMARY" }))).toBe(
      "Sleep logged: 6 hr 40 min (main sleep).",
    );
    expect(describeEvent(event("SLEEP_LOGGED", { commandId: "x", durationMinutes: 30, kind: "SUPPLEMENTAL" }))).toBe(
      "Sleep logged: 30 min (nap).",
    );
  });

  it("WATER_LOGGED and WATER_LOG_CORRECTED name the amount", () => {
    expect(describeEvent(event("WATER_LOGGED", { commandId: "x", amountOz: 12 }))).toBe("Water logged: 12 oz.");
    expect(
      describeEvent(
        event("WATER_LOG_CORRECTED", { commandId: "x", originalEventId: "o", supersedesEventId: "s", amountOz: 17 }),
      ),
    ).toBe("Water corrected to 17 oz.");
  });

  it("WORK_CONTEXT_SET distinguishes manual from accepted-suggestion source", () => {
    expect(
      describeEvent(event("WORK_CONTEXT_SET", { commandId: "x", workContext: "WORK", source: "MANUAL" })),
    ).toBe("Work context set to WORK (manual).");
    expect(
      describeEvent(
        event("WORK_CONTEXT_SET", { commandId: "x", workContext: "OFF", source: "SCHEDULE_SUGGESTION_ACCEPTED" }),
      ),
    ).toBe("Work context set to OFF (accepted schedule suggestion).");
  });

  it("STATE_CHECKED_IN names all five values", () => {
    expect(
      describeEvent(
        event("STATE_CHECKED_IN", {
          id: "c",
          beyondDayId: "d1",
          recordedAt: "x",
          energy: 4,
          stress: 2,
          mood: 4,
          soreness: 1,
          alcoholUrge: 0,
        }),
      ),
    ).toBe("Check-in: energy 4, stress 2, mood 4, soreness 1, urge 0.");
  });

  it("SET_LOGGED includes the substitution when present, omits it otherwise", () => {
    expect(
      describeEvent(
        event("SET_LOGGED", {
          commandId: "x",
          sessionId: "s",
          exerciseId: "machine-chest-press",
          setNumber: 1,
          weight: 135,
          reps: 10,
        }),
      ),
    ).toBe("Set logged: machine-chest-press #1 — 135 lb x 10.");
    expect(
      describeEvent(
        event("SET_LOGGED", {
          commandId: "x",
          sessionId: "s",
          exerciseId: "triceps-pressdown",
          setNumber: 1,
          weight: 50,
          reps: 15,
          substitutedName: "Rope Pushdown",
        }),
      ),
    ).toBe("Set logged: triceps-pressdown (as Rope Pushdown) #1 — 50 lb x 15.");
  });

  it("RESET_STARTED names the intensity", () => {
    expect(describeEvent(event("RESET_STARTED", { intensity: 4 }))).toBe("RESET started at intensity 4.");
  });

  it("RECOVER_CONNECT_COMPLETED names which activity when present", () => {
    expect(describeEvent(event("RECOVER_CONNECT_COMPLETED", { commandId: "x", activity: "CONNECT" }))).toBe(
      "Connect marked done.",
    );
    expect(describeEvent(event("RECOVER_CONNECT_COMPLETED", { commandId: "x" }))).toBe(
      "Recover/Connect marked done.",
    );
  });

  it("falls back to the raw type name for anything unmapped, rather than vanishing", () => {
    expect(describeEvent(event("COMMAND_STARTED", {}))).toBe("COMMAND_STARTED");
  });
});

describe("Drop 1.6a — History says it in words (field soak)", () => {
  it("names work ending, recommendations by their TODAY title, and exercises by name", () => {
    expect(describeEvent(event("WORK_PERIOD_ENDED", {}))).toBe("Work marked ended.");
    expect(describeEvent(event("RECOMMENDATION_ISSUED", { kind: "POST_SHIFT_TRANSITION" }))).toBe("Recommendation: Shift down after work.");
    expect(describeEvent(event("RECOMMENDATION_ACCEPTED", { kind: "RECOVER" }))).toBe("Recommendation accepted: Protect recovery.");
    const names = { "machine-chest-press": "Machine Chest Press" };
    expect(describeEvent(event("SET_LOGGED", { exerciseId: "machine-chest-press", setNumber: 1, weight: 135, reps: 10 }), names)).toBe(
      "Set logged: Machine Chest Press #1 — 135 lb x 10.",
    );
    expect(describeEvent(event("SET_SKIPPED", { exerciseId: "unknown-id", setNumber: 2 }), names)).toBe("Set skipped: unknown-id #2.");
    expect(describeEvent(event("SLEEP_LOG_CORRECTED", { durationMinutes: 390 }))).toBe("Sleep corrected to 6 hr 30 min.");
  });

  it("describes a day's state and work context without raw codes", () => {
    expect(describeHistoryDayMeta("ACTIVE", "OFF", 2)).toBe("In progress · day off · 2 events");
    expect(describeHistoryDayMeta("ENDED", "WORK", 1)).toBe("Ended · work day · 1 event");
    expect(describeHistoryDayMeta("ENDED", "UNKNOWN", 0)).toBe("Ended · work not set · 0 events");
  });
});
