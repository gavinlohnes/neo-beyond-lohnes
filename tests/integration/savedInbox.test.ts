import "dexie-export-import";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteSavedInboxItem, getSavedInboxItems, makeSavedItemTask, saveInboxItem, updateSavedInboxItem } from "../../src/application/savedInbox";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

beforeEach(async () => {
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});

describe("SHARE-INBOX-001", () => {
  it("stores only the shared payload, supports explicit edits and links a task to its source", async () => {
    const item = await saveInboxItem({ source: "SHARE", title: "Read this", text: "A useful passage", url: "https://example.com/article" });
    await updateSavedInboxItem(item.id, { note: "Use this later", tags: ["research", " research ", ""] });
    const [saved] = await getSavedInboxItems();
    expect(saved).toMatchObject({ title: "Read this", text: "A useful passage", url: "https://example.com/article", note: "Use this later", tags: ["research"] });
    const task = await makeSavedItemTask(item.id);
    expect(task).toMatchObject({ title: "Read this", description: "https://example.com/article\nUse this later", source: "USER" });
    expect(await db.events.where("type").equals("OBLIGATION_CREATED").count()).toBe(1);
    await deleteSavedInboxItem(item.id);
    expect(await getSavedInboxItems()).toEqual([]);
  });

  it("round-trips the inbox and restores a pre-feature backup with it empty", async () => {
    const oldJson = JSON.parse(await (await db.export()).text());
    oldJson.data.databaseVersion = 19;
    oldJson.data.tables = oldJson.data.tables.filter((table: { name: string }) => table.name !== "savedInboxItems");
    oldJson.data.data = oldJson.data.data.filter((table: { tableName: string }) => table.tableName !== "savedInboxItems");
    await saveInboxItem({ title: "Kept", url: "https://example.com" });
    const backup = new File([await db.export()], "saved-inbox.json");
    await db.savedInboxItems.clear();
    await applyRestore(backup);
    expect((await getSavedInboxItems()).map((item) => item.title)).toEqual(["Kept"]);
    await applyRestore(new File([JSON.stringify(oldJson)], "before-saved-inbox.json"));
    expect(await getSavedInboxItems()).toEqual([]);
  });
});
