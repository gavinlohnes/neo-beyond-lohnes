import "dexie-export-import";
import { beforeEach, describe, expect, it } from "vitest";
import { startDay } from "../../src/application/commands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { getDailyNote, getMentions, getWikiTargets, wikiLabels } from "../../src/application/dailyNoteQueries";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

beforeEach(async () => {
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});

describe("DAILY-NOTE-001", () => {
  it("keeps exactly one explicit-save note per lived day and derives links/backlinks on read", async () => {
    const day = await startDay("2026-11-03T22:30:00.000Z");
    expect(await getDailyNote(day.id)).toBeUndefined();
    await saveDailyNote(day.id, "Talk with [[Gavin]] about [[2026-11-03]].");
    await saveDailyNote(day.id, "Updated [[Gavin]].");
    expect(await db.dailyNotes.count()).toBe(1);
    expect((await getDailyNote(day.id))?.text).toBe("Updated [[Gavin]].");
    expect(wikiLabels("[[A]] x [[B]]")).toEqual(["A", "B"]);
    expect(await getMentions("Gavin")).toEqual([{ kind: "DAY", id: day.id, label: "2026-11-03" }]);
    expect((await getWikiTargets("2026-11-03")).map((target) => target.kind)).toEqual(["DAY"]);
  });

  it("round-trips saved notes and restores a v22 backup with the new table empty", async () => {
    const day = await startDay("2026-11-03T22:30:00.000Z");
    const oldJson = JSON.parse(await (await db.export()).text());
    oldJson.data.databaseVersion = 22;
    oldJson.data.tables = oldJson.data.tables.filter((table: { name: string }) => table.name !== "dailyNotes");
    oldJson.data.data = oldJson.data.data.filter((table: { tableName: string }) => table.tableName !== "dailyNotes");
    await saveDailyNote(day.id, "This survives.");
    const backup = new File([await db.export()], "daily-notes.json");
    await db.dailyNotes.clear();
    await applyRestore(backup);
    expect((await getDailyNote(day.id))?.text).toBe("This survives.");
    await applyRestore(new File([JSON.stringify(oldJson)], "before-daily-notes.json"));
    expect(await db.dailyNotes.count()).toBe(0);
  });
});
