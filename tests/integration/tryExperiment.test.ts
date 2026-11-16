import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { activeExperiments, closeExperiment, diffVerdict, experimentDay, experimentResult, getExperiments, meanDiffInterval, readExperiment, startExperiment, tCritical975 } from "../../src/application/tryExperiment";
import { modifyDecisionJournalEntry } from "../../src/application/journalCommands";
import { followUpsDue } from "../../src/application/reflect";
import { getDecisionJournalEntries } from "../../src/application/journalQueries";
import type { PictureRow } from "../../src/application/wholePictureProjection";

beforeEach(async () => { await db.open(); });
afterEach(() => { vi.useRealTimers(); db.close(); });

const at = (day: number, hour: number) => vi.setSystemTime(new Date(2026, 9, day, hour));
const start = (day: number) => new Date(2026, 9, day, 16, 30).toISOString();
const row = (day: number, context: PictureRow["context"], sleepHours?: number, energy?: number, sessions = 0) =>
  ({ start: start(day), dayIds: [`d${day}`], context, sessions, ambiguousSleep: false, ...(sleepHours !== undefined ? { sleepHours } : {}), ...(energy !== undefined ? { energy } : {}) } as unknown as PictureRow);

const workTry = (days = 4) => readExperiment({ id: "x", title: "Try: Nap first", context: `Window 2026-10-10 for ${days} days · WORK\nCompared…`, decision: "d", status: "OPEN", source: "USER", createdAt: "", updatedAt: "" })!;

describe("LOOP step 3 — TRY", () => {
  it("an experiment is a journal entry with a window that starts on the current lived day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); at(20, 3); // lived day of Oct 19
    const e = await startExperiment({ what: " Nap 40 min before night 1 ", days: 7, scope: "WORK", expect: "Better energy on shift 1" });
    expect(e.what).toBe("Nap 40 min before night 1");
    expect(e.from).toEqual(new Date(2026, 9, 19, 16, 30));
    expect(e.to).toEqual(new Date(2026, 9, 26, 16, 30));
    expect(e.entry).toMatchObject({ title: "Try: Nap 40 min before night 1", decision: "Try it on work days for 7 days", expectation: "Better energy on shift 1", status: "OPEN" });
    expect(experimentDay(e, new Date())).toBe(1);
    at(22, 18); expect(experimentDay(e, new Date())).toBe(4);
    expect(activeExperiments(await getExperiments(), new Date()).map((x) => x.entry.id)).toEqual([e.entry.id]);
    at(26, 16); expect(activeExperiments(await getExperiments(), new Date())).toHaveLength(1);
    at(26, 17); expect(activeExperiments(await getExperiments(), new Date())).toEqual([]);
    // Not a REFLECT follow-up: experiments close through their own card.
    expect(followUpsDue(await getDecisionJournalEntries(), new Date())).toEqual([]);
    // Editing the window line away makes it a plain journal entry again.
    await modifyDecisionJournalEntry(e.entry.id, { context: "free text" });
    expect(await getExperiments()).toEqual([]);
  });

  it("compares the experiment's days with usual days of the same kind, honestly", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); at(10, 18);
    const e = workTry(4);
    const rows = [
      row(5, "WORK", 6, 3), row(6, "WORK", 6, 3), row(7, "WORK", 6.5, 3, 1), row(8, "OFF", 9, 5), // usual
      row(10, "WORK", 7, 3.1), row(11, "WORK", 6.75, 3.2, 1), row(12, "OFF", 9, 5), row(13, "WORK", 7.25, 3), // during
      row(15, "WORK", 6, 3), // after the window: usual again
    ];
    const r = experimentResult(e, rows);
    expect(r.enough).toBe(true);
    expect(r.during.map((x) => x.start)).toEqual([start(10), start(11), start(13)]); // the day off is out of scope
    expect(r.lines.map((l) => l.text)).toEqual([
      "Main sleep: 7:00 during (3 days), 6:08 usually (4 days) — 53 min more (range 21 to 84 min).",
      "Check-in energy: 3.1 during (3 days), 3.0 usually (4 days) — can't tell yet (0.1 higher, range -0.2 to 0.4).",
      "Trained on 1 of 3 days during, 1 of 4 usually.",
    ]);
    const thin = experimentResult(e, rows.slice(0, 5));
    expect(thin).toMatchObject({ enough: false, need: "3 recorded work days with main sleep or a check-in, both during the experiment and outside it (1 during so far)" });
  });

  it("says it can't tell yet when the range crosses zero, and about the same when the range stays small", () => {
    const e = workTry(14);
    const usual = [row(1, "WORK", 6, 3), row(2, "WORK", 7, 3), row(3, "WORK", 5, 2.8), row(4, "WORK", 8, 3.1), row(5, "WORK", 6, 3)];
    const overlap = [row(10, "WORK", 8, 3.2), row(11, "WORK", 5, 3), row(12, "WORK", 7, 3.4), row(13, "WORK", 6, 3.1), row(14, "WORK", 8, 2.9)];
    const unsure = experimentResult(e, [...usual, ...overlap]);
    expect(unsure.enough).toBe(true);
    expect(unsure.lines.map((l) => l.text)).toEqual([
      "Main sleep: 6:48 during (5 days), 6:24 usually (5 days) — can't tell yet (24 min more, range -84 to 132 min).",
      "Check-in energy: 3.1 during (5 days), 3.0 usually (5 days) — can't tell yet (0.1 higher, range -0.1 to 0.4).",
      "Trained on 0 of 5 days during, 0 of 5 usually.",
    ]);

    const tightUsual = [row(1, "WORK", 6, 3), row(2, "WORK", 6.05, 3.05), row(3, "WORK", 6.1, 3.1), row(4, "WORK", 6, 3), row(5, "WORK", 6.05, 3.05)];
    const tightDuring = [row(10, "WORK", 6.1, 3.1), row(11, "WORK", 6, 3), row(12, "WORK", 6.05, 3.05), row(13, "WORK", 6.1, 3.1), row(14, "WORK", 6, 3)];
    const same = experimentResult(e, [...tightUsual, ...tightDuring]);
    expect(same.lines.map((l) => l.text)).toEqual([
      "Main sleep: 6:03 during (5 days), 6:02 usually (5 days) — about the same (range -4 to 5 min).",
      "Check-in energy: 3.0 during (5 days), 3.0 usually (5 days) — about the same (range -0.1 to 0.1).",
      "Trained on 0 of 5 days during, 0 of 5 usually.",
    ]);

    const clearUsual = [row(1, "WORK", 6, 3), row(2, "WORK", 6.2, 3), row(3, "WORK", 6, 2), row(4, "WORK", 6.1, 3), row(5, "WORK", 5.9, 3)];
    const clearDuring = [row(10, "WORK", 8, 4), row(11, "WORK", 8, 4), row(12, "WORK", 7.5, 4), row(13, "WORK", 8, 5), row(14, "WORK", 7.75, 4)];
    const clear = experimentResult(e, [...clearUsual, ...clearDuring]);
    expect(clear.lines.map((l) => l.text)).toEqual([
      "Main sleep: 7:51 during (5 days), 6:02 usually (5 days) — 109 min more (range 92 to 126 min).",
      "Check-in energy: 4.2 during (5 days), 2.8 usually (5 days) — 1.4 higher (range 0.7 to 2.1).",
      "Trained on 0 of 5 days during, 0 of 5 usually.",
    ]);
  });

  it("closes through the journal's own review", async () => {
    const e = await startExperiment({ what: "No caffeine after 02:00", days: 14, scope: "ALL" });
    const closed = await closeExperiment(e.entry.id, "No clear difference", " Not worth the fight ");
    expect(closed).toMatchObject({ status: "REVIEWED", outcome: "No clear difference", lesson: "Not worth the fight" });
    await expect(startExperiment({ what: "  ", days: 7, scope: "WORK" })).rejects.toThrow("Say what you'll try.");
  });
});

