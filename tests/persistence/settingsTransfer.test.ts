import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { exportNativeBackup } from "../../src/persistence/backup";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { applySettingsBlock, parseSettingsBlock, TRAVELLING_SETTINGS } from "../../src/persistence/settingsTransfer";
import { logBodyweight, startDay } from "../../src/application/commands";

/**
 * GRAYSON C8.1 (Q6): the non-secret preferences on the allowlist travel with every native backup and come back on
 * restore; keys, sign-ins, screen privacy and device bookkeeping never leave the phone.
 */
const PREFS: Record<string, string> = {
  "beyond.alfredCap": "15",
  "beyond.alfredAuto": "on",
  "beyond.alfredSpeak": "1",
  "beyond.delta.voice.v1": "DROID",
  "beyond:checkInReminderPreference": JSON.stringify({ enabled: true, reminderHour: 20 }),
  "beyond:autoBackupPreference": "on",
  "beyond:restSecondsByExercise": JSON.stringify({ "ex-1": 120 }),
  "beyond.hiddenFeatures": JSON.stringify({ foodLookup: true }),
  "beyond.vision": "NIGHT",
  "beyond.more.favorites.v1": JSON.stringify(["LIFE"]),
  "beyond.close.prompts.v1": JSON.stringify(["WIN"]),
};
const STAYS: Record<string, string> = {
  "beyond.alfredKey": "sk-ant-secret",
  "beyond.ifttt.config": JSON.stringify({ key: "ifttt-secret" }),
  "beyond.googleCalendar": JSON.stringify({ token: "gcal-secret" }),
  "beyond:driveBackupState": JSON.stringify({ on: true, folderId: "f1" }),
  "beyond:stealth": "1",
  "beyond:lastBackupAt": "2026-11-01T00:00:00.000Z",
};
const setAll = (entries: Record<string, string>) => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); };
const asFile = (text: string) => new File([text], "backup.json", { type: "application/json" });

beforeEach(async () => { localStorage.clear(); await db.open(); });
afterEach(() => { localStorage.clear(); db.close(); });

