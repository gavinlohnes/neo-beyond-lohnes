import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/persistence/db";
import {
  REVIEW_CHOICES, WINDOW_REVIEW, actualLine, actualWindows, applyOffer, closeWindowReview, keepWindowPlan, kindsOf, openWindowTry,
  planOffer, readWindowReviewPreference, startWindowReview, summarizeActual, weightLine, windowReview, type ActualDay, type ReviewInputs,
} from "../src/application/eatingWindowReview";
import { getEatingWindowSettings, saveEatingWindowSettings, type EatingMark } from "../src/application/eatingWindow";
import { getExperiments, readExperiment, type Experiment } from "../src/application/tryExperiment";
import type { PictureRow } from "../src/application/wholePictureProjection";
import type { DecisionJournalEntry } from "../src/domain/journal/types";

/** GRAYSON-WINDOW-REVIEW-001 (C4.8c). Run under TZ=UTC and TZ=America/Chicago. */
beforeEach(async () => { await db.open(); localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); db.close(); });

const OPENS = { WORK: "14:00", RECOVERY: "14:00", OFF: "10:00" } as const;
const settings = { enabled: true, eatingHours: 10, opensAt: { ...OPENS }, safetyCheckedAt: "2026-11-01T12:00:00.000Z", setAt: "2026-11-01T12:00:00.000Z" };
const start = (d: number) => new Date(2026, 10, d, 16, 30);
type RowOpts = { context?: PictureRow["context"]; meals?: number[]; protein?: number; sessions?: number; energy?: number; recorded?: boolean };
const row = (d: number, o: RowOpts = {}) => ({
  start: start(d).toISOString(), dayIds: o.recorded === false ? [] : [`d${d}`], context: o.context ?? "WORK", sessions: o.sessions ?? 0,
  ambiguousSleep: false, weights: [], marks: { meals: o.meals ?? [], water: [], workouts: [] },
  ...(o.protein !== undefined ? { protein: o.protein } : {}), ...(o.energy !== undefined ? { energy: o.energy } : {}),
} as unknown as PictureRow);
/** A mark at local clock time on the calendar date `d` (+1 for the next morning). */
let seq = 0;
const mark = (boundary: "OPENED" | "CLOSED", d: number, h: number, m = 0): EatingMark => ({ id: `m${++seq}`, dayId: undefined, boundary, at: new Date(2026, 10, d, h, m).toISOString(), seq });
const minutesAfterStart = (d: number, calDay: number, h: number, m = 0) => (new Date(2026, 10, calDay, h, m).getTime() - start(d).getTime()) / 60_000;