describe("meanDiffInterval — Welch 95% CI", () => {
  it("needs at least three values in each arm", () => {
    expect(meanDiffInterval([1, 2], [1, 2, 3])).toBeUndefined();
    expect(meanDiffInterval([1, 2, 3], [1, 2])).toBeUndefined();
    expect(meanDiffInterval([], [1, 2, 3])).toBeUndefined();
  });

  it("returns a point interval when both arms have no spread, and a wide interval that crosses zero when the samples overlap", () => {
    expect(meanDiffInterval([7, 7, 7], [6, 6, 6])).toMatchObject({ diff: 1, lo: 1, hi: 1, nA: 3, nB: 3 });
    const overlap = meanDiffInterval([1, 2, 3], [2, 3, 4])!;
    expect(overlap.diff).toBe(-1);
    expect(overlap.lo).toBeCloseTo(-3.2666, 3);
    expect(overlap.hi).toBeCloseTo(1.2666, 3);
    expect(overlap.lo).toBeLessThan(0);
    expect(overlap.hi).toBeGreaterThan(0);
    expect(diffVerdict(overlap.diff, overlap.lo, overlap.hi, 0.5)).toBe("unsure");
  });

  it("uses the textbook 95% t critical values", () => {
    expect(tCritical975(1)).toBe(12.706);
    expect(tCritical975(2)).toBe(4.303);
    expect(tCritical975(4)).toBe(2.776);
    expect(tCritical975(30)).toBe(2.042);
    expect(tCritical975(60)).toBeCloseTo(2.001, 3);
  });
});
