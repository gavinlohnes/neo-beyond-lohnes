import "dexie-export-import";
import { beforeEach, describe, expect, it } from "vitest";
import { addCollectionItem, createCollection, setCollectionItemArchived, updateCollectionItem } from "../../src/application/collectionCommands";
import { getCollectionItems } from "../../src/application/collectionQueries";
import { confirmProposal } from "../../src/application/alfred/alfredActions";
import { interpret } from "../../src/application/helper/freeHelper";
import { readHelperContext } from "../../src/application/helper/helperContext";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

beforeEach(async () => { await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); }); });

describe("COLLECTIONS-001", () => {
  it("stores six typed fields, edits, searches, sorts and archives without deleting", async () => {
    const collection = await createCollection("Gear sizes", [{ label: "Item", type: "TEXT" }, { label: "Size", type: "NUMBER" }, { label: "Bought", type: "DATE" }, { label: "Fits", type: "YES_NO" }, { label: "Link", type: "LINK" }, { label: "Note", type: "TEXT" }]);
    const [item, size, bought, fits, link] = collection.fields;
    const row = await addCollectionItem(collection.id, { [item!.id]: "Boots", [size!.id]: "12", [bought!.id]: "2026-11-04", [fits!.id]: true, [link!.id]: "https://example.com/boots" });
    expect(row.values).toMatchObject({ [item!.id]: "Boots", [size!.id]: 12, [bought!.id]: "2026-11-04", [fits!.id]: true });
    await updateCollectionItem(row.id, { ...row.values, [size!.id]: 13 });
    expect((await getCollectionItems(collection.id, "boots", size!.id))[0]!.values[size!.id]).toBe(13);
    await setCollectionItemArchived(row.id, true); expect(await getCollectionItems(collection.id)).toEqual([]); expect(await db.collectionItems.get(row.id)).toBeDefined();
  });

  it("turns 'add to gift ideas' into a confirmation card and saves only on confirm", async () => {
    const collection = await createCollection("Gift ideas", [{ label: "Idea", type: "TEXT" }]);
    const result = interpret("add to gift ideas: heated blanket", await readHelperContext());
    expect(result.unknown).toEqual([]); expect(result.cards[0]).toMatchObject({ kind: "collection_add", collection_id: collection.id, value: "heated blanket" });
    expect(await db.collectionItems.count()).toBe(0); await confirmProposal(result.cards[0]!); expect(await db.collectionItems.count()).toBe(1);
  });

  it("rejects unknown field types, ambiguous yes/no values and impossible dates", async () => {
    await expect(createCollection("Broken", [{ label: "Value", type: "MAYBE" }])).rejects.toThrow("unknown field type");
    const collection = await createCollection("Typed", [{ label: "Done", type: "YES_NO" }, { label: "When", type: "DATE" }]);
    const [done, when] = collection.fields;
    await expect(addCollectionItem(collection.id, { [done!.id]: "not sure", [when!.id]: "2026-11-04" })).rejects.toThrow("needs yes or no");
    await expect(addCollectionItem(collection.id, { [done!.id]: "yes", [when!.id]: "2026-02-30" })).rejects.toThrow("real calendar date");
    expect(await db.collectionItems.count()).toBe(0);
  });

  it("round-trips collections and restores a v23 backup with both stores empty", async () => {
    const oldJson = JSON.parse(await (await db.export()).text()); oldJson.data.databaseVersion = 23;
    for (const name of ["collections", "collectionItems"]) { oldJson.data.tables = oldJson.data.tables.filter((table: { name: string }) => table.name !== name); oldJson.data.data = oldJson.data.data.filter((table: { tableName: string }) => table.tableName !== name); }
    const collection = await createCollection("Gift ideas", [{ label: "Idea", type: "TEXT" }]); await addCollectionItem(collection.id, { [collection.fields[0]!.id]: "Book" });
    const backup = new File([await db.export()], "collections.json"); await db.collections.clear(); await db.collectionItems.clear(); await applyRestore(backup);
    expect(await db.collections.count()).toBe(1); expect(await db.collectionItems.count()).toBe(1);
    await applyRestore(new File([JSON.stringify(oldJson)], "before-collections.json")); expect(await db.collections.count()).toBe(0); expect(await db.collectionItems.count()).toBe(0);
  });
});
