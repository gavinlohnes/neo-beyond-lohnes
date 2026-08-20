import { describe, expect, it } from "vitest";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";
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
  it("SLEEP_LOGGED names duration and kind", () => {
    expect(describeEvent(event("SLEEP_LOGGED", { commandId: "x", durationMinutes: 400, kind: "PRIMARY" }))).toBe(
      "Sleep logged: 400 min (main sleep).",
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
