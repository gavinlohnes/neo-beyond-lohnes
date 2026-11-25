import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { MemoryPanel } from "../../src/ui/components/MemoryPanel";
import { getMemoryFacts, recordMemory } from "../../src/application/memory";
import { getMemories } from "../../src/application/alfred/alfredMemory";
import { buildAlfredContext } from "../../src/application/alfred/alfredContext";
import { db } from "../../src/persistence/db";

/** GRAYSON-ONE-MEMORY-001 (C6.7): one memory list; every old Delta entry reviewed by his tap, each choice undoable. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });
const old = (id: string, text: string, savedAt = "2026-01-0" + id.slice(-1) + "T12:00:00.000Z") => db.alfredMemories.add({ id, text, topic: "HOME", savedAt });
const targets = (root: Element) => { for (const b of root.querySelectorAll("button")) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44); };

it("KEEP, FIX and DON'T KEEP each old entry; UNDO the last; nothing changes before a tap", async () => {
  await old("old-1", "Filter size 16x25x1"); await old("old-2", "Trash goes out Tuesday"); await old("old-3", "Spare key under the mat");
  const screen = await render(<MemoryPanel />);
  await expect.element(screen.getByText("3 old Delta entries to review", { exact: true })).toBeVisible();
  expect(await getMemoryFacts()).toEqual([]);
  await screen.getByRole("button", { name: "REVIEW", exact: true }).click();
  const review = screen.getByRole("region", { name: "3 old Delta entries to review" });
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(review.element())).violations).toEqual([]);
    targets(review.element());
  }
  const row = (text: string) => screen.getByRole("listitem").filter({ hasText: text });
  await row("Filter size").getByRole("button", { name: "KEEP", exact: true }).click();
  await expect.element(screen.getByText("Kept as written.", { exact: true })).toBeVisible();
  await row("Trash goes out").getByRole("button", { name: "FIX", exact: true }).click();
  await screen.getByRole("textbox", { name: "Your words" }).fill("Trash goes out Wednesday");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("Kept with your words.", { exact: true })).toBeVisible();
  await row("Spare key").getByRole("button", { name: "DON'T KEEP", exact: true }).click();
  await expect.element(screen.getByText(/^Not kept\. It's under Stopped/)).toBeVisible();
  await screen.getByRole("button", { name: "UNDO", exact: true }).click();
  await expect.element(screen.getByText("Restored. Delta uses it again.", { exact: true })).toBeVisible();
  const facts = await getMemoryFacts();
  expect(facts.map((f) => [f.statement, f.status, f.history[0]!.via]).sort()).toEqual([
    ["Filter size 16x25x1", "ACTIVE", "OLD_ENTRY"], ["Spare key under the mat", "ACTIVE", "OLD_ENTRY"], ["Trash goes out Wednesday", "ACTIVE", "OLD_ENTRY"]]);
  expect(facts.find((f) => f.statement.startsWith("Spare"))!.history.map((h) => h.action)).toEqual(["CREATED", "IRRELEVANT", "RESTORED"]);
  expect(await db.alfredMemories.count()).toBe(3); // the old words stay as evidence
  expect(screen.getByText(/old Delta entr/).elements()).toHaveLength(0);
  await expect.element(screen.getByRole("article").filter({ hasText: "Filter size" })).toHaveTextContent("Old Delta entry, kept");
});

it("UNDO after a FIX goes back to the old words, with history", async () => {
  await old("old-1", "Trash goes out Tuesday");
  const screen = await render(<MemoryPanel />);
  await screen.getByRole("button", { name: "REVIEW", exact: true }).click();
  await screen.getByRole("button", { name: "FIX", exact: true }).click();
  await screen.getByRole("textbox", { name: "Your words" }).fill("Trash goes out Wednesday");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await screen.getByRole("button", { name: "UNDO", exact: true }).click();
  await expect.element(screen.getByText("Back to the old words.", { exact: true })).toBeVisible();
  const [fact] = await getMemoryFacts();
  expect(fact).toMatchObject({ statement: "Trash goes out Tuesday", status: "ACTIVE" });
  expect(fact!.history.map((h) => h.action)).toEqual(["CREATED", "CORRECTED"]);
});

it("KEEP THE REST appears only at the end, skips entries too long to keep, and leaves Delta's context unchanged", async () => {
  await recordMemory({ factId: "f-new", expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", topic: "WORK", statement: "Shift starts 0600", via: "MEMORY" });
  await recordMemory({ factId: "f-pre", expectedPreviousId: null, action: "CREATED", kind: "PERSONAL_FACT", topic: "WORK", statement: "Locker 12" });
  for (let n = 1; n <= 10; n++) await old(`old-${n}`, `Old note number ${n}`, `2026-01-${String(n).padStart(2, "0")}T12:00:00.000Z`);
  await old("old-long", "y".repeat(300), "2026-02-01T12:00:00.000Z");
  // What Delta is told: each memory's topic, words and date. Ids and revision notes change on conversion by design.
  const told = async () => (await buildAlfredContext()).split("\n").flatMap((l) => { const m = /\] ([A-Z]+: .+ — saved [^.]+)\./.exec(l); return m && l.includes("WHAT HE ASKED YOU TO REMEMBER") ? [m[1]] : []; }).sort();
  const before = await told();
  expect(before).toHaveLength(13);
  const screen = await render(<MemoryPanel />);
  // Where each memory came from: recorded from now on, never guessed for older facts.
  await expect.element(screen.getByRole("article").filter({ hasText: "Shift starts 0600" })).toHaveTextContent("Added in Memory");
  await expect.element(screen.getByRole("article").filter({ hasText: "Locker 12" })).toHaveTextContent("Saved in BEYOND");
  await screen.getByRole("button", { name: "REVIEW", exact: true }).click();
  expect(screen.getByRole("button", { name: "KEEP THE REST AS WRITTEN" }).elements()).toHaveLength(0);
  await screen.getByRole("button", { name: "SHOW MORE OLD ENTRIES" }).click();
  screen.getByRole("listitem").last().element().scrollIntoView({ block: "end" });
  document.querySelector("[data-legacy-review]")!.lastElementChild!.scrollIntoView({ block: "end" });
  const rest = screen.getByRole("button", { name: "KEEP THE REST AS WRITTEN" });
  await expect.element(rest).toBeVisible();
  await rest.click();
  await screen.getByRole("button", { name: "YES, KEEP THEM" }).click();
  await expect.element(screen.getByText("Kept 10 as written.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("1 old Delta entry to review", { exact: true })).toBeVisible();
  expect(await told()).toEqual(before);
  expect((await getMemories()).filter((m) => m.reference?.source === "ALFRED_MEMORY").map((m) => m.id)).toEqual(["old-long"]);
});
