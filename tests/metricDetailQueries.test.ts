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

it("review of #522: resting LATEST falls back to the previous lived day, and says nothing when both are unmeasured", async () => {
  const { syntheticGarminMonth } = await import("./helpers/syntheticGarminMonth");
  const { importActivitySnapshot } = await import("../src/application/externalActivityCommands");
  try {
    const firstDay = new Date(2026, 8, 22, 16, 30).getTime(), now = new Date(2026, 9, 21, 22, 10).getTime();
    vi.setSystemTime(now);
    const { days, activity } = syntheticGarminMonth(firstDay, 30, now);
    await db.beyondDays.bulkAdd(days);
    await importActivitySnapshot(activity);
    const all = await getMetricDetail("resting", now);
    const [previous, current] = all.series.slice(-2);
    const inPeriod = (p: { from: number; to: number }) => (r: { time: string }) => { const t = Date.parse(r.time); return t >= p.from && t < p.to; };
    // The seed is like a real evening: this lived day has no resting reading yet, the previous one does.
    expect(previous!.value).not.toBeNull();
    // This lived day unmeasured: the newest reading is the previous lived day's.
    await db.externalRestingHeartRates.bulkDelete((await db.externalRestingHeartRates.toArray()).filter(inPeriod(current!)).map((r) => r.key));
    const fallback = await getMetricDetail("resting", now);
    expect(fallback.today).toMatchObject({ kind: "latest", from: previous!.from });
    expect(fallback.today.kind === "latest" && fallback.today.value).not.toBeNull();
    // Both unmeasured: no reading, never an older one dressed up as recent.
    await db.externalRestingHeartRates.bulkDelete((await db.externalRestingHeartRates.toArray()).filter(inPeriod(previous!)).map((r) => r.key));
    expect((await getMetricDetail("resting", now)).today).toEqual({ kind: "latest", value: null, from: null });
  } finally { vi.useRealTimers(); }
});

it("slice 4: calories keep eaten (your logs) and burned (Garmin) as two series, a day without meals missing, read without writing", async () => {
  const { syntheticGarminMonth } = await import("./helpers/syntheticGarminMonth");
  const { importActivitySnapshot } = await import("../src/application/externalActivityCommands");
  const { getMeasuredSnapshot } = await import("../src/application/measuredQueries");
  const { createSavedMeal, logMeal } = await import("../src/application/nutritionCommands");
  try {
    const H = 3_600_000, DAY = 24 * H;
    const firstDay = new Date(2026, 8, 22, 16, 30).getTime(), now = new Date(2026, 9, 21, 22, 10).getTime();
    vi.setSystemTime(now);
    const { days, activity } = syntheticGarminMonth(firstDay, 30, now, { calories: true });
    await db.beyondDays.bulkAdd(days);
    await importActivitySnapshot(activity);
    const meal = await createSavedMeal({ name: "Rice bowl", calories: 650, proteinG: 40, carbsG: 70, fatG: 15 });
    vi.setSystemTime(firstDay + 27 * DAY + 3 * H); await logMeal(days[27]!.id, meal.id);
    vi.setSystemTime(firstDay + 29 * DAY + 2 * H); await logMeal(days[29]!.id, meal.id);
    vi.setSystemTime(now);
    const before = await db.events.toArray();
    const d = await getMetricDetail("calories", now);
    const snapshot = await getMeasuredSnapshot(now);
    expect(d.source).toBe("GARMIN");
    expect(d.series).toEqual(snapshot.burned);
    expect(d.eaten!.series).toEqual(snapshot.eaten);
    const eatenOf = (i: number) => d.eaten!.series.find((p) => p.dayId === days[i]!.id)!.value;
    expect(eatenOf(27)).toBe(650);
    // A lived day with no meals is missing, never 0 kcal.
    expect(eatenOf(26)).toBeNull();
    expect(d.today).toEqual({ kind: "pair", from: snapshot.current.from, eaten: snapshot.eatenToday, burned: snapshot.burnedToday });
    expect(d.today.kind === "pair" && d.today.eaten.at(-1)!.total).toBe(650);
    expect(d.usual.value).toBe(snapshot.usual.burned.value);
    // One logged finished day is not enough for a usual: it says so instead of inventing one.
    expect(d.eaten!.usual).toMatchObject({ value: null, samples: 1 });
    expect(d.asOf).toBe(snapshot.caloriesAsOf);
    expect(await db.events.toArray()).toEqual(before);
  } finally { vi.useRealTimers(); }
});

