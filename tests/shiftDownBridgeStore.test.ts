import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BRIDGE_KEY, DEFAULT_BRIDGE, HOME_FIRST_KEY, SOMETHING_ELSE, homeChips, homeFirstFor, livedDayEnd, readBridgeSettings, setHomeFirst, writeBridgeSettings,
} from "../src/ui/screens/today/shiftDownBridgeStore";
import { TRAVELLING_SETTINGS } from "../src/persistence/settingsTransfer";

/** GRAYSON-SHIFTDOWN-TAPS-001. Runs under TZ=UTC and TZ=America/Chicago. Lived days start at 16:30. */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("settings", () => {
  it("defaults, and bad JSON or values fall back", () => {
    expect(readBridgeSettings()).toEqual(DEFAULT_BRIDGE);
    localStorage.setItem(BRIDGE_KEY, "{nope");
    expect(readBridgeSettings()).toEqual(DEFAULT_BRIDGE);
    localStorage.setItem(BRIDGE_KEY, JSON.stringify({ show: "yes", minutes: 4, park: false }));
    expect(readBridgeSettings()).toMatchObject({ show: true, minutes: 1, park: false });
  });
  it("length is only 1, 2, 3 or 5 minutes", () => {
    for (const m of [1, 2, 3, 5]) { writeBridgeSettings({ ...DEFAULT_BRIDGE, minutes: m as 1 }); expect(readBridgeSettings().minutes).toBe(m); }
    localStorage.setItem(BRIDGE_KEY, JSON.stringify({ minutes: 10 }));
    expect(readBridgeSettings().minutes).toBe(1);
  });
  it("chips: at most 6 with Something else last, 20 characters each, no duplicates", () => {
    writeBridgeSettings({ ...DEFAULT_BRIDGE, chips: ["A", "a", "B", "Something else", "x".repeat(21), "C", "D", "E", "F", "G"] });
    const chips = homeChips(readBridgeSettings());
    expect(chips).toEqual(["A", "B", "C", "D", "E", SOMETHING_ELSE]);
    expect(chips).toHaveLength(6);
  });
  it("the settings travel with the backup; tonight's pick doesn't", () => {
    expect(Object.hasOwn(TRAVELLING_SETTINGS, BRIDGE_KEY)).toBe(true);
    expect(Object.hasOwn(TRAVELLING_SETTINGS, HOME_FIRST_KEY)).toBe(false);
  });
});

describe("tonight's pick", () => {
  it("is read only for its own lived day, and only until that day ends at 16:30", () => {
    const started = at(16, 17).toISOString(); // Monday's lived day, 16:30 → Tuesday 16:30
    expect(livedDayEnd(started).getTime()).toBe(at(17, 16, 30).getTime());
    setHomeFirst("day-mon", "Elle");
    expect(homeFirstFor("day-mon", started, at(17, 6, 10))).toBe("Elle"); // SHIFT DOWN at 06:10
    expect(homeFirstFor("day-mon", started, at(17, 16, 29))).toBe("Elle");
    expect(homeFirstFor("day-mon", started, at(17, 16, 31))).toBeNull();
    expect(homeFirstFor("day-tue", at(17, 17).toISOString(), at(17, 18))).toBeNull(); // yesterday's pick reads as none
  });
  it("a day started after midnight still ends at the 16:30 after its own boundary", () => {
    expect(livedDayEnd(at(17, 1).toISOString()).getTime()).toBe(at(17, 16, 30).getTime());
  });
  it("clearing removes it; a bad stored value reads as none", () => {
    setHomeFirst("d", "Food"); setHomeFirst("d", null);
    expect(localStorage.getItem(HOME_FIRST_KEY)).toBeNull();
    localStorage.setItem(HOME_FIRST_KEY, "{bad");
    expect(homeFirstFor("d", at(16, 17).toISOString(), at(16, 20))).toBeNull();
  });
});
