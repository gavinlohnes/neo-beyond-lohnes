import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_QUIET_SETTINGS, QUIET_LINE_DEFAULT_ORDER } from "../src/ui/screens/today/attentionPolicy";
import {
  TODAY_QUIET_KEY, effectiveQuietOff, markQuietMoreOpened, normalizeQuietOrder, quietLineOn, quietMoreOpened,
  readTodayQuietSettings, setQuietLineOn, writeTodayQuietSettings,
} from "../src/ui/screens/today/todayQuietStore";
import { LOG_NUDGE_KEY, readLogNudgeSettings } from "../src/ui/screens/today/logNudgeStore";

/** GRAYSON-TODAY-CALM-001: TODAY's quiet-line settings and the day's "N MORE" opened state. Runs under any TZ. */
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("todayQuietStore", () => {
  it("defaults: two at once, the brief's order, nothing off, one after-shift card at a time", () => {
    expect(readTodayQuietSettings()).toEqual(DEFAULT_QUIET_SETTINGS);
    expect(DEFAULT_QUIET_SETTINGS).toEqual({ max: 2, order: QUIET_LINE_DEFAULT_ORDER, off: [], oneAfterShift: true });
  });
  it("round-trips his settings", () => {
    const mine = { max: 3 as const, order: [...QUIET_LINE_DEFAULT_ORDER].reverse(), off: ["ROUTINE" as const], oneAfterShift: false };
    writeTodayQuietSettings(mine);
    expect(readTodayQuietSettings()).toEqual(mine);
  });
  it("validates: a bad max falls back, unknown ids drop, duplicates go, missing ids join at their default place", () => {
    localStorage.setItem(TODAY_QUIET_KEY, JSON.stringify({ max: 7, order: ["REVIEW", "NOPE", "REVIEW", "DRIVE_HOME"], off: ["NOPE", "EXPERIMENT"], oneAfterShift: "yes" }));
    const s = readTodayQuietSettings();
    expect(s.max).toBe(2);
    expect(s.off).toEqual(["EXPERIMENT"]);
    expect(s.oneAfterShift).toBe(true);
    expect(s.order).toHaveLength(QUIET_LINE_DEFAULT_ORDER.length);
    expect(new Set(s.order).size).toBe(QUIET_LINE_DEFAULT_ORDER.length);
    // His two stay in his order; each missing line joins right after the line that comes before it by default
    // (HABIT_LADDER then WORK_DUE after REVIEW; DRIVE_HOME's followers after DRIVE_HOME).
    expect(s.order).toEqual(["REVIEW", "HABIT_LADDER", "WORK_DUE", "DRIVE_HOME", "FIRST_AT_HOME", "LOG_NUDGE", "PHONE_ALERTS_BEHIND", "ROUTINE", "EXPERIMENT"]);
    expect(normalizeQuietOrder([])).toEqual([...QUIET_LINE_DEFAULT_ORDER]);
  });
  it("damaged JSON reads as the defaults", () => {
    localStorage.setItem(TODAY_QUIET_KEY, "{not json");
    expect(readTodayQuietSettings()).toEqual(DEFAULT_QUIET_SETTINGS);
  });
  it("LOG_NUDGE has one switch: the logging nudge's own", () => {
    let s = readTodayQuietSettings();
    expect(quietLineOn(s, "LOG_NUDGE")).toBe(true);
    s = setQuietLineOn(s, "LOG_NUDGE", false);
    expect(readLogNudgeSettings().enabled).toBe(false);
    expect(JSON.parse(localStorage.getItem(LOG_NUDGE_KEY)!).enabled).toBe(false);
    expect(s.off).not.toContain("LOG_NUDGE");
    expect(effectiveQuietOff(s)).toContain("LOG_NUDGE");
    s = setQuietLineOn(s, "LOG_NUDGE", true);
    expect(quietLineOn(s, "LOG_NUDGE")).toBe(true);
    s = setQuietLineOn(s, "ROUTINE", false);
    expect(readTodayQuietSettings().off).toEqual(["ROUTINE"]);
  });
  it("the opened state lasts for the lived day and resets at the next 16:30", () => {
    const at = (h: number, m: number, d = 24) => new Date(2026, 10, d, h, m);
    markQuietMoreOpened(at(17, 0));
    expect(quietMoreOpened(at(23, 59))).toBe(true);
    expect(quietMoreOpened(at(9, 0, 25))).toBe(true);
    expect(quietMoreOpened(at(16, 29, 25))).toBe(true);
    expect(quietMoreOpened(at(16, 30, 25))).toBe(false);
    // Opened in the morning belongs to the lived day that started yesterday at 16:30.
    localStorage.clear();
    markQuietMoreOpened(at(8, 0));
    expect(quietMoreOpened(at(16, 29))).toBe(true);
    expect(quietMoreOpened(at(16, 30))).toBe(false);
  });
});
