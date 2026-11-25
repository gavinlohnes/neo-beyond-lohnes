import "dexie-export-import";
import { describe, expect, it } from "vitest";
import { getFlipSettingsView, getSleepPlanSettings, saveFlipSettings, setCaffeineCutoffHours } from "../../src/application/sleepPlanSettings";
import { parseSleepPlanSettings } from "../../src/persistence/sleepPlanSettingsValidation";
import { DEFAULT_FLIP } from "../../src/application/flipPlan";
import { db } from "../../src/persistence/db";

/** GRAYSON-FLIP-PLAN-001: the flip settings beside the caffeine cut-off, on the schedule row. */
describe("flip settings", () => {
  it("saving flip without a cut-off keeps it (the writeSettings fix), and says which values are his", async () => {
    const view0 = await getFlipSettingsView();
    expect(view0).toMatchObject({ settings: DEFAULT_FLIP, setBy: {} });
    await saveFlipSettings({ getUpBy: 12 * 60 + 30 }, new Date("2026-11-20T10:00:00Z"));
    expect((await getSleepPlanSettings()).flip).toMatchObject({ getUpBy: 750 });
    const view = await getFlipSettingsView();
    expect(view.settings).toEqual({ ...DEFAULT_FLIP, getUpBy: 750 });
    expect(view.setBy).toEqual({ getUpBy: "OWNER" });
  });
  it("saving a cut-off keeps flip; saving flip keeps the cut-off; UNDO restores each exactly", async () => {
    const f = await saveFlipSettings({ laterHours: 1 }, new Date("2026-11-20T10:00:00Z"));
    const c = await setCaffeineCutoffHours(8, new Date("2026-11-20T11:00:00Z"));
    expect(await getSleepPlanSettings()).toMatchObject({ caffeineCutoff: { hours: 8 }, flip: { laterHours: 1 } });
    const f2 = await saveFlipSettings({ show: false }, new Date("2026-11-20T12:00:00Z"));
    expect(await getSleepPlanSettings()).toMatchObject({ caffeineCutoff: { hours: 8 }, flip: { laterHours: 1, show: false } });
    expect(await f.undo()).toBe(false); // a later flip save replaced it
    expect(await f2.undo()).toBe(true);
    expect((await getSleepPlanSettings()).flip).toEqual({ laterHours: 1, setAt: "2026-11-20T10:00:00.000Z" });
    expect(await c.undo()).toBe(true);
    expect(await getSleepPlanSettings()).toEqual({ flip: { laterHours: 1, setAt: "2026-11-20T10:00:00.000Z" } });
  });
  it("#723 review: UNDO of a cut-off save keeps a flip save made after it", async () => {
    const c = await setCaffeineCutoffHours(8, new Date("2026-11-20T10:00:00Z"));
    await saveFlipSettings({ getUpBy: 12 * 60 }, new Date("2026-11-20T11:00:00Z"));
    expect(await c.undo()).toBe(true);
    expect(await getSleepPlanSettings()).toEqual({ flip: { getUpBy: 720, setAt: "2026-11-20T11:00:00.000Z" } });
  });
  it("a bad value is refused with nothing saved; a bad stored value falls back to its default, never the others", async () => {
    await expect(saveFlipSettings({ getUpBy: 10 * 60 })).rejects.toThrow("isn't allowed");
    await expect(saveFlipSettings({ getUpBy: 13 * 60 + 5 })).rejects.toThrow("isn't allowed");
    expect((await getSleepPlanSettings()).flip).toBeUndefined();
    const parsed = parseSleepPlanSettings({ caffeineCutoff: { hours: 99 }, flip: { getUpBy: 3, laterHours: 2, shortBreak: "NOPE", setAt: "2026-11-20T10:00:00Z" } });
    expect(parsed).toEqual({ flip: { laterHours: 2, setAt: "2026-11-20T10:00:00Z" } });
  });
  it("a native backup round-trip keeps both", async () => {
    await saveFlipSettings({ daylightStart: 15 * 60 }, new Date("2026-11-20T10:00:00Z"));
    await setCaffeineCutoffHours(7, new Date("2026-11-20T11:00:00Z"));
    const before = await getSleepPlanSettings();
    const blob = await db.export();
    await db.schedulePatterns.clear();
    await db.import(new File([blob], "b.json", { type: "application/json" }), { clearTablesBeforeImport: true });
    expect(await getSleepPlanSettings()).toEqual(before);
  });
});
