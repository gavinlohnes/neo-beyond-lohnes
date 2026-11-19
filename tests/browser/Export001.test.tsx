import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { startDay, logBodyweight, logWater } from "../../src/application/commands";
import { commandResult } from "./helpers/command";

/**
 * EXPORT-001 (Gavin, 2026-11-19, approved list item 2): MORE → Data safety → Readable records (CSV). Each area shows its
 * row count and date range before anything leaves; EXPORT sends a CSV to the share sheet or downloads it; cancelling the
 * share sheet says so; an empty area offers no button. Nothing is written, and the backup reminder is untouched.
 */
beforeEach(async () => { try { localStorage.clear(); } catch { /* ignore */ } await page.viewport(360, 800); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openExport() {
  const screen = await render(<App />);
  await (await commandResult(screen, "BACKUP & RECOVERY")).click();
  await screen.getByText("Readable records (CSV)", { exact: true }).click();
  const panel = screen.getByRole("region", { name: "EXPORT RECORDS (CSV)" });
  await expect.element(panel).toBeVisible();
  return { screen, panel };
}

describe("EXPORT-001", () => {
  it("previews an area, exports a real CSV file, and writes nothing", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 204.2);
    await logWater(day.id, 16);
    const shared: File[] = [];
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { value: async ({ files }: { files: File[] }) => { shared.push(...files); }, configurable: true });
    const before = await db.events.count();
    const { panel } = await openExport();
    await expect.poll(() => panel.element().querySelector("[data-export-preview]")?.textContent).toMatch(/^1 row · \d{4}-\d\d-\d\d to \d{4}-\d\d-\d\d$/);
    await panel.getByRole("button", { name: "Weight", exact: true }).click();
    await expect.poll(() => panel.element().querySelector("[data-export-preview]")?.textContent).toMatch(/^1 row/);
    await panel.getByRole("button", { name: "EXPORT WEIGHT", exact: true }).click();
    await expect.poll(() => panel.element().querySelector("[data-export-receipt]")?.textContent).toMatch(/^Shared 1 row · /);
    expect(shared[0]!.name).toMatch(/^beyond-weight-\d{4}-\d\d-\d\d\.csv$/);
    const text = await shared[0]!.text();
    expect(text.split("\r\n")[0]).toBe("lived_day,time,weight,unit,source");
    expect(text).toContain(",204.2,lb,you");
    expect(await db.events.count()).toBe(before);
    for (const b of panel.element().querySelectorAll("button")) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect((await axe.run(panel.element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations).toEqual([]);
  });

  it("says when the share sheet was cancelled, and an empty area offers no button", async () => {
    await startDay();
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", { value: async () => { throw new DOMException("cancelled", "AbortError"); }, configurable: true });
    const { panel } = await openExport();
    await panel.getByRole("button", { name: "Weight", exact: true }).click();
    await expect.poll(() => panel.element().querySelector("[data-export-preview]")?.textContent).toBe("Nothing to export yet.");
    expect(panel.getByRole("button", { name: /^EXPORT/ }).elements()).toHaveLength(0);
    await panel.getByRole("button", { name: "Daily totals", exact: true }).click();
    await expect.poll(() => panel.element().querySelector("[data-export-preview]")?.textContent).toMatch(/^1 row/);
    await panel.getByRole("button", { name: "EXPORT DAILY TOTALS", exact: true }).click();
    await expect.poll(() => panel.element().querySelector("[data-export-receipt]")?.textContent).toBe("Export cancelled.");
  });
});
