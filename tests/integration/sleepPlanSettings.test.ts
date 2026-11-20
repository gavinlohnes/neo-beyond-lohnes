import { describe, expect, it } from "vitest";
import { parseSleepPlanSettings } from "../../src/persistence/sleepPlanSettingsValidation";
import { getSleepPlanSettings, setCaffeineCutoffHours } from "../../src/application/sleepPlanSettings";
import { deriveShiftSleepPlan, getCaffeineCutoffView } from "../../src/application/shiftSleepPlan";
import { updateSchedulePattern } from "../../src/application/commands";
import { getSchedulePattern } from "../../src/application/queries";
import { getKeyMomentAlerts, setKeyMomentAlerts } from "../../src/application/keyMomentAlerts";
import { isOperatorSavedSchedule } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import type { SchedulePattern, SleepPlanSettings } from "../../src/domain/common/types";
import type { SleepRhythm } from "../../src/engine/sleepRhythm";

/** C4.2a: the caffeine cut-off as his own setting, on the schedule row; owner-only configuration, no proposals or suppression. */
const nights: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
const rhythm: SleepRhythm = { nights: [], groups: [{ kind: "WORK", nights: 5, start: 7 * 60 + 30, end: 14 * 60 + 15, midpoint: 0, spread: 0 }], offMinusWork: null, axisStart: 0 };

describe("C4.2a: the caffeine cut-off he can change", () => {
  it("the plan uses his hours and says whose number it is; the default reads as before", () => {
    const now = new Date(2026, 9, 26, 9);
    const base = deriveShiftSleepPlan({ now, pattern: nights, rhythm, rows: [] })!;
    expect(base.caffeine).toEqual({ hours: 6, setBy: "DEFAULT" });
    expect(base.cards[0]!.basis).toBe("6 h before your usual post-shift sleep at 07:30 (Garmin, 5 work days).");
    const own = deriveShiftSleepPlan({ now, pattern: nights, rhythm, rows: [], caffeineCutoff: { hours: 8, setBy: "OWNER" } })!;
    expect(own.caffeine).toEqual({ hours: 8, setBy: "OWNER" });
    expect(own.cards[0]!.detail).toBe("No substantial caffeine after Mon 23:30.");
    expect(own.cards[0]!.basis).toBe("8 h (your setting) before your usual post-shift sleep at 07:30 (Garmin, 5 work days).");
    expect(own.cards[0]!.plan.title).toBe("No caffeine after 23:30");
    const under = deriveShiftSleepPlan({ now, pattern: nights, rhythm, rows: [], caffeineCutoff: { hours: 4, setBy: "OWNER" } })!;
    expect(under.cards[0]!.basis).toMatch(/^4 h \(your setting, below BEYOND's 6 h default\) before/);
  });

  it("saves only on his tap, undoes exactly, survives a schedule save, keeps the schedule unsaved, and round-trips a native backup", async () => {
    await db.open();
    expect(await getSleepPlanSettings()).toEqual({});
    await expect(setCaffeineCutoffHours(2)).rejects.toThrow();
    await expect(setCaffeineCutoffHours(6.5)).rejects.toThrow();
    await expect(setCaffeineCutoffHours(13)).rejects.toThrow();
    expect(await getSleepPlanSettings()).toEqual({});

    await setKeyMomentAlerts({ off: ["WAKE"], quietFrom: null, quietTo: null });
    const first = await setCaffeineCutoffHours(7, new Date("2026-11-20T04:00:00.000Z"));
    expect(await getSleepPlanSettings()).toEqual({ caffeineCutoff: { hours: 7, setAt: "2026-11-20T04:00:00.000Z", setBy: "OWNER" } });
    expect(isOperatorSavedSchedule(await getSchedulePattern())).toBe(false);
    expect((await getKeyMomentAlerts()).off).toEqual(["WAKE"]);

    // A second owner save, then UNDO: back to the previous owner setting exactly.
    const secondSave = await setCaffeineCutoffHours(8, new Date("2026-11-20T05:00:00.000Z"));
    expect((await getCaffeineCutoffView()).setBy).toBe("OWNER");
    expect(await secondSave.undo()).toBe(true);
    expect((await getSleepPlanSettings()).caffeineCutoff).toEqual({ hours: 7, setAt: "2026-11-20T04:00:00.000Z", setBy: "OWNER" });
    // An UNDO once a later change replaced it does nothing.
    await setCaffeineCutoffHours(9, new Date("2026-11-20T06:00:00.000Z"));
    expect(await first.undo()).toBe(false);
    expect((await getSleepPlanSettings()).caffeineCutoff?.hours).toBe(9);

    await setCaffeineCutoffHours(6, new Date("2026-11-20T08:00:00.000Z"));
    expect(await getCaffeineCutoffView()).toEqual({ hours: 6, setBy: "OWNER", setAt: "2026-11-20T08:00:00.000Z" });

    const pattern = await getSchedulePattern();
    await updateSchedulePattern({ anchorMonday: pattern.anchorMonday, weeks: pattern.weeks, shiftStartHour: 19, shiftEndHour: 7, postWorkTailHours: pattern.postWorkTailHours });
    const settings: SleepPlanSettings = { caffeineCutoff: { hours: 6, setAt: "2026-11-20T08:00:00.000Z", setBy: "OWNER" } };
    expect(await getSleepPlanSettings()).toEqual(settings);

    const file = new File([await db.export({ prettyJson: true })], "native-backup.json", { type: "application/json" });
    await setCaffeineCutoffHours(10);
    await applyAnyRestore(file);
    expect(await getSleepPlanSettings()).toEqual(settings);
    expect((await getSchedulePattern()).shiftStartHour).toBe(19);

    // A malformed restored row reads as the cited default, never as a broken plan.
    await db.schedulePatterns.update("current", { sleepPlanSettings: { caffeineCutoff: { hours: "lots" } } as unknown as SleepPlanSettings });
    expect(await getSleepPlanSettings()).toEqual({});
    expect((await getCaffeineCutoffView()).hours).toBe(6);
  });
});


it("keeps owner provenance only and cannot restore proposal suppression as active settings", async () => {
  const cutoff = { hours: 8, setAt: "2026-11-20T08:00:00.000Z", setBy: "OWNER" };
  expect(parseSleepPlanSettings({ caffeineCutoff: cutoff, declinedAt: "2026-11-20T07:00:00.000Z" })).toEqual({ caffeineCutoff: cutoff });
  expect(parseSleepPlanSettings({ caffeineCutoff: { ...cutoff, setBy: "DELTA" } })).toEqual({});
  expect(await getCaffeineCutoffView()).toEqual({ hours: 6, setBy: "DEFAULT" });
  expect(await getSleepPlanSettings()).toEqual({});
});
