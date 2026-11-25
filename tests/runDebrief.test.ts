import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/persistence/db";
import {
  RUN_DEBRIEF_TITLE, SHIFT_DEBRIEF_TITLE, changeRunDebriefFelt, closeShift, followUpsDue, getRunDebrief, isRunDebriefSkipped,
  recordRunDebrief, restoreRunDebrief, runDebriefContext, runDebriefFor, setRunDebriefNext, skipRunDebrief,
} from "../src/application/reflect";
import { derivePostRunReport } from "../src/application/postRunReport";
import { getDecisionJournalEntries } from "../src/application/journalQueries";
import { startDay } from "../src/application/commands";
import type { DecisionJournalEntry } from "../src/domain/journal/types";
import type { PictureRow } from "../src/application/wholePictureProjection";

/** GRAYSON-RUN-DEBRIEF-001 (C2.5). Run under TZ=UTC and TZ=America/Chicago. */
beforeEach(async () => { await db.open(); localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); db.close(); });

const run = { from: "2026-11-18", to: "2026-11-21", shifts: 4 };
const entry = (context: string, createdAt: string, title = RUN_DEBRIEF_TITLE): DecisionJournalEntry =>
  ({ id: context + createdAt, title, context, decision: "Run felt ok", status: "OPEN", source: "USER", createdAt, updatedAt: createdAt } as DecisionJournalEntry);

describe("run debrief", () => {
  it("names the run by its dates and shifts", () => {
    expect(runDebriefContext(run)).toBe("Run Nov 18 to Nov 21, 4 shifts");
    expect(runDebriefContext({ from: "2026-11-21", to: "2026-11-21", shifts: 1 })).toBe("Run Nov 21, 1 shift");
  });

  it("tap 1 writes one journal entry; SAVE adds the next-run line to that same entry", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 22, 10));
    const saved = await recordRunDebrief({ felt: "Rough", run });
    expect(saved).toMatchObject({ title: "Run debrief", context: "Run Nov 18 to Nov 21, 4 shifts", decision: "Run felt rough", status: "OPEN" });
    expect(saved.expectation).toBeUndefined();
    await setRunDebriefNext(saved.id, "  Bed by 9 on night one ");
    const all = await getDecisionJournalEntries();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: saved.id, decision: "Run felt rough", expectation: "Next run: Bed by 9 on night one" });
    await expect(setRunDebriefNext(saved.id, "   ")).rejects.toThrow(/EMPTY_RUN_NEXT/);
    await expect(setRunDebriefNext(saved.id, "x".repeat(201))).rejects.toThrow(/RUN_NEXT_TOO_LONG/);
  });

  it("a fix changes the same entry, and Undo puts it back", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 22, 10));
    const saved = await setRunDebriefNext((await recordRunDebrief({ felt: "OK", run })).id, "Nap first");
    await changeRunDebriefFelt(saved.id, "Good");
    await setRunDebriefNext(saved.id, "Nap 90 min first");
    expect((await getRunDebrief(run.to))).toMatchObject({ decision: "Run felt good", expectation: "Next run: Nap 90 min first" });
    await restoreRunDebrief(saved.id, { decision: saved.decision, expectation: saved.expectation! });
    expect((await getDecisionJournalEntries())).toHaveLength(1);
    expect((await getRunDebrief(run.to))).toMatchObject({ decision: "Run felt ok", expectation: "Next run: Nap first" });
  });

  it("finds this run's entry, not an earlier run's or last year's", () => {
    const earlier = entry("Run Nov 4 to Nov 7, 4 shifts", new Date(2026, 10, 8, 10).toISOString());
    const lastYear = entry("Run Nov 18 to Nov 21, 4 shifts", new Date(2025, 10, 22, 10).toISOString());
    const shift = entry("Run Nov 18 to Nov 21, 4 shifts", new Date(2026, 10, 22, 10).toISOString(), SHIFT_DEBRIEF_TITLE);
    expect(runDebriefFor([earlier, lastYear, shift], run.to)).toBeUndefined();
    const mine = entry("Run Nov 18 to Nov 21, 4 shifts", new Date(2026, 10, 22, 10).toISOString());
    expect(runDebriefFor([earlier, lastYear, mine], run.to)).toBe(mine);
    expect(runDebriefFor([earlier, lastYear, mine], "2026-11-07")).toBe(earlier);
    // The key is the last day: a late log that changes the first date or the count still finds it.
    const moved = entry("Run Nov 19 to Nov 21, 3 shifts", new Date(2026, 10, 22, 10).toISOString());
    expect(runDebriefFor([moved], run.to)).toBe(moved);
    expect(runDebriefFor([entry("Run Nov 21, 1 shift", new Date(2026, 10, 22, 1).toISOString())], run.to)).toBeDefined();
  });

  it("a second run gets its own entry", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 8, 10));
    const first = await recordRunDebrief({ felt: "Good", run: { from: "2026-11-04", to: "2026-11-07", shifts: 4 } });
    vi.setSystemTime(new Date(2026, 10, 22, 10));
    expect(await getRunDebrief(run.to)).toBeUndefined();
    const second = await recordRunDebrief({ felt: "Rough", run });
    expect((await getRunDebrief(run.to))?.id).toBe(second.id);
    expect((await getRunDebrief("2026-11-07"))?.id).toBe(first.id);
  });

  it("follow-ups never ask about a run debrief", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 22, 10));
    await setRunDebriefNext((await recordRunDebrief({ felt: "OK", run })).id, "Nap first");
    vi.setSystemTime(new Date(2026, 10, 25, 10));
    expect(followUpsDue(await getDecisionJournalEntries(), new Date())).toEqual([]);
  });

  it("a skipped run stays skipped, and the next run asks again", () => {
    expect(isRunDebriefSkipped(run.to)).toBe(false);
    skipRunDebrief(run.to);
    expect(isRunDebriefSkipped(run.to)).toBe(true);
    expect(isRunDebriefSkipped("2026-12-05")).toBe(false);
  });

  it("a run whose last shift ended just before midnight keys to that shift's lived day", async () => {
    // Lived days start at 16:30 local; the last one ran Nov 21 16:30 to Nov 22 16:30, shift ending 23:50 on the 21st.
    const row = (d: number) => ({ start: new Date(2026, 10, d, 16, 30).toISOString(), dayIds: [`d${d}`], context: "WORK", sessions: 0, ambiguousSleep: false } as unknown as PictureRow);
    const report = derivePostRunReport([row(18), row(19), row(20), row(21)])!;
    expect(report.to).toBe("2026-11-21");
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 21, 23, 55));
    await recordRunDebrief({ felt: "OK", run: report });
    expect((await getRunDebrief(report.to))?.context).toBe("Run Nov 18 to Nov 21, 4 shifts");
  });

  it("shift debriefs and closeShift behave as before", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 21, 18));
    const day = await startDay();
    await closeShift(day.id, { felt: "Good" });
    const all = await getDecisionJournalEntries();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: SHIFT_DEBRIEF_TITLE, decision: "Shift felt good" });
    expect(await getRunDebrief(run.to)).toBeUndefined();
  });
});
