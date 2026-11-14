/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { db } from "../../src/persistence/db";

/**
 * MORE-HOME-001: MORE opens like YOUR LIFE. The top is a guide over what was already there: one tap from
 * an area to its unchanged panel, status only from what was recorded, nothing written, the 16 px floor.
 */
afterEach(async () => { await cleanup(); localStorage.clear(); });

describe("MORE-HOME-001", () => {
  it("opens with YOUR SYSTEMS., backup first, areas that open their own panels, true status, and nothing written", async () => {
    await page.viewport(360, 780);
    const before = await db.events.count();
    const screen = await render(<MoreScreen />);
    // VISUAL-FOUNDATION-004: the hero is the command bar; YOUR SYSTEMS. stays the screen-reader heading.
    await expect.element(screen.getByRole("heading", { name: "YOUR SYSTEMS.", exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("MORE // SYSTEMS", { exact: false })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Back up my data", exact: true })).toBeVisible();
    // Nothing recorded yet: status says so, never "fine".
    await expect.element(screen.getByRole("article", { name: "Backup" }).getByText("No backup on record yet.")).toBeVisible();
    await expect.element(screen.getByRole("article", { name: "Garmin" }).getByText("No Garmin data imported yet.")).toBeVisible();
    await expect.element(screen.getByRole("article", { name: "Alfred" }).getByText(/No Claude key on this phone/)).toBeVisible();
    await expect.element(screen.getByRole("article", { name: "Work schedule" }).getByText("Not saved yet. BEYOND won't decide your work days from a schedule until you save yours.", { exact: true })).toBeVisible();

    const plan = document.querySelector<HTMLDetailsElement>('details[data-area="Plan"]')!;
    expect(plan.open).toBe(false);
    await screen.getByRole("button", { name: "Plan", exact: true }).click();
    expect(plan.open).toBe(true);
    expect(document.activeElement).toBe(plan.querySelector("summary"));

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    const home = document.querySelector(".sys-home")!;
    const small: string[] = [];
    const walker = document.createTreeWalker(home, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      if (!node.textContent?.trim() || el.closest(".visually-hidden")) continue;
      // Accessibility (amended 2026-11-14): short mono-capital labels may be smaller, never under 10 px.
      const t = node.textContent.trim(), isLabel = (t === t.toUpperCase() || getComputedStyle(el).textTransform === "uppercase") && t.length <= 24;
      if (parseFloat(getComputedStyle(el).fontSize) < (isLabel ? 10 : 16)) small.push(t);
    }
    expect(small).toEqual([]);
    expect(await db.events.count()).toBe(before);
  });

  it("with Drive connected the Backup card says so, with the last confirmed time", async () => {
    localStorage.setItem("beyond:driveBackupState", JSON.stringify({ on: true, folderId: "f", lastSuccessAt: "2026-11-08T19:52:00.000Z", failure: null }));
    const screen = await render(<MoreScreen />);
    await expect.element(screen.getByRole("article", { name: "Backup" }).getByText(/^Google Drive, locked · last backup /)).toBeVisible();
    await expect.element(screen.getByRole("article", { name: "Backup" }).getByRole("button")).not.toBeInTheDocument();
  });

  it("a paused Drive backup offers Reconnect Drive, which opens automatic backups", async () => {
    localStorage.setItem("beyond:driveBackupState", JSON.stringify({ on: true, folderId: "f", lastSuccessAt: null, failure: "PAUSED" }));
    const screen = await render(<MoreScreen />);
    const card = screen.getByRole("article", { name: "Backup" });
    await expect.element(card.getByText("Google Drive · paused until you reconnect.")).toBeVisible();
    await card.getByRole("button", { name: "Reconnect Drive" }).click();
    expect(document.querySelector<HTMLDetailsElement>('details[data-area="Backup & recovery"]')!.open).toBe(true);
    await expect.element(screen.getByRole("button", { name: "RECONNECT" }).first()).toBeVisible();
  });
});
