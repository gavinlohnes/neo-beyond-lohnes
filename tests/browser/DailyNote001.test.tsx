import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { startDay } from "../../src/application/commands";
import { getDailyNote } from "../../src/application/dailyNoteQueries";
import { db } from "../../src/persistence/db";
import { DailyNoteScreen } from "../../src/ui/screens/more/DailyNoteScreen";
import "../../src/ui/screens/more/operator.css";

beforeEach(async () => {
  await page.viewport(360, 800); sessionStorage.clear();
  await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  await startDay("2026-11-03T22:30:00.000Z");
});
afterEach(() => { cleanup(); sessionStorage.clear(); });

it("keeps a phone-local draft until SAVE, autocompletes a day link and exposes backlinks at 360px", async () => {
  let screen = await render(<DailyNoteScreen active />);
  const editor = screen.getByRole("textbox", { name: "Your note", exact: true });
  await editor.fill("Talk about [[2026");
  await expect.element(screen.getByRole("option", { name: /2026-11-03/ })).toBeVisible();
  await screen.getByRole("option", { name: /2026-11-03/ }).click();
  expect(await getDailyNote((await db.beyondDays.toArray())[0]!.id)).toBeUndefined();
  await cleanup(); screen = await render(<DailyNoteScreen active />);
  await expect.element(screen.getByRole("textbox", { name: "Your note", exact: true })).toHaveValue("Talk about [[2026-11-03]]");
  await screen.getByRole("button", { name: "SAVE NOTE", exact: true }).click();
  await expect.element(screen.getByRole("status")).toHaveTextContent("Daily note saved.");
  await screen.getByRole("button", { name: "[[2026-11-03]]", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Mentioned in 2026-11-03", exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  for (const control of document.querySelectorAll<HTMLElement>(".daily-note-screen button, .daily-note-screen textarea")) expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("forgets an older session draft after the operator reverts to the saved text", async () => {
  let screen = await render(<DailyNoteScreen active />);
  const editor = screen.getByRole("textbox", { name: "Your note", exact: true });
  await editor.fill("Keep this only while editing");
  await expect.poll(() => sessionStorage.length).toBe(1);
  await editor.fill("");
  await expect.poll(() => sessionStorage.length).toBe(0);
  await cleanup();
  screen = await render(<DailyNoteScreen active />);
  await expect.element(screen.getByRole("textbox", { name: "Your note", exact: true })).toHaveValue("");
});

it("NOTE-TEMPLATES-001: offers prompts only while the note is empty, and they save nothing", async () => {
  await startDay();
  const screen = await render(<DailyNoteScreen active />);
  const before = await db.events.count();
  await screen.getByRole("button", { name: "DAY OFF PROMPTS" }).click();
  await expect.element(screen.getByRole("textbox", { name: "Your note", exact: true })).toHaveValue("What I did for me:\nWho I spent time with:\nOne thing for tomorrow:\n");
  expect(screen.getByRole("button", { name: "WORK DAY PROMPTS" }).elements()).toHaveLength(0);
  expect(await db.events.count()).toBe(before);
});