describe("C8.1 settings travel with the backup", () => {
  it("every allowlisted preference round-trips; nothing secret or device-only is exported or overwritten", async () => {
    const day = await startDay(); await logBodyweight(day.id, 201);
    setAll(PREFS); setAll(STAYS);
    const text = await (await exportNativeBackup(true)).text();
    const json = JSON.parse(text) as { formatName: string; beyondSettings: { version: number; values: Record<string, string> } };
    expect(json.formatName).toBe("dexie");
    expect(json.beyondSettings).toEqual({ version: 1, values: PREFS });
    for (const secret of ["sk-ant-secret", "ifttt-secret", "gcal-secret", "folderId", "beyond:stealth", "lastBackupAt"]) expect(text).not.toContain(secret);

    // A new phone: other preferences and its own secrets.
    localStorage.clear();
    setAll({ "beyond.vision": "THERMAL", "beyond.alfredCap": "99", "beyond.alfredKey": "sk-new-phone", "beyond:stealth": "0" });
    const preview = await previewAnyRestore(asFile(text));
    expect(preview.format === "NATIVE" && preview.settingsCount).toBe(Object.keys(PREFS).length);
    await db.events.clear();
    await applyAnyRestore(asFile(text));
    for (const [k, v] of Object.entries(PREFS)) expect(localStorage.getItem(k), k).toBe(v);
    expect(localStorage.getItem("beyond.alfredKey")).toBe("sk-new-phone");
    expect(localStorage.getItem("beyond:stealth")).toBe("0");
    expect(localStorage.getItem("beyond.ifttt.config")).toBeNull();
    expect(await db.events.count()).toBeGreaterThan(0); // the data restored as before
  });

  it("is replace-only for the allowlist: a preference the backup lacks returns to its default", async () => {
    setAll({ "beyond.vision": "NIGHT" });
    const text = await (await exportNativeBackup(false)).text();
    setAll({ "beyond.vision": "THERMAL", "beyond.alfredCap": "40" });
    await applyAnyRestore(asFile(text));
    expect(localStorage.getItem("beyond.vision")).toBe("NIGHT");
    expect(localStorage.getItem("beyond.alfredCap")).toBeNull();
  });

  it("a backup from before C8.1 restores its data and leaves this phone's preferences alone", async () => {
    await startDay();
    const old = await (await db.export({ prettyJson: true })).text();
    setAll(PREFS);
    const preview = await previewAnyRestore(asFile(old));
    expect(preview.format === "NATIVE" && preview.settingsCount).toBeNull();
    await db.events.clear();
    await applyAnyRestore(asFile(old));
    for (const [k, v] of Object.entries(PREFS)) expect(localStorage.getItem(k), k).toBe(v);
    expect(await db.events.count()).toBeGreaterThan(0);
  });

  it("ignores anything outside the allowlist, non-strings, oversized values and unknown block versions", () => {
    expect(parseSettingsBlock({ version: 2, values: { "beyond.vision": "NIGHT" } })).toBeNull();
    expect(parseSettingsBlock({ version: 1, values: ["x"] })).toBeNull();
    expect(parseSettingsBlock(null)).toBeNull();
    // Parsed from JSON, as a real backup file is: "__proto__" arrives as an own key, not a prototype.
    const hostile = JSON.parse('{"version":1,"values":{"beyond.alfredKey":"sk-x","beyond.vision":3,"beyond.delta.voice.v1":"DELTA","__proto__":{"beyond.vision":"NIGHT"},"constructor":"x"}}') as unknown;
    const block = parseSettingsBlock(hostile);
    expect(block).toEqual({ version: 1, values: { "beyond.delta.voice.v1": "DELTA" } });
    expect(Object.getPrototypeOf(block!.values)).toBe(Object.prototype);
    localStorage.setItem("beyond.alfredKey", "keep");
    applySettingsBlock(block);
    expect(localStorage.getItem("beyond.alfredKey")).toBe("keep");
    expect(localStorage.getItem("beyond.delta.voice.v1")).toBe("DELTA");
  });

  it("an oversized value is skipped on both sides: the target keeps its own instead of resetting", async () => {
    localStorage.setItem("beyond:restSecondsByExercise", "x".repeat(20_000)); localStorage.setItem("beyond.vision", "NIGHT");
    const text = await (await exportNativeBackup(false)).text();
    expect(JSON.parse(text).beyondSettings).toEqual({ version: 1, values: { "beyond.vision": "NIGHT" }, oversized: ["beyond:restSecondsByExercise"] });
    localStorage.clear(); localStorage.setItem("beyond:restSecondsByExercise", "{\"ex-1\":90}");
    await applyAnyRestore(asFile(text));
    expect(localStorage.getItem("beyond:restSecondsByExercise")).toBe("{\"ex-1\":90}");
    expect(localStorage.getItem("beyond.vision")).toBe("NIGHT");
    // A hand-made backup with an oversized value: skipped the same way.
    localStorage.setItem("beyond.alfredCap", "20");
    applySettingsBlock(parseSettingsBlock({ version: 1, values: { "beyond.alfredCap": "9".repeat(20_000) } }));
    expect(localStorage.getItem("beyond.alfredCap")).toBe("20");
  });

  it("every allowlisted key is a key the app really reads (no drift)", () => {
    const files: string[] = [];
    const walk = (dir: string) => { for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(p) && !p.endsWith("settingsTransfer.ts")) files.push(p); } };
    walk("src");
    const source = files.map((f) => readFileSync(f, "utf8")).join("\n");
    for (const key of Object.keys(TRAVELLING_SETTINGS)) expect(source.includes(`"${key}"`), key).toBe(true);
  });

  /**
   * #633 review: a new preference must not silently stay behind. Every beyond-prefixed string in src is either on the
   * allowlist, deliberately kept on the phone, or not a storage key at all (a window event name). Adding a key
   * without classifying it here fails this test.
   */
  it("every storage key in the app is classified: travels, or stays on the phone for a stated reason", () => {
    const STAYS_ON_PHONE: Record<string, string> = {
      "beyond.alfredKey": "secret", "beyond.ifttt.config": "secret (webhook key)", "beyond.googleCalendar": "sign-in",
      "beyond.googleCalendar.events": "cache", "beyond.googleCalendar.family": "cache", "beyond:driveBackupState": "Drive link",
      "beyond.garminBridgeTrusted": "device trust", "beyond:stealth": "screen privacy (SUIT-001)",
      "beyond.alfredSpend": "counter", "beyond.ifttt.sends": "counter", "beyond.alfredBrief": "cache",
      "beyond.alfredReviewSeen": "seen", "beyond.bootShownFor": "seen", "beyond.reportSeen": "seen", "beyond:deltaSeen": "seen",
      "beyond.orientation.v1": "seen", "beyond.shiftChange": "seen", "beyond.today.lastLook.v1": "seen",
      "beyond.more.recents.v1": "history", "beyond.catchup.done.v1": "done flag", "beyond.close.done.v1": "done flag",
      "beyond.coach.skips.v1": "dismissal", "beyond.eating.dismissed.v1": "dismissal", "beyond.logNudge.dismissed.v1": "dismissal", "beyond.workRunRedraft.dismissed.v1": "dismissal",
      "beyond.weeklyReviewLater": "snooze", "beyond.workoutCallLater.": "snooze", "beyond.shiftSleepPlan.skip.": "dismissal",
      "beyond:sleepDraftDismissedDay": "dismissal", "beyond:outcomeDismissed:": "dismissal", "beyond:shiftHandoffSkipped:": "dismissal",
      "beyond:modePin:": "temporary pin", "beyond:autoBackupSnoozedUntil": "snooze", "beyond:lastBackupAt": "clock",
      "beyond:lastRestoreCheckAt": "clock", "beyond:checkInReminderLastSentDate": "clock", "beyond.garminSyncRequestedAt": "clock",
      "beyond.daily-note.draft.": "draft", "beyond:gym-draft:": "draft", "beyond:decrypt:": "animation state",
      // GRAYSON-TRAIN-BODYMAP-001: the map's equipment chips, a view setting on this phone (the brief: doesn't travel).
      "beyond.bodyMap.v1": "view setting",
    };
    const EVENTS = new Set(["beyond:ask-alfred", "beyond:do", "beyond:drive-home", "beyond:find-food", "beyond:hidden-features",
      "beyond:memory-changed", "beyond:open-record", "beyond:routines-changed", "beyond:snippets-changed", "beyond:weekly-review-saved"]);
    const files: string[] = [];
    const walk = (dir: string) => { for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(p)) files.push(p); } };
    walk("src");
    const found = new Set<string>();
    for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/["'`](beyond[.:][A-Za-z0-9._:-]*)/g)) found.add(m[1]!);
    const unclassified = [...found].filter((k) => !Object.hasOwn(TRAVELLING_SETTINGS, k) && !Object.hasOwn(STAYS_ON_PHONE, k) && !EVENTS.has(k));
    expect(unclassified).toEqual([]);
    for (const k of Object.keys(TRAVELLING_SETTINGS)) expect(Object.hasOwn(STAYS_ON_PHONE, k), k).toBe(false);
  });
});
