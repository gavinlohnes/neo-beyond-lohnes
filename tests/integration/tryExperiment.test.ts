import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { activeExperiments, closeExperiment, experimentDay, experimentResult, getExperiments, readExperiment, startExperiment } from "../../src/application/tryExperiment";
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
    const e = readExperiment({ id: "x", title: "Try: Nap first", context: "Window 2026-10-10 for 4 days · WORK\nCompared…", decision: "d", status: "OPEN", source: "USER", createdAt: "", updatedAt: "" })!;
    const rows = [
      row(5, "WORK", 6, 3), row(6, "WORK", 6, 3), row(7, "WORK", 6.5, 3, 1), row(8, "OFF", 9, 5), // usual
      row(10, "WORK", 7, 3.1), row(11, "WORK", 6.75, 3.2, 1), row(12, "OFF", 9, 5), row(13, "WORK", 7.25, 3), // during
      row(15, "WORK", 6, 3), // after the window: usual again
    ];
    const r = experimentResult(e, rows);
    expect(r.enough).toBe(true);
    expect(r.during.map((x) => x.start)).toEqual([start(10), start(11), start(13)]); // the day off is out of scope
    expect(r.lines.map((l) => l.text)).toEqual([
      "Main sleep: 7:00 during (3 days), 6:08 usually (4 days) — 53 min more.",
      "Check-in energy: 3.1 during (3 days), 3.0 usually (4 days) — about the same.",
      "Trained on 1 of 3 days during, 1 of 4 usually.",
    ]);
    const thin = experimentResult(e, rows.slice(0, 5));
    expect(thin).toMatchObject({ enough: false, need: "3 recorded work days with main sleep or a check-in, both during the experiment and outside it (1 during so far)" });
  });

  it("closes through the journal's own review", async () => {
    const e = await startExperiment({ what: "No caffeine after 02:00", days: 14, scope: "ALL" });
    const closed = await closeExperiment(e.entry.id, "No clear difference", " Not worth the fight ");
    expect(closed).toMatchObject({ status: "REVIEWED", outcome: "No clear difference", lesson: "Not worth the fight" });
    await expect(startExperiment({ what: "  ", days: 7, scope: "WORK" })).rejects.toThrow("Say what you'll try.");
  });
});
