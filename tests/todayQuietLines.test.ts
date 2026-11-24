import { describe, expect, it } from "vitest";
import { DEFAULT_QUIET_SETTINGS, QUIET_LINE_DEFAULT_ORDER, deriveQuietLines, type QuietLineId } from "../src/ui/screens/today/attentionPolicy";

/** GRAYSON-TODAY-CALM-001: the quiet-line budget, alone. */
const all: QuietLineId[] = ["REVIEW", "LOG_NUDGE", "ROUTINE", "DRIVE_HOME", "EXPERIMENT"];

describe("deriveQuietLines", () => {
  it("shows the first two in the default order and tucks the rest", () => {
    expect(deriveQuietLines(all, DEFAULT_QUIET_SETTINGS)).toEqual({ shown: ["DRIVE_HOME", "LOG_NUDGE"], tucked: ["ROUTINE", "EXPERIMENT", "REVIEW"] });
  });
  it("follows his order", () => {
    const order: QuietLineId[] = ["REVIEW", "ROUTINE", ...QUIET_LINE_DEFAULT_ORDER.filter((id) => id !== "REVIEW" && id !== "ROUTINE")];
    expect(deriveQuietLines(all, { ...DEFAULT_QUIET_SETTINGS, order })).toEqual({ shown: ["REVIEW", "ROUTINE"], tucked: ["DRIVE_HOME", "LOG_NUDGE", "EXPERIMENT"] });
  });
  it("never shows a line he turned off, shown or tucked", () => {
    const r = deriveQuietLines(all, { ...DEFAULT_QUIET_SETTINGS, off: ["DRIVE_HOME", "REVIEW"] });
    expect(r).toEqual({ shown: ["LOG_NUDGE", "ROUTINE"], tucked: ["EXPERIMENT"] });
  });
  it.each([[1, 1, 4], [2, 2, 3], [3, 3, 2]] as const)("max %i shows %i and tucks %i", (max, shown, tucked) => {
    const r = deriveQuietLines(all, { ...DEFAULT_QUIET_SETTINGS, max });
    expect(r.shown).toHaveLength(shown);
    expect(r.tucked).toHaveLength(tucked);
    expect([...r.shown, ...r.tucked]).toEqual(["DRIVE_HOME", "LOG_NUDGE", "ROUTINE", "EXPERIMENT", "REVIEW"]);
  });
  it("a saved order missing a line still places it (at its default place after the ones he ordered)", () => {
    const r = deriveQuietLines(["EXPERIMENT", "ROUTINE"], { ...DEFAULT_QUIET_SETTINGS, order: ["EXPERIMENT"] });
    expect(r.shown).toEqual(["EXPERIMENT", "ROUTINE"]);
  });
  it("empty input shows nothing and tucks nothing", () => {
    expect(deriveQuietLines([], DEFAULT_QUIET_SETTINGS)).toEqual({ shown: [], tucked: [] });
  });
  it("no lines while an operation owns the screen, except DRIVE HOME's own rule", () => {
    expect(deriveQuietLines(all, DEFAULT_QUIET_SETTINGS, true)).toEqual({ shown: ["DRIVE_HOME"], tucked: [] });
    expect(deriveQuietLines(["LOG_NUDGE", "ROUTINE"], DEFAULT_QUIET_SETTINGS, true)).toEqual({ shown: [], tucked: [] });
  });
  it("duplicates in the candidates count once", () => {
    expect(deriveQuietLines(["ROUTINE", "ROUTINE"], DEFAULT_QUIET_SETTINGS)).toEqual({ shown: ["ROUTINE"], tucked: [] });
  });
});