describe("what you actually do", () => {
  it("kinds of day: work, the first day off after work is recovery, other days off", () => {
    expect(kindsOf([{ context: "WORK" }, { context: "OFF" }, { context: "OFF" }, { context: "UNKNOWN" }, { context: "OFF" }])).toEqual(["WORK", "RECOVERY", "OFF", null, "OFF"]);
  });

  it("medians by kind from his marks; a meal-only day is an estimate; a day with neither is unknown", () => {
    // Work days Nov 10–13: plan opens 14:00 on the next calendar day. He opens at 15:30 and closes at 01:00.
    const rows = [10, 11, 12, 13].map((d) => row(d));
    const marks = [10, 11, 12].flatMap((d) => [mark("OPENED", d + 1, 15, 30), mark("CLOSED", d + 2, 1, 0)]);
    rows.push(row(14, { context: "WORK", meals: [minutesAfterStart(14, 15, 16), minutesAfterStart(14, 16, 0, 30)] })); // meals only
    rows.push(row(15)); // nothing
    const days = actualWindows(rows, marks, settings);
    expect(days.map((d) => d.source)).toEqual(["MARKED", "MARKED", "MARKED", "UNKNOWN", "MEALS", "UNKNOWN"]);
    const work = summarizeActual(days, settings).find((s) => s.kind === "WORK")!;
    expect(work).toMatchObject({ days: 6, known: 4, marked: 3, fromMeals: 1, enough: true, opensAt: "15:30" });
    const line = actualLine(work);
    expect(line.counts).toBe("6 work days: 3 marked, 1 from meals, 2 unknown.");
    expect(line.estimate).toBe(true);
    expect(line.text).toMatch(/^Opens around 15:30, closes around 0[01]:\d\d, about \d+:\d\d of eating\.$/);
  });

  it("shows nothing below 4 known days of a kind", () => {
    const rows = [10, 11, 12].map((d) => row(d));
    const marks = [10, 11, 12].map((d) => mark("OPENED", d + 1, 14, 5));
    const s = summarizeActual(actualWindows(rows, marks, settings), settings).find((x) => x.kind === "WORK")!;
    expect(s.enough).toBe(false);
    expect(s.opensAt).toBeUndefined();
    expect(actualLine(s).text).toBe("Not enough days yet (3 of 4).");
  });

  it("a window that opens after midnight on a work night belongs to that night", () => {
    const night = { ...settings, opensAt: { ...OPENS, WORK: "01:00" } };
    const rows = [10, 11, 12, 13].map((d) => row(d));
    const marks = [10, 11, 12, 13].map((d) => mark("OPENED", d + 1, 1, 20));
    const days = actualWindows(rows, marks, night);
    expect(days.every((d) => d.opened !== undefined && d.opened - d.planned === 20 * 60_000)).toBe(true);
    expect(summarizeActual(days, night).find((s) => s.kind === "WORK")!.opensAt).toBe("01:20");
  });

  it("#727 review: a Recovery day then a day off don't share a meal; spans stop halfway to the next plan", () => {
    // Nov 10 work, Nov 11 recovery (opens Nov 12 14:00), Nov 12 off (opens Nov 13 10:00). A 23:30 meal on Nov 12 sits
    // inside both 12-hour spans; it belongs to the recovery day (before the halfway point, Nov 13 00:00).
    const rows = [row(10), row(11, { context: "OFF", meals: [minutesAfterStart(11, 12, 15), minutesAfterStart(11, 12, 23, 30)] }), row(12, { context: "OFF", meals: [minutesAfterStart(12, 13, 10)] })];
    const [, recovery, off] = actualWindows(rows, [], settings);
    expect(recovery).toMatchObject({ kind: "RECOVERY", opened: new Date(2026, 10, 12, 15).getTime(), closed: new Date(2026, 10, 12, 23, 30).getTime() });
    expect(off).toMatchObject({ kind: "OFF", opened: new Date(2026, 10, 13, 10).getTime() });
  });
});

describe("one offer to move the plan", () => {
  const workDays = (late: number[]): ActualDay[] => [1, 2, 3, 4, 5, 6].map((i) => {
    const planned = new Date(2026, 10, 10 + i, 14, 0).getTime();
    return { start: start(9 + i).toISOString(), kind: "WORK", planned, opened: planned + (late.includes(i) ? 90 : 5) * 60_000, source: "MARKED" };
  });
  const now = new Date(2026, 10, 20, 12);

  it("90 minutes late on 4 of 6 work days offers 15:30 (rounded to 15 min); 3 of 6 offers nothing", () => {
    const offer = planOffer(workDays([1, 2, 4, 6]), settings, { keptOffers: {} }, now);
    expect(offer).toMatchObject({ kind: "WORK", from: "14:00", to: "15:30" });
    expect(offer!.line).toBe("On work days you've opened around 15:30, not 14:00. Move the plan to 15:30?");
    expect(planOffer(workDays([1, 2, 4]), settings, { keptOffers: {} }, now)).toBeNull();
  });

  it("KEEP hides that offer for 14 days", () => {
    keepWindowPlan("WORK", now);
    const pref = readWindowReviewPreference();
    expect(pref.keptOffers.WORK).toBe("2026-11-20");
    expect(planOffer(workDays([1, 2, 3, 4]), settings, pref, new Date(2026, 11, 3, 12))).toBeNull();
    expect(planOffer(workDays([1, 2, 3, 4]), settings, pref, new Date(2026, 11, 5, 12))).not.toBeNull();
  });

  it("never shortens the window: MOVE changes only that kind's opening", () => {
    const offer = planOffer(workDays([1, 2, 3, 4, 5, 6]), settings, { keptOffers: {} }, now)!;
    const moved = applyOffer(settings, offer);
    expect(moved.eatingHours).toBe(settings.eatingHours);
    expect(moved.opensAt).toEqual({ ...OPENS, WORK: "15:30" });
  });
});

