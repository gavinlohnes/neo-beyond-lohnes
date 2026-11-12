import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { logWater, startDay } from "../../src/application/commands";

/** PERF-001: concurrent getDaySummaries calls share one read, but a committed write is never hidden from a later call. */
describe("getDaySummaries sharing", () => {
  it("shares a read between concurrent callers", async () => {
    await startDay();
    const a = getDaySummaries(), b = getDaySummaries();
    expect(a).toBe(b);
    expect(await a).toEqual(await b);
  });

  it("a caller after a committed write sees it, even while an earlier read is still running", async () => {
    const day = await startDay();
    const before = getDaySummaries();
    await logWater(day.id, 20);
    const after = getDaySummaries();
    expect(after).not.toBe(before);
    expect((await after).find((d) => d.beyondDayId === day.id)?.waterOz).toBe(20);
  });

  it("app writes fire storagemutated, so the shared read is dropped before the writer continues", async () => {
    const day = await startDay();
    let fired = 0;
    const listen = () => { fired++; };
    Dexie.on("storagemutated", listen);
    try { await logWater(day.id, 10); } finally { Dexie.on("storagemutated").unsubscribe(listen); }
    expect(fired).toBeGreaterThan(0);
  });

  it("a committed write (Dexie's storagemutated) drops a read that is still running", async () => {
    await startDay();
    const running = getDaySummaries();
    Dexie.on("storagemutated").fire({});
    const next = getDaySummaries();
    expect(next).not.toBe(running);
    await Promise.all([running, next]);
  });
});