it("METRIC-PAGE-002 slice 1: weight is each lived day's last weigh-in, corrected, an undone weigh-in left out, a day without one missing, read without writing", async () => {
  const { logBodyweight, correctBodyweight, voidBodyweightLog } = await import("../src/application/commands");
  const { getBodyweightHistory, getBodyweightHistoryWithSources } = await import("../src/application/bodyTrendQueries");
  const { updateNutritionTargets } = await import("../src/application/nutritionTargetCommands");
  try {
    vi.setSystemTime(new Date(2026, 10, 10, 18));
    const first = await startDay();
    await logBodyweight(first.id, 204);
    vi.setSystemTime(new Date(2026, 10, 10, 20));
    await logBodyweight(first.id, 203.4); // the lived day's last weigh-in is the one that counts
    vi.setSystemTime(new Date(2026, 10, 11, 18));
    await startDay(); // a lived day with no weigh-in
    vi.setSystemTime(new Date(2026, 10, 12, 18));
    const third = await startDay();
    await logBodyweight(third.id, 202);
    const [, , thirdWeighIn] = await getBodyweightHistoryWithSources();
    await correctBodyweight(third.id, thirdWeighIn!.headEventId, 202.6);
    await updateNutritionTargets({ goalWeightLbs: 190 });

    const before = await db.events.toArray();
    const d = await getMetricDetail("weight");
    expect(d.source).toBe("LOGGED");
    expect(d.series.slice(-3).map((v) => v.value)).toEqual([203.4, null, 202.6]);
    expect(d.series.at(-1)!.partial).toBe(true);
    // The same history BODY's weight trend draws, so best-since, milestones and the goal date match it exactly.
    expect(d.today).toEqual({ kind: "weighin", latest: { recordedAt: expect.any(String), weightLbs: 202.6 }, history: await getBodyweightHistory(), goalWeightLbs: 190 });
    expect(await db.events.toArray()).toEqual(before);

    // An undone weigh-in leaves its lived day missing, never zero and never the day before carried forward.
    const latest = (await getBodyweightHistoryWithSources()).at(-1)!;
    await voidBodyweightLog(third.id, latest.rootEventId);
    const undone = await getMetricDetail("weight");
    expect(undone.series.slice(-3).map((v) => v.value)).toEqual([203.4, null, null]);
    expect(undone.today.kind === "weighin" && undone.today.latest?.weightLbs).toBe(203.4);
  } finally { vi.useRealTimers(); }
});

it("METRIC-PAGE-002 slice 1: with no weigh-ins, weight has no latest, no history and no goal unless one is set", async () => {
  try {
    vi.setSystemTime(new Date(2026, 10, 10, 18));
    await startDay();
    const d = await getMetricDetail("weight");
    expect(d.series.every((v) => v.value === null)).toBe(true);
    expect(d.today).toMatchObject({ kind: "weighin", latest: null, history: [] });
    expect(d.usual.value).toBeNull();
  } finally { vi.useRealTimers(); }
});

it("METRIC-PAGE-002 slice 2: protein is meal protein plus quick logs per lived day, corrections applied, undone logs left out, a day without any missing, read without writing", async () => {
  const { logProtein, correctProtein, voidProteinLog, logBodyweight } = await import("../src/application/commands");
  const { getProteinEntries } = await import("../src/application/queries");
  const { createSavedMeal, logMeal } = await import("../src/application/nutritionCommands");
  const { getEffectiveProteinTargetG } = await import("../src/application/nutritionTargetQueries");
  try {
    vi.setSystemTime(new Date(2026, 10, 10, 18));
    const first = await startDay();
    await logProtein(first.id, 30);
    vi.setSystemTime(new Date(2026, 10, 11, 18));
    await startDay(); // a lived day with nothing logged
    vi.setSystemTime(new Date(2026, 10, 12, 18));
    const third = await startDay();
    await logBodyweight(third.id, 200);
    const meal = await createSavedMeal({ name: "Eggs", calories: 300, proteinG: 25, carbsG: 2, fatG: 20 });
    vi.setSystemTime(new Date(2026, 10, 12, 19));
    await logMeal(third.id, meal.id);
    vi.setSystemTime(new Date(2026, 10, 12, 20));
    await logProtein(third.id, 40);
    const [quick] = await getProteinEntries(third.id);
    await correctProtein(third.id, quick!.headEventId, 45);
    vi.setSystemTime(new Date(2026, 10, 12, 21));

    const before = await db.events.toArray();
    const d = await getMetricDetail("protein");
    expect(d.source).toBe("LOGGED");
    expect(d.series.slice(-3).map((v) => v.value)).toEqual([30, null, 70]);
    expect(d.series.at(-1)!.partial).toBe(true);
    // TODAY: the running total from 16:30, stepping up at the meal (25 g) and the corrected quick log (45 g).
    expect(d.today.kind === "logged" && d.today.points.map((p) => p.total)).toEqual([0, 25, 70]);
    // The target is BEYOND's existing one, unchanged.
    expect(d.target).toBe(await getEffectiveProteinTargetG());
    expect(d.target).toBeGreaterThan(0);
    expect(await db.events.toArray()).toEqual(before);

    await voidProteinLog(third.id, quick!.rootEventId);
    const undone = await getMetricDetail("protein");
    expect(undone.series.at(-1)?.value).toBe(25);
    expect(undone.today.kind === "logged" && undone.today.points.map((p) => p.total)).toEqual([0, 25]);
  } finally { vi.useRealTimers(); }
});

it("METRIC-PAGE-002 slice 2: with no weigh-in there is no protein target, never a guessed one", async () => {
  try {
    vi.setSystemTime(new Date(2026, 10, 10, 18));
    await startDay();
    const d = await getMetricDetail("protein");
    expect(d.target).toBeUndefined();
    expect(d.series.every((v) => v.value === null)).toBe(true);
    expect(d.today).toMatchObject({ kind: "logged", points: [{ total: 0 }] });
  } finally { vi.useRealTimers(); }
});
