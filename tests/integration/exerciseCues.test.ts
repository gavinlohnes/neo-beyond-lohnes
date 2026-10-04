import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { startDay } from "../../src/application/commands";
import { setExerciseCue } from "../../src/application/trainCommands";
import { getExerciseCues } from "../../src/application/trainQueries";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/**
 * GYM-002 (owner sign-off 2026-10-04): a lift's cue is an EXERCISE_CUE_SET
 * event; the latest one wins, an empty one clears it, and it rides in backups
 * with no database upgrade.
 */

beforeEach(async () => {
  await db.open();
});
afterEach(() => {
  db.close();
});

async function backupFile(): Promise<File> {
  const blob = await db.export({ prettyJson: true });
  return new File([blob], "beyond-backup.json", { type: "application/json" });
}

describe("exercise cues", () => {
  it("saves a trimmed cue; the latest per lift wins; an empty cue clears it", async () => {
    const day = await startDay();
    await setExerciseCue(day.id, "leg-press", "  Feet high, slow down  ");
    await setExerciseCue(day.id, "pec-deck", "Squeeze at the middle");
    expect(Object.fromEntries(await getExerciseCues())).toEqual({
      "leg-press": "Feet high, slow down",
      "pec-deck": "Squeeze at the middle",
    });
    await setExerciseCue(day.id, "leg-press", "Feet high, don't lock knees");
    await setExerciseCue(day.id, "pec-deck", "");
    expect(Object.fromEntries(await getExerciseCues())).toEqual({ "leg-press": "Feet high, don't lock knees" });
  });

  it("rejects a cue over 140 characters and writes nothing", async () => {
    const day = await startDay();
    const before = await db.events.count();
    await expect(setExerciseCue(day.id, "leg-press", "x".repeat(141))).rejects.toThrow(/CUE_TOO_LONG/);
    expect(await db.events.count()).toBe(before);
    await setExerciseCue(day.id, "leg-press", "x".repeat(140));
    expect((await getExerciseCues()).get("leg-press")).toHaveLength(140);
  });

  it("needs no database upgrade: the schema version is unchanged by a cue", async () => {
    const versionBefore = db.verno;
    const day = await startDay();
    await setExerciseCue(day.id, "leg-press", "Feet high");
    expect(db.verno).toBe(versionBefore);
  });

  it("round-trips through backup and restore", async () => {
    const day = await startDay();
    await setExerciseCue(day.id, "leg-press", "Feet high, slow down");
    const file = await backupFile();
    const preview = await previewAnyRestore(file);
    expect(preview.format).toBe("NATIVE");

    // Change things after the backup, then restore it: the backup's cue comes back.
    await setExerciseCue(day.id, "leg-press", "");
    await setExerciseCue(day.id, "pec-deck", "Squeeze");
    await applyAnyRestore(file);
    expect(Object.fromEntries(await getExerciseCues())).toEqual({ "leg-press": "Feet high, slow down" });
  });

  it("history words it plainly", async () => {
    const day = await startDay();
    await setExerciseCue(day.id, "leg-press", "Feet high");
    await setExerciseCue(day.id, "leg-press", "");
    const events = await db.events.where("type").equals("EXERCISE_CUE_SET").sortBy("seq");
    const names = { "leg-press": "Leg Press" };
    expect(events.map((e) => describeEvent(e, names))).toEqual(["Cue set: Leg Press.", "Cue cleared: Leg Press."]);
  });
});
