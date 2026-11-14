import { beforeEach, expect, it, vi } from "vitest";
import { db } from "../src/persistence/db";
import { startDay, logWater, correctWater, voidWaterLog } from "../src/application/commands";
import { getHydrationEntries } from "../src/application/queries";
import { getMetricDetail } from "../src/application/metricDetailQueries";

beforeEach(async () => { await db.delete(); await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });

it("reads corrected hydration without rewriting history and leaves a recorded day without water missing", async () => {
  try {
    vi.setSystemTime(new Date(2026, 10, 10, 18));
    const first = await startDay();
    await logWater(first.id, 16);
    const [entry] = await getHydrationEntries(first.id);
    await correctWater(first.id, entry!.headEventId, 24);
    vi.setSystemTime(new Date(2026, 10, 11, 18));
    await startDay();
    const before = await db.events.toArray();
    const d = await getMetricDetail("water");
    expect(d.series.at(-2)?.value).toBe(24);
    expect(d.series.at(-1)?.value).toBeNull();
    expect(d.today.kind).toBe("hours");
    expect(await db.events.toArray()).toEqual(before);
  } finally { vi.useRealTimers(); }
});

it("distinguishes a corrected zero from an undone log and an unrecorded day", async () => {
  try {
    vi.setSystemTime(new Date(2026, 10, 12, 18));
    const day = await startDay();
    await logWater(day.id, 16);
    const [entry] = await getHydrationEntries(day.id);
    await correctWater(day.id, entry!.headEventId, 0);
    const zero = await getMetricDetail("water");
    expect(zero.series.at(-1)?.value).toBe(0);
    expect(zero.today.kind === "hours" && zero.today.entries).toBe(1);
    await voidWaterLog(day.id, entry!.rootEventId);
    const undone = await getMetricDetail("water");
    expect(undone.series.at(-1)?.value).toBeNull();
    expect(undone.today.kind === "hours" && undone.today.entries).toBe(0);
  } finally { vi.useRealTimers(); }
});

it("resting heart rate: Garmin's newest reading from this or the previous lived day, read without writing", async () => {
  const { syntheticGarminMonth } = await import("./helpers/syntheticGarminMonth");
  const { importActivitySnapshot } = await import("../src/application/externalActivityCommands");
  const { getMeasuredSnapshot } = await import("../src/application/measuredQueries");
  try {
    const firstDay = new Date(2026, 8, 22, 16, 30).getTime(), now = new Date(2026, 9, 21, 22, 10).getTime();
    vi.setSystemTime(now);
    const { days, activity } = syntheticGarminMonth(firstDay, 30, now);
    await db.beyondDays.bulkAdd(days);
    await importActivitySnapshot(activity);
    const before = await db.events.toArray();
    const d = await getMetricDetail("resting", now);
    const snapshot = await getMeasuredSnapshot(now);
    expect(d.source).toBe("GARMIN");
    expect(d.series).toEqual(snapshot.resting);
    const newest = [...snapshot.resting].reverse().slice(0, 2).find((v) => v.value !== null) ?? null;
    expect(d.today).toEqual({ kind: "latest", value: newest?.value ?? null, from: newest?.from ?? null });
    expect(d.usual.value).toBe(snapshot.usual.resting.value);
    expect(await db.events.toArray()).toEqual(before);
  } finally { vi.useRealTimers(); }
});
