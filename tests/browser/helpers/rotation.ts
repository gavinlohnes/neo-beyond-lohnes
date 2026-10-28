import { vi } from "vitest";
import { endDay, logBodyweight, logProtein, logSleep, logWater, startDay, submitCheckIn, updateSchedulePattern } from "../../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../../src/engine/scheduledContext";

/**
 * FIELD-REHEARSAL: 56 finished lived days of the owner's own 2-2-3 rotation (DEFAULT_SCHEDULE_PATTERN),
 * Sep 1 to Oct 26 2026, written through the app's real commands: sleep, a check-in, water, protein and a
 * weigh-in every third day. Deterministic. Leaves fake Date on; the caller restores real timers.
 */
export async function seedRotation(): Promise<void> {
  let r = 7;
  const rand = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const at = (d: Date, h: number, m = 0) => { const t = new Date(d); t.setHours(h, m, 0, 0); return t; };
  vi.useFakeTimers({ toFake: ["Date"] });
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  vi.setSystemTime(new Date(2026, 8, 1, 16, 31));
  await updateSchedulePattern(schedule);
  for (let i = 0; i < 56; i++) {
    const d = new Date(2026, 8, 1 + i);
    vi.setSystemTime(at(d, 16, 35));
    const day = await startDay();
    const work = day.workContext === "WORK";
    vi.setSystemTime(at(d, 16, 40));
    await logSleep(day.id, Math.round(work ? between(290, 400) : between(410, 520)));
    vi.setSystemTime(at(d, 16, 45));
    const energy = Math.max(1, Math.min(5, Math.round(work ? between(2, 4.4) : between(3, 5)))) as 1 | 2 | 3 | 4 | 5;
    await submitCheckIn(day.id, { energy, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 });
    vi.setSystemTime(at(d, 19)); await logWater(day.id, Math.round(between(30, 50)));
    vi.setSystemTime(at(d, 21)); await logProtein(day.id, Math.round(between(60, 90)));
    vi.setSystemTime(at(d, 23, 30)); await logWater(day.id, Math.round(between(30, 60)));
    vi.setSystemTime(at(d, 23, 45)); await logProtein(day.id, Math.round(between(50, 90)));
    if (i % 3 === 0) { vi.setSystemTime(at(d, 23, 50)); await logBodyweight(day.id, Math.round(between(181, 184) * 10) / 10); }
    vi.setSystemTime(at(new Date(2026, 8, 2 + i), 16, 25));
    await endDay(day.id);
  }
}
