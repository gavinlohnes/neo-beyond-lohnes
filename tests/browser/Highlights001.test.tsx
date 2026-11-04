import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { HighlightsScreen } from "../../src/ui/screens/more/HighlightsScreen";
import "../../src/ui/screens/more/operator.css";
beforeEach(async () => { await page.viewport(360, 800); await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); }); }); afterEach(() => cleanup());
it("saves and searches a linked pasted highlight at 360px", async () => { const screen = await render(<HighlightsScreen active />); await screen.getByText("PASTE A HIGHLIGHT", { exact: true }).click(); await screen.getByRole("textbox", { name: "Source title", exact: true }).fill("Book"); await screen.getByRole("textbox", { name: "Highlight", exact: true }).fill("Remember [[Atlas]]"); await screen.getByRole("button", { name: "SAVE HIGHLIGHT", exact: true }).click(); await expect.element(screen.getByText("[[Atlas]]", { exact: true })).toBeVisible(); await screen.getByRole("searchbox", { name: "Search highlights", exact: true }).fill("missing"); await expect.element(screen.getByText("No matching highlights.", { exact: true })).toBeVisible(); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360); expect((await axe.run(document.body)).violations).toEqual([]); });
