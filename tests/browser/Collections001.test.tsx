import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { createCollection } from "../../src/application/collectionCommands";
import { db } from "../../src/persistence/db";
import { CollectionsScreen } from "../../src/ui/screens/more/CollectionsScreen";
import "../../src/ui/screens/more/operator.css";

beforeEach(async () => { await page.viewport(360, 800); await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); }); });
afterEach(() => cleanup());
it("adds, edits and searches a typed item accessibly at 360px", async () => {
  const collection = await createCollection("Gift ideas", [{ label: "Idea", type: "TEXT" }, { label: "Price", type: "NUMBER" }, { label: "Bought", type: "YES_NO" }]);
  const screen = await render(<CollectionsScreen active />);
  await expect.element(screen.getByRole("heading", { name: "Gift ideas", exact: true })).toBeVisible();
  await screen.getByRole("textbox", { name: "Idea", exact: true }).fill("Heated blanket"); await screen.getByRole("spinbutton", { name: "Price", exact: true }).fill("49"); await screen.getByRole("checkbox", { name: "Bought", exact: true }).click();
  await screen.getByRole("button", { name: "ADD ITEM", exact: true }).click(); await expect.element(screen.getByText("Heated blanket", { exact: true })).toBeVisible();
  await screen.getByRole("searchbox", { name: "Search this collection", exact: true }).fill("missing"); await expect.element(screen.getByText("No matching items.", { exact: true })).toBeVisible();
  await screen.getByRole("searchbox", { name: "Search this collection", exact: true }).fill("blanket"); await expect.element(screen.getByText("Heated blanket", { exact: true })).toBeVisible();
  expect(await db.collectionItems.where("collectionId").equals(collection.id).count()).toBe(1); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  for (const control of document.querySelectorAll<HTMLElement>(".collections-screen button, .collections-screen input, .collections-screen select, .collections-screen summary")) expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect((await axe.run(document.body)).violations).toEqual([]);
});
