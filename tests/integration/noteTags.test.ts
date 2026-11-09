import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { addTagToActiveDay, getTagChoices, noteTags, normalizeTag, toggleNoteTag, SUGGESTED_TAGS } from "../../src/application/noteTags";

/** JOURNAL-LEARN-001 part 1: #tags are words in the note. Invented text only. */
beforeEach(async () => { await db.open(); await db.dailyNotes.clear(); });

describe("note tags", () => {
  it("reads tags at the start or after a space, never a link's #fragment, case-insensitive and unique", () => {
    expect(noteTags("Slept badly #LateCoffee. Then #nap, then #nap again. See https://x.com/a#section")).toEqual(["latecoffee", "nap"]);
    expect(noteTags("#sauna")).toEqual(["sauna"]);
    expect(noteTags("price #1 and email a#b")).toEqual([]);
  });

  it("toggles a tag without touching the rest of the note", () => {
    const one = toggleNoteTag("How the shift went: long", "nap");
    expect(one).toBe("How the shift went: long\n\n#nap");
    const two = toggleNoteTag(one, "sauna");
    expect(two).toBe("How the shift went: long\n\n#nap #sauna");
    expect(toggleNoteTag(two, "nap")).toBe("How the shift went: long\n\n#sauna");
    expect(toggleNoteTag("", "Late coffee!")).toBe("#latecoffee");
    expect(normalizeTag("123")).toBe("");
  });

  it("offers your most-used tags first, then the suggestions you haven't used", async () => {
    await db.dailyNotes.bulkPut([
      { dayId: "a", text: "#sauna #gym", updatedAt: "2026-11-01T00:00:00Z" },
      { dayId: "b", text: "#gym", updatedAt: "2026-11-02T00:00:00Z" },
    ] as never);
    const choices = await getTagChoices();
    expect(choices.slice(0, 2)).toEqual(["gym", "sauna"]);
    expect(choices).toEqual(expect.arrayContaining(SUGGESTED_TAGS.filter((t) => t !== "sauna")));
    expect(choices.filter((t) => t === "sauna")).toHaveLength(1);
  });
});

describe("tagging today from elsewhere (DELTA-NEXT 4)", () => {
  it("adds the tag to today's note through the ordinary save, once, keeping what was written", async () => {
    const day = await startDay();
    expect(await addTagToActiveDay("felt-strong")).toEqual(["felt-strong"]);
    expect((await db.dailyNotes.get(day.id))?.text).toBe("#felt-strong");
    await db.dailyNotes.put({ dayId: day.id, text: "Long shift\n\n#felt-strong", createdAt: "x", updatedAt: "x" } as never);
    expect(await addTagToActiveDay("Sore")).toEqual(["felt-strong", "sore"]);
    expect((await db.dailyNotes.get(day.id))?.text).toBe("Long shift\n\n#felt-strong #sore");
    expect(await addTagToActiveDay("sore")).toEqual(["felt-strong", "sore"]);
  });
});
