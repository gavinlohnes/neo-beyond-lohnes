import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getWeekAhead } from "../../src/application/weekAheadQueries";
import { getWeekEnergyForecast } from "../../src/application/weekEnergyForecast";
import { readOperatorContext } from "../../src/application/operatorContext";
import { answerQuestion } from "../../src/application/helper/freeAnswers";
import { deriveLifeState, lifeStateInput } from "../../src/application/lifeState";
import { getSchedulePattern, getWorkContextSource } from "../../src/application/queries";
import { recordedBy } from "../../src/application/workContextResolution";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * CONTEXT-INTEGRATION-001: the same lived day reads the same in every system. Gavin's 2-2-3 rotation (week B from Mon
 * Nov 16 2026 works Wed and Thu, 18:00–06:00); a lived day runs 16:30 → 16:30.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(() => { vi.useRealTimers(); });

async function everywhere(now: Date) {
  const [week, forecast, context, pattern] = await Promise.all([getWeekAhead(now), getWeekEnergyForecast(now), readOperatorContext({ purpose: "local", includePersonal: false }, now), getSchedulePattern()]);
  const day = await db.beyondDays.orderBy("startedAt").last();
  const by = day ? recordedBy(await getWorkContextSource(day.id)) : undefined;
  const life = day ? deriveLifeState(lifeStateInput(now, pattern, day.workContext === "UNKNOWN" ? null : day.workContext, null, by)) : null;
  const text = (kind: string) => context.records.filter((r) => r.kind === kind).map((r) => r.text).join(" | ");
  return { week, forecast, life, today: text("CURRENT_DAY"), schedule: text("SCHEDULE"), next7: context.records.find((r) => r.title === "Next seven scheduled days")?.text ?? "" };
}

