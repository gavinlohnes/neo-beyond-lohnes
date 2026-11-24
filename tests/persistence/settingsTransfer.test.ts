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
    const block = parseSettingsBlock({ version: 1, values: { "beyond.alfredKey": "sk-x", "beyond.vision": 3, "beyond.alfredCap": "x".repeat(20_000), "beyond.delta.voice.v1": "DELTA", __proto__: "x" } });
    expect(block).toEqual({ version: 1, values: { "beyond.delta.voice.v1": "DELTA" } });
    localStorage.setItem("beyond.alfredKey", "keep");
    applySettingsBlock(block);
    expect(localStorage.getItem("beyond.alfredKey")).toBe("keep");
    expect(localStorage.getItem("beyond.delta.voice.v1")).toBe("DELTA");
  });

  it("every allowlisted key is a key the app really reads (no drift)", () => {
    const files: string[] = [];
    const walk = (dir: string) => { for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(p) && !p.endsWith("settingsTransfer.ts")) files.push(p); } };
    walk("src");
    const source = files.map((f) => readFileSync(f, "utf8")).join("\n");
    for (const key of Object.keys(TRAVELLING_SETTINGS)) expect(source.includes(`"${key}"`), key).toBe(true);
  });
});
