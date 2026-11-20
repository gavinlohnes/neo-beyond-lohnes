import { describe, expect, it } from "vitest";
import { declineCutoffSuggestion, getSleepPlanSettings, setCaffeineCutoffHours } from "../../src/application/sleepPlanSettings";
import { deriveShiftSleepPlan, getCaffeineCutoffView } from "../../src/application/shiftSleepPlan";
import { updateSchedulePattern } from "../../src/application/commands";
import { getSchedulePattern } from "../../src/application/queries";
import { getKeyMomentAlerts, setKeyMomentAlerts } from "../../src/application/keyMomentAlerts";
import { isOperatorSavedSchedule } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import type { SchedulePattern, SleepPlanSettings } from "../../src/domain/common/types";
import type { SleepRhythm } from "../../src/engine/sleepRhythm";

/** C4.2a: the caffeine cut-off as his own setting, on the schedule row; DELTA's suggestion only on his tap. */
const nights: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
const rhythm: SleepRhythm = { nights: [], groups: [{ kind: "WORK", nights: 5, start: 7 * 60 + 30, end: 14 * 60 + 15, midpoint: 0, spread: 0 }], offMinusWork: null, axisStart: 0 };

describe("C4.2a: the caffeine cut-off he can change", () => {
  it("the plan uses his hours and says whose number it is; the default reads as before", () => {
    const now = new Date(2026, 9, 26, 9);
    const base = deriveShiftSleepPlan({ now, pattern: nights, rhythm, rows: [] })!;
    expect(base.caffeine).toEqual({ hours: 6, setBy: "DEFAULT" });
    expect(base.cards[0]!.basis).toBe("6 h before your usual post-shift sleep at 07:30 (Garmin, 5 work days).");
    const own = deriveShiftSleepPlan({ now, pattern: nights, rhythm, rows: [], caffeineCutoff: { hours: 8, setBy: "DELTA" } })!;
    expect(own.caffeine).toEqual({ hours: 8, setBy: "DELTA" });
    expect(own.cards[0]!.detail).toBe("No substantial caffeine after Mon 23:30.");
    expect(own.cards[0]!.basis).toBe("8 h (DELTA's suggestion you approved) before your usual post-shift sleep at 07:30 (Garmin, 5 work days).");
    expect(own.cards[0]!.plan.title).toBe("No caffeine after 23:30");
    const under = deriveShiftSleepPlan({ now, pattern: nights, rhythm, rows: [], caffeineCutoff: { hours: 4, setBy: "OWNER" } })!;
    expect(under.cards[0]!.basis).toMatch(/^4 h \(your setting, under the study's 6 h minimum\) before/);
  });

  it("saves only on his tap, undoes exactly, survives a schedule save, keeps the schedule unsaved, and round-trips a native backup", async () => {
    await db.open();
    expect(await getSleepPlanSettings()).toEqual({});
    await expect(setCaffeineCutoffHours(2, "OWNER")).rejects.toThrow();
    await expect(setCaffeineCutoffHours(6.5, "OWNER")).rejects.toThrow();
    await expect(setCaffeineCutoffHours(13, "OWNER")).rejects.toThrow();
    expect(await getSleepPlanSettings()).toEqual({});

    await setKeyMomentAlerts({ off: ["WAKE"], quietFrom: null, quietTo: null });
    const first = await setCaffeineCutoffHours(7, "OWNER", new Date("2026-11-20T04:00:00.000Z"));
    expect(await getSleepPlanSettings()).toEqual({ caffeineCutoff: { hours: 7, setAt: "2026-11-20T04:00:00.000Z", setBy: "OWNER" } });
    expect(isOperatorSavedSchedule(await getSchedulePattern())).toBe(false);
    expect((await getKeyMomentAlerts()).off).toEqual(["WAKE"]);

    // APPROVE on DELTA's suggestion, then UNDO: back to his own 7 h exactly.
    const approved = await setCaffeineCutoffHours(8, "DELTA", new Date("2026-11-20T05:00:00.000Z"));
    expect((await getCaffeineCutoffView()).setBy).toBe("DELTA");
    expect(await approved.undo()).toBe(true);
    expect((await getSleepPlanSettings()).caffeineCutoff).toEqual({ hours: 7, setAt: "2026-11-20T04:00:00.000Z", setBy: "OWNER" });
    // An UNDO once a later change replaced it does nothing.
    await setCaffeineCutoffHours(9, "OWNER", new Date("2026-11-20T06:00:00.000Z"));
    expect(await first.undo()).toBe(false);
    expect((await getSleepPlanSettings()).caffeineCutoff?.hours).toBe(9);

    // NOT NOW keeps the number and quiets DELTA; his own later edit doesn't reset the quiet spell.
    await declineCutoffSuggestion(new Date("2026-11-20T07:00:00.000Z"));
    expect(await getSleepPlanSettings()).toEqual({ caffeineCutoff: { hours: 9, setAt: "2026-11-20T06:00:00.000Z", setBy: "OWNER" }, declinedAt: "2026-11-20T07:00:00.000Z" });
    expect((await getCaffeineCutoffView(new Date("2026-11-21T07:00:00.000Z"))).suggestion.kind).toBe("QUIET");
    await setCaffeineCutoffHours(6, "OWNER", new Date("2026-11-20T08:00:00.000Z"));
    expect((await getCaffeineCutoffView(new Date("2026-11-21T07:00:00.000Z"))).suggestion).toEqual({ kind: "QUIET", until: "2026-12-04T07:00:00.000Z" });

    const pattern = await getSchedulePattern();
    await updateSchedulePattern({ anchorMonday: pattern.anchorMonday, weeks: pattern.weeks, shiftStartHour: 19, shiftEndHour: 7, postWorkTailHours: pattern.postWorkTailHours });
    const settings: SleepPlanSettings = { caffeineCutoff: { hours: 6, setAt: "2026-11-20T08:00:00.000Z", setBy: "OWNER" }, declinedAt: "2026-11-20T07:00:00.000Z" };
    expect(await getSleepPlanSettings()).toEqual(settings);

    const file = new File([await db.export({ prettyJson: true })], "native-backup.json", { type: "application/json" });
    await setCaffeineCutoffHours(10, "OWNER");
    await applyAnyRestore(file);
    expect(await getSleepPlanSettings()).toEqual(settings);
    expect((await getSchedulePattern()).shiftStartHour).toBe(19);

    // A malformed restored row reads as the cited default, never as a broken plan.
    await db.schedulePatterns.update("current", { sleepPlanSettings: { caffeineCutoff: { hours: "lots" } } as unknown as SleepPlanSettings });
    expect(await getSleepPlanSettings()).toEqual({});
    expect((await getCaffeineCutoffView()).hours).toBe(6);
  });
});