describe("the review", () => {
  const tryOf = (days = 28): Experiment => readExperiment({
    id: "t", title: "Try: Eating window 14:10", context: `Window 2026-10-20 for ${days} days · ALL\nCompared…`, decision: "d",
    status: "OPEN", source: "USER", createdAt: "", updatedAt: "",
  } as DecisionJournalEntry)!;
  const e = tryOf();
  const at = (y: number, m: number, d: number) => new Date(y, m, d, 7).toISOString();
  const end = new Date(2026, 10, 18, 12);

  it("weight pace, and weeks to goal only when the trend heads there with enough weigh-ins", () => {
    const losing = [at(2026, 9, 10, ), at(2026, 9, 15)].map((r, i) => ({ recordedAt: r, weightLbs: 185 - i * 0.2 }))
      .concat(Array.from({ length: 10 }, (_, i) => ({ recordedAt: at(2026, 9, 21 + i * 3), weightLbs: 184 - i * 0.6 })));
    const toward = weightLine(e, losing, 0.1, 170, end);
    expect(toward.pace).toBeLessThan(0);
    expect(toward.text).toMatch(/lb a week \(10 weigh-ins\)\. About \d+ weeks to 170 at this pace\.$/);
    const away = weightLine(e, losing, 0.1, 190, end);
    expect(away.text).not.toMatch(/weeks to/);
    expect(weightLine(e, losing, 0.1, undefined, end).text).not.toMatch(/weeks to/);
    const few = weightLine(e, losing.slice(0, 5), 0.1, 170, end);
    expect(few).toEqual({ text: "Not enough weigh-ins to tell (3 during; it needs 5 over 7 days).", pace: undefined });
  });

  const base = (rows: PictureRow[], over: Partial<ReviewInputs> = {}): ReviewInputs => ({
    rows, actual: [], weighIns: [], alpha: 0.1, goalWeightLbs: undefined, proteinTargetG: 180,
    strength: { state: "WORKING", missing: [] }, now: end, ...over,
  });
  // Before the Try: Sep 22 – Oct 19. During: Oct 20 – Nov 16.
  const days = (from: number, to: number, month: number, f: (d: number) => RowOpts) =>
    Array.from({ length: to - from + 1 }, (_, i) => { const d = from + i; const r = row(0, f(d)); (r as { start: string }).start = new Date(2026, month, d, 16, 30).toISOString(); return r; });

  it("protein days during vs before, training days counted separately; the kept line is last", () => {
    const before = days(1, 10, 9, (d) => ({ protein: d <= 4 ? 190 : 150, sessions: d % 2 })); // Oct 1–10: 4 of 10; training (odd) 2 of 5
    const during = days(20, 31, 9, (d) => ({ protein: d <= 28 ? 185 : 120, sessions: d % 2 })); // Oct 20–31: 9 of 12
    const r = windowReview(e, base([...before, ...during]));
    expect(r.lines.find((l) => l.label === "Protein")!.text).toBe("Target reached on 9 of 12 days during, 4 of 10 before (days with food logged).");
    expect(r.lines.find((l) => l.label === "Protein on training days")!.text).toBe("4 of 6 during, 2 of 5 before.");
    expect(r.lines.at(-1)!.label).toBe("Window kept");
    expect(r.lines.find((l) => l.label === "Strength")!.text).toBe("Holding or rising across your comparable lifts, compared with the 4 weeks before.");
  });

  it("guardrails fire at exactly the stated thresholds, and at most two show", () => {
    const training = (under: number) => days(20, 25, 9, (d) => ({ protein: d - 20 < under ? 150 : 190, sessions: 1 }));
    expect(windowReview(e, base(training(4))).guardrails).toEqual(["Protein has been under target on 4 of 6 training days. A wider window on training days may help."]);
    expect(windowReview(e, base(training(3))).guardrails).toEqual([]);
    // Strength lower while weight falls, plus energy clearly lower: three would fire; two show.
    const weighIns = Array.from({ length: 10 }, (_, i) => ({ recordedAt: at(2026, 9, 18 + i * 3), weightLbs: 184 - i * 0.6 }));
    const energyRows = [...days(1, 12, 9, () => ({ energy: 4, protein: 190 })), ...days(20, 31, 9, (d) => ({ energy: 2, protein: d < 24 ? 150 : 190, sessions: d < 26 ? 1 : 0 }))];
    const all = windowReview(e, base(energyRows, { weighIns, strength: { state: "NEEDS ATTENTION", missing: [] } }));
    expect(all.guardrails).toHaveLength(WINDOW_REVIEW.MAX_GUARDS);
    expect(all.guardrails[0]).toMatch(/^Protein has been under target on 4 of 6 training days/);
    expect(all.guardrails[1]).toBe("Strength is lower than 4 weeks ago while your weight is dropping. Worth more protein or a wider window before anything else.");
    const noProtein = windowReview(e, base(energyRows.map((r) => ({ ...r, protein: 200 })), { weighIns, strength: { state: "NEEDS ATTENTION", missing: [] } }));
    expect(noProtein.guardrails[1]).toBe("Energy has been lower while you've been on the window. A wider window or more food on work nights may help.");
  });

  it("#727 review: an unknown day isn't counted as kept, and counts read in the singular", () => {
    const planned = (d: number) => new Date(2026, 9, d + 1, 14).getTime();
    const actual: ActualDay[] = [
      { start: new Date(2026, 9, 20, 16, 30).toISOString(), kind: "WORK", planned: planned(20), opened: planned(20) + 10 * 60_000, source: "MARKED" },
      { start: new Date(2026, 9, 21, 16, 30).toISOString(), kind: "WORK", planned: planned(21), source: "UNKNOWN" },
    ];
    expect(windowReview(e, base([], { actual })).lines.at(-1)).toEqual({ label: "Window kept",
      text: "Opened within 30 minutes of your plan as it is now on 1 of 1 known day; 1 day unknown." });
  });

  it("strength says when there aren't enough comparable lifts", () => {
    const r = windowReview(e, base([], { strength: { state: "UNCERTAIN", missing: ["1 of 2 lifts with sessions in both of the last two 4-week periods"] } }));
    expect(r.lines.find((l) => l.label === "Strength")!.text).toBe("Not enough comparable lifts to tell (1 of 2 lifts with sessions in both of the last two 4-week periods).");
  });
});

