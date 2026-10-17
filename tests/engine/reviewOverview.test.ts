import { describe, expect, it } from "vitest";
import { projectReviewOverview, type ReviewWeight } from "../../src/engine/reviewOverview";
import type { DaySummary } from "../../src/engine/dayLedger";
import { finishedLivedDays, livedDayBoundary } from "../../src/engine/livedDaySeries";
const now = new Date(2026, 9, 20, 20);
function day(back: number, override: Partial<DaySummary> = {}): DaySummary {
  const start = livedDayBoundary(finishedLivedDays(now, 0, 1).to, back).toISOString();
  return { beyondDayId: `day-${back}`, startedAt: start, livedDayStart: start,
    endedAt: livedDayBoundary(new Date(start), -1).toISOString(),
    work: { declared: "OFF", scheduled: "OFF" }, sleep: {}, workouts: [], urges: [], cleanDay: false,
    burden: { manualEntries: 0, corrections: 0, trainingSets: 0 }, ...override };
}
const weight = (d: DaySummary, lbs: number): ReviewWeight => ({ dayId: d.beyondDayId, lbs, at: d.startedAt, rootId: `${d.beyondDayId}-${lbs}` });
describe("read-only Review overview", () => {
  it("keeps missing windows missing, never zero-filled nutrition/sleep", () => {
    const result = projectReviewOverview([], [], now);
    expect(result.rows).toHaveLength(28); expect(result.recordedDays).toBe(0);
    expect(result.protein).toEqual({ days: 0, mean: undefined }); expect(result.sleep.mean).toBeUndefined();
    expect(result.weight.change).toBeUndefined();
  });
  it("retains a recorded zero and combines restarted-day segments once", () => {
    const first = day(1, { proteinG: 0, kcal: 0 });
    const second = { ...first, beyondDayId: "second", proteinG: 25 }; delete second.kcal;
    const result = projectReviewOverview([first, second, day(2, { proteinG: 0 })], [], now);
    expect(result.recordedDays).toBe(2); expect(result.protein).toEqual({ days: 2, mean: 12.5 });
    expect(result.calories).toEqual({ days: 1, mean: 0 });
    expect(result.rows.at(-1)?.dayIds).toEqual([first.beyondDayId, "second"]);
  });
  it("excludes current windows and entire lived days with a deferred active segment", () => {
    const first = day(1, { proteinG: 100 });
    const active = { ...first, beyondDayId: "active" }; delete active.endedAt;
    const result = projectReviewOverview([first, active, day(0, { proteinG: 200 })], [], now);
    expect(result.recordedDays).toBe(0); expect(result.protein.days).toBe(0);
  });
  it("averages weigh-ins per day before averaging weeks and enforces distinct-day floor", () => {
    const days = Array.from({ length: 14 }, (_, index) => day(index + 1));
    const weights = days.flatMap((d, index) => [weight(d, index < 7 ? 180 : 182)]);
    // Many observations on a day do not give that day more influence.
    weights.push(...Array.from({ length: 20 }, (_, index) => ({ ...weight(days[0]!, 180), rootId: `extra-${index}` })));
    const result = projectReviewOverview(days, weights, now);
    expect(result.weight).toMatchObject({ recentDays: 7, previousDays: 7, recentMean: 180, previousMean: 182, change: -2 });
    const oneDay = projectReviewOverview(days, weights.filter((w) => w.dayId === days[0]!.beyondDayId), now);
    expect(oneDay.weight.change).toBeUndefined(); expect(oneDay.weight.recentDays).toBe(1);
  });
  it("does not treat ambiguous main sleeps as one night", () => {
    const days = [day(1, { sleep: { primaryLogs: [{ at: day(1).startedAt, minutes: 360 }, { at: day(1).startedAt, minutes: 420 }] } }), day(3)];
    const result = projectReviewOverview(days, days.map((d, index) => weight(d, 180 + index)), now);
    expect(result.sleep.days).toBe(0); expect(result.rows.at(-1)?.ambiguousSleep).toBe(true);
    expect(result.weight.change).toBeUndefined();
  });
  it("excludes mixed/unknown work contexts rather than using today's schedule", () => {
    const off = day(1); const work = { ...off, beyondDayId: "work", work: { declared: "WORK" as const, scheduled: "OFF" as const } };
    expect(projectReviewOverview([off, work], [], now).rows.at(-1)?.context).toBe("UNKNOWN");
  });
  it("counts finished/partial strength only and deduplicates session identity", () => {
    const base = { sessionId: "a", templateId: "A", sessionType: "STANDARD", status: "COMPLETED", startedAt: day(1).startedAt, setsLogged: 1, records: [] };
    const d = day(1, { workouts: [base, base, { ...base, sessionId: "b", status: "PARTIAL", sessionType: "REDUCED" }, { ...base, sessionId: "c", status: "ACTIVE" }, { ...base, sessionId: "d", status: "ABANDONED" }, { ...base, sessionId: "e", sessionType: "RECOVERY" }] });
    expect(projectReviewOverview([d], [], now)).toMatchObject({ sessions: 2, trainingDays: 1 });
  });
  it.each([new Date(2026, 2, 10, 12), new Date(2026, 10, 3, 12)])("keeps 28 distinct local 16:30 boundaries through DST (%s)", (at) => {
    const result = projectReviewOverview([], [], at);
    expect(new Set(result.rows.map((row) => row.start)).size).toBe(28);
    expect(result.rows.every((row) => new Date(row.start).getHours() === 16 && new Date(row.start).getMinutes() === 30)).toBe(true);
  });
});
