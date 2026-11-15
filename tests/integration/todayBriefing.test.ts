import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { deriveHandled, deriveTodayBriefing, getTodayBriefing } from "../../src/application/todayBriefing";
import { getTodayPicture } from "../../src/application/todayPicture";
import { getLatestRecommendation } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import type { MeasuredSnapshot } from "../../src/application/measuredQueries";
import type { ExternalSleep } from "../../src/domain/health/sleepImport";

/**
 * BEYOND 4.0-d: the briefing preview composes existing NOW/NEXT, Engine guidance
 * and Garmin last-night import, and writes nothing.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const night = (end: string, minutes: number): ExternalSleep => ({
  id: "night-1",
  dataOriginPackage: "garmin",
  lastModifiedTime: end,
  startTime: new Date(Date.parse(end) - minutes * 60_000).toISOString(),
  endTime: end,
  startZoneOffsetSeconds: null,
  endZoneOffsetSeconds: null,
  stages: [],
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  await updateSchedulePattern(ROTATION);
});
afterEach(async () => { vi.useRealTimers(); await db.close(); });

it("with no lived day started invents nothing and writes nothing", async () => {
  vi.setSystemTime(at(18, 20));
  const before = await db.events.count();
  const briefing = await getTodayBriefing(at(18, 20));
  expect(briefing.started).toBe(false);
  expect(briefing.now.line).toMatch(/Start your day/);
  expect(briefing.now.guidance).toBeNull();
  expect(briefing.next).toBeNull();
  expect(briefing.handled).toEqual([]);
  expect(await db.events.count()).toBe(before);
});

it("composes TODAY's NOW and NEXT and the issued Engine guidance, without writing", async () => {
  const started = at(18, 20);
  vi.setSystemTime(started);
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const before = await db.events.count();
  const picture = (await getTodayPicture(started))!;
  const recommendation = await getLatestRecommendation(day.id);
  const briefing = deriveTodayBriefing(picture, recommendation, null);
  expect(briefing.started).toBe(true);
  expect(briefing.now.label).toBe("WORK RUN");
  expect(briefing.now.line).toMatch(/Shift 1 of/);
  expect(briefing.next!.line).toMatch(/Next day off/);
  expect(briefing.now.guidance?.title).toBe(recommendation!.title);
  expect(briefing.now.guidance?.rationale).toBe(recommendation!.rationale);
  expect(briefing.handled).toEqual([]);
  const loaded = await getTodayBriefing(started);
  expect(loaded.now.label).toBe("WORK RUN");
  expect(loaded.now.guidance?.title).toBe(recommendation!.title);
  expect(await db.events.count()).toBe(before);
});

it("lists Garmin last-night sleep as handled and stays quiet without one", () => {
  expect(deriveHandled(null)).toEqual([]);
  const measured = { lastNight: night("2026-11-18T07:00:00.000Z", 450) } as MeasuredSnapshot;
  expect(deriveHandled(measured)).toEqual([{
    id: "garmin-sleep",
    line: "Garmin sleep synced: 7h 30m",
    detail: "Imported from Garmin. Review it in BODY; nothing was applied as advice.",
    open: "BODY_SLEEP",
  }]);
});