describe("his choices at the review", () => {
  const setUp = async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 20, 18));
    const { setAt: _s, ...rest } = settings;
    const saved = await saveEatingWindowSettings(rest);
    const e = await startWindowReview(saved, 28);
    vi.setSystemTime(new Date(2026, 10, 18, 18));
    return { saved, e };
  };

  it("starts a Try named for his preset, over every day, 14 or 28 days", async () => {
    const { e } = await setUp();
    expect(e).toMatchObject({ what: "Eating window 14:10", scope: "ALL", days: 28 });
    expect(openWindowTry(await getExperiments())?.entry.id).toBe(e.entry.id);
    await expect(startWindowReview((await getEatingWindowSettings())!, 7)).rejects.toThrow(/REVIEW_LENGTH/);
  });

  it.each(["KEEP", "ADJUST", "PAUSE", "END"] as const)("%s closes the Try with its outcome and changes settings as stated", async (choice) => {
    const { saved, e } = await setUp();
    await closeWindowReview(e.entry.id, choice, saved, " Felt steady ");
    const entry = (await db.decisionJournalEntries.get(e.entry.id))!;
    expect(entry).toMatchObject({ status: "REVIEWED", outcome: REVIEW_CHOICES[choice], lesson: "Felt steady" });
    const after = (await getEatingWindowSettings())!;
    expect(after.enabled).toBe(choice === "KEEP" || choice === "ADJUST");
    expect(after.opensAt).toEqual(saved.opensAt);
    expect(after.eatingHours).toBe(saved.eatingHours);
    expect(openWindowTry(await getExperiments())).toBeUndefined();
  });

  it("a failed settings write leaves the Try open", async () => {
    const { saved, e } = await setUp();
    vi.spyOn(db.schedulePatterns, "put").mockRejectedValueOnce(new Error("disk full"));
    await expect(closeWindowReview(e.entry.id, "END", saved)).rejects.toThrow();
    expect((await db.decisionJournalEntries.get(e.entry.id))!.status).toBe("OPEN");
    expect((await getEatingWindowSettings())!.enabled).toBe(true);
  });
});
