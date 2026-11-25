import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addHomeItem, getHomeView, HOME_HISTORY_MAX, HOME_PREFIX, homeHistory } from "../src/application/homeCommands";
import { createObligation, releaseObligation, satisfyObligation } from "../src/application/intentCommands";
import type { Obligation } from "../src/domain/intent/types";
import { db } from "../src/persistence/db";

/** GRAYSON-HOME-LASTDONE-001. Runs under TZ=UTC and TZ=America/Chicago. */
const ob = (over: Partial<Obligation>): Obligation => ({ id: Math.random().toString(36).slice(2), title: `${HOME_PREFIX}Furnace filter`, status: "SATISFIED", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...over } as Obligation);

describe("homeHistory (pure)", () => {
  it("newest first, notes through, RELEASED and other titles ignored, capped at 10", () => {
    const all = [
      ob({ resolvedAt: "2026-08-02T15:00:00.000Z", resolutionNote: "16x25x1, Home Depot" }),
      ob({ resolvedAt: "2026-10-02T15:00:00.000Z" }),
      ob({ status: "RELEASED", resolvedAt: "2026-11-01T15:00:00.000Z" }),
      ob({ title: "Furnace filter", resolvedAt: "2026-11-02T15:00:00.000Z" }), // not a Home job
      ob({ title: `${HOME_PREFIX}Furnace filters`, resolvedAt: "2026-11-03T15:00:00.000Z" }),
    ];
    expect(homeHistory(all, `${HOME_PREFIX}Furnace filter`)).toEqual([{ on: "2026-10-02" }, { on: "2026-08-02", note: "16x25x1, Home Depot" }]);
    expect(homeHistory(all, `${HOME_PREFIX}Gutters`)).toEqual([]);
    const many = Array.from({ length: 13 }, (_, i) => ob({ resolvedAt: new Date(2026, 0, i + 1, 12).toISOString() }));
    const h = homeHistory(many, `${HOME_PREFIX}Furnace filter`);
    expect(h).toHaveLength(HOME_HISTORY_MAX);
    expect(h[0]!.on > h[9]!.on).toBe(true);
  });
});

describe("getHomeView", () => {
  beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); await db.open(); await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); }); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("a job done at 23:30 local on Nov 30 reads Nov 30, with its note; the next date comes from the due date", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 9));
    const { reminder } = await addHomeItem({ item: "Furnace filter", details: "Check the size", repeat: { every: 3, unit: "MONTHS", firstDue: "2026-11-30" } });
    vi.setSystemTime(new Date(2026, 10, 30, 23, 30));
    await satisfyObligation(reminder!.id, "16x25x1, Home Depot");
    const view = await getHomeView(new Date(2026, 10, 30, 23, 31));
    expect(view.due).toHaveLength(1);
    // The next date is the existing repeat's (from the due date): a 30th-of-the-month rule skips February (no Feb 30).
    expect(view.due[0]).toMatchObject({ reminder: { dueAt: "2027-05-30" }, lastDone: { on: "2026-11-30", note: "16x25x1, Home Depot" }, doneCount: 1 });
  });
  it("never done: no lastDone, empty history; a RELEASED one doesn't count; one obligations read per view", async () => {
    vi.setSystemTime(new Date(2026, 10, 1, 9));
    await addHomeItem({ item: "Gutters", details: "", repeat: { every: 6, unit: "MONTHS", firstDue: "2026-12-01" } });
    const old = await createObligation({ title: `${HOME_PREFIX}Gutters`, dueAt: "2026-06-01" });
    await releaseObligation(old.id);
    const reads = vi.spyOn(db.obligations, "toArray");
    const view = await getHomeView(new Date(2026, 10, 2, 9));
    expect(view.due[0]).toMatchObject({ history: [], doneCount: 0 });
    expect(view.due[0]!.lastDone).toBeUndefined();
    expect(reads.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
