import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { getModePin, setModePin, clearModePin } from "../../src/application/modePinQueries";
import { getSystemStatus } from "../../src/application/systemStatus";
import { getActiveDay, getLatestRecommendation } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { MODE_PIN_PHASES } from "../../src/persistence/modePins";
import { db } from "../../src/persistence/db";

/**
 * COMMAND-CENTER-001 acceptance: "the Engine output is identical with and
 * without a pin". The same day is played twice from an empty database — once
 * plain, once with every write preceded by a pin — and the recommendation,
 * System Status, events and work context are compared field by field.
 */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);
// Ids are random and `seq` is a process-wide tie-break counter; neither is Engine output.
const normalize = (value: unknown) => JSON.stringify(value ?? null).replace(/"[0-9a-f-]{36}"/g, '"<id>"').replace(/"seq":\d+,?/g, "");

async function playDay(pin: (typeof MODE_PIN_PHASES)[number] | null) {
  await Dexie.delete("beyond");
  await db.open();
  localStorage.clear();
  vi.setSystemTime(at(12, 16, 30));
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  const day = await startDay();
  if (pin) setModePin(day.id, pin);
  vi.setSystemTime(at(13, 7, 0));
  await submitCheckIn(day.id, { energy: 3, stress: 3, mood: 3, soreness: 2, alcoholUrge: 1 });
  const recommendation = await getLatestRecommendation(day.id);
  const activeDay = await getActiveDay();
  const status = await getSystemStatus(activeDay ?? null, at(13, 7, 5));
  const events = (await db.events.toArray()).map(({ id: _i, beyondDayId: _d, occurredAt: _o, recordedAt: _r, payload, type }) => ({ type, payload: normalize(payload) }))
    .sort((a, b) => (a.type + a.payload).localeCompare(b.type + b.payload));
  return {
    pinStored: getModePin(day.id),
    recommendation: recommendation && { kind: recommendation.kind, priority: recommendation.priority, title: recommendation.title, rationale: recommendation.rationale, suggestedCommand: recommendation.suggestedCommand, statusAtIssue: recommendation.statusAtIssue, trace: normalize(recommendation.trace) },
    status,
    workContext: activeDay?.workContext,
    events,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("mode pin — Engine identity", () => {
  it("recommendation, System Status, events and work context are identical under every pin", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { pinStored: _none, ...plain } = await playDay(null);
    expect(plain.recommendation).not.toBeNull();
    for (const pin of MODE_PIN_PHASES) {
      const { pinStored, ...pinned } = await playDay(pin);
      expect(pinStored).toBe(pin);
      expect(pinned).toEqual(plain);
    }
  });

  it("stores one pin per BeyondDay and clears it", () => {
    setModePin("day-a", "OFF");
    expect(getModePin("day-a")).toBe("OFF");
    expect(getModePin("day-b")).toBeNull();
    localStorage.setItem("beyond:modePin:day-b", "NONSENSE");
    expect(getModePin("day-b")).toBeNull();
    clearModePin("day-a");
    expect(getModePin("day-a")).toBeNull();
  });
});
