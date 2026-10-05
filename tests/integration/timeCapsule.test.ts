import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import { markTimeCapsuleOpened, opensOnAfter, sealTimeCapsule } from "../../src/application/timeCapsuleCommands";
import { getTimeCapsules } from "../../src/application/timeCapsuleQueries";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/**
 * NOTES-CAPSULE-001 (owner rulings 2026-10-04): a sealed note opens on its
 * date; its text never shows before then; events only, in backups.
 */

beforeEach(async () => {
  await db.open();
});
afterEach(() => {
  db.close();
});

const OCT_4 = new Date(2026, 9, 4, 9, 0);

async function backupFile(): Promise<File> {
  const blob = await db.export({ prettyJson: true });
  return new File([blob], "beyond-backup.json", { type: "application/json" });
}

describe("opensOnAfter", () => {
  it("adds whole months, clamping to the month's last day", () => {
    expect(opensOnAfter(OCT_4, 1)).toBe("2026-11-04");
    expect(opensOnAfter(OCT_4, 3)).toBe("2027-01-04");
    expect(opensOnAfter(OCT_4, 12)).toBe("2027-10-04");
    expect(opensOnAfter(new Date(2026, 0, 31), 1)).toBe("2026-02-28");
  });
});

describe("time capsule", () => {
  it("stays sealed, without its text, until the opening date; then it's due until GOT IT", async () => {
    const id = await sealTimeCapsule("  Did the 5 a.m. workouts stick?  ", 3, OCT_4);
    const before = await getTimeCapsules(new Date(2027, 0, 3, 23, 59));
    expect(before.due).toEqual([]);
    expect(before.waiting).toHaveLength(1);
    expect(before.waiting[0]).toMatchObject({ opensOn: "2027-01-04" });
    expect(JSON.stringify(before.waiting)).not.toContain("5 a.m.");

    const onDay = await getTimeCapsules(new Date(2027, 0, 4, 6, 0));
    expect(onDay.waiting).toEqual([]);
    expect(onDay.due.map((c) => c.note)).toEqual(["Did the 5 a.m. workouts stick?"]);

    await markTimeCapsuleOpened(id);
    expect((await getTimeCapsules(new Date(2027, 0, 5))).due).toEqual([]);
  });

  it("is not tied to a day", async () => {
    await sealTimeCapsule("Hello", 1, OCT_4);
    const [event] = await db.events.where("type").equals("TIME_CAPSULE_SEALED").toArray();
    expect(event?.beyondDayId).toBeUndefined();
  });

  it("rejects empty, over-long or odd dates without writing", async () => {
    const before = await db.events.count();
    await expect(sealTimeCapsule("  ", 1, OCT_4)).rejects.toThrow(/EMPTY_CAPSULE/);
    await expect(sealTimeCapsule("x".repeat(501), 1, OCT_4)).rejects.toThrow(/CAPSULE_TOO_LONG/);
    await expect(sealTimeCapsule("Hi", 2 as 1, OCT_4)).rejects.toThrow(/INVALID_CAPSULE_DATE/);
    expect(await db.events.count()).toBe(before);
  });

  it("survives backup and restore, sealed stays sealed and unread stays unread; no schema upgrade", async () => {
    const version = db.verno;
    await sealTimeCapsule("Still sealed", 12, OCT_4);
    const dueId = await sealTimeCapsule("Due and unread", 1, new Date(2026, 7, 1));
    const file = await backupFile();
    await markTimeCapsuleOpened(dueId);
    await applyAnyRestore(file);
    const state = await getTimeCapsules(OCT_4);
    expect(state.waiting.map((c) => c.opensOn)).toEqual(["2027-10-04"]);
    expect(state.due.map((c) => c.note)).toEqual(["Due and unread"]);
    expect(db.verno).toBe(version);
  });

  it("history words both plainly, without the sealed text", async () => {
    const id = await sealTimeCapsule("Secret", 1, OCT_4);
    await markTimeCapsuleOpened(id);
    const events = (await db.events.toArray()).filter((e) => e.type.startsWith("TIME_CAPSULE")).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect(events.map((e) => describeEvent(e))).toEqual(["Time capsule sealed (opens 2026-11-04).", "Time capsule opened."]);
  });
});
