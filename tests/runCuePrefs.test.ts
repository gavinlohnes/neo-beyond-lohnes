import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RUN_CUE_PREFS, readRunCuePrefs, resetRunCueWords, RUN_CUES_KEY, runCueSwitchDefault, runCueSwitchOn, writeRunCuePrefs,
} from "../src/application/runCuePrefs";
import { db } from "../src/persistence/db";
import { applySettingsBlock, parseSettingsBlock, readTravellingSettings, TRAVELLING_SETTINGS } from "../src/persistence/settingsTransfer";

/** GRAYSON-TRAIN-RUN-CUES-001: his cue words and switches, validated on read, reset on RESET, carried in backups. */
afterEach(async () => { localStorage.clear(); await db.healthImportReceipts.clear(); });

describe("GRAYSON-TRAIN-RUN-CUES-001 run cue preferences", () => {
  it("bad stored JSON falls back to the defaults", () => {
    localStorage.setItem(RUN_CUES_KEY, "{not json");
    expect(readRunCuePrefs()).toEqual(DEFAULT_RUN_CUE_PREFS);
    localStorage.setItem(RUN_CUES_KEY, JSON.stringify([1, 2]));
    expect(readRunCuePrefs()).toEqual(DEFAULT_RUN_CUE_PREFS);
    localStorage.setItem(RUN_CUES_KEY, JSON.stringify({ on: "yes", voice: 1, buzz: false, words: { RUN: "Go", SPRINT: "x", WALK: 7, HALFWAY: "  " }, speak: { FINISH: false, RUN: "no" } }));
    expect(readRunCuePrefs()).toEqual({ voice: true, buzz: false, words: { RUN: "Go" }, speak: { FINISH: false } });
  });

  it("writes and reads back his choices; RESET clears the words and cue switches only", () => {
    writeRunCuePrefs({ on: true, voice: false, buzz: true, words: { RUN: "Go", WALK: "" }, speak: { HALFWAY: false } });
    const saved = readRunCuePrefs();
    expect(saved).toEqual({ on: true, voice: false, buzz: true, words: { RUN: "Go" }, speak: { HALFWAY: false } });
    const reset = resetRunCueWords(saved);
    expect(reset).toEqual({ on: true, voice: false, buzz: true, words: {}, speak: {} });
    expect(readRunCuePrefs()).toEqual(reset);
  });

  it("the switch defaults on only once Health Bridge has sent data, and his choice wins after that", async () => {
    expect(await runCueSwitchDefault()).toBe(false);
    await db.healthImportReceipts.add({ id: "r1", importedAt: "2026-11-20T10:00:00.000Z", exportedAt: "2026-11-20T09:59:00.000Z", producerVersion: "0.11.2", inserted: 1, revised: 0, skipped: 0 });
    expect(await runCueSwitchDefault()).toBe(true);
    expect(runCueSwitchOn(readRunCuePrefs(), true)).toBe(true);
    expect(runCueSwitchOn({ ...readRunCuePrefs(), on: false }, true)).toBe(false);
    expect(runCueSwitchOn({ ...readRunCuePrefs(), on: true }, false)).toBe(true);
  });

  it("travels with his settings and backup as \"Run cue words and voice\"", () => {
    expect(TRAVELLING_SETTINGS[RUN_CUES_KEY]).toBe("Run cue words and voice");
    writeRunCuePrefs({ on: true, voice: true, buzz: false, words: { RUN: "Go {minutes}" }, speak: { HALFWAY: false } });
    const block = parseSettingsBlock(JSON.parse(JSON.stringify(readTravellingSettings())));
    localStorage.clear();
    expect(readRunCuePrefs()).toEqual(DEFAULT_RUN_CUE_PREFS);
    applySettingsBlock(block);
    expect(readRunCuePrefs()).toEqual({ on: true, voice: true, buzz: false, words: { RUN: "Go {minutes}" }, speak: { HALFWAY: false } });
  });
});