describe("one lived day, every system", () => {
  it("normal rotation: a scheduled work day set at day start reads as work everywhere, and says the schedule set it", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
    vi.setSystemTime(new Date(2026, 10, 18, 18)); await startDay();
    const v = await everywhere(new Date(2026, 10, 18, 18));
    expect(v.week.days[0]).toMatchObject({ date: "2026-11-18", work: "WORK", basis: "RECORDED" });
    expect(v.week.days[1]).toMatchObject({ date: "2026-11-19", work: "WORK", basis: "PREDICTED" });
    expect(v.forecast.days[0]!.work).toBe("WORK");
    expect(v.life?.state).toBe("WORK_RUN");
    expect(v.life?.why[0]).toBe("Today: a work day, set from your saved schedule when the day started.");
    expect(v.today).toContain("a work day, set from your saved schedule when the day started");
    expect(v.next7).toContain("2026-11-18 WORK 18:00 (recorded)");
    expect(v.next7).toContain("2026-11-19 WORK 18:00 (forecast)");
  });

  it("overtime on a scheduled day off: recorded work wins in every system, and Alfred says you recorded it", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
    vi.setSystemTime(new Date(2026, 10, 21, 18)); // Sat, scheduled off
    const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
    const v = await everywhere(new Date(2026, 10, 21, 18));
    // Recorded work, so its post-shift morning can take the suggestion (Sun is off): the rotation's day-off rule moved with it.
    expect(v.week.days[0]).toMatchObject({ date: "2026-11-21", work: "WORK", basis: "RECORDED", afterShift: true });
    expect(v.forecast.days[0]!.work).toBe("WORK");
    expect(v.life?.state).toBe("WORK_RUN");
    expect(v.life?.why[0]).toBe("Today: recorded as a work day.");
    expect(v.today).toContain("recorded by you as a work day");
  });

  it("a scheduled work day recorded as off reads as off everywhere; the rest of the week stays a forecast", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
    vi.setSystemTime(new Date(2026, 10, 18, 18));
    const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
    const v = await everywhere(new Date(2026, 10, 18, 18));
    expect(v.week.days[0]).toMatchObject({ work: "OFF", basis: "RECORDED" });
    expect(v.forecast.days[0]!.work).toBe("OFF");
    expect(v.life?.state).not.toBe("WORK_RUN");
    // A swap's other half (working a day off later) isn't a record yet, and BEYOND has no confirmed-exception store:
    // that future day stays the rotation's forecast, never silently confirmed.
    expect(v.week.days[1]).toMatchObject({ date: "2026-11-19", basis: "PREDICTED" });
  });

  it("missing schedule: no shifts are invented anywhere, and Alfred says no schedule was saved", async () => {
    vi.setSystemTime(new Date(2026, 10, 18, 18)); await startDay();
    const v = await everywhere(new Date(2026, 10, 18, 18));
    expect(v.week.days.every((d) => d.basis === "UNKNOWN" && d.suggestedTemplate === null && d.shiftStartHour === null)).toBe(true);
    expect(v.forecast.scheduled).toBe(false);
    expect(v.life).toBeNull();
    expect(v.schedule).toBe("SCHEDULE: no work schedule has been saved. Future work days are unknown; do not assume a rotation.");
    expect(v.next7).toContain("2026-11-18 unknown");
    expect(await answerQuestion("when do i work", new Date(2026, 10, 18, 18))).toBe("There's no saved schedule to read that from. Set it in MORE → WORK SCHEDULE.");
  });

  it("missing schedule, but today recorded: today is known, the rest stays unknown", async () => {
    vi.setSystemTime(new Date(2026, 10, 18, 17));
    const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
    const v = await everywhere(new Date(2026, 10, 18, 17));
    expect(v.week.days[0]).toMatchObject({ work: "WORK", basis: "RECORDED" });
    expect(v.week.days.slice(1).every((d) => d.basis === "UNKNOWN")).toBe(true);
    expect(await answerQuestion("when do i work", new Date(2026, 10, 18, 17))).toBe("Next shift: Wed, Nov 18 (start time not saved). Recorded for that day.");
  });

  it("16:30 rollover: at 09:00 the overnight shift still belongs to the lived day it started in", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
    vi.setSystemTime(new Date(2026, 10, 18, 16, 40)); await startDay(); // Wed's lived day
    const v = await everywhere(new Date(2026, 10, 19, 9)); // Thu 09:00: still Wed's lived day
    expect(v.today).toContain("lived day from");
    expect(v.life?.state).toBe("WORK_RUN");
    // Week Ahead rows are lived days by their start date: Thu's lived day hasn't begun, so it is the forecast.
    expect(v.week.days[0]).toMatchObject({ date: "2026-11-19", work: "WORK", basis: "PREDICTED" });
  });

  it("a schedule change never rewrites a recorded day, and moves the forecast and the training suggestions", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
    vi.setSystemTime(new Date(2026, 10, 18, 18)); await startDay();
    const before = await everywhere(new Date(2026, 10, 18, 18));
    // Now every day is a work day.
    vi.setSystemTime(new Date(2026, 10, 18, 19)); await updateSchedulePattern({ ...ROTATION, weeks: [{ workdays: [0, 1, 2, 3, 4, 5, 6] }] });
    const after = await everywhere(new Date(2026, 10, 18, 19));
    expect(after.week.days[0]).toEqual(before.week.days[0] && { ...before.week.days[0], suggestedTemplate: after.week.days[0]!.suggestedTemplate, afterShift: after.week.days[0]!.afterShift });
    expect(after.week.days[0]).toMatchObject({ work: "WORK", basis: "RECORDED" });
    expect(after.week.days.slice(1).every((d) => d.work === "WORK" && d.basis === "PREDICTED")).toBe(true);
    // No days off ahead: no day-off workout suggestions remain (only the last shift could take one, and there isn't one).
    expect(after.week.days.some((d) => d.suggestedTemplate !== null)).toBe(false);
    expect(before.week.days.some((d) => d.suggestedTemplate !== null)).toBe(true);
  });
});
