import "dexie-export-import";
import { beforeEach, describe, expect, it } from "vitest";
import { saveLogTemplate, saveSnippet } from "../../src/application/snippetCommands";
import { getLogTemplates, getSnippets } from "../../src/application/snippetQueries";
import { interpret } from "../../src/application/helper/freeHelper";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

beforeEach(async () => {
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});

describe("SNIPPETS-001", () => {
  it("validates unique explicit configuration and expands a template into unsaved helper cards", async () => {
    await expect(saveSnippet({ trigger: "shift", text: "handoff" })).rejects.toThrow("start with ;");
    await saveSnippet({ trigger: ";shift", text: "Final shift handoff" });
    await expect(saveSnippet({ trigger: ";SHIFT", text: "duplicate" })).rejects.toThrow("already exists");
    const cards = [
      { kind: "log_meal" as const, name: "Protein shake", calories: 240, protein_g: 32 },
      { kind: "log_water" as const, oz: 20 },
    ];
    await saveLogTemplate({ name: "usual pre-shift", cards });
    const result = interpret("usual pre-shift", { now: new Date(), savedMeals: [], openTasks: [], openProjects: [], routines: [], logTemplates: await getLogTemplates() });
    expect(result).toEqual({ cards, unknown: [] });
    result.cards[0] = { kind: "clean_day" };
    expect((await getLogTemplates())[0]!.cards).toEqual(cards);
    expect(await db.events.count()).toBe(0);
  });

  it("round-trips both stores and restores a pre-feature backup with them empty", async () => {
    const oldJson = JSON.parse(await (await db.export()).text());
    oldJson.data.databaseVersion = 19;
    const names = new Set(["textSnippets", "logTemplates"]);
    oldJson.data.tables = oldJson.data.tables.filter((table: { name: string }) => !names.has(table.name));
    oldJson.data.data = oldJson.data.data.filter((table: { tableName: string }) => !names.has(table.tableName));
    await saveSnippet({ trigger: ";shift", text: "Final shift handoff" });
    await saveLogTemplate({ name: "usual pre-shift", cards: [{ kind: "log_water", oz: 20 }] });
    const backup = new File([await db.export()], "snippets.json");
    await db.textSnippets.clear(); await db.logTemplates.clear();
    await applyRestore(backup);
    expect((await getSnippets()).map((row) => row.trigger)).toEqual([";shift"]);
    expect((await getLogTemplates()).map((row) => row.name)).toEqual(["usual pre-shift"]);
    await applyRestore(new File([JSON.stringify(oldJson)], "before-snippets.json"));
    expect(await getSnippets()).toEqual([]); expect(await getLogTemplates()).toEqual([]);
  });
});
