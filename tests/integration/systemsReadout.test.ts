import { afterEach, describe, expect, it, vi } from "vitest";
import { logBodyweight, logProtein, logSleep, logWater, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, startWorkout } from "../../src/application/trainCommands";
import { getDayProteinTotalG, getEffectiveHydrationTotal, getMostRecentBodyweight } from "../../src/application/queries";
import { getEffectiveProteinTargetG } from "../../src/application/nutritionTargetQueries";
import { suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import { getLastMainSleep, getSystemStatus } from "../../src/application/systemStatus";
import { getSystemsReadout } from "../../src/application/systemsReadoutQueries";
import { describeSystemsLine, formatFuelReading } from "../../src/ui/screens/systems/systemsCopy";
import { db } from "../../src/persistence/db";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** SUIT-001: the SYSTEMS readout is the existing queries' values, read only. */
afterEach(() => vi.useRealTimers());

describe("getSystemsReadout", () => {
  it("reads nothing personal and writes nothing without an active day", async () => {
    const before = await db.events.count();
    const r = await getSystemsReadout();
    expect(r).toMatchObject({ day: null, lastMainSleep: null, proteinG: null, waterOz: null, bodyweightLbs: undefined, sessionsInWindow: 0, lastSession: null, checkIn: null });
    expect(r.status.level).toBe("NO_READ");
    expect(await db.events.count()).toBe(before);
  });

  it("matches the existing queries for every reading", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    await logSleep(day.id, 410, "PRIMARY");
    await logProtein(day.id, 40);
    await logWater(day.id, 24);
    await logBodyweight(day.id, 182);
    await submitCheckIn(day.id, { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 2 });
    const session = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL", 30);
    const eventsBefore = await db.events.count();

    const r = await getSystemsReadout();
    expect(r.day?.id).toBe(day.id);
    expect(r.lastMainSleep).toEqual(await getLastMainSleep(day.id));
    expect(r.lastMainSleep?.minutes).toBe(410);
    expect(r.proteinG).toBe(await getDayProteinTotalG(day.id));
    expect(r.proteinTargetG).toBe(await getEffectiveProteinTargetG());
    expect(r.waterOz).toBe(await getEffectiveHydrationTotal(day.id));
    expect(r.bodyweightLbs).toBe(await getMostRecentBodyweight());
    expect(r.status).toEqual(await getSystemStatus(day));
    expect(r.checkIn?.capacity).toBe("YELLOW");
    expect(r.sessionsInWindow).toBe(1);
    expect(r.lastSession).toMatchObject({ templateId: "A", status: "PARTIAL" });
    expect(r.nextTemplateId).toBe(await suggestTemplateForNextWorkout());
    expect(r.workContextSource).toBe("MANUAL");
    expect(await db.events.count()).toBe(eventsBefore);
  });

  it("counts finished sessions in the last 7 days only, never active or abandoned ones", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 18));
    const old = await startDay();
    const early = await startWorkout(old.id, "A", "STANDARD", { overrideConfirmed: true });
    await completeWorkout(old.id, early.id, "STANDARD", "COMPLETED", 45);
    vi.setSystemTime(new Date(2026, 9, 16, 18));
    await db.beyondDays.update(old.id, { status: "ENDED" });
    const day = await startDay();
    const recent = await startWorkout(day.id, null, "RECOVERY", { overrideConfirmed: true });
    await completeWorkout(day.id, recent.id, "RECOVERY", "COMPLETED", 20);
    await startWorkout(day.id, "B", "STANDARD", { overrideConfirmed: true });
    const r = await getSystemsReadout();
    expect(r.sessionsInWindow).toBe(1);
    expect(r.lastSession?.status).toBe("COMPLETED");
  });

  it("flags only TODAY's existing RED + No action required note", async () => {
    const day = await startDay();
    await logSleep(day.id, 180, "PRIMARY");
    const r = await getSystemsReadout();
    expect(r.status.level).toBe("RED");
    expect(r.statusRedWithNoAction).toBe(false);
  });
});

describe("SYSTEMS line copy", () => {
  it("shows fuel against the target, or the plain total without one", () => {
    expect(formatFuelReading(96, 170)).toBe("96/170 g");
    expect(formatFuelReading(96, undefined)).toBe("96 g");
  });

  it("states missing data plainly and leads AMBER/RED in words", () => {
    expect(describeSystemsLine({ sleepMinutes: null, proteinG: 0, proteinTargetG: undefined, checkIn: null, statusLevel: "NO_READ", warnings: [] }))
      .toEqual(["NOT CHECKED IN · log sleep or check in", "Fuel 0g"]);
    expect(describeSystemsLine({ sleepMinutes: null, proteinG: 0, proteinTargetG: undefined, checkIn: "GREEN", statusLevel: "GREEN", warnings: [] }))
      .toEqual(["Sleep not logged", "Fuel 0g", "Check-in GREEN"]);
    expect(describeSystemsLine({ sleepMinutes: 410, proteinG: 96, proteinTargetG: 170, checkIn: "GREEN", statusLevel: "GREEN", warnings: ["Offline"] }))
      .toEqual(["Sleep 6:50", "Fuel 96/170g", "Check-in GREEN", "Offline"]);
    expect(describeSystemsLine({ sleepMinutes: 300, proteinG: 0, proteinTargetG: 160, checkIn: "YELLOW", statusLevel: "AMBER", warnings: [] })[0])
      .toBe("AMBER");
  });
});

describe("FRICTION-001 — a Garmin sleep is as fresh as its wake time (owner approval 2026-10-22)", () => {
  const H = 3600_000, start = new Date(2026, 9, 20, 16, 30).getTime(), now = start + 34 * H; // 02:30 the next lived day

  it("counts a Garmin night from when you woke, and SYSTEMS says so", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { days, sleep } = syntheticGarminMonth(start, 2, now);
    await db.beyondDays.bulkAdd(days);
    vi.setSystemTime(now); await importSleepSnapshot(sleep);
    const last = await getLastMainSleep(days[1]!.id, new Date(now));
    expect(last).toMatchObject({ fromGarmin: true, occurredAt: sleep.records[0]!.endTime });
    expect(last!.recordedAt).not.toBe(last!.occurredAt); // imported later than it ended
    expect((await getSystemsReadout(new Date(now))).lastMainSleep).toEqual(last);
  });

  it("a late import can't make an old night count as last night", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { days, sleep } = syntheticGarminMonth(start, 2, now);
    await db.beyondDays.bulkAdd(days);
    const late = now + 30 * H; // imported more than 36 h after that wake time
    vi.setSystemTime(late); await importSleepSnapshot(sleep);
    expect(await getLastMainSleep(days[1]!.id, new Date(late))).toBeNull();
  });
});
