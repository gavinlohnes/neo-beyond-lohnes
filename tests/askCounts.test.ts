import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ASK_COUNT_SETTINGS_KEY, clearAskCounts, getAskSummary, noteAsk, pruneAskCounts, resetAskCountSession, restoreAskCounts, writeAskCountSettings,
} from "../src/application/askCounts";
import type { AskCount } from "../src/domain/askCounts";
import { askDate, describeAskChange, summarizeAsks } from "../src/engine/askSummary";
import { db } from "../src/persistence/db";
import { TRAVELLING_SETTINGS } from "../src/persistence/settingsTransfer";

/**
 * GRAYSON-ASKS-COUNT-001: questions counted when shown, once per key per lived day (16:30 to 16:30), never an input.
 * Run under TZ=UTC and TZ=America/Chicago; the November DST change is covered.
 */
beforeEach(() => { resetAskCountSession(); localStorage.clear(); });
afterEach(async () => { await db.askCounts.clear(); });

const row = (date: string, area: AskCount["area"], key: string): AskCount =>
  ({ id: `${date}|${area}|FIELD|${key}`, date, area, kind: "FIELD", key, count: 1, firstAt: `${date}T18:00:00.000Z` });
/** Local YYYY-MM-DD for a day offset from a local date. */
const local = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function dateBack(from: Date, days: number): string {
  const d = new Date(from); d.setDate(d.getDate() - days);
  return local(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

describe("GRAYSON-ASKS-COUNT-001 counting", () => {
  it("the same key twice in a lived day counts once; the next lived day counts again; a 06:10 ask is the night before's", async () => {
    const evening = new Date(2026, 10, 24, 18, 0);
    await noteAsk({ area: "TODAY", kind: "FIELD", key: "checkin.energy" }, evening);
    resetAskCountSession(); // a reload: the database dedupes too
    await noteAsk({ area: "TODAY", kind: "FIELD", key: "checkin.energy" }, new Date(2026, 10, 25, 6, 10));
    expect((await db.askCounts.toArray()).map((r) => r.date)).toEqual(["2026-11-24"]);
    await noteAsk({ area: "TODAY", kind: "FIELD", key: "checkin.energy" }, new Date(2026, 10, 25, 16, 40));
    expect((await db.askCounts.toArray()).map((r) => r.date).sort()).toEqual(["2026-11-24", "2026-11-25"]);
    expect(askDate(new Date(2026, 10, 25, 6, 10))).toBe("2026-11-24");
  });

  it("across the November DST change each lived day keeps its own date", () => {
    expect(askDate(new Date(2026, 9, 31, 20))).toBe("2026-10-31");
    expect(askDate(new Date(2026, 10, 1, 10))).toBe("2026-10-31");
    expect(askDate(new Date(2026, 10, 1, 17))).toBe("2026-11-01");
    expect(askDate(new Date(2026, 10, 2, 16, 0))).toBe("2026-11-01");
  });

  it("off writes nothing", async () => {
    writeAskCountSettings({ on: false, showPanel: true });
    await noteAsk({ area: "TODAY", kind: "FIELD", key: "checkin.energy" }, new Date(2026, 10, 24, 18));
    expect(await db.askCounts.count()).toBe(0);
    expect(TRAVELLING_SETTINGS[ASK_COUNT_SETTINGS_KEY]).toBe("Counting GRAYSON's questions");
  });

  it("pruning keeps 400 days", async () => {
    const now = new Date(2026, 10, 24, 18);
    await db.askCounts.bulkAdd([row(dateBack(now, 401), "TODAY", "old"), row(dateBack(now, 399), "TODAY", "kept")]);
    expect(await pruneAskCounts(now)).toBe(1);
    expect((await db.askCounts.toArray()).map((r) => r.key)).toEqual(["kept"]);
  });

  it("clear removes every count and UNDO puts them back", async () => {
    await db.askCounts.bulkAdd([row("2026-11-20", "TODAY", "a"), row("2026-11-21", "FOOD", "b")]);
    const removed = await clearAskCounts();
    expect(await db.askCounts.count()).toBe(0);
    await restoreAskCounts(removed);
    expect(await db.askCounts.count()).toBe(2);
  });
});

describe("GRAYSON-ASKS-COUNT-001 summary", () => {
  const now = new Date(2026, 10, 24, 18);
  it("totals by area for the last 4 weeks and the 4 before, as words, with no total across areas", async () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => row(dateBack(now, i), "TODAY", `k${i % 3}`)),
      ...Array.from({ length: 16 }, (_, i) => row(dateBack(now, 28 + i), "TODAY", "k0")),
      row(dateBack(now, 2), "FOOD", "catchup.meal"),
      row(dateBack(now, 55), "SLEEP", "sleepPlan.X"),
    ];
    const s = summarizeAsks(rows, now);
    expect(s.state).toBe("READY");
    if (s.state !== "READY") return;
    expect(s.areas).toEqual([
      { area: "TODAY", recent: 10, previous: 16, change: "6 fewer" },
      { area: "FOOD", recent: 1, previous: 0, change: "1 more" },
      { area: "SLEEP", recent: 0, previous: 1, change: "1 fewer" },
    ]);
    expect(describeAskChange(4, 4)).toBe("same");
    await db.askCounts.bulkAdd(rows);
    expect((await getAskSummary(now)).summary).toEqual(s);
  });

  it("Asked most: the three highest, ties broken by key", () => {
    const rows = [row(dateBack(now, 1), "TODAY", "b"), row(dateBack(now, 2), "TODAY", "b"), row(dateBack(now, 1), "TODAY", "c"),
      row(dateBack(now, 1), "TODAY", "a"), row(dateBack(now, 1), "TODAY", "d"), row(dateBack(now, 60), "TODAY", "z")];
    const s = summarizeAsks(rows, now);
    expect(s.state !== "EMPTY" && s.top).toEqual([{ key: "b", count: 2 }, { key: "a", count: 1 }, { key: "c", count: 1 }]);
  });

  it("under 8 weeks of counts it says when counting started; nothing counted is empty", () => {
    const s = summarizeAsks([row(dateBack(now, 20), "TODAY", "a"), row(dateBack(now, 1), "TODAY", "a")], now);
    expect(s).toMatchObject({ state: "LEARNING", startedOn: dateBack(now, 20) });
    expect(summarizeAsks([], now)).toEqual({ state: "EMPTY" });
  });
});
