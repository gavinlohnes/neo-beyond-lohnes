import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { logWater, startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** COMMAND-BAR-001: one box goes, logs (free, after SAVE), answers and finds. Invented data only. */
beforeEach(async () => { await page.viewport(360, 800); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); });

async function openSearch() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "Search everything", exact: true }).first().click();
  const box = screen.getByRole("textbox", { name: "Search everything" });
  await expect.element(box).toBeVisible();
  return { screen, box };
}

it("logs for free through the usual confirm card; nothing is written until SAVE", async () => {
  const day = await startDay();
  const { screen, box } = await openSearch();
  await box.fill("16 oz water");
  const go = screen.getByRole("button", { name: "Log free: Log 16 oz water" });
  await expect.element(go).toBeVisible();
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
  await go.click();
  const card = screen.getByRole("dialog", { name: "ALFRED" }).getByRole("group", { name: "Log 16 oz water" });
  await expect.element(card).toBeVisible();
  await card.getByRole("button", { name: "SAVE" }).click();
  await expect.poll(() => db.events.where("beyondDayId").equals(day.id).filter((e) => e.type === "WATER_LOGGED").count()).toBe(1);
});

it("answers from records in place, goes to screens, and offers Alfred only on request", async () => {
  const day = await startDay();
  await logWater(day.id, 20);
  const { screen, box } = await openSearch();
  await box.fill("how much water today?");
  await expect.element(screen.getByText("Water today: 20 oz.")).toBeVisible();
  await box.fill("week ahead");
  const goWeek = screen.getByRole("button", { name: /^Go: WEEKLY CHECK-IN/ });
  await expect.element(goWeek).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "ASK ALFRED ABOUT THIS" })).toBeVisible();
  expect((await axe.run(document.querySelector(".command-bar")!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByText("MORE // WEEKLY", { exact: false }).first()).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("Enter never acts on a stale preview, and DO IT from search never becomes a paid call (review of #380)", async () => {
  await startDay();
  localStorage.setItem("beyond.alfredKey", "sk-ant-test-command");
  let requests = 0;
  const fetchSpy = (await import("vitest")).vi.spyOn(window, "fetch").mockImplementation(async (_input, init) => { if (String(init?.body ?? "").includes("car insurance")) requests++; return new Response("{}", { status: 500 }); }); // the automatic brief may call too; only this message counts
  const { screen, box } = await openSearch();
  await box.fill("16 oz water");
  await expect.element(screen.getByRole("button", { name: "Log free: Log 16 oz water" })).toBeVisible();
  await box.fill("16 oz water and sort out the car insurance");
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => document.querySelector(".drive-home, [role=dialog][aria-label=ALFRED]")).toBeNull();
  // Sent from search, words that need Alfred stay in his box instead of being sent.
  const { doInBeyond } = await import("../../src/ui/components/AlfredSheet");
  doInBeyond("16 oz water and sort out the car insurance");
  const sheet = screen.getByRole("dialog", { name: "ALFRED" });
  await expect.element(sheet.getByText("That needs Alfred. Tap SEND to ask him, or change the words.")).toBeVisible();
  await expect.element(sheet.getByRole("textbox", { name: "Message Alfred" })).toHaveValue("16 oz water and sort out the car insurance");
  expect(requests).toBe(0);
  fetchSpy.mockRestore();
});
