import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { HomePanel } from "../../src/ui/components/HomePanel";
import { CommitmentQuickActions } from "../../src/ui/screens/today/CommitmentQuickActions";
import { addHomeItem } from "../../src/application/homeCommands";
import * as intent from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";

/** GRAYSON-HOME-LASTDONE-001: last done, its note, and DONE right on Home's rows. Invented house details only. */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => {
  await page.viewport(360, 800);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 10));
  await addHomeItem({ item: "Furnace filter", details: "Check the size on the old one.", repeat: { every: 3, unit: "MONTHS", firstDue: "2026-11-20" } });
  await addHomeItem({ item: "Gutters", details: "", repeat: { every: 6, unit: "MONTHS", firstDue: "2026-12-05" } });
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); await page.viewport(1280, 800); });
const job = (screen: Awaited<ReturnType<typeof render>>, name: string) => screen.getByRole("group", { name: `Task: Home: ${name}` });
const row = (name: string) => document.querySelector(`[data-home-job="${name}"]`)!;

describe("GRAYSON-HOME-LASTDONE-001 on Home", () => {
  it("mark a job done with a note: Last done with that date and note, the next date, and Done 1 time", async () => {
    const screen = await render(<HomePanel active />);
    await expect.element(screen.getByText("Not marked done in GRAYSON yet.").first()).toBeVisible();
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    await page.viewport(360, 800);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/coming-round-before-360.png` });
    expect(job(screen, "Furnace filter").getByRole("button", { name: "NOT A TASK" }).elements()).toHaveLength(0);
    await job(screen, "Furnace filter").getByRole("button", { name: "DONE" }).click();
    await expect.element(screen.getByText('Mark "Furnace filter" done?')).toBeVisible();
    await screen.getByRole("textbox", { name: /^Note \(optional\)/ }).fill("16x25x1, Home Depot");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/done-confirm-360.png`, element: row("Furnace filter") as HTMLElement });
    expect((await axe.run(row("Furnace filter"), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    await screen.getByRole("button", { name: "YES, DONE" }).click();
    await expect.poll(() => row("Furnace filter")?.querySelector("[data-last-done]")?.textContent).toBe("Last done Nov 25 · 16x25x1, Home Depot");
    expect(row("Furnace filter").textContent).toContain("Feb 20");
    await screen.getByText("Done 1 time").click();
    await expect.element(screen.getByRole("listitem").filter({ hasText: "Nov 25 · 16x25x1, Home Depot" })).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/history-open-360.png`, element: row("Furnace filter") as HTMLElement });
    expect((await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("CANCEL changes nothing; NEW DATE moves the row; keyboard only", async () => {
    const screen = await render(<HomePanel active />);
    const before = await db.obligations.toArray();
    await job(screen, "Gutters").getByRole("button", { name: "DONE" }).click();
    await screen.getByRole("button", { name: "CANCEL" }).click();
    expect(await db.obligations.toArray()).toEqual(before);
    (job(screen, "Gutters").getByRole("button", { name: "NEW DATE" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await screen.getByLabelText("New due date").fill("2026-12-20");
    await screen.getByRole("button", { name: "SAVE DATE" }).click();
    await expect.poll(() => row("Gutters")?.textContent ?? "").toContain("Dec 20");
  });

  it("a failed save shows the existing error and changes nothing", async () => {
    const screen = await render(<HomePanel active />);
    const before = await db.obligations.toArray();
    vi.spyOn(db.obligations, "update").mockRejectedValue(new Error("disk full"));
    await job(screen, "Gutters").getByRole("button", { name: "DONE" }).click();
    await screen.getByRole("button", { name: "YES, DONE" }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("That didn't save. Your task is unchanged. Try again.");
    expect(await db.obligations.toArray()).toEqual(before);
  });
});

it("TODAY's quick actions are unchanged: NOT A TASK, and no Note field", async () => {
  const task = await intent.createObligation({ title: "Call the vet", dueAt: "2026-11-25" });
  const screen = await render(<CommitmentQuickActions obligation={task} today="2026-11-25" onChanged={() => {}} />);
  await expect.element(screen.getByRole("button", { name: "NOT A TASK" })).toBeVisible();
  await screen.getByRole("button", { name: "DONE" }).click();
  await expect.element(screen.getByText('Mark "Call the vet" done?')).toBeVisible();
  expect(screen.getByRole("textbox").elements()).toHaveLength(0);
});
