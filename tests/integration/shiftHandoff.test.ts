import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import { markShiftHandoffRead, markWorkEnded, noteShiftHandoff, setWorkContext, startDay } from "../../src/application/commands";
import { getShiftHandoffState, skipShiftHandoff } from "../../src/application/shiftHandoffQueries";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/**
 * NOTES-HANDOFF-001 (owner rulings 2026-10-04): a note for the next shift is
 * a SHIFT_HANDOFF_NOTED event; it shows on the next work day until GOT IT
 * (SHIFT_HANDOFF_READ). In backups, no database upgrade.
 */

beforeEach(async () => {
  await db.open();
});
afterEach(() => {
  db.close();
});

async function workDay() {
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  return day;
}

async function backupFile(): Promise<File> {
  const blob = await db.export({ prettyJson: true });
  return new File([blob], "beyond-backup.json", { type: "application/json" });
}

describe("shift handoff", () => {
  it("asks only after work ends on a work day, until saved or skipped", async () => {
    const day = await workDay();
    expect((await getShiftHandoffState()).prompt).toBe(false);
    await markWorkEnded(day.id);
    expect((await getShiftHandoffState()).prompt).toBe(true);
    await noteShiftHandoff(day.id, "Truck 12 brakes still soft");
    expect((await getShiftHandoffState()).prompt).toBe(false);
  });

  it("SKIP writes no event and stops the prompt", async () => {
    const day = await workDay();
    await markWorkEnded(day.id);
    const before = await db.events.count();
    skipShiftHandoff(day.id);
    expect((await getShiftHandoffState()).prompt).toBe(false);
    expect(await db.events.count()).toBe(before);
  });

  it("shows on the next work day, not on a day off, and GOT IT hides it for good", async () => {
    const first = await workDay();
    await markWorkEnded(first.id);
    const noteId = await noteShiftHandoff(first.id, "  Truck 12 brakes still soft, check first thing  ");

    const off = await startDay();
    await setWorkContext(off.id, "OFF", "MANUAL");
    expect((await getShiftHandoffState()).unread).toBeUndefined();

    const next = await workDay();
    const shown = (await getShiftHandoffState()).unread;
    expect(shown).toMatchObject({ eventId: noteId, note: "Truck 12 brakes still soft, check first thing" });

    await markShiftHandoffRead(next.id, noteId);
    expect((await getShiftHandoffState()).unread).toBeUndefined();
    await workDay();
    expect((await getShiftHandoffState()).unread).toBeUndefined();
  });

  it("the same day's own note isn't shown back to it", async () => {
    const day = await workDay();
    await markWorkEnded(day.id);
    await noteShiftHandoff(day.id, "For tomorrow");
    expect((await getShiftHandoffState()).unread).toBeUndefined();
  });

  it("rejects empty and over-long notes without writing", async () => {
    const day = await workDay();
    const before = await db.events.count();
    await expect(noteShiftHandoff(day.id, "   ")).rejects.toThrow(/EMPTY_HANDOFF/);
    await expect(noteShiftHandoff(day.id, "x".repeat(281))).rejects.toThrow(/HANDOFF_TOO_LONG/);
    expect(await db.events.count()).toBe(before);
  });

  it("an unread note survives backup and restore still unread; no schema upgrade", async () => {
    const version = db.verno;
    const first = await workDay();
    await markWorkEnded(first.id);
    const noteId = await noteShiftHandoff(first.id, "Truck 12 brakes");
    const next = await workDay();
    const file = await backupFile();
    await markShiftHandoffRead(next.id, noteId);
    expect((await getShiftHandoffState()).unread).toBeUndefined();

    await applyAnyRestore(file);
    expect((await getShiftHandoffState()).unread?.note).toBe("Truck 12 brakes");
    expect(db.verno).toBe(version);
  });

  it("history words both plainly", async () => {
    const first = await workDay();
    const noteId = await noteShiftHandoff(first.id, "Truck 12 brakes");
    const next = await workDay();
    await markShiftHandoffRead(next.id, noteId);
    const events = (await db.events.toArray()).filter((e) => e.type.startsWith("SHIFT_HANDOFF")).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect(events.map((e) => describeEvent(e))).toEqual(["Note for next shift: Truck 12 brakes", "Shift note read."]);
  });
});
